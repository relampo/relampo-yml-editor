import { useState } from 'react';
import { Eye, EyeOff, MousePointer2 } from 'lucide-react';
import type { HTTPRecordedRow, HTTPRecordingPreview } from '../../utils/httpRecorderApi';
export function HTTPRecorderExchangeDetails({
  row,
  preview,
  error,
  responses,
  language,
  showSensitive,
  onToggleSensitive,
}: {
  row?: HTTPRecordedRow;
  preview: HTTPRecordingPreview | null;
  error: string;
  responses: boolean;
  language: string;
  showSensitive: boolean;
  onToggleSensitive?: () => void;
}) {
  const [tab, setTab] = useState<'request' | 'response'>('request'),
    [part, setPart] = useState<'overview' | 'body' | 'headers' | 'parameters'>('overview');
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const exchange = preview?.[tab] as { headers?: unknown; body?: unknown } | undefined;
  let parameters: [string, string][] = [];
  try {
    parameters = Array.from(new URL(preview?.url || row?.url || '').searchParams.entries());
  } catch {
    /* Await a selected URL. */
  }
  const value = part === 'parameters' ? parameters : part === 'overview' ? undefined : exchange?.[part];
  const headers = exchange?.headers && typeof exchange.headers === 'object' ? Object.entries(exchange.headers) : [];
  const body = exchange?.body;
  const bodyMissing = body === '' || body === null || body === undefined;
  const bodyContent =
    tab === 'response' && !responses ? (
      <p className="text-xs text-zinc-400">
        {text(
          'Response bodies were not captured. Enable Capture responses before starting a new recording.',
          'No se capturaron cuerpos de respuesta. Activa Capturar respuestas antes de iniciar otra grabación.',
        )}
      </p>
    ) : bodyMissing ? (
      <p className="text-xs text-zinc-400">
        {tab === 'request'
          ? text('This request has no body.', 'Este request no tiene cuerpo.')
          : text('This response has no body.', 'Esta respuesta no tiene cuerpo.')}
      </p>
    ) : (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-zinc-300">
        {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
      </pre>
    );
  const headerContent = headers.length ? (
    <dl className="space-y-1 text-xs">
      {headers.map(([name, headerValue]) => (
        <div
          key={name}
          className="grid grid-cols-[minmax(90px,1fr)_2fr] gap-3 border-b border-white/5 py-1"
        >
          <dt className="break-all font-medium text-zinc-300">{name}</dt>
          <dd className="whitespace-pre-wrap break-all font-mono text-zinc-300">
            {Array.isArray(headerValue) ? headerValue.join('\n') : String(headerValue)}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className="text-xs text-zinc-400">{text('No headers captured.', 'No se capturaron headers.')}</p>
  );
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
          <div className="flex shrink-0 flex-wrap gap-1 border-b border-white/5 px-3 py-2">
            {(['overview', 'body', 'headers', ...(tab === 'request' ? (['parameters'] as const) : [])] as const).map(
              value => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setPart(value)}
                  className={
                    'rounded px-2 py-1 text-xs ' +
                    (part === value ? 'bg-white/10 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300')
                  }
                >
                  {value === 'overview'
                    ? text('Overview', 'Resumen')
                    : value === 'body'
                      ? 'Body'
                      : value === 'headers'
                        ? 'Headers'
                        : text('Parameters', 'Parámetros')}
                </button>
              ),
            )}
            {onToggleSensitive && (
              <button
                type="button"
                aria-pressed={showSensitive}
                onClick={onToggleSensitive}
                className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
              >
                {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSensitive
                  ? text('Mask sensitive data', 'Enmascarar datos sensibles')
                  : text('Show full content', 'Mostrar contenido completo')}
              </button>
            )}
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
            {preview?.webSocket && (
              <div className="mb-4 space-y-2 text-xs text-zinc-300">
                <h3 className="font-semibold text-yellow-300">
                  WebSocket · {preview.webSocket.subprotocol || text('Messages', 'Mensajes')}
                </h3>
                {preview.webSocket.messages.map((message, index) => (
                  <div
                    key={index}
                    className="rounded border border-white/10 p-2"
                  >
                    <p>
                      {index + 1} ·{' '}
                      {message.direction === 'client_to_server'
                        ? text('Sent', 'Enviado')
                        : text('Received', 'Recibido')}{' '}
                      · {message.type} · {message.sizeBytes} B
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
                      {message.payloadBase64 ??
                        (typeof message.payload === 'string'
                          ? message.payload
                          : JSON.stringify(message.payload, null, 2))}
                    </pre>
                  </div>
                ))}
                <p>
                  {text('Close code', 'Código de cierre')}: {preview.webSocket.closeCode}{' '}
                  {preview.webSocket.closeReason}
                </p>
                {preview.webSocket.incomplete && <p className="text-amber-300">{preview.webSocket.incompleteReason}</p>}
              </div>
            )}
            {part === 'overview' ? (
              <div className="space-y-4">
                <div className="text-xs text-zinc-300">
                  {tab === 'request'
                    ? text('Method', 'Método') + ': ' + (preview?.method || row.method)
                    : text('Status', 'Estado') + ': ' + (preview?.status ?? row.status)}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-zinc-300">Headers</h3>
                  {headerContent}
                </div>
                {tab === 'request' && parameters.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-zinc-300">{text('Parameters', 'Parámetros')}</h3>
                    <dl className="space-y-1 text-xs text-zinc-300">
                      {parameters.map(([name, parameterValue], index) => (
                        <div
                          key={index}
                          className="flex gap-3"
                        >
                          <dt>{name}</dt>
                          <dd className="break-all font-mono">{parameterValue}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-zinc-300">Body</h3>
                  {preview || (tab === 'response' && !responses)
                    ? bodyContent
                    : !error && text('Loading…', 'Cargando…')}
                </div>
              </div>
            ) : part === 'body' && preview ? (
              bodyContent
            ) : part === 'headers' && preview ? (
              headerContent
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
