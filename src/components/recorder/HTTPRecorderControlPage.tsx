import { useEffect, useState } from 'react';
import { CircleDot, Square, Tag, Layers, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { httpRecorderRequest, type HTTPRecordingState } from '../../utils/httpRecorderApi';
import { recorderButton, recorderInput } from './HTTPRecorderSettings';
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
    <main className="h-full overflow-y-auto bg-[#0a0a0a] p-5 pb-24 text-zinc-200">
      <header className="mb-5 border-b border-white/10 pb-4">
        <h1 className="flex items-center gap-2 font-bold">
          <CircleDot className="h-4 w-4 text-red-400" />
          RELAMPO · {text('Recording controls', 'Control de grabación')}
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          {state?.active
            ? `${state.totalRequests} requests`
            : state?.savedPath
              ? text('Saved', 'Guardado')
              : text('Preparing recording…', 'Preparando grabación…')}
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded border border-red-400/20 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {state?.active && (
        <div className="space-y-5">
          {state.prefixEnabled && (
            <form
              className="space-y-3 rounded-md border border-yellow-400/20 bg-yellow-400/5 p-4"
              onSubmit={e => {
                e.preventDefault();
                void action('prefix', { prefix });
              }}
            >
              <label className="block space-y-2 text-sm">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-yellow-300" />
                  Prefix
                </span>
                <input
                  aria-label="Prefix"
                  className={recorderInput}
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={!!busy}
                className={recorderButton}
              >
                {text('Apply prefix', 'Aplicar prefix')}
              </button>
              <p className="break-all text-xs text-yellow-300">
                {text('Active prefix: ', 'Prefix activo: ')}
                {state.prefix || '—'}
              </p>
              <p className="text-xs text-zinc-500">
                {text(
                  'Names upcoming requests. Clear and apply to remove it.',
                  'Nombra los próximos requests. Vacía y aplica para quitarlo.',
                )}
              </p>
            </form>
          )}
          {state.transactionsEnabled && (
            <section className="space-y-3 rounded-md border border-violet-400/20 bg-violet-400/5 p-4">
              <form
                className="space-y-3"
                onSubmit={e => {
                  e.preventDefault();
                  void action('transaction', { action: 'start', name: transaction });
                }}
              >
                <label className="block space-y-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-300" />
                    {text('Transaction name', 'Nombre de transacción')}
                  </span>
                  <input
                    aria-label="Transaction name"
                    className={recorderInput}
                    value={transaction}
                    disabled={!!state.transaction?.id}
                    onChange={e => setTransaction(e.target.value)}
                  />
                </label>
                {state.transaction?.id ? (
                  <button
                    type="button"
                    disabled={!!busy}
                    className={recorderButton}
                    onClick={() => void action('transaction', { action: 'end' })}
                  >
                    {text('End transaction', 'Terminar transacción')}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!!busy || !transaction.trim()}
                    className={recorderButton}
                  >
                    {text('Start transaction', 'Iniciar transacción')}
                  </button>
                )}
              </form>
              <p className="break-all text-xs text-violet-300">
                {text('Active transaction: ', 'Transacción activa: ')}
                {state.transaction?.name || '—'}
              </p>
              <p className="text-xs text-zinc-500">
                {text(
                  'Groups requests in a transaction controller until you end it. Changing prefix does not close this transaction.',
                  'Agrupa requests en un controlador hasta terminarla. Cambiar el prefix no cierra esta transacción.',
                )}
              </p>
            </section>
          )}
          <button
            type="button"
            className={
              recorderButton +
              ' fixed bottom-4 left-5 right-5 z-30 border-red-400/40 bg-[#321313] py-3 text-red-200 shadow-xl'
            }
            disabled={!!busy}
            onClick={() => void action('stop', {})}
          >
            <Square className="h-4 w-4" />
            {busy === 'stop' ? text('Saving…', 'Guardando…') : text('Stop and save', 'Detener y guardar')}
          </button>
          <p className="text-xs text-zinc-500">
            {text(
              'Closing this window does not stop recording. Stop closes the active transaction and saves the script.',
              'Cerrar esta ventana no detiene la grabación. Stop cierra la transacción activa y guarda el script.',
            )}
          </p>
        </div>
      )}
      {state?.savedPath && (
        <p
          role="status"
          className="break-all rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-300"
        >
          {state.savedPath}
        </p>
      )}
      <button
        type="button"
        className={recorderButton + ' mt-5 w-full'}
        onClick={() => {
          if (!returnToHTTPRecorderTab()) setError(text('Allow opening Recorder.', 'Permite abrir Recorder.'));
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        {text('Return to Recorder', 'Volver al Recorder')}
      </button>
    </main>
  );
}
