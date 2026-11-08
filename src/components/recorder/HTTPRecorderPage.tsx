import { useEffect, useState } from 'react';
import { CircleDot, ExternalLink, Play, Square, Tag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { validateSavedEditorURL } from '../../utils/recorderTabs';
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
    { options, update, state, error, setError, busy, ready, firefoxAvailable } = recorder;
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#111111] p-4">
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
                (options.openFirefox && !firefoxAvailable)
              }
              className={recorderButton + ' border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300'}
              onClick={() => void recorder.start()}
            >
              <Play className="h-4 w-4" />
              {options.openFirefox
                ? text('Start recording and open Firefox', 'Iniciar grabación y abrir Firefox')
                : text('Start recording', 'Iniciar grabación')}
            </button>
          )}
        </div>
        {!state.active && !canRetrySave && (
          <fieldset
            disabled={!!busy}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="block space-y-2 text-xs font-semibold text-zinc-400">
              {text('Application URL', 'URL de la aplicación')}
              <input
                aria-label="Application URL"
                type="url"
                placeholder="https://my-app.example"
                className={recorderInput}
                value={options.applicationUrl}
                onChange={e => {
                  const applicationUrl = e.target.value;
                  let baseUrls = options.baseUrls;
                  try {
                    const old = options.applicationUrl ? new URL(options.applicationUrl).origin : '';
                    if (baseUrls === '' || baseUrls === old) baseUrls = new URL(applicationUrl).origin;
                  } catch {
                    /* Keep custom domains until a URL is valid. */
                  }
                  update({ applicationUrl, baseUrls });
                }}
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold text-zinc-400">
              {text('Output YAML file', 'Archivo YAML de salida')}
              <input
                aria-label="Output YAML file"
                className={recorderInput + ' font-mono'}
                value={options.output}
                onChange={e => update({ output: e.target.value })}
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold text-zinc-400">
              {text('Initial prefix (optional)', 'Prefix inicial (opcional)')}
              <input
                aria-label="Initial prefix"
                className={recorderInput}
                value={options.prefix}
                placeholder="Login"
                onChange={e => update({ prefix: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                className="accent-yellow-400"
                type="checkbox"
                checked={options.responses}
                onChange={e => update({ responses: e.target.checked })}
              />
              {text('Capture responses for correlation', 'Capturar respuestas para correlación')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                className="accent-yellow-400"
                type="checkbox"
                checked={options.openFirefox}
                onChange={e => update({ openFirefox: e.target.checked })}
              />
              {text('Configure and open Firefox automatically', 'Configurar y abrir Firefox automáticamente')}
            </label>
            {!firefoxAvailable && ready && options.openFirefox && (
              <p className="text-sm text-amber-300 md:col-span-2">
                {text(
                  'Firefox is not installed on this computer. Install it to use automatic recording, or select another client.',
                  'Firefox no está instalado en esta PC. Instálalo para usar la grabación automática, o selecciona otro cliente.',
                )}
              </p>
            )}
          </fieldset>
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
        {state.active && (
          <form
            className="flex flex-wrap items-end gap-3 rounded-lg border border-yellow-400/15 bg-yellow-400/5 p-4"
            onSubmit={event => {
              event.preventDefault();
              void recorder.applyPrefix();
            }}
          >
            <label className="block flex-1 space-y-2 text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-yellow-400" />
                {text('Prefix for upcoming requests', 'Prefix para los próximos requests')}
              </span>
              <input
                aria-label="Prefix"
                className={recorderInput}
                value={options.prefix}
                placeholder="Login / Select seats"
                onChange={e => update({ prefix: e.target.value })}
              />
            </label>
            <button
              type="submit"
              disabled={!!busy}
              className={recorderButton}
            >
              {text('Apply prefix', 'Aplicar prefix')}
            </button>
            <p className="w-full text-xs text-yellow-300">
              {text('Active prefix: ', 'Prefix activo: ')}
              {state.prefix || '—'}
            </p>
            <p className="w-full text-xs text-zinc-500">
              {text(
                'Apply before performing the action in Firefox. Previous requests keep their prefix. Clear and apply to stop adding a prefix.',
                'Aplica antes de realizar la acción en Firefox. Los requests anteriores conservan su prefix. Vacía y aplica para dejar de añadirlo.',
              )}
            </p>
          </form>
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
          </section>
        )}
        <HTTPRecorderRequests
          key={state.startedAt || 'idle'}
          rows={state.requests || []}
          total={state.totalRequests}
          responses={state.responses ?? options.responses}
          language={language}
        />
      </div>
    </RecorderShell>
  );
}
