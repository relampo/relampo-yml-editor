import { persistEmbeddedRecordingFiles, type RecordingAsset } from '../../utils/embeddedFileStorage';
import { HTTPRecorderSetup } from './HTTPRecorderSetup';
import { HTTPRecorderSaved } from './HTTPRecorderSaved';
import { useCallback, useEffect, useState } from 'react';
import { CircleDot, Play, Square, Eraser, ExternalLink as ControlsIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { validateSavedEditorURL, openHTTPRecordingControls } from '../../utils/recorderTabs';
import { httpRecorderRequest, recorderTLSFailureText } from '../../utils/httpRecorderApi';
import { RecorderShell } from './RecorderShell';
import { useHTTPRecorder } from './useHTTPRecorder';
import { recorderCompactInput as recorderInput, recorderCompactButton as recorderButton } from './HTTPRecorderSettings';
import { HTTPRecorderRequests } from './HTTPRecorderRequests';
import { HTTPRecorderFloatingControls } from './HTTPRecorderFloatingControls';
import { openRecorderControlWindow } from '../../utils/recorderControlWindow';
export function HTTPRecorderPage({
  embedded = false,
  onImport,
  onActivityChange,
  onPendingChange,
}: {
  /** Inside the web app: floating controls, no output file; recording goes to the test plan. */
  embedded?: boolean;
  onImport?: (yaml: string, name: string, afterSaved?: () => Promise<void>) => Promise<void>;
  onActivityChange?: (active: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
} = {}) {
  const { language, setLanguage } = useLanguage();
  const es = language === 'es',
    text = (en: string, spanish: string) => (es ? spanish : en);
  const [controlsWindow, setControlsWindow] = useState<Window | null>(null);
  const closeControls = useCallback(() => setControlsWindow(null), []);
  const recorder = useHTTPRecorder(embedded, controlsWindow),
    { options, update, state, error, setError, busy, ready, firefoxAvailable, firefoxConfigured } = recorder;
  const [opening, setOpening] = useState(false),
    [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Relampo Recorder · HTTP/HTTPS';
    const lang = new URLSearchParams(window.location.search).get('lang');
    if (lang === 'es' || lang === 'en') setLanguage(lang);
    return () => {
      document.title = previous;
    };
  }, [setLanguage]);
  useEffect(() => {
    onActivityChange?.(state.active);
  }, [state.active, onActivityChange]);
  useEffect(() => {
    onPendingChange?.(state.pending === true);
  }, [state.pending, onPendingChange]);
  // Inside the web app only `recording: true` is a recording: with `false`, or
  // with no value, the proxy forwards the traffic and records nothing.
  const recording = state.active && (embedded ? state.recording === true : state.recording !== false);
  useEffect(() => {
    if (!recording || !state.startedAt) return;
    const started = Date.parse(state.recordingStartedAt || state.startedAt);
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [recording, state.startedAt, state.recordingStartedAt]);
  async function startRecording() {
    if (embedded) {
      const popup = await showEmbeddedControls();
      if (!popup) return;
      const current = await recorder.start();
      if (!current?.active) {
        popup.close();
        closeControls();
      }
      return;
    }
    const popup = openHTTPRecordingControls(language);
    if (!popup) {
      setError(
        text('Allow the recording control popup before starting.', 'Permite el popup de control antes de iniciar.'),
      );
      return;
    }
    const current = await recorder.start();
    if (!current?.active) popup.close();
  }
  async function showEmbeddedControls() {
    if (controlsWindow && !controlsWindow.closed) {
      controlsWindow.focus();
      return controlsWindow;
    }
    const popup = await openRecorderControlWindow();
    if (!popup) {
      setError(text('Allow the recording control popup.', 'Permite el popup de control de grabación.'));
      return null;
    }
    setControlsWindow(popup);
    return popup;
  }
  async function openSaved() {
    if (onImport) {
      setOpening(true);
      setError('');
      try {
        // The agent returns the script. It has no second Studio process to open.
        const result = await httpRecorderRequest<{
          name?: unknown;
          yaml?: unknown;
          files?: RecordingAsset[];
          captureId?: string;
        }>('editor', {});
        if (typeof result.yaml !== 'string' || !result.yaml.trim())
          throw new Error(text('The agent returned no recording.', 'El agente no devolvió la grabación.'));
        // eslint-disable-next-line no-control-regex -- the file name must not contain control characters
        const valid = typeof result.name === 'string' && /^[^/\\\x00-\x1f]{1,180}\.ya?ml$/i.test(result.name);
        await persistEmbeddedRecordingFiles(result.files ?? []);
        let acknowledged = false;
        const confirmImport = async () => {
          if (!result.captureId || acknowledged) return;
          const confirmed = await recorder.control('acknowledge', { captureId: result.captureId });
          if (confirmed?.pending !== false)
            throw new Error(
              text(
                'The script was saved but the recording import was not confirmed. Retry the import.',
                'El script se guardó pero no se confirmó la importación de la grabación. Reintenta importar.',
              ),
            );
          acknowledged = true;
        };
        if (result.captureId)
          await onImport(result.yaml, valid ? (result.name as string) : 'recording.yaml', confirmImport);
        else await onImport(result.yaml, valid ? (result.name as string) : 'recording.yaml');
        await confirmImport();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setOpening(false);
      }
      return;
    }
    const editor = window.open('about:blank', '_blank');
    if (!editor) {
      setError(text('Allow opening Studio in another tab.', 'Permite abrir Studio en otra pestaña.'));
      return;
    }
    editor.opener = null;
    editor.document.title = 'Relampo Studio';
    editor.document.body.textContent = text('Opening saved recording…', 'Abriendo grabación guardada…');
    setOpening(true);
    setError('');
    try {
      const result = await httpRecorderRequest<{ editorUrl: string }>('editor', {});
      if (!editor.closed) editor.location.replace(validateSavedEditorURL(result.editorUrl));
    } catch (cause) {
      editor.close();
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setOpening(false);
    }
  }
  const canRetrySave = !embedded && !state.active && !state.savedPath && !!state.proxyAddress;
  // Inside the web app the agent keeps a stopped recording in memory until Clear or the next start.
  const recorded = embedded && !state.active && state.totalRequests > 0;
  return (
    <RecorderShell
      embedded={embedded}
      language={language}
      setLanguage={setLanguage}
      onError={setError}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <HTTPRecorderSetup
          recorder={recorder}
          language={language}
          disabled={state.active || canRetrySave}
          embedded={embedded}
        />
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/10 bg-[#111111] px-3 text-xs">
          <span className={'flex items-center gap-1.5 ' + (state.active ? 'text-red-300' : 'text-zinc-400')}>
            <CircleDot className={'h-3 w-3 ' + (state.active ? 'animate-pulse' : '')} />
            {busy === 'start'
              ? text('Preparing Firefox…', 'Preparando Firefox…')
              : busy === 'stop'
                ? text('Saving…', 'Guardando…')
                : state.active
                  ? recording
                    ? text('Recording', 'Grabando')
                    : text('Browser ready · not recording', 'Navegador listo · sin grabar')
                  : state.savedPath
                    ? text('Saved', 'Guardado')
                    : recorded
                      ? text('Recording ready', 'Grabación lista')
                      : text('Ready to record', 'Listo para grabar')}
          </span>
          {recording && (
            <span className="font-mono text-zinc-500">
              {Math.floor(seconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(seconds % 60).toString().padStart(2, '0')}
            </span>
          )}
          <span className="text-zinc-500">{state.totalRequests} requests</span>
          {state.protocol && <span className="font-mono text-yellow-300">{state.protocol}</span>}
          {state.proxyAddress && <span className="font-mono text-zinc-500">{state.proxyAddress}</span>}
          {state.active && state.certificateReady && (
            <span className="text-emerald-400/70">
              {text('Firefox certificate ready', 'Certificado de Firefox preparado')}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className={recorderButton}
              disabled={
                !ready ||
                !!busy ||
                !!state.saving ||
                state.active ||
                (!state.proxyAddress && !state.savedPath && !state.totalRequests)
              }
              title={
                state.active
                  ? text('Stop recording before clearing.', 'Detén la grabación antes de limpiar.')
                  : text(
                      'Clear recorded requests and responses. Saved files are kept.',
                      'Limpia los requests y respuestas grabados. Los archivos guardados se conservan.',
                    )
              }
              onClick={() => void recorder.clear()}
            >
              <Eraser className="h-3 w-3" />
              {text('Clear', 'Limpiar')}
            </button>
            {state.active && !state.firefoxRunning && !state.firefoxPreparing && (
              <button
                type="button"
                disabled={!!busy || !firefoxAvailable}
                className={recorderButton}
                onClick={() => void recorder.openFirefox()}
              >
                {text('Open Firefox', 'Abrir Firefox')}
              </button>
            )}
            {state.active && (
              <button
                type="button"
                className={recorderButton}
                onClick={() => {
                  if (embedded) {
                    void showEmbeddedControls();
                    return;
                  }
                  if (!openHTTPRecordingControls(language))
                    setError(text('Allow the recording control popup.', 'Permite el popup de control.'));
                }}
              >
                <ControlsIcon className="h-3 w-3" />
                {text('Open recording controls', 'Abrir control de grabación')}
              </button>
            )}
            {state.active || canRetrySave ? (
              <button
                type="button"
                disabled={!!busy}
                className={recorderButton + ' border-red-400/30! text-red-300!'}
                onClick={() => void recorder.stop()}
              >
                <Square className="h-3 w-3" />
                {canRetrySave
                  ? text('Retry saving', 'Reintentar guardado')
                  : embedded
                    ? text('Stop recording', 'Detener grabación')
                    : text('Stop and save', 'Detener y guardar')}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  !ready ||
                  !!busy ||
                  state.pending === true ||
                  !options.applicationUrl.trim() ||
                  (!embedded && !options.output.trim()) ||
                  (options.openFirefox && (!firefoxAvailable || !firefoxConfigured))
                }
                className={
                  recorderButton + ' border-yellow-400! bg-yellow-400! font-semibold! text-black! hover:bg-yellow-300!'
                }
                onClick={() => void startRecording()}
              >
                <Play className="h-3 w-3" />
                {options.openFirefox
                  ? text('Open Firefox', 'Abrir Firefox')
                  : text('Prepare recorder', 'Preparar grabador')}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="flex shrink-0 items-center justify-between gap-3 border-b border-red-400/15 bg-red-500/5 px-3 py-2 text-xs text-red-300"
          >
            <span>{error}</span>
            {!ready && (
              <button
                type="button"
                className={recorderButton}
                onClick={recorder.retryInitialization}
              >
                {text('Retry', 'Reintentar')}
              </button>
            )}
          </div>
        )}
        {!!state.tlsFailures && (
          <p className="shrink-0 px-3 py-1 text-xs text-amber-300">
            {text('TLS connection failures: ', 'Fallos de conexión TLS: ')}
            {state.tlsFailures}
          </p>
        )}
        {!!state.upstreamTLSFailures && (
          <p
            role="alert"
            className="shrink-0 border-b border-amber-400/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-300"
          >
            {state.upstreamTLSError
              ? recorderTLSFailureText(state.upstreamTLSError, language)
              : text(
                  'Relampo could not establish a trusted TLS connection to the application server. Check its certificate and issuing CA.',
                  'Relampo no pudo establecer una conexión TLS de confianza con el servidor. Revisa su certificado y su CA emisora.',
                )}
          </p>
        )}
        {canRetrySave && (
          <label className="flex shrink-0 items-center gap-2 px-3 py-2 text-xs text-zinc-400">
            {text('Retry output path', 'Ruta para reintentar el guardado')}
            <input
              aria-label="Retry output path"
              className={recorderInput + ' max-w-xl'}
              value={options.output}
              onChange={e => update({ output: e.target.value })}
            />
          </label>
        )}
        {embedded && controlsWindow && (
          <HTTPRecorderFloatingControls
            target={controlsWindow}
            state={{ ...state, recording }}
            busy={busy}
            error={error}
            language={language}
            onAction={recorder.control}
            onClose={closeControls}
          />
        )}
        <HTTPRecorderRequests
          key={state.startedAt || 'idle'}
          rows={state.requests || []}
          total={state.totalRequests}
          responses={state.responses ?? options.responses}
          language={language}
          transactionsEnabled={state.transactionsEnabled}
        />
        {(state.savedPath || recorded) && (
          <HTTPRecorderSaved
            // Its own key space: the list of requests above also uses `startedAt` as its key.
            key={'saved:' + (state.savedPath || state.startedAt || 'recorded')}
            path={state.savedPath ?? ''}
            embedded={embedded}
            total={state.totalRequests}
            opening={opening}
            onOpen={() => void openSaved()}
            language={language}
          />
        )}
      </div>
    </RecorderShell>
  );
}
