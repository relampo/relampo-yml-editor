import { useEffect, useState } from 'react';
import { grpcRequest, type GRPCCallPreview, type GRPCRecording } from '../../utils/grpcApi';
const input = 'w-full h-8 rounded border border-white/10 bg-white/5 px-2 text-xs text-zinc-300';
const button = 'rounded border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40';
export function GRPCNativeRecorder({
  recording,
  listen,
  onListenChange,
  onStart,
  onStop,
  onDiscard,
  busy,
  canStart,
  language = 'en',
}: {
  recording: GRPCRecording;
  listen: string;
  onListenChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onDiscard?: () => void;
  busy: boolean;
  canStart: boolean;
  language?: string;
}) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [history, setHistory] = useState<GRPCRecording['calls']>([]),
    [selected, setSelected] = useState<number | null>(null),
    [detail, setDetail] = useState<GRPCCallPreview | null>(null),
    [error, setError] = useState('');
  const calls = Array.from(
    new Map([...history, ...recording.calls].map((call, index) => [call.id ?? index, call])).values(),
  ).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  useEffect(() => {
    if (recording.active && recording.calls.length === 0) {
      setHistory([]);
      setSelected(null);
      setDetail(null);
    }
  }, [recording.active, recording.calls.length]);
  useEffect(() => {
    if (selected === null) return;
    const abort = new AbortController();
    setDetail(null);
    setError('');
    grpcRequest<GRPCCallPreview>('recordings/calls/' + selected, undefined, abort.signal)
      .then(value => {
        if (!abort.signal.aborted) setDetail(value);
      })
      .catch(cause => {
        if (!abort.signal.aborted) setError(cause.message);
      });
    return () => abort.abort();
  }, [selected]);
  async function earlier() {
    try {
      const first = Math.min(...calls.filter(call => !call.active).map(call => call.id ?? 0));
      const page = await grpcRequest<GRPCRecording>('recordings/calls?before=' + first);
      setHistory(old => [...page.calls, ...old]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  return (
    <section className="space-y-3 rounded border border-white/10 bg-[#111111] p-3 text-xs text-zinc-300">
      <h3>{text('Client → Relampo recorder → gRPC service', 'Cliente → Grabador Relampo → Servicio gRPC')}</h3>
      <p>
        {text(
          'Point the client at the local recorder. Browser HTTPS recording does not capture internal native gRPC calls.',
          'Conecta el cliente al grabador local. Grabar HTTPS del navegador no captura llamadas gRPC nativas internas.',
        )}
      </p>
      <label className="block">
        {text('Local recorder address', 'Dirección del grabador local')}
        <input
          aria-label="Local recorder address"
          className={input}
          value={listen}
          disabled={recording.active}
          onChange={event => onListenChange(event.target.value)}
        />
      </label>
      {recording.active ? (
        <>
          <p>
            {text('Recording at', 'Grabando en')} {recording.listen}
          </p>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onStop}
          >
            {text('Stop and review recording', 'Detener y revisar grabación')}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy || !canStart}
          className={button}
          onClick={onStart}
        >
          {text('Start recording', 'Iniciar grabación')}
        </button>
      )}
      {!recording.active && recording.pending && !recording.generated && (
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={onStop}
        >
          {text('Retry preparing the recording', 'Reintentar preparar la grabación')}
        </button>
      )}
      {recording.pending && (
        <div className="flex items-center gap-3">
          <p>
            {text(
              'Add this recording to the Test Plan before starting another.',
              'Agrega esta grabación al plan antes de iniciar otra.',
            )}
          </p>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={onDiscard}
          >
            {text('Discard recording', 'Descartar grabación')}
          </button>
        </div>
      )}
      {calls.some(call => !call.active && (call.id ?? 0) > 0) &&
        Math.min(...calls.filter(call => !call.active).map(call => call.id ?? 0)) > 0 && (
          <button
            type="button"
            className={button}
            onClick={() => void earlier()}
          >
            {text('Load earlier calls', 'Cargar llamadas anteriores')}
          </button>
        )}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="max-h-96 overflow-auto">
          {calls.map((call, index) => (
            <button
              type="button"
              className={
                'block w-full border-b border-white/5 p-2 text-left ' +
                (selected === (call.id ?? index) ? 'bg-yellow-400/10' : '')
              }
              disabled={call.active}
              key={call.id ?? index}
              onClick={() => setSelected(call.id ?? index)}
            >
              {(call.id ?? index) + 1} · {call.method} · {call.type || 'unary'} · {call.messages}{' '}
              {text('messages', 'mensajes')} · {call.status}
            </button>
          ))}
        </div>
        <div className="min-w-0 max-h-96 overflow-auto">
          <h3>{text('Call details · request, response and metadata', 'Detalles · petición, respuesta y metadata')}</h3>
          {detail !== null ? (
            <div className="mt-2 space-y-3">
              <p>
                {detail.method} · {detail.status} · {detail.durationMs} ms
              </p>
              <div className="flex gap-2">
                {(['request', 'response'] as const).map(value => (
                  <button
                    type="button"
                    key={value}
                    className={button + (tab === value ? ' border-yellow-400 text-yellow-300' : '')}
                    onClick={() => setTab(value)}
                  >
                    {value === 'request' ? 'Request' : 'Response'}
                  </button>
                ))}
              </div>
              <h4>{text('Metadata / headers', 'Metadata / headers')}</h4>
              <pre className="whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(detail[tab].metadata, null, 2)}
              </pre>
              <h4>Body</h4>
              <pre className="whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(detail[tab].body, null, 2) ?? text('No message captured', 'Sin mensaje capturado')}
              </pre>
              {tab === 'response' && (
                <>
                  <h4>Trailers</h4>
                  <pre className="whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(detail.response.trailers, null, 2)}
                  </pre>
                </>
              )}
              {detail.messages
                ?.filter(
                  message =>
                    message.direction === (tab === 'request' ? 'send' : 'receive') ||
                    message.direction === (tab === 'request' ? 'client_to_server' : 'server_to_client'),
                )
                .map((message, index) => (
                  <div key={index}>
                    <h4>
                      {text('Message', 'Mensaje')} {message.sequence} · {message.atMs} ms · {message.sizeBytes} B
                    </h4>
                    <pre className="whitespace-pre-wrap break-all font-mono">
                      {message.payloadBase64 ?? JSON.stringify(message.message, null, 2)}
                    </pre>
                  </div>
                ))}
              {detail.statusMessage && <p>{detail.statusMessage}</p>}
            </div>
          ) : (
            <p>
              {text(
                'Select a completed call to inspect its messages, headers and trailers.',
                'Selecciona una llamada terminada para ver sus mensajes, headers y trailers.',
              )}
            </p>
          )}
        </div>
      </div>
      {recording.truncated && (
        <p className="text-amber-300">
          {text(
            'Capture limit reached. Forwarding continues; incomplete replay steps are disabled.',
            'Se alcanzó el límite de captura. El tráfico continúa; los pasos incompletos se deshabilitan.',
          )}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
