import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GRPCWorkbench } from './GRPCWorkbench';
import * as api from '../../utils/grpcApi';
import { advance, lostAnswer } from '../../test/lostFrames';
vi.mock('../../utils/grpcApi', () => ({ grpcRequest: vi.fn(), grpcBundlePath: () => '/bundle' }));
const catalog = {
  descriptorSet: '',
  messages: { Request: { name: 'Request', fields: [{ name: 'name', type: 'string' }] } },
  services: [
    {
      name: 'demo.API',
      methods: [
        {
          name: 'Call',
          path: '/demo.API/Call',
          kind: 'unary',
          input: 'Request',
          output: 'Request',
          template: { name: '' },
        },
      ],
    },
  ],
};
describe('Studio gRPC workflow', () => {
  beforeEach(() => {
    vi.mocked(api.grpcRequest)
      .mockReset()
      .mockImplementation(async path => {
        if (path === 'recordings/current') return { active: false, calls: [] } as any;
        if (path === 'schema') return { id: 'schema', catalog, descriptorPath: 'schema.protoset' } as any;
        if (path === 'generate') return { id: 'bundle', yaml: 'generated-yaml', warnings: [] } as any;
        throw Error(path);
      });
  });
  it('returns directly to Studio without adding or discarding a draft', async () => {
    const close = vi.fn(),
      go = vi.fn(),
      add = vi.fn();
    await act(async () => {
      render(
        <GRPCWorkbench
          open
          onOpenChange={close}
          onGoToStudio={go}
          onAdd={add}
        />,
      );
    });
    fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'draft.example:443' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go to Studio' }));
    expect(close).toHaveBeenCalledWith(false);
    expect(go).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Server address')).toHaveValue('draft.example:443');
  });
  it('discovers a contract, edits a method and adds generated YAML', async () => {
    const add = vi.fn();
    render(
      <GRPCWorkbench
        open
        onOpenChange={() => {}}
        onAdd={add}
      />,
    );
    fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'host:443' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discover service' }));
    await screen.findByText('demo.API');
    fireEvent.click(screen.getByLabelText('Select Call'));
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate scenario' }));
    await screen.findByRole('button', { name: 'Add to scenario' });
    fireEvent.click(screen.getByRole('button', { name: 'Add to scenario' }));
    expect(add).toHaveBeenCalledWith('generated-yaml');
    await waitFor(() =>
      expect(api.grpcRequest).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({
          methods: [expect.objectContaining({ method: '/demo.API/Call', message: { name: 'Ada' } })],
        }),
        expect.anything(),
      ),
    );
  });
});

it('shows the protobuf response shape after discovery before any RPC execution', async () => {
  vi.mocked(api.grpcRequest).mockReset();
  vi.mocked(api.grpcRequest).mockImplementation(async path => {
    if (path === 'recordings/current') return { active: false, calls: [] } as any;
    if (path === 'schema')
      return {
        id: 'schema',
        catalog: {
          ...catalog,
          services: [
            {
              name: 'demo.API',
              methods: [
                { ...catalog.services[0].methods[0], output: 'Reply', responseTemplate: { token: '', expiresIn: 0 } },
              ],
            },
          ],
        },
      } as any;
    throw Error(path);
  });
  render(
    <GRPCWorkbench
      open
      onOpenChange={() => {}}
      onAdd={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'host:443' } });
  fireEvent.click(screen.getByRole('button', { name: 'Discover service' }));
  await screen.findByText('demo.API');
  fireEvent.click(screen.getByRole('tab', { name: 'Response' }));
  expect(screen.getByLabelText('Contract response template')).toHaveValue(
    JSON.stringify({ token: '', expiresIn: 0 }, null, 2),
  );
  expect(api.grpcRequest).not.toHaveBeenCalledWith('generate', expect.anything(), expect.anything());
});

// Contract 0.15, section 8, "Lost frames".
describe('when the relay loses a frame', () => {
  const recording = { active: true, listen: '127.0.0.1:50051', calls: [] };
  const mount = () =>
    render(
      <GRPCWorkbench
        open
        initialMode="record"
        onOpenChange={() => {}}
        onAdd={vi.fn()}
      />,
    );
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.grpcRequest).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up a state read after 10 seconds and reads again at the next tick', async () => {
    let reads = 0;
    vi.mocked(api.grpcRequest).mockImplementation((_path, _body, signal) =>
      ++reads === 2 ? lostAnswer(signal) : Promise.resolve(recording as any),
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

  it('reads the state after a start with no answer, and sends start one time', async () => {
    let active = false;
    const posts: string[] = [];
    vi.mocked(api.grpcRequest).mockImplementation(async (path, body) => {
      if (body === undefined) return (active ? recording : { active: false, calls: [] }) as any;
      // The agent did the work. Its answer did not arrive.
      posts.push(path);
      active = true;
      throw new TypeError('no answer');
    });
    mount();
    await advance(0);
    fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'host:443' } });

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
    await advance(0);

    expect(screen.getByText('Recording at 127.0.0.1:50051')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(posts).toEqual(['recordings']);
  });

  it('says that the script is lost after a stop with no answer', async () => {
    let active = true;
    const posts: string[] = [];
    vi.mocked(api.grpcRequest).mockImplementation(async (path, body) => {
      if (body === undefined) return (active ? recording : { active: false, calls: [] }) as any;
      posts.push(path);
      active = false;
      throw new TypeError('no answer');
    });
    mount();
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stop and review recording' }));
    await advance(0);

    expect(screen.getByRole('alert')).toHaveTextContent('The recording stopped, but its script did not arrive.');
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
    expect(posts).toEqual(['recordings/stop']);
  });
});
