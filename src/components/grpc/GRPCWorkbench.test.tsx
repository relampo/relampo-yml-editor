import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GRPCWorkbench } from './GRPCWorkbench';
import * as api from '../../utils/grpcApi';
import { persistEmbeddedRecordingFiles } from '../../utils/embeddedFileStorage';
vi.mock('../../utils/embeddedFileStorage', () => ({ persistEmbeddedRecordingFiles: vi.fn() }));
import { advance, lostAnswer } from '../../test/lostFrames';
import { InFrontWhen } from '../../contexts/InFrontContext';
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

  it('reads nothing while the view is hidden, and reads at once when it is in front again', async () => {
    // Contract 0.18: a hidden view sends no frame.
    let reads = 0;
    vi.mocked(api.grpcRequest).mockImplementation(() => {
      reads++;
      return Promise.resolve(recording as any);
    });
    const noop = vi.fn();
    const view = (shown: boolean) => (
      <InFrontWhen shown={shown}>
        <GRPCWorkbench
          open
          initialMode="record"
          onOpenChange={noop}
          onAdd={noop}
        />
      </InFrontWhen>
    );
    const { rerender, unmount } = render(view(true));
    await advance(0);
    await advance(1000);
    expect(reads).toBe(2);

    rerender(view(false));
    await advance(60_000);
    expect(reads).toBe(2);

    rerender(view(true));
    await advance(0);
    expect(reads).toBe(3);
    // The dialog closes on the fake clock, so no timer of it is left for later.
    unmount();
    await advance(0);
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

  // Contract 0.16: the agent keeps the last script in `generated` after a stop.
  it.each([
    ['takes the script from the state', { id: 'bundle', yaml: 'recorded-yaml', warnings: [] }],
    ['says that the script is lost when the state has none', undefined],
    ['says that the script is lost when the state has an empty one', { id: 'bundle', yaml: '', warnings: [] }],
  ])('after a stop with no answer, %s', async (_name, generated) => {
    let active = true;
    const posts: string[] = [];
    vi.mocked(api.grpcRequest).mockImplementation(async (path, body) => {
      if (body === undefined) return (active ? recording : { active: false, calls: [], generated }) as any;
      posts.push(path);
      active = false;
      throw new TypeError('no answer');
    });
    mount();
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stop and review recording' }));
    await advance(0);

    if (generated?.yaml) {
      expect(screen.getByText('recorded-yaml')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('alert')).toHaveTextContent('The recording stopped, but its script did not arrive.');
      expect(screen.queryByText('Preview generated YAML')).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
    expect(posts).toEqual(['recordings/stop']);
  });
});

it('keeps three imported operations selected when the third request has no fields', async () => {
  const methods = [
    { ...catalog.services[0].methods[0], name: 'StartSession', path: '/tienda.v1.TiendaService/StartSession' },
    { ...catalog.services[0].methods[0], name: 'ListProducts', path: '/tienda.v1.TiendaService/ListProducts' },
    {
      ...catalog.services[0].methods[0],
      name: 'CreateCart',
      path: '/tienda.v1.TiendaService/CreateCart',
      input: 'Empty',
      template: {},
    },
  ];
  vi.mocked(api.grpcRequest)
    .mockReset()
    .mockImplementation(async path => {
      if (path === 'recordings/current') return { active: false, calls: [] } as any;
      if (path === 'schema')
        return {
          id: 'tienda-schema',
          descriptorPath: 'tienda.protoset',
          catalog: {
            ...catalog,
            messages: { ...catalog.messages, Empty: { name: 'Empty', fields: null } },
            services: [{ name: 'tienda.v1.TiendaService', methods }],
          },
        } as any;
      if (path === 'generate') return { id: 'bundle', yaml: 'generated-yaml', warnings: [] } as any;
      throw Error(path);
    });
  render(
    <GRPCWorkbench
      open
      initialMode="import"
      onOpenChange={() => {}}
      onAdd={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Server address'), { target: { value: 'localhost:50051' } });
  const proto = new File(['syntax="proto3";'], 'tienda.proto', { type: 'text/plain' });
  fireEvent.change(screen.getByLabelText('Contract files'), { target: { files: [proto] } });
  await screen.findByLabelText('Select StartSession');
  fireEvent.click(screen.getByLabelText('Select StartSession'));
  fireEvent.change(screen.getByLabelText('name'), { target: { value: 'saved-session-data' } });
  fireEvent.click(screen.getByLabelText('Select ListProducts'));
  fireEvent.click(screen.getByLabelText('Select CreateCart'));
  expect(screen.getByText('This message has no fields. Nothing to fill in.')).toBeInTheDocument();
  for (const method of methods) expect(screen.getByLabelText('Select ' + method.name)).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Generate scenario' }));
  await waitFor(() =>
    expect(api.grpcRequest).toHaveBeenCalledWith(
      'generate',
      expect.objectContaining({
        methods: [
          expect.objectContaining({ method: methods[0].path, message: { name: 'saved-session-data' } }),
          expect.objectContaining({ method: methods[1].path }),
          expect.objectContaining({ method: methods[2].path, message: {} }),
        ],
      }),
      expect.anything(),
    ),
  );
});

describe('browser project import into a Test Plan', () => {
  const project = { id: 'web-project', yaml: 'test: {name: Browser calls}', warnings: [], privateEvidence: true };
  const assets = [{ path: '../Utilities/browser.protoset', data: 'ZGVzY3JpcHRvcg==' }];
  beforeEach(() => {
    vi.mocked(persistEmbeddedRecordingFiles).mockReset().mockResolvedValue();
    vi.mocked(api.grpcRequest)
      .mockReset()
      .mockImplementation(async path => {
        if (path === 'recordings/current') return { active: false, calls: [] } as any;
        if (path === 'browser-recordings/current')
          return {
            active: false,
            captureSupported: true,
            recordingPayloads: true,
            capturedCalls: 1,
            counts: { http: 0, https: 0, grpcWeb: 1, grpcNative: 0 },
            requests: [],
            detected: 'grpc_web',
            totalRequests: 1,
            tlsFailures: 0,
            grpcWebReplaySupported: true,
            firefoxAvailable: true,
          } as any;
        if (path === 'schema') return { id: 'contract', catalog } as any;
        if (path === 'browser-recordings/generate') return project as any;
        if (path === 'projects/web-project/recording-files')
          return {
            yaml: 'test: {name: Portable browser calls}',
            files: assets,
          } as any;
        throw Error(path);
      });
  });
  async function prepare(
    add: (yaml: string, afterSaved?: () => Promise<void>) => void,
    close: (open: boolean) => void,
  ) {
    render(
      <GRPCWorkbench
        open
        presentation="page"
        initialMode="record"
        browserRecordingEnabled
        onOpenChange={close}
        onAdd={add}
      />,
    );
    const input = await screen.findByLabelText('Recording contract');
    fireEvent.change(input, { target: { files: [new File(['syntax="proto3";'], 'shop.proto')] } });
    await screen.findByText('shop.proto', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: 'Generate recorded scenario' }));
    await screen.findByRole('button', { name: 'Add to scenario' });
    fireEvent.click(screen.getByRole('button', { name: 'Add to scenario' }));
  }
  it('persists the descriptor before importing the portable script', async () => {
    const add = vi.fn(),
      close = vi.fn();
    await prepare(add, close);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(persistEmbeddedRecordingFiles).toHaveBeenCalledWith(assets);
    expect(add).toHaveBeenCalledWith('test: {name: Portable browser calls}', expect.any(Function));
    expect(vi.mocked(persistEmbeddedRecordingFiles).mock.invocationCallOrder[0]).toBeLessThan(
      add.mock.invocationCallOrder[0],
    );
    expect(api.grpcRequest).not.toHaveBeenCalledWith('recordings/acknowledge', expect.anything());
  });
  it('keeps the project open when the Test Plan cannot save its contract', async () => {
    vi.mocked(persistEmbeddedRecordingFiles).mockRejectedValue(Error('Could not save recording files.'));
    const add = vi.fn(),
      close = vi.fn();
    await prepare(add, close);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save recording files.');
    expect(add).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add to scenario' })).toBeEnabled();
  });
});
