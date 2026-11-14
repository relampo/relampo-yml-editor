import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GRPCBrowserRecorder } from './GRPCBrowserRecorder';
import { grpcRequest } from '../../utils/grpcApi';
vi.mock('../../utils/grpcApi', () => ({ grpcRequest: vi.fn(), GRPC_BROWSER_CA_PATH: '/certificate' }));
const initial = {
  active: false,
  detected: 'none',
  requests: [],
  totalRequests: 0,
  counts: { http: 0, https: 0, grpcWeb: 0, grpcNative: 0 },
  tlsFailures: 0,
  grpcWebReplaySupported: false,
  firefoxAvailable: true,
};
beforeEach(() => {
  vi.mocked(grpcRequest).mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});
it('shows HTTP observation honestly and provides working Discovery and proto alternatives', async () => {
  const discover = vi.fn(),
    importProto = vi.fn();
  vi.mocked(grpcRequest).mockResolvedValue({
    ...initial,
    active: true,
    detected: 'http',
    totalRequests: 1,
    counts: { ...initial.counts, https: 1 },
    requests: [{ method: 'POST', url: 'https://example.test/login', protocol: 'https' }],
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={discover}
      onImport={importProto}
    />,
  );
  expect(await screen.findByText('No gRPC detected in browser traffic')).toBeInTheDocument();
  expect(screen.getByText(/does not reveal whether the server uses gRPC internally/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use Discovery' }));
  expect(discover).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Import .proto' }));
  expect(importProto).toHaveBeenCalledOnce();
  expect(screen.queryByText(/application does not use gRPC/i)).not.toBeInTheDocument();
});
it('waits for actual traffic, starts from an application URL and reports gRPC-Web support accurately', async () => {
  vi.mocked(grpcRequest).mockImplementation(async path => {
    if (path === 'browser-recordings/current') return initial as any;
    if (path === 'browser-recordings') return { ...initial, active: true, proxyAddress: '127.0.0.1:8888' } as any;
    throw Error(path);
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
    />,
  );
  await screen.findByLabelText('Application URL');
  fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start browser recording' }));
  expect(await screen.findByText('Waiting for browser traffic')).toBeInTheDocument();
  expect(grpcRequest).toHaveBeenCalledWith(
    'browser-recordings',
    expect.objectContaining({ applicationUrl: 'https://example.test' }),
    expect.anything(),
  );
});
it('does not offer unsupported gRPC-Web replay or fabricate captured requests', async () => {
  vi.mocked(grpcRequest).mockResolvedValue({
    ...initial,
    active: true,
    detected: 'grpc_web',
    totalRequests: 1,
    counts: { ...initial.counts, grpcWeb: 1 },
    requests: [{ method: 'POST', url: 'https://example.test/demo.API/Call', protocol: 'grpc_web' }],
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
    />,
  );
  expect(await screen.findByText('gRPC-Web detected')).toBeInTheDocument();
  expect(screen.getByText(/gRPC-Web script generation is not available yet/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /generate.*scenario/i })).not.toBeInTheDocument();
});

it('explains that Relampo manages the recording Firefox certificate automatically', async () => {
  vi.mocked(grpcRequest).mockResolvedValue({
    ...initial,
    active: true,
    proxyAddress: '127.0.0.1:8888',
    firefoxCertificateManaged: true,
    firefoxCertificateReady: false,
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
    />,
  );
  expect(
    await screen.findByText(/Relampo automatically prepares and verifies the recorder certificate/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/import this certificate in Firefox Settings/i)).not.toBeInTheDocument();
});
