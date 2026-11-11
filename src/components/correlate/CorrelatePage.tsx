import type { CorrelateDocument } from '../../utils/correlateBridge';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Link2, FolderOpen, Eraser, Play, Check, Save, X, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RecorderShell } from '../recorder/RecorderShell';
import { recorderCompactButton as button, recorderCompactInput as input } from '../recorder/HTTPRecorderSettings';
import { useResizePanel } from '../../hooks/useResizePanel';
import {
  correlateRequest,
  correlatedFileName,
  type CorrelateReport,
  type CorrelateCandidate,
} from '../../utils/correlateApi';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
import { openStudioEditorTab, validateSavedEditorURL } from '../../utils/recorderTabs';
import { CorrelateDocumentPanel } from './CorrelateDocumentPanel';
import { CorrelateResults } from './CorrelateResults';
import type { AppliedCorrelation, CorrelatedDocument } from '../../utils/correlateApi';

export function CorrelatePage({
  source,
  onCommit,
  onGoToScripting,
  onDraftChange,
  saveRef,
}: {
  saveRef?: Ref<{ save: () => Promise<void> }>;
  source?: CorrelateDocument;
  onCommit?: (yaml: string, name: string) => Promise<void>;
  onGoToScripting?: () => void;
  onDraftChange?: (draft: { yaml: string; fileName: string; changed: boolean }) => void;
} = {}) {
  const embedded = Boolean(onCommit);
  const { language, setLanguage } = useLanguage();
  const es = language === 'es',
    text = (en: string, spanish: string) => (es ? spanish : en);
  const [yaml, setYaml] = useState(''),
    [name, setName] = useState(''),
    [output, setOutput] = useState(''),
    [overwrite, setOverwrite] = useState(false);
  const [results, setResults] = useState<AppliedCorrelation[] | null>(null);
  const [report, setReport] = useState<CorrelateReport | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [locate, setLocate] = useState<CorrelateCandidate | null>(null);
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [applied, setApplied] = useState(false),
    [generated, setGenerated] = useState(false),
    [linked, setLinked] = useState(false),
    [changed, setChanged] = useState(false),
    [savedPath, setSavedPath] = useState(''),
    [savedYaml, setSavedYaml] = useState(''),
    [conflict, setConflict] = useState(false);
  const version = useRef(0),
    channel = useRef<BroadcastChannel | null>(null),
    acceptSource = useRef(true),
    directory = useRef(''),
    fileName = useRef('script.yaml'),
    fileInput = useRef<HTMLInputElement | null>(null);
  const pending = useRef<{ id: string; resolve: () => void; reject: (error: Error) => void } | null>(null);
  const { leftPanelWidth, setIsResizing } = useResizePanel(30);
  const invalidate = () => {
    version.current++;
    setReport(null);
    setResults(null);
    setSelected([]);
    setLocate(null);
    setApplied(false);
    setGenerated(false);
    setSavedPath('');
    setSavedYaml('');
    setConflict(false);
    setError('');
  };
  function edit(value: string) {
    invalidate();
    setYaml(value);
    setChanged(true);
  }
  async function analyze(value = yaml) {
    if (!value.trim()) return;
    const revision = ++version.current;
    setBusy('analyze');
    setError('');
    setReport(null);
    setSelected([]);
    setApplied(false);
    setLocate(null);
    try {
      const result = await correlateRequest<CorrelateReport>('analyze', { yaml: value });
      if (version.current === revision) setReport(result);
    } catch (cause) {
      if (version.current === revision) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (version.current === revision) setBusy('');
    }
  }
  function load(value: string, title: string, fromSource: boolean) {
    invalidate();
    fileName.current = title;
    setName(title);
    setYaml(value);
    setLinked(fromSource);
    setChanged(false);
    if (directory.current) setOutput(directory.current + '/' + correlatedFileName(title));
    setBusy('');
  }
  useEffect(() => {
    document.title = 'Relampo Correlate';
    let live = true;
    if (source) {
      load(source.yaml, source.fileName, true);
    }
    if (!embedded)
      correlateRequest<{ directory: string }>('options', {})
        .then(value => {
          if (live) {
            directory.current = value.directory;
            setOutput(current => current || value.directory + '/' + correlatedFileName(fileName.current));
          }
        })
        .catch(cause => {
          if (live) setError(String(cause.message || cause));
        });
    const session = embedded ? null : new URLSearchParams(location.search).get('session');
    let active: BroadcastChannel | null = null;
    if (session && /^[a-zA-Z0-9_-]{1,80}$/.test(session)) {
      active = new BroadcastChannel('relampo-correlate-v1-' + session);
      channel.current = active;
      active.onmessage = event => {
        const value = event.data;
        if (
          value?.kind === 'source' &&
          acceptSource.current &&
          typeof value.document?.yaml === 'string' &&
          typeof value.document?.fileName === 'string'
        ) {
          acceptSource.current = false;
          load(value.document.yaml, value.document.fileName, true);
        }
        if (pending.current && value?.requestId === pending.current.id) {
          if (value.kind === 'committed') pending.current?.resolve();
          if (value.kind === 'conflict')
            pending.current?.reject(
              Error(
                text(
                  'The source script changed. Open the saved result in a new Studio.',
                  'El script de origen cambió. Abre el resultado guardado en un nuevo Studio.',
                ),
              ),
            );
          if (value.kind === 'failed')
            pending.current?.reject(
              Error(
                text(
                  'Studio could not confirm the update. Your saved result is available.',
                  'Studio no pudo confirmar la actualización. Tu resultado guardado está disponible.',
                ),
              ),
            );
        }
      };
      active.postMessage({ kind: 'ready' });
    }
    return () => {
      live = false;
      version.current++;
      active?.postMessage({ kind: 'bye' });
      active?.close();
      channel.current = null;
    };
    // Each page owns one transfer; actions explicitly load or analyze later documents.
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (changed) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [changed]);
  useEffect(() => {
    onDraftChange?.({ yaml, fileName: name, changed });
  }, [yaml, name, changed, onDraftChange]);
  function clear() {
    acceptSource.current = false;
    invalidate();
    setBusy('');
    setYaml('');
    setName('');
    setLinked(false);
    setChanged(false);
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      setError(text('The YAML file exceeds 16 MB.', 'El archivo YAML supera 16 MB.'));
      return;
    }
    const revision = ++version.current;
    acceptSource.current = false;
    try {
      const value = await file.text();
      if (revision === version.current) load(value, file.name, false);
    } catch (cause) {
      setError(String(cause));
    }
  }
  async function chooseOutput() {
    setBusy('choose');
    setError('');
    try {
      const result = await httpRecorderRequest<{ cancelled: boolean; output?: string }>('choose-output', {
        suggested: output || directory.current + '/' + correlatedFileName(name),
      });
      if (!result.cancelled && result.output) setOutput(result.output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy('');
    }
  }
  async function apply() {
    if (!report || !selected.length) return;
    const revision = version.current;
    setBusy('apply');
    setError('');
    try {
      const result = await correlateRequest<CorrelatedDocument>('apply', {
        yaml,
        digest: report.digest,
        selectedIds: selected,
      });
      if (revision === version.current) {
        setYaml(result.yaml);
        setResults(result.applied ?? []);
        setApplied(true);
        setGenerated(true);
        setChanged(true);
        setSavedPath('');
        setSavedYaml('');
        setConflict(false);
        setLocate(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (revision === version.current) setBusy('');
    }
  }
  async function openSaved(path: string, placeholder: Window | null) {
    const tab = placeholder ?? window.open('about:blank', '_blank');
    if (!tab) throw Error(text('Allow opening Studio in another tab.', 'Permite abrir Studio en otra pestaña.'));
    try {
      const result = await correlateRequest<{ editorUrl: string }>('open-saved', { path });
      tab.opener = null;
      tab.location.replace(validateSavedEditorURL(result.editorUrl));
      return tab;
    } catch (cause) {
      tab.close();
      throw cause;
    }
  }
  const commitEmbedded = async () => {
    if (!onCommit) return;
    await onCommit(yaml, name || 'script.yaml');
    setChanged(false);
  };
  useImperativeHandle(saveRef, () => ({ save: commitEmbedded }));
  async function saveAndReturn() {
    if (onCommit) {
      setBusy('save');
      setError('');
      try {
        await commitEmbedded();
        onGoToScripting?.();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy('');
      }
      return;
    }
    let placeholder: Window | null = null;
    if (!linked) {
      placeholder = window.open('about:blank', '_blank');
      if (!placeholder) {
        setError(text('Allow opening Studio in another tab.', 'Permite abrir Studio en otra pestaña.'));
        return;
      }
    }
    setBusy('save');
    setError('');
    try {
      let path = savedPath;
      let title = path.split('/').pop() || name;
      if (!path || savedYaml !== yaml) {
        const result = await correlateRequest<{ savedPath: string; name: string }>('save', {
          yaml,
          output,
          force: overwrite,
        });
        path = result.savedPath;
        title = result.name;
        setSavedPath(path);
        setSavedYaml(yaml);
      }
      setChanged(false);
      if (linked) {
        try {
          await new Promise<void>((resolve, reject) => {
            const id = crypto.randomUUID();
            const timer = window.setTimeout(
              () =>
                reject(
                  Error(
                    text(
                      'The source Studio did not respond. Open the saved result in a new Studio.',
                      'El Studio de origen no respondió. Abre el resultado guardado en un nuevo Studio.',
                    ),
                  ),
                ),
              4000,
            );
            pending.current = {
              id,
              resolve: () => {
                clearTimeout(timer);
                pending.current = null;
                resolve();
              },
              reject: error => {
                clearTimeout(timer);
                pending.current = null;
                reject(error);
              },
            };
            channel.current?.postMessage({ kind: 'commit', requestId: id, yaml, fileName: title });
          });
        } catch (cause) {
          setConflict(true);
          throw cause;
        }
        window.opener?.focus();
      } else await openSaved(path, placeholder);
      window.close();
    } catch (cause) {
      placeholder?.close();
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy('');
    }
  }
  const goToStudio = () => {
    if (onGoToScripting) {
      onGoToScripting();
      return;
    }
    if (window.opener && !window.opener.closed) window.opener.focus();
    else if (!openStudioEditorTab()) setError(text('Allow opening Studio.', 'Permite abrir Studio.'));
  };
  return (
    <RecorderShell
      embedded={embedded}
      language={language}
      setLanguage={setLanguage}
      onError={setError}
      title={
        <>
          <Link2 className="h-3.5 w-3.5 text-yellow-400" />
          Correlate
        </>
      }
      onGoToStudio={goToStudio}
    >
      <section
        aria-label="Correlation controls"
        className="shrink-0 space-y-2 border-b border-white/10 bg-[#111111] px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          {!embedded && (
            <span
              className="mr-2 max-w-64 truncate text-xs font-medium text-zinc-300"
              title={name}
            >
              {name || text('No script loaded', 'Sin script cargado')}
            </span>
          )}
          {!embedded && (
            <>
              <button
                type="button"
                className={button}
                disabled={!!busy}
                onClick={() => fileInput.current?.click()}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {text('Open script', 'Abrir script')}
              </button>
              <input
                type="file"
                accept=".yaml,.yml"
                ref={fileInput}
                hidden
                onChange={e => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
          <button
            type="button"
            className={button}
            onClick={clear}
            disabled={busy === 'save'}
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            className={button + ' border-yellow-400/30 text-yellow-400'}
            onClick={() => void analyze()}
            disabled={!!busy || !yaml.trim()}
          >
            <Play className="h-3.5 w-3.5" />
            {text('Analyze', 'Analizar')}
          </button>
          <button
            type="button"
            className={button}
            onClick={() => void apply()}
            disabled={!!busy || !report || !selected.length || applied}
          >
            <Check className="h-3.5 w-3.5" />
            Correlate
          </button>
          <button
            type="button"
            className={button + ' border-yellow-400/30 bg-yellow-400! text-black!'}
            onClick={() => void saveAndReturn()}
            disabled={!!busy || !generated || (!embedded && !output)}
          >
            <Save className="h-3.5 w-3.5" />
            {embedded
              ? text('Apply to test plan', 'Aplicar al plan de prueba')
              : linked
                ? text('Save and return to Studio', 'Guardar y volver a Studio')
                : text('Save and open in Studio', 'Guardar y abrir en Studio')}
          </button>
          <button
            type="button"
            className={button + ' ml-auto'}
            onClick={() => {
              if (
                !changed ||
                window.confirm(text('Close without saving these changes?', '¿Cerrar sin guardar estos cambios?'))
              )
                if (onGoToScripting) {
                  setChanged(false);
                  onGoToScripting();
                } else window.close();
            }}
          >
            <X className="h-3.5 w-3.5" />
            {embedded ? text('Back to Scripting', 'Volver a Scripting') : text('Close', 'Cerrar')}
          </button>
        </div>
        {!embedded && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <label className="flex flex-1 items-center gap-2">
              <span className="uppercase">{text('Output YAML', 'YAML de salida')}</span>
              <input
                aria-label="Correlated output YAML"
                className={input + ' flex-1'}
                value={output}
                disabled={!!busy}
                onChange={e => setOutput(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={button}
              disabled={!!busy}
              onClick={() => void chooseOutput()}
              aria-label={text('Choose output file', 'Seleccionar archivo de salida')}
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={overwrite}
                disabled={!!busy}
                onChange={e => setOverwrite(e.target.checked)}
              />
              {text('Overwrite existing', 'Sobrescribir existente')}
            </label>
          </div>
        )}
      </section>
      {(!embedded || busy || applied || report || savedPath) && (
        <div
          role="status"
          className="flex min-h-8 shrink-0 items-center gap-4 border-b border-white/10 bg-[#111111] px-3 py-1 text-[11px] text-zinc-400"
        >
          <span>
            {busy
              ? text('Working…', 'Procesando…')
              : applied
                ? text('Selected correlations applied', 'Correlaciones seleccionadas aplicadas')
                : report
                  ? text('Analysis complete', 'Análisis completado')
                  : text('Ready', 'Listo')}
          </span>
          {report && (
            <>
              <span>
                {report.requests} requests · {report.responses} {text('responses', 'respuestas')}
              </span>
              <span>
                {report.candidates.length} {text('candidates', 'candidatos')} · {selected.length}{' '}
                {text('selected', 'seleccionados')}
              </span>
            </>
          )}
          {savedPath && (
            <span
              className="truncate text-emerald-300"
              title={savedPath}
            >
              {savedPath}
            </span>
          )}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="shrink-0 border-b border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300"
        >
          {error}
          {conflict && savedPath && (
            <button
              type="button"
              className={button + ' ml-3'}
              onClick={() =>
                void openSaved(savedPath, null)
                  .then(() => window.close())
                  .catch(cause => setError(cause.message))
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {text('Open result in new Studio', 'Abrir resultado en nuevo Studio')}
            </button>
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex min-h-0 min-w-0 shrink-0 flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <CorrelateDocumentPanel
            yaml={yaml}
            onChange={edit}
            language={language}
            locate={locate}
            scriptSelectionDisabled={!!busy}
          />
        </div>
        <div
          role="separator"
          aria-label="Resize correlation panels"
          aria-orientation="vertical"
          className="w-1 shrink-0 cursor-col-resize border-l border-white/10 bg-white/5 hover:bg-yellow-400/30"
          onMouseDown={() => setIsResizing(true)}
        />
        <CorrelateResults
          results={results}
          rows={report?.candidates ?? null}
          selected={selected}
          onSelected={setSelected}
          onLocate={row => setLocate({ ...row })}
          disabled={!!busy || applied}
          language={language}
        />
      </div>
    </RecorderShell>
  );
}
