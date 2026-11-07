import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WebSocketMetrics } from './WebSocketMetrics';
describe('WebSocket result metrics', () => {
  it('distinguishes connection, receive wait and correlated response timing', () => {
    render(
      <WebSocketMetrics
        event={{
          operation: 'receive',
          protocol_status: 'ok',
          messages_received: 3,
          connection_latency_ms: 2,
          correlated_latency_ms: 12,
          session_duration_ms: 4000,
          receive_timeouts: 1,
        }}
      />,
    );
    expect(screen.getByText('Send → response')).toBeInTheDocument();
    expect(screen.getByText('12.00 ms')).toBeInTheDocument();
    expect(screen.getByText('Messages received')).toBeInTheDocument();
    expect(screen.getByText('Receive timeouts')).toBeInTheDocument();
  });
});
