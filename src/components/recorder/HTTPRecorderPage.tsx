import { HTTPRecorderSetup } from './HTTPRecorderSetup';
import { HTTPRecorderSaved } from './HTTPRecorderSaved';
import { useEffect, useState } from 'react';
import { CircleDot, Play, Square, Eraser, ExternalLink as ControlsIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { validateSavedEditorURL, openHTTPRecordingControls } from '../../utils/recorderTabs';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
import { RecorderShell } from './RecorderShell';
import { useHTTPRecorder } from './useHTTPRecorder';
import { recorderCompactInput as recorderInput, recorderCompactButton as recorderButton } from './HTTPRecorderSettings';
import { HTTPRecorderRequests } from './HTTPRecorderRequests';
export function HTTPRecorderPage() {
  const { language, setLanguage } = useLanguage();
  const es = language === 'es',
    text = (en: string, spanish: string) => (es ? spanish : en);
  const recorder = useHTTPRecorder(),
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
    if (!state.active || !state.startedAt) return;
    const started = Date.parse(state.startedAt);
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.active, state.startedAt]);
  async function startRecording() {
    const popup = openHTTPRecordingControls(language);
    if (!popup) {
      setError(
        text('Allow the recording control popup before starting.', 'Permite el popup de control antes de iniciar.'),
      );
      return;
    }
    const current = await recorder.start();
    if (!current?.active) popup.close();
    else if (!popup.closed) popup.focus();
  }
  async function openSaved() {
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
  const canRetrySave = !state.active && !state.savedPath && !!state.proxyAddress;
  return (
    <RecorderShell
      language={language}
      setLanguage={setLanguage}
      onError={setError}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <HTTPRecorderSetup
          recorder={recorder}
          language={language}
          disabled={state.active || canRetrySave}
        />
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-white/10 bg-[#111111] px-3 text-xs">
          <span className={'flex items-center gap-1.5 ' + (state.active ? 'text-red-300' : 'text-zinc-400')}>
            <CircleDot className={'h-3 w-3 ' + (state.active ? 'animate-pulse' : '')} />
            {busy === 'start'
              ? text('Preparing Firefox…', 'Preparando Firefox…')
              : busy === 'stop'
                ? text('Saving…', 'Guardando…')
                : state.active
                  ? text('Recording', 'Grabando')
                  : state.savedPath
                    ? text('Saved', 'Guardado')
                    : text('Ready to record', 'Listo para grabar')}
          </span>
          {state.active && (
            <span className="font-mono text-zinc-500">
              {Math.floor(seconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(seconds % 60).toString().padStart(2, '0')}
            </span>
          )}
          <span className="text-zinc-500">{state.totalRequests} requests</span>
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
                  : text('Stop and save', 'Detener y guardar')}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  !ready ||
                  !!busy ||
                  !options.applicationUrl.trim() ||
                  !options.output.trim() ||
                  (options.openFirefox && (!firefoxAvailable || !firefoxConfigured))
                }
                className={
                  recorderButton + ' border-yellow-400! bg-yellow-400! font-semibold! text-black! hover:bg-yellow-300!'
                }
                onClick={() => void startRecording()}
              >
                <Play className="h-3 w-3" />
                {options.openFirefox
                  ? text('Start recording and open Firefox', 'Iniciar grabación y abrir Firefox')
                  : text('Start recording', 'Iniciar grabación')}
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
            {text(
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
        <HTTPRecorderRequests
          key={state.startedAt || 'idle'}
          rows={state.requests || []}
          total={state.totalRequests}
          responses={state.responses ?? options.responses}
          language={language}
          transactionsEnabled={state.transactionsEnabled}
        />
        {state.savedPath && (
          <HTTPRecorderSaved
            key={state.savedPath}
            path={state.savedPath}
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
