import { useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import type { HTTPRecordedRow, HTTPRecordingPreview } from '../../utils/httpRecorderApi';
export function HTTPRecorderExchangeDetails({
  row,
  preview,
  error,
  responses,
  language,
}: {
  row?: HTTPRecordedRow;
  preview: HTTPRecordingPreview | null;
  error: string;
  responses: boolean;
  language: string;
}) {
  const [tab, setTab] = useState<'request' | 'response'>('request'),
    [part, setPart] = useState<'body' | 'headers' | 'parameters'>('body');
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const exchange = preview?.[tab] as { headers?: unknown; body?: unknown } | undefined;
  let parameters: Record<string, string> = {};
  try {
    parameters = Object.fromEntries(new URL(preview?.url || row?.url || '').searchParams.entries());
  } catch {
    /* Await a selected URL. */
  }
  const value = part === 'parameters' ? parameters : exchange?.[part];
  return (
    <section
      role="region"
      aria-label="Request details"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#111111]"
    >
      <div className="flex h-9 shrink-0 items-center border-b border-white/10 px-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {text('Request details', 'Detalle del request')}
      </div>
      {!row ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
          <MousePointer2 className="h-8 w-8 text-yellow-400/50" />
          <p className="text-sm">{text('Select a recorded request', 'Selecciona un request grabado')}</p>
          <p className="text-xs">
            {text('Inspect its request and response here.', 'Aquí verás su request y su respuesta.')}
          </p>
        </div>
      ) : (
        <>
          <div className="shrink-0 space-y-2 border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-yellow-300">#{String(row.id + 1).padStart(2, '0')}</span>
              <span className="font-mono text-emerald-300">{row.method}</span>
              <span className={row.status >= 400 ? 'text-red-300' : 'text-zinc-400'}>{row.status}</span>
              <span className="ml-auto font-mono text-zinc-500">{row.durationMs.toFixed(1)} ms</span>
            </div>
            <p className="break-all font-mono text-xs text-zinc-300">{preview?.url || row.url}</p>
          </div>
          <div className="flex shrink-0 gap-5 border-b border-white/10 px-4">
            {(['request', 'response'] as const).map(value => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  setTab(value);
                  if (value === 'response' && part === 'parameters') setPart('body');
                }}
                className={
                  'border-b-2 py-2 text-xs ' +
                  (tab === value
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200')
                }
              >
                {value === 'request' ? 'Request' : 'Response'}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-1 border-b border-white/5 px-3 py-2">
            {(['body', 'headers', ...(tab === 'request' ? (['parameters'] as const) : [])] as const).map(value => (
              <button
                type="button"
                key={value}
                onClick={() => setPart(value)}
                className={
                  'rounded px-2 py-1 text-xs ' +
                  (part === value ? 'bg-white/10 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300')
                }
              >
                {value === 'body' ? 'Body' : value === 'headers' ? 'Headers' : text('Parameters', 'Parámetros')}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {error && (
              <p
                role="alert"
                className="text-xs text-red-300"
              >
                {error}
              </p>
            )}
            {tab === 'response' && !responses ? (
              <p className="text-xs text-zinc-400">
                {text(
                  'Response bodies were not captured. Enable Capture responses before starting a new recording.',
                  'No se capturaron cuerpos de respuesta. Activa Capturar respuestas antes de iniciar otra grabación.',
                )}
              </p>
            ) : (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-zinc-300">
                {preview
                  ? typeof value === 'string'
                    ? value
                    : JSON.stringify(value ?? {}, null, 2)
                  : text('Loading…', 'Cargando…')}
              </pre>
            )}
          </div>
        </>
      )}
    </section>
  );
}
