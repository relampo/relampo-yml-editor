import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GRPCRequestMetrics } from './GRPCRequestMetrics';
import type { RunRequestStat } from '../../utils/runApi';
const base: RunRequestStat = {
  name: 'Watch',
  method: 'GRPC',
  path: '/demo.API/Watch',
  count: 1,
  failures: 0,
  avg_ms: 2,
  min_ms: 2,
  max_ms: 2,
  p90_ms: 2,
  p95_ms: 2,
};
describe('GRPCRequestMetrics', () => {
  it('shows gRPC OK and stream metrics without inventing unmatched RTT', () => {
    const histogram = { count: 1, average: 10, p95_upper: 16 };
    render(
      <GRPCRequestMetrics
        request={{
          ...base,
          protocol: 'grpc',
          protocol_status: 'OK',
          stream_type: 'server_streaming',
          messages_sent: 1,
          messages_received: 3,
          grpc_timing: {
            duration_ms: histogram,
            first_response_ms: histogram,
            message_latency_ms: { count: 0, average: 0, p95_upper: 0 },
            sent_size_bytes: histogram,
            received_size_bytes: histogram,
          },
        }}
      />,
    );
    expect(screen.getByText('OK · server_streaming')).toBeTruthy();
    expect(screen.getByText(/Messages ↑ 1 ↓ 3/)).toBeTruthy();
    expect(screen.getByText(/First response:/)).toBeTruthy();
    expect(screen.queryByText(/Matched message RTT:/)).toBeNull();
  });
  it('does not add protocol details to HTTP requests', () => {
    const { container } = render(<GRPCRequestMetrics request={base} />);
    expect(container.textContent).toBe('');
  });
});
