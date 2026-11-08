import { HTTPRecorderSetup } from './HTTPRecorderSetup';
import { HTTPDynamicReview } from './HTTPDynamicReview';
import { useEffect, useState } from 'react';
import { CircleDot, ExternalLink, Play, Square, ExternalLink as ControlsIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { validateSavedEditorURL, openHTTPRecordingControls } from '../../utils/recorderTabs';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
import { RecorderShell } from './RecorderShell';
import { useHTTPRecorder } from './useHTTPRecorder';
import { HTTPRecorderSettings, recorderInput, recorderButton } from './HTTPRecorderSettings';
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
      <div className="space-y-5 p-6">
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-md border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-300"
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
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#111111] p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <span
              className={
                'flex items-center gap-2 text-sm font-semibold ' + (state.active ? 'text-red-300' : 'text-zinc-400')
              }
            >
              <CircleDot className={'h-4 w-4 ' + (state.active ? 'animate-pulse' : '')} />
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
              <span className="font-mono text-sm text-zinc-400">
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(seconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <span className="text-sm text-zinc-500">{state.totalRequests} requests</span>
          </div>
          {state.active || canRetrySave ? (
            <button
              type="button"
              disabled={!!busy}
              className={recorderButton + ' border-red-400/30 bg-red-500/10 text-red-300'}
              onClick={() => void recorder.stop()}
            >
              <Square className="h-4 w-4" />
              {canRetrySave ? text('Retry saving', 'Reintentar guardado') : text('Stop and save', 'Detener y guardar')}
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
              className={recorderButton + ' border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300'}
              onClick={() => void startRecording()}
            >
              <Play className="h-4 w-4" />
              {options.openFirefox
                ? text('Start recording and open Firefox', 'Iniciar grabación y abrir Firefox')
                : text('Start recording', 'Iniciar grabación')}
            </button>
          )}
        </div>
        {!state.active && !canRetrySave && (
          <HTTPRecorderSetup
            recorder={recorder}
            language={language}
          />
        )}
        {state.proxyAddress && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span>
              Proxy: <strong className="font-mono font-normal text-zinc-200">{state.proxyAddress}</strong>
            </span>
            {state.active && (
              <>
                <span>
                  {state.firefoxPreparing
                    ? text('Preparing certificate…', 'Preparando certificado…')
                    : state.certificateReady
                      ? text('Firefox certificate ready', 'Certificado de Firefox preparado')
                      : text('External client / Firefox not running', 'Cliente externo / Firefox cerrado')}
                </span>
                {!state.firefoxRunning && !state.firefoxPreparing && (
                  <button
                    type="button"
                    className={recorderButton}
                    disabled={!!busy || !firefoxAvailable}
                    onClick={() => void recorder.openFirefox()}
                  >
                    {text('Open Firefox', 'Abrir Firefox')}
                  </button>
                )}
              </>
            )}
            {!!state.tlsFailures && (
              <span className="text-amber-300">
                {text('TLS connection failures: ', 'Fallos de conexión TLS: ')}
                {state.tlsFailures}
              </span>
            )}
          </div>
        )}
        {!!state.upstreamTLSFailures && (
          <p
            role="alert"
            className="rounded-md border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-300"
          >
            {text(
              'Relampo could not establish a trusted TLS connection to the application server. Check the server certificate and its issuing CA. Firefox recorder certificate preparation is separate.',
              'Relampo no pudo establecer una conexión TLS de confianza con el servidor de la aplicación. Revisa el certificado del servidor y su CA emisora. La preparación del certificado del grabador en Firefox es independiente.',
            )}
          </p>
        )}
        {state.active && (
          <button
            type="button"
            className={recorderButton + ' border-yellow-400/30 text-yellow-300'}
            onClick={() => {
              if (!openHTTPRecordingControls(language))
                setError(text('Allow the recording control popup.', 'Permite el popup de control.'));
            }}
          >
            <ControlsIcon className="h-4 w-4" />
            {text('Open recording controls', 'Abrir control de grabación')}
          </button>
        )}
        {canRetrySave && (
          <label className="block space-y-2 text-sm">
            {text('Retry output path', 'Ruta para reintentar el guardado')}
            <input
              aria-label="Retry output path"
              className={recorderInput}
              value={options.output}
              onChange={e => update({ output: e.target.value })}
            />
          </label>
        )}
        <HTTPRecorderSettings
          options={options}
          onChange={update}
          disabled={state.active || !!busy}
          language={language}
        />
        {state.savedPath && (
          <section className="space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-300">
              {text('Recording saved on your computer', 'Grabación guardada en tu PC')}
            </p>
            <p
              role="status"
              className="break-all font-mono text-xs text-zinc-300"
            >
              {state.savedPath}
            </p>
            {state.totalRequests === 0 && (
              <p className="text-sm text-amber-300">
                {text(
                  'No requests were captured. This YAML contains no recorded business flow.',
                  'No se capturaron requests. Este YAML no contiene un flujo de negocio grabado.',
                )}
              </p>
            )}
            <button
              type="button"
              className={recorderButton + ' border-yellow-400/30 text-yellow-300'}
              disabled={opening}
              onClick={() => void openSaved()}
            >
              <ExternalLink className="h-4 w-4" />
              {text('Open saved script in Studio', 'Abrir script guardado en Studio')}
            </button>
            <p className="text-xs text-zinc-500">
              {text(
                'Review dynamic values in Studio before replaying your flow.',
                'Revisa los valores dinámicos en Studio antes de ejecutar tu flujo.',
              )}
            </p>
            <HTTPDynamicReview
              key={state.savedPath}
              language={language}
            />
          </section>
        )}
        <HTTPRecorderRequests
          key={state.startedAt || 'idle'}
          rows={state.requests || []}
          total={state.totalRequests}
          responses={state.responses ?? options.responses}
          language={language}
          transactionsEnabled={state.transactionsEnabled}
        />
      </div>
    </RecorderShell>
  );
}
