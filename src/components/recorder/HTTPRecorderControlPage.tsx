import { useEffect, useState } from 'react';
import { CircleDot, Square, Tag, Layers, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { httpRecorderRequest, type HTTPRecordingState } from '../../utils/httpRecorderApi';
import { recorderCompactButton, recorderCompactInput } from './HTTPRecorderSettings';
import { returnToHTTPRecorderTab } from '../../utils/recorderTabs';
export function HTTPRecorderControlPage() {
  const { language, setLanguage } = useLanguage();
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [state, setState] = useState<HTTPRecordingState | null>(null),
    [prefix, setPrefix] = useState(''),
    [transaction, setTransaction] = useState(''),
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
    async function poll() {
      try {
        const value = await httpRecorderRequest<HTTPRecordingState>('current', undefined, controller.signal);
        if (!controller.signal.aborted) {
          if (value.active) seenActive = true;
          if (seenActive) setState(value);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
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
        <div className="space-y-2">
          {state.prefixEnabled && (
            <form
              className="rounded border border-white/10 bg-white/[0.02] p-2"
              onSubmit={e => {
                e.preventDefault();
                void action('prefix', { prefix });
              }}
            >
              <label
                htmlFor="recording-prefix"
                className="mb-1 flex items-center gap-1.5 text-zinc-300"
              >
                <Tag className="h-3 w-3 text-yellow-300" />
                Prefix
              </label>
              <div className="flex gap-1.5">
                <input
                  id="recording-prefix"
                  aria-label="Prefix"
                  className={recorderCompactInput}
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!!busy}
                  className={recorderCompactButton}
                  aria-label={text('Apply prefix', 'Aplicar prefix')}
                >
                  {text('Apply', 'Aplicar')}
                </button>
              </div>
              <p
                className="mt-1 truncate text-[11px] text-yellow-300"
                title={state.prefix || undefined}
              >
                {text('Active prefix: ', 'Prefix activo: ')}
                {state.prefix || '—'}
              </p>
            </form>
          )}
          {state.transactionsEnabled && (
            <section className="rounded border border-white/10 bg-white/[0.02] p-2">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void action('transaction', { action: 'start', name: transaction });
                }}
              >
                <label
                  htmlFor="recording-transaction"
                  className="mb-1 flex items-center gap-1.5 text-zinc-300"
                >
                  <Layers className="h-3 w-3 text-violet-300" />
                  {text('Transaction', 'Transacción')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="recording-transaction"
                    aria-label="Transaction name"
                    className={recorderCompactInput}
                    value={transaction}
                    disabled={!!state.transaction?.id}
                    onChange={e => setTransaction(e.target.value)}
                  />
                  {state.transaction?.id ? (
                    <button
                      type="button"
                      disabled={!!busy}
                      className={recorderCompactButton}
                      aria-label={text('End transaction', 'Terminar transacción')}
                      onClick={() => void action('transaction', { action: 'end' })}
                    >
                      {text('End', 'Terminar')}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!!busy || !transaction.trim()}
                      className={recorderCompactButton}
                      aria-label={text('Start transaction', 'Iniciar transacción')}
                    >
                      {text('Start', 'Iniciar')}
                    </button>
                  )}
                </div>
              </form>
              <p
                className="mt-1 truncate text-[11px] text-violet-300"
                title={state.transaction?.name || undefined}
              >
                {text('Active transaction: ', 'Transacción activa: ')}
                {state.transaction?.name || '—'}
              </p>
            </section>
          )}
          <div className="sticky bottom-0 space-y-1.5 bg-[#0a0a0a] py-1">
            {state.recording === false && (
              <>
                <p className="text-[11px] text-zinc-400">
                  {text(
                    'Ready. Capture starts when you press Record.',
                    'Todo listo. Pulsa Grabar para empezar a capturar.',
                  )}
                </p>
                <button
                  type="button"
                  disabled={!!busy}
                  className={
                    recorderCompactButton + ' w-full border-yellow-400/60 bg-yellow-400 text-black! hover:bg-yellow-300'
                  }
                  onClick={() => void action('record', {})}
                >
                  <CircleDot className="h-3 w-3" />
                  {text('Start recording', 'Grabar')}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={!!busy}
              className={
                recorderCompactButton + ' w-full border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20'
              }
              onClick={() => void action('stop', {})}
            >
              <Square className="h-3 w-3" />
              {busy === 'stop' ? text('Saving…', 'Guardando…') : text('Stop and save', 'Detener y guardar')}
            </button>
          </div>
          <details className="text-[11px] text-zinc-500">
            <summary className="cursor-pointer hover:text-zinc-300">{text('Help', 'Ayuda')}</summary>
            <div className="mt-1 space-y-1 leading-relaxed">
              <p>
                {text(
                  'Prefix names upcoming requests. Clear and apply to remove it.',
                  'El prefix nombra los próximos requests. Vacía y aplica para quitarlo.',
                )}
              </p>
              <p>
                {text(
                  'Transactions group requests until you end them. Changing prefix keeps the transaction open.',
                  'La transacción agrupa requests hasta terminarla. Cambiar el prefix la mantiene abierta.',
                )}
              </p>
              <p>
                {text(
                  'Closing this window keeps recording. Stop ends the active transaction and saves.',
                  'Cerrar esta ventana mantiene la grabación. Detener cierra la transacción activa y guarda.',
                )}
              </p>
            </div>
          </details>
        </div>
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
