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
  const controller = useRef<EmbeddedStudioController>(null);
  const correlation = useRef<{ save: () => Promise<void> }>(null);
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
      if (reason === 'switch-plan' && (activity.current.http || activity.current.grpc)) {
        throw new Error('Stop the recording before switching test plans.');
      }
      if (draft.current.changed && correlation.current) await correlation.current.save();
      else await controller.current.save();
    },
    [ready],
  );
  useEffect(() => {
    window.parent.postMessage({ type: 'relampo:workspace-state', ready }, window.location.origin);
  }, [ready]);
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
        try {
          await flush(message.reason);
          ok = true;
        } catch (cause) {
          report(cause);
        }
        window.parent.postMessage(
          { type: 'relampo:plan-saved', requestId: message.requestId, ok },
          window.location.origin,
        );
        return;
      }
      if (!ready || !controller.current) return;
      if (message.type === 'relampo:workspace-view' && views.includes(message.view)) {
        setError('');
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
            goToScripting();
            if (message.command === 'upload') controller.current.upload();
            else controller.current.newDocument();
          } else if (message.command === 'export-with-responses' || message.command === 'export-without-responses') {
            await flush('save');
            controller.current.download(message.command === 'export-with-responses');
          }
        } catch (cause) {
          report(cause);
        }
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [flush, goToScripting, protocol, ready]);

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
  );
}
