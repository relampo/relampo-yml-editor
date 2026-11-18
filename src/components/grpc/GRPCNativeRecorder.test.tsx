import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { GRPCNativeRecorder } from './GRPCNativeRecorder';
import { grpcRequest } from '../../utils/grpcApi';
vi.mock('../../utils/grpcApi', () => ({ grpcRequest: vi.fn() }));
it('opens the captured request, response, metadata and trailers for a native call', async () => {
  vi.mocked(grpcRequest).mockResolvedValue({
    method: '/demo.Order/Watch',
    request: { metadata: { authorization: ['fixture'] }, body: { orderId: 12 } },
    response: {
      metadata: { 'content-type': ['application/grpc'] },
      trailers: { 'x-end': ['finished'] },
      body: { state: 'ready' },
    },
    messages: [{ direction: 'server_to_client', message: { status: 'delivered' } }],
  });
  render(
    <GRPCNativeRecorder
      recording={{
        active: false,
        pending: true,
        calls: [
          {
            id: 0,
            method: '/demo.Order/Watch',
            type: 'server_streaming',
            status: 'OK',
            messages: 2,
            durationMs: 10,
            truncated: false,
          },
        ],
      }}
      listen="127.0.0.1:50052"
      onListenChange={vi.fn()}
      onStart={vi.fn()}
      onStop={vi.fn()}
      busy={false}
      canStart={false}
    />,
  );
  expect(screen.getByRole('button', { name: 'Start recording' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /demo.Order/ }));
  expect(await screen.findByText(/orderId/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByText(/finished/)).toBeInTheDocument();
  expect(screen.getByText(/delivered/)).toBeInTheDocument();
  expect(grpcRequest).toHaveBeenCalledWith('recordings/calls/0', undefined, expect.any(AbortSignal));
});
