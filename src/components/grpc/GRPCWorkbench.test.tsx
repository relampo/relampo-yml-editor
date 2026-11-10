import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GRPCWorkbench } from './GRPCWorkbench';
import * as api from '../../utils/grpcApi';
vi.mock('../../utils/grpcApi', () => ({ grpcRequest: vi.fn(), grpcBundleURL: () => '/bundle' }));
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
