import { persistEmbeddedScript } from '../utils/embeddedFileStorage';
import { buildDownloadContent } from '../hooks/useYAMLPersistence';
import { PlanScriptsContext } from '../contexts/PlanScriptsContext';
import {
  addPlanScript,
  loadPlanScripts,
  renamePlanScript,
  selectPlanScript,
  type PlanScripts,
} from '../utils/planScriptStorage';
import { NEW_DOCUMENT_YAML } from './yaml-editor/useYamlDocumentSync';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { CorrelateDocument } from '../utils/correlateBridge';
import type { EmbeddedStudioController, EmbeddedStudioView } from '../utils/embeddedStudioController';
import { validateSavedEditorURL } from '../utils/recorderTabs';
import { YAMLEditor } from './YAMLEditor';
import { HTTPRecorderPage } from './recorder/HTTPRecorderPage';
import { GRPCRecorderPage } from './grpc/GRPCRecorderPage';
import { CorrelatePage } from './correlate/CorrelatePage';

const views: EmbeddedStudioView[] = ['scripting', 'record', 'correlation', 'debug', 'run'];
export function EmbeddedStudioWorkspace() {
  const [catalog, setCatalog] = useState<PlanScripts | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void loadPlanScripts()
      .then(async catalog => {
        const address = new URL(window.location.href);
        const requested = address.searchParams.get('script');
        if (requested && requested !== catalog.activeScriptId) catalog = await selectPlanScript(requested);
        if (cancelled) return;
        address.searchParams.set('script', catalog.activeScriptId);
        window.history.replaceState(window.history.state, '', address);
        setCatalog(catalog);
      })
      .catch(cause => {
        if (!cancelled) setError(String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!catalog)
    return (
      <p
        role={error ? 'alert' : 'status'}
        className="p-4 text-sm text-zinc-400"
      >
        {error || 'Loading plan scripts…'}
      </p>
    );
  return <ScriptWorkspace initialCatalog={catalog} />;
}

function ScriptWorkspace({ initialCatalog }: { initialCatalog: PlanScripts }) {
  const controller = useRef<EmbeddedStudioController>(null);
  const correlation = useRef<{ save: () => Promise<void> }>(null);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const scriptId = initialCatalog.activeScriptId;
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<EmbeddedStudioView>('scripting');
  const [protocol, setProtocol] = useState<'http' | 'grpc'>('http');
  const [openedHTTP, setOpenedHTTP] = useState(false);
  const [openedGRPC, setOpenedGRPC] = useState(false);
  const [source, setSource] = useState<CorrelateDocument | null>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const draft = useRef({ yaml: '', fileName: '', changed: false });
  const activity = useRef({ http: false, grpc: false });
  const [error, setError] = useState('');
  const { language } = useLanguage();
  const report = (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause));
  const goToScripting = useCallback(() => {
    draft.current.changed = false;
    setView('scripting');
    setSource(null);
    window.parent.postMessage({ type: 'relampo:navigate-host', view: 'scripting' }, window.location.origin);
  }, []);
  const trackDraft = useCallback((value: typeof draft.current) => {
    draft.current = value;
  }, []);
  const trackHTTP = useCallback((active: boolean) => {
    activity.current.http = active;
  }, []);
  const trackGRPC = useCallback((active: boolean) => {
    activity.current.grpc = active;
  }, []);
  const commitCorrelation = useCallback(async (yaml: string, fileName: string) => {
    const editor = controller.current;
    const baseline = sourceRef.current;
    if (!editor || !baseline) throw new Error('The test plan is not ready.');
    const current = editor.document();
    if (current.yaml !== baseline.yaml || current.fileName !== baseline.fileName) {
      throw new Error('The test plan changed. Reopen Correlation from its current script.');
    }
    await editor.replace(yaml, fileName);
    draft.current.changed = false;
    sourceRef.current = { yaml, fileName, revision: current.revision };
  }, []);
  const flush = useCallback(
    async (reason?: string) => {
      if (!ready || !controller.current) throw new Error('Studio is still loading. Try again when the plan is ready.');
      if (switchingRef.current && reason !== 'switch-script') throw new Error('A script is already loading.');
      if (reason === 'switch-plan' && (activity.current.http || activity.current.grpc)) {
        throw new Error('Stop the recording before switching test plans.');
      }
      if (draft.current.changed && correlation.current) await correlation.current.save();
      else await controller.current.save();
      await renamePlanScript(scriptId, controller.current.document().fileName);
      const document = controller.current.document();
      const saved = await persistEmbeddedScript(scriptId, document, reason === 'save');
      if (saved?.yaml !== undefined && saved.yaml !== document.yaml) {
        const current = controller.current.document();
        if (current.revision === document.revision && current.fileName === document.fileName) {
          await controller.current.replace(saved.yaml, document.fileName);
          const updated = { yaml: saved.yaml, fileName: document.fileName, revision: current.revision };
          sourceRef.current = updated;
          setSource(updated);
          draft.current.changed = false;
        } else
          throw new Error('The shared update was saved. Your newer draft was kept; review it before saving again.');
      }
    },
    [ready, scriptId],
  );
  const fileNameChanged = useCallback(
    (fileName: string) => {
      setCatalog(current => ({
        ...current,
        scripts: current.scripts.map(script => (script.id === scriptId ? { ...script, fileName } : script)),
      }));
    },
    [scriptId],
  );
  const changeScript = useCallback(
    async (nextId?: string, document?: { yaml: string; fileName: string }) => {
      if (switchingRef.current) throw new Error('A script is already loading.');
      if (activity.current.http || activity.current.grpc)
        throw new Error('Stop the recording before switching scripts.');
      setError('');
      switchingRef.current = true;
      setSwitching(true);
      try {
        await flush('switch-script');
        const newId = crypto.randomUUID();
        // A rejected disk write must not select/register a script that was not created.
        if (document) await persistEmbeddedScript(newId, document);
        const next = document
          ? await addPlanScript({ ...document, updatedAt: new Date().toISOString() }, newId)
          : await selectPlanScript(nextId!);
        // A fresh workspace restores only this script's draft and execution sessions.
        const address = new URL(window.location.href);
        address.searchParams.set('script', next.activeScriptId);
        window.location.replace(address.href);
      } catch (cause) {
        switchingRef.current = false;
        setSwitching(false);
        report(cause);
        throw cause;
      }
    },
    [flush],
  );
  const importScript = useCallback(
    async (yaml: string, fileName: string) => {
      if (!controller.current) throw new Error('The script is not ready.');
      if (activity.current.http || activity.current.grpc)
        throw new Error('Stop the recording before importing a script.');
      // Use the initial empty slot instead of leaving an unused blank script behind.
      if (!controller.current.document().yaml.trim()) {
        await controller.current.replace(yaml, fileName);
        await renamePlanScript(scriptId, fileName);
        fileNameChanged(fileName);
        await persistEmbeddedScript(scriptId, { yaml, fileName });
      } else await changeScript(undefined, { yaml, fileName });
    },
    [changeScript, fileNameChanged, scriptId],
  );
  useEffect(() => {
    window.parent.postMessage({ type: 'relampo:workspace-state', ready: ready && !switching }, window.location.origin);
  }, [ready, switching]);
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !event.data ||
        typeof event.data !== 'object'
      )
        return;
      const message = event.data;
      if (
        message.type === 'relampo:save-plan' &&
        typeof message.requestId === 'string' &&
        message.requestId.length <= 80
      ) {
        let ok = false;
        let error = '';
        let cancelled = false;
        try {
          if (message.includeResponses === false && controller.current) {
            if (draft.current.changed && correlation.current) await correlation.current.save();
            const current = controller.current.document();
            const result = buildDownloadContent(false, current.yaml, language);
            if (result.content === null) throw new Error(result.error);
            await controller.current.replace(result.content, current.fileName);
          }
          await flush(message.reason);
          setError('');
          ok = true;
        } catch (cause) {
          cancelled = cause instanceof Error && cause.name === 'ScriptSaveCancelled';
          if (cancelled) setError('');
          else {
            error = cause instanceof Error ? cause.message : String(cause);
            report(cause);
          }
        }
        window.parent.postMessage(
          { type: 'relampo:plan-saved', requestId: message.requestId, ok, error, cancelled },
          window.location.origin,
        );
        return;
      }
      if (!ready || !controller.current || switchingRef.current) return;
      if (message.type === 'relampo:workspace-view' && views.includes(message.view)) {
        if (message.view === 'correlation') {
          const current = controller.current.document();
          if (
            !sourceRef.current ||
            current.yaml !== sourceRef.current.yaml ||
            current.fileName !== sourceRef.current.fileName
          ) {
            setSource(current);
            draft.current.changed = false;
          }
        }
        if (message.view === 'record') {
          if (protocol === 'http') setOpenedHTTP(true);
          else setOpenedGRPC(true);
        }
        if (message.view === 'debug' || message.view === 'run') controller.current.view(message.view);
        if (message.view === 'scripting') controller.current.view('tree');
        setView(message.view);
      }
      if (message.type === 'relampo:editor-command') {
        try {
          setError('');
          if (message.command === 'upload' || message.command === 'new') {
            if (activity.current.http || activity.current.grpc)
              throw new Error('Stop the recording before changing scripts.');
            await flush('import');
            goToScripting();
            if (message.command === 'upload') controller.current.upload();
            else
              await importScript(
                NEW_DOCUMENT_YAML,
                `script-${catalog.scripts.length + (controller.current.document().yaml.trim() ? 1 : 0)}.yaml`,
              );
          } else if (message.command === 'export-with-responses' || message.command === 'export-without-responses') {
            await flush('download');
            controller.current.download(message.command === 'export-with-responses');
          }
        } catch (cause) {
          report(cause);
        }
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [flush, goToScripting, protocol, ready, importScript, catalog.scripts.length, language]);

  async function importRecording(yaml: string, fileName: string) {
    if (!controller.current) throw new Error('The test plan is not ready.');
    if (
      controller.current.document().yaml.trim() &&
      !window.confirm(
        language === 'es'
          ? '¿Reemplazar el script de este plan por la grabación?'
          : 'Replace this test plan script with the recording?',
      )
    )
      return;
    await controller.current.replace(yaml, fileName);
    await persistEmbeddedScript(scriptId, { yaml, fileName });
    goToScripting();
  }
  async function openSavedRecording(editorURL: string) {
    const address = new URL(validateSavedEditorURL(editorURL));
    const infoURL = new URL('/api/studio/info', address.origin);
    const token = address.searchParams.get('token');
    const response = await fetch(infoURL, {
      headers: token ? { 'X-Relampo-Studio-Token': token } : {},
      signal: AbortSignal.timeout(10000),
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('Could not load the saved recording from Studio.');
    const info = await response.json();
    if (typeof info.initialScript?.yaml !== 'string' || typeof info.initialScript?.name !== 'string')
      throw new Error('Studio did not return the saved recording.');
    await importRecording(info.initialScript.yaml, info.initialScript.name);
  }
  return (
    <PlanScriptsContext.Provider
      value={{
        scripts: catalog.scripts,
        selectedId: scriptId,
        disabled: switching || !ready || (view !== 'scripting' && view !== 'correlation'),
        select: id => {
          if (id !== scriptId) void changeScript(id).catch(report);
        },
      }}
    >
      <div
        className="flex h-full min-h-0 flex-col bg-[#0a0a0a]"
        data-studio-workspace={view}
      >
        {error && (
          <p
            role="alert"
            className="shrink-0 bg-red-500/10 px-4 py-2 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        <div
          className="min-h-0 flex-1"
          hidden={view === 'record' || view === 'correlation'}
          style={{ display: view === 'record' || view === 'correlation' ? 'none' : undefined }}
        >
          <YAMLEditor
            controllerRef={controller}
            onImport={importScript}
            onFileNameChange={fileNameChanged}
            onReady={setReady}
            onNavigateToScripting={goToScripting}
          />
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col"
          hidden={view !== 'record'}
          style={{ display: view !== 'record' ? 'none' : undefined }}
        >
          <div
            className="flex shrink-0 gap-2 border-b border-white/10 p-2"
            role="tablist"
            aria-label="Recorder protocol"
          >
            {(['http', 'grpc'] as const).map(value => (
              <button
                key={value}
                role="tab"
                aria-selected={protocol === value}
                className="rounded border border-white/15 px-3 py-1 text-xs text-zinc-200 aria-selected:border-yellow-400 aria-selected:text-yellow-300"
                onClick={() => {
                  setProtocol(value);
                  if (value === 'http') setOpenedHTTP(true);
                  else setOpenedGRPC(true);
                }}
              >
                {value === 'http' ? 'HTTP/HTTPS' : 'gRPC'}
              </button>
            ))}
          </div>
          {openedHTTP && (
            <div
              className="min-h-0 flex-1"
              hidden={protocol !== 'http'}
              style={{ display: protocol !== 'http' ? 'none' : undefined }}
              data-studio-tool="http-recorder"
            >
              <HTTPRecorderPage
                embedded
                onOpenSaved={openSavedRecording}
                onActivityChange={trackHTTP}
              />
            </div>
          )}
          {openedGRPC && (
            <div
              className="min-h-0 flex-1"
              hidden={protocol !== 'grpc'}
              style={{ display: protocol !== 'grpc' ? 'none' : undefined }}
              data-studio-tool="grpc-recorder"
            >
              <GRPCRecorderPage
                embedded
                onGoToScripting={goToScripting}
                onAdd={yaml => {
                  void importRecording(yaml, 'grpc-recording.yaml').catch(report);
                }}
                onActivityChange={trackGRPC}
              />
            </div>
          )}
        </div>
        {source && (
          <div
            className="min-h-0 flex-1"
            hidden={view !== 'correlation'}
            style={{ display: view !== 'correlation' ? 'none' : undefined }}
            data-studio-tool="correlation"
          >
            <CorrelatePage
              key={source.revision + ':' + source.fileName}
              source={source}
              onCommit={commitCorrelation}
              onGoToScripting={goToScripting}
              onDraftChange={trackDraft}
              saveRef={correlation}
            />
          </div>
        )}
      </div>
    </PlanScriptsContext.Provider>
  );
}
