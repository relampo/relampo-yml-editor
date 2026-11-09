import { PlugZap } from 'lucide-react';
export interface WebSocketEventMetrics {
  protocol?: string;
  operation?: string;
  protocol_status?: string;
  connection_latency_ms?: number;
  session_duration_ms?: number;
  correlated_latency_ms?: number;
  first_response_latency_ms?: number;
  messages_sent?: number;
  messages_received?: number;
  bytes_sent?: number;
  bytes_received?: number;
  receive_timeouts?: number;
  send_failures?: number;
  unexpected_disconnects?: number;
  buffer_overflows?: number;
  reconnect_attempts?: number;
}
export function WebSocketMetrics({ event }: { event: WebSocketEventMetrics }) {
  const timings: [string, number | undefined][] = [
    ['Connection time', event.connection_latency_ms],
    ['Send → response', event.correlated_latency_ms],
    ['First relevant response', event.first_response_latency_ms],
    ['Session duration', event.session_duration_ms],
  ];
  const counts: [string, number | undefined][] = [
    ['Messages sent', event.messages_sent],
    ['Messages received', event.messages_received],
    ['Bytes sent', event.bytes_sent],
    ['Bytes received', event.bytes_received],
    ['Receive timeouts', event.receive_timeouts],
    ['Send failures', event.send_failures],
    ['Unexpected disconnects', event.unexpected_disconnects],
    ['Buffer overflows', event.buffer_overflows],
    ['Reconnect attempts', event.reconnect_attempts],
  ];
  return (
    <section
      className="rounded-lg border border-violet-400/30 p-4 space-y-3"
      aria-label="WebSocket metrics"
    >
      <h4 className="text-violet-400 flex items-center gap-2 text-sm">
        <PlugZap size={16} />
        WebSocket · {event.operation || 'session'} · {event.protocol_status || '—'}
      </h4>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        {timings
          .filter(([, value]) => value !== undefined && value > 0)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="opacity-70">{label}</dt>
              <dd className="font-mono">{value!.toFixed(2)} ms</dd>
            </div>
          ))}
        {counts
          .filter(([, value]) => value !== undefined)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="opacity-70">{label}</dt>
              <dd className="font-mono">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
