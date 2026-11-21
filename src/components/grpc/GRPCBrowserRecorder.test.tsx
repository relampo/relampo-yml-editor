import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRPCBrowserRecorder } from './GRPCBrowserRecorder';
import { grpcRequest } from '../../utils/grpcApi';
import { advance, lostAnswer } from '../../test/lostFrames';
import { InFrontWhen } from '../../contexts/InFrontContext';
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
it('explains when the installed CLI does not provide browser recording', async () => {
  vi.mocked(grpcRequest).mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
  render(<GRPCBrowserRecorder onDiscover={vi.fn()} onImport={vi.fn()} />);
  expect(await screen.findByRole('status')).toHaveTextContent('Browser recording requires a newer Relampo CLI.');
  expect(screen.queryByRole('button', { name: 'Start browser recording' })).not.toBeInTheDocument();
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

// Contract 0.15, section 8, "Lost frames".
describe('when the relay loses a frame', () => {
  const mount = () =>
    render(
      <GRPCBrowserRecorder
        onDiscover={vi.fn()}
        onImport={vi.fn()}
      />,
    );
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('gives up a state read after 10 seconds and reads again at the next tick', async () => {
    let reads = 0;
    vi.mocked(grpcRequest).mockImplementation((_path, _body, signal) =>
      ++reads === 2 ? lostAnswer(signal) : Promise.resolve({ ...initial, active: true, totalRequests: reads } as any),
    );
    mount();
    await advance(0);
    await advance(1000);
    expect(reads).toBe(2);

    await advance(10_000);
    expect(screen.getByRole('alert')).toHaveTextContent('The machine did not answer in time.');

    await advance(1000);
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reads nothing while the view is hidden, and reads at once when it is in front again', async () => {
    // Contract 0.18: a hidden view sends no frame.
    let reads = 0;
    vi.mocked(grpcRequest).mockImplementation(() =>
      Promise.resolve({ ...initial, active: true, totalRequests: ++reads } as any),
    );
    const noop = vi.fn();
    const view = (shown: boolean) => (
      <InFrontWhen shown={shown}>
        <GRPCBrowserRecorder
          onDiscover={noop}
          onImport={noop}
        />
      </InFrontWhen>
    );
    const { rerender } = render(view(true));
    await advance(0);
    await advance(1000);
    expect(reads).toBe(2);

    rerender(view(false));
    await advance(60_000);
    expect(reads).toBe(2);

    rerender(view(true));
    await advance(0);
    expect(reads).toBe(3);
  });

  it('reads the state after a start and a stop with no answer, and sends each one time', async () => {
    let active = false;
    const posts: string[] = [];
    vi.mocked(grpcRequest).mockImplementation(async (path, body) => {
      if (body === undefined) return { ...initial, active } as any;
      // The agent did the work. Its answer did not arrive.
      posts.push(path);
      active = path === 'browser-recordings';
      throw new TypeError('no answer');
    });
    mount();
    await advance(0);
    fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://example.test' } });

    fireEvent.click(screen.getByRole('button', { name: 'Start browser recording' }));
    await advance(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stop browser recording' }));
    await advance(0);
    expect(screen.getByRole('button', { name: 'Start browser recording' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(posts).toEqual(['browser-recordings', 'browser-recordings/stop']);
  });

  it('shows the error of a start with no answer when the agent did not start', async () => {
    vi.mocked(grpcRequest).mockImplementation(async (_path, body) => {
      if (body === undefined) return initial as any;
      throw new TypeError('no answer');
    });
    mount();
    await advance(0);
    fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://example.test' } });

    fireEvent.click(screen.getByRole('button', { name: 'Start browser recording' }));
    await advance(0);

    expect(screen.getByRole('alert')).toHaveTextContent('no answer');
    expect(screen.getByRole('button', { name: 'Start browser recording' })).toBeEnabled();
  });
});

it('offers contract decoding only after a complete payload recording stops', async () => {
  vi.mocked(grpcRequest).mockResolvedValue({
    ...initial,
    captureSupported: true,
    recordingPayloads: true,
    capturedCalls: 3,
    pendingCalls: 0,
    detected: 'grpc_web',
    totalRequests: 3,
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
    />,
  );
  expect(await screen.findByLabelText('Recording contract')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate recorded scenario' })).toBeDisabled();
  expect(screen.getByText(/Captured calls: 3/)).toBeInTheDocument();
});

it('imports a recording contract, generates actual messages and hands the project to the save workflow', async () => {
  const generated = {
    id: 'recorded-project',
    warnings: [],
    yaml: 'grpc_defaults: {transport: grpc_web, target: https://shop.test}\nscenarios:\n- steps:\n  - grpc:\n      name: /shop.v1.API/CreateCart\n      message: {}\n      response: {status: OK, message: {cartId: actual-cart-from-server}}\n',
  };
  vi.mocked(grpcRequest).mockImplementation(async (path, body) => {
    if (path === 'browser-recordings/current')
      return { ...initial, captureSupported: true, recordingPayloads: true, capturedCalls: 1, pendingCalls: 0 } as any;
    if (path === 'schema') {
      expect(body).toMatchObject({ source: { files: { 'shop.proto': expect.any(String) } } });
      return { id: 'contract' } as any;
    }
    if (path === 'browser-recordings/generate') {
      expect(body).toEqual({ schemaId: 'contract' });
      return generated as any;
    }
    throw Error(path);
  });
  const onGenerated = vi.fn();
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
      onGenerated={onGenerated}
    />,
  );
  const contract = await screen.findByLabelText('Recording contract');
  fireEvent.change(contract, { target: { files: [new File(['syntax="proto3";'], 'shop.proto')] } });
  await screen.findByText('shop.proto', { exact: true });
  fireEvent.click(screen.getByRole('button', { name: 'Generate recorded scenario' }));
  expect(await screen.findByText('Recorded response')).toBeInTheDocument();
  expect(screen.getByText(/actual-cart-from-server/)).toBeInTheDocument();
  expect(onGenerated).toHaveBeenLastCalledWith(generated);
});

it('requests payload capture only when the backend advertises the capability', async () => {
  vi.mocked(grpcRequest).mockImplementation(async path => {
    if (path === 'browser-recordings/current') return { ...initial, captureSupported: true } as any;
    if (path === 'browser-recordings') return { ...initial, active: true, recordingPayloads: true } as any;
    throw Error(path);
  });
  render(
    <GRPCBrowserRecorder
      onDiscover={vi.fn()}
      onImport={vi.fn()}
    />,
  );
  await screen.findByLabelText('Recording contract');
  fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://shop.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start browser recording' }));
  await screen.findByRole('button', { name: 'Stop browser recording' });
  expect(grpcRequest).toHaveBeenCalledWith(
    'browser-recordings',
    expect.objectContaining({ capture: true }),
    expect.anything(),
  );
});
