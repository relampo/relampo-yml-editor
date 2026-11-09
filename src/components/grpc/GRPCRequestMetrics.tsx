import type { RunRequestStat } from '../../utils/runApi';
export function GRPCRequestMetrics({ request }: { request: RunRequestStat }) {
  if (request.protocol !== 'grpc') return null;
  const timing = request.grpc_timing;
  const ms = (value: number) => `${value.toFixed(2)} ms`;
  return (
    <div className="mt-1 space-y-1 whitespace-normal text-[11px] text-cyan-300">
      <div>
        {request.protocol_status ?? 'gRPC'}
        {request.stream_type && ` · ${request.stream_type}`}
      </div>
      {request.grpc_status_counts && (
        <div>
          {Object.entries(request.grpc_status_counts)
            .map(([code, count]) => `${code}: ${count}`)
            .join(' · ')}
        </div>
      )}
      {request.stream_type && (
        <div>
          Messages ↑ {request.messages_sent ?? 0} ↓ {request.messages_received ?? 0} · Bytes ↑ {request.bytes_sent ?? 0}{' '}
          ↓ {request.bytes_received ?? 0}
        </div>
      )}
      {timing && (
        <>
          {timing.first_response_ms.count > 0 && (
            <div>
              First response: {ms(timing.first_response_ms.average)} avg · {ms(timing.first_response_ms.p95_upper)} p95
              upper bound
            </div>
          )}
          {timing.duration_ms.count > 0 && (
            <div>
              Stream duration: {ms(timing.duration_ms.average)} avg · {ms(timing.duration_ms.p95_upper)} p95 upper bound
            </div>
          )}
          {timing.message_latency_ms.count > 0 && (
            <div>
              Matched message RTT: {ms(timing.message_latency_ms.average)} avg ·{' '}
              {ms(timing.message_latency_ms.p95_upper)} p95 upper bound
            </div>
          )}
          {!!timing.unmatched_messages && <div>Unmatched messages: {timing.unmatched_messages}</div>}
        </>
      )}
    </div>
  );
}
