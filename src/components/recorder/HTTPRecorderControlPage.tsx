import { useEffect, useState } from 'react';
import { CircleDot, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { timerRead, timerReadError } from '../../utils/agentTransport';
import { httpRecorderRequest, type HTTPRecordingState } from '../../utils/httpRecorderApi';
import { recorderCompactButton } from './HTTPRecorderSettings';
import { HTTPRecorderControls } from './HTTPRecorderControls';
import { returnToHTTPRecorderTab } from '../../utils/recorderTabs';
export function HTTPRecorderControlPage() {
  const { language, setLanguage } = useLanguage();
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [state, setState] = useState<HTTPRecordingState | null>(null),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    document.title = 'Relampo · Recording controls';
    const lang = new URLSearchParams(location.search).get('lang');
    if (lang === 'es' || lang === 'en') setLanguage(lang);
  }, [setLanguage]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let seenActive = !new URLSearchParams(location.search).has('waiting');
    const report = timerReadError(setError);
    async function poll() {
      try {
        const value = await timerRead(
          signal => httpRecorderRequest<HTTPRecordingState>('current', undefined, signal),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          if (value.active) seenActive = true;
          if (seenActive) setState(value);
          report();
        }
      } catch (cause) {
        if (!controller.signal.aborted) report(cause);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 500);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  async function action(path: string, body: unknown) {
    setBusy(path);
    setError('');
    try {
      const value = await httpRecorderRequest<HTTPRecordingState>(path, body);
      setState(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy('');
    }
  }
  return (
    <main className="flex min-h-full flex-col bg-[#0a0a0a] p-3 text-xs text-zinc-200">
      <header className="mb-3 flex items-start justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-xs font-semibold">
            <CircleDot className={`h-3.5 w-3.5 ${state?.recording ? 'text-red-400' : 'text-yellow-400'}`} />
            RELAMPO · {text('Recording controls', 'Control de grabación')}
          </h1>
          <p
            className="mt-1 text-[11px] text-zinc-400"
            aria-live="polite"
          >
            {state?.active
              ? `${state.recording === false ? text('Browser ready', 'Navegador listo') : text('Recording', 'Grabando')} · ${state.totalRequests} requests`
              : state?.savedPath
                ? text('Saved', 'Guardado')
                : state
                  ? text('No recording active', 'Sin grabación activa')
                  : text('Preparing recording…', 'Preparando grabación…')}
          </p>
        </div>
        <button
          type="button"
          className={recorderCompactButton}
          aria-label={text('Return to Recorder', 'Volver al Recorder')}
          title={text('Return to Recorder', 'Volver al Recorder')}
          onClick={() => {
            if (!returnToHTTPRecorderTab()) setError(text('Allow opening Recorder.', 'Permite abrir Recorder.'));
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Recorder
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="mb-2 break-words rounded border border-red-400/20 p-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {state?.active && (
        <HTTPRecorderControls
          state={state}
          busy={busy}
          language={language}
          stopLabel={busy === 'stop' ? text('Saving…', 'Guardando…') : text('Stop and save', 'Detener y guardar')}
          stopHelp={text(
            'Closing this window keeps recording. Stop ends the active transaction and saves.',
            'Cerrar esta ventana mantiene la grabación. Detener cierra la transacción activa y guarda.',
          )}
          onAction={action}
        />
      )}
      {state?.savedPath && (
        <p
          role="status"
          className="break-all rounded border border-emerald-400/20 bg-emerald-400/5 p-2 text-xs text-emerald-300"
        >
          {state.savedPath}
        </p>
      )}
    </main>
  );
}
