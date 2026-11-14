import { useState } from 'react';
import { CircleDot, Square, Tag, Layers } from 'lucide-react';
import type { HTTPRecordingState } from '../../utils/httpRecorderApi';
import { recorderCompactButton, recorderCompactInput } from './HTTPRecorderSettings';

/**
 * The controls of an active recording: prefix, transaction, record and stop.
 * The standalone Studio shows them in a popup. Inside the web app they are a
 * view in the frame, because Studio opens no window of its own there.
 */
export function HTTPRecorderControls({
  state,
  busy,
  language,
  stopLabel,
  stopHelp,
  onAction,
}: {
  state: HTTPRecordingState;
  busy: string;
  language: string;
  stopLabel: string;
  stopHelp: string;
  onAction: (path: string, body: unknown) => Promise<unknown>;
}) {
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [prefix, setPrefix] = useState(''),
    [transaction, setTransaction] = useState('');
  return (
    <div className="space-y-2">
      {state.prefixEnabled && (
        <form
          className="rounded border border-white/10 bg-white/[0.02] p-2"
          onSubmit={e => {
            e.preventDefault();
            void onAction('prefix', { prefix });
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
              void onAction('transaction', { action: 'start', name: transaction });
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
                  onClick={() => void onAction('transaction', { action: 'end' })}
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
              onClick={() => void onAction('record', {})}
            >
              <CircleDot className="h-3 w-3" />
              {text('Start recording', 'Grabar')}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={!!busy}
          className={recorderCompactButton + ' w-full border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20'}
          onClick={() => void onAction('stop', {})}
        >
          <Square className="h-3 w-3" />
          {stopLabel}
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
          <p>{stopHelp}</p>
        </div>
      </details>
    </div>
  );
}
