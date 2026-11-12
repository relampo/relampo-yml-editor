import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DistributedConnection } from './DistributedConnection';
const request = vi.hoisted(() => vi.fn());
vi.mock('../../utils/distributedApi', async original => ({
  ...(await original<typeof import('../../utils/distributedApi')>()),
  distributedRequest: request,
}));
const connected = { git_installed: true, cli_installed: true, authenticated: true, user: 'owner', max_nodes: 4 };
const catalog = {
  repositories: [
    { name: 'owner/first', url: 'https://github.com/owner/first', writable: true },
    { name: 'other/read', url: 'https://github.com/other/read', writable: false },
  ],
  namespaces: [{ id: 'owner', name: 'owner' }],
  has_more: false,
};
const connection = (status = connected) => ({ events: [{ type: 'connection', connection: status }] });
const repos = { events: [{ type: 'repositories', data: catalog }] };
const onRepository = vi.fn();
const onStatus = vi.fn();
function props() {
  return {
    provider: 'github' as const,
    host: 'gitlab.com',
    enabled: true,
    disabled: false,
    repository: '',
    onRepository,
    onStatus,
    es: true,
  };
}
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  vi.clearAllMocks();
  request.mockImplementation(async (path: string) => (path === 'requirements' ? connection() : repos));
});
afterEach(cleanup);
describe('distributed provider connection', () => {
  it('reuses a session and shows selectable repositories with read-only choices disabled', async () => {
    render(<DistributedConnection {...props()} />);
    await screen.findByText('Conectado · owner');
    const repo = await screen.findByRole('combobox', { name: 'Repositorio' });
    await waitFor(() => expect(screen.getByRole('option', { name: 'other/read (solo lectura)' })).toBeDisabled());
    expect(screen.queryByRole('textbox', { name: 'Buscar repositorios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar más repositorios' })).not.toBeInTheDocument();
    fireEvent.change(repo, { target: { value: 'owner/first' } });
    expect(onRepository).toHaveBeenLastCalledWith('owner/first');
    expect(request).not.toHaveBeenCalledWith('connect', expect.anything());
  });
  it('requires installed tools and never offers anonymous execution', async () => {
    request.mockResolvedValue(connection({ ...connected, git_installed: false, authenticated: false }));
    render(<DistributedConnection {...props()} />);
    await screen.findByText(/Instala/);
    expect(screen.queryByRole('button', { name: 'Conectar con GitHub' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Repositorio' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('starts authorization only on a click and presents the device instructions', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === 'requirements') return connection({ ...connected, authenticated: false });
      if (path === 'connect') return { id: 'auth-1' };
      return {
        status: 'running',
        connection: {
          ...connected,
          authenticated: false,
          code: 'ABCD-1234',
          verification_url: 'https://github.com/login/device',
        },
      };
    });
    render(<DistributedConnection {...props()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Conectar con GitHub' }));
    expect(await screen.findByText('ABCD-1234')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir autorización' })).toHaveAttribute(
      'href',
      'https://github.com/login/device',
    );
    expect(screen.getByRole('combobox', { name: 'Repositorio' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('run/auth-1/stop', {}));
  });
  it('creates a private repository only after explicit submission and selects it', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === 'requirements') return connection();
      if (path === 'create_repository')
        return {
          events: [
            {
              type: 'repository_created',
              data: { name: 'owner/relampo_new', url: 'https://github.com/owner/relampo_new', writable: true },
            },
          ],
        };
      return repos;
    });
    render(<DistributedConnection {...props()} />);
    const create = await screen.findByRole('button', { name: 'Crear repositorio' });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del repositorio' }), {
      target: { value: 'relampo_new' },
    });
    expect(request).not.toHaveBeenCalledWith('create_repository', expect.anything());
    expect(screen.getByText('relampo_', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre del repositorio' })).toHaveValue('new');
    fireEvent.click(screen.getByRole('button', { name: 'Crear y seleccionar' }));
    await waitFor(() => expect(onRepository).toHaveBeenLastCalledWith('owner/relampo_new'));
    expect(window.localStorage.getItem('relampo.studio.distributed.repository:github:github.com:owner')).toBe(
      'owner/relampo_new',
    );
    expect(request).toHaveBeenCalledWith('create_repository', { provider: 'github', name: 'new', namespace: 'owner' });
  });
  it('ignores a stale provider response after switching account provider', async () => {
    let resolve: (value: unknown) => void = () => {};
    request.mockImplementation((path: string, body: { provider: string }) => {
      if (path === 'requirements' && body.provider === 'github')
        return new Promise(r => {
          resolve = r;
        });
      if (path === 'requirements') return Promise.resolve(connection({ ...connected, user: 'gitlab-user' }));
      return Promise.resolve(repos);
    });
    const view = render(<DistributedConnection {...props()} />);
    await waitFor(() => expect(request).toHaveBeenCalled());
    view.rerender(
      <DistributedConnection
        {...props()}
        provider="gitlab"
      />,
    );
    await screen.findByText('Conectado · gitlab-user');
    resolve(connection());
    await waitFor(() => expect(screen.queryByText('Conectado · owner')).not.toBeInTheDocument());
    expect(onStatus).toHaveBeenLastCalledWith('gitlab:gitlab.com', expect.objectContaining({ user: 'gitlab-user' }));
  });
  it('loads every repository page automatically into the same selector', async () => {
    request.mockImplementation(async (path: string, body: { page?: number }) => {
      if (path === 'requirements') return connection();
      if (body.page === 1) return { events: [{ type: 'repositories', data: { ...catalog, has_more: true } }] };
      return {
        events: [
          {
            type: 'repositories',
            data: {
              repositories: [{ name: 'owner/last', writable: true, url: 'https://github.com/owner/last' }],
              namespaces: [],
              has_more: false,
            },
          },
        ],
      };
    });
    render(<DistributedConnection {...props()} />);
    expect(await screen.findByRole('option', { name: 'owner/last' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'owner/first' })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith('repositories', { provider: 'github', page: 2 }, expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: 'Cargar más repositorios' })).not.toBeInTheDocument();
  });
  it('restores the last writable repository for this account and remembers later choices', async () => {
    window.localStorage.setItem('relampo.studio.distributed.repository:github:github.com:owner', 'owner/last');
    request.mockImplementation(async (path: string) =>
      path === 'requirements'
        ? connection()
        : {
            events: [
              {
                type: 'repositories',
                data: {
                  ...catalog,
                  repositories: [
                    ...catalog.repositories,
                    { name: 'owner/last', writable: true, url: 'https://github.com/owner/last' },
                  ],
                },
              },
            ],
          },
    );
    function Controlled() {
      const [repository, setRepository] = useState('');
      return (
        <DistributedConnection
          {...props()}
          repository={repository}
          onRepository={setRepository}
        />
      );
    }
    render(<Controlled />);
    const selector = screen.getByRole('combobox', { name: 'Repositorio' });
    await waitFor(() => expect(selector).toHaveValue('owner/last'));
    fireEvent.change(selector, { target: { value: 'owner/first' } });
    expect(window.localStorage.getItem('relampo.studio.distributed.repository:github:github.com:owner')).toBe(
      'owner/first',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    await waitFor(() => expect(selector).toBeEnabled());
    expect(selector).toHaveValue('owner/first');
  });
  it('falls back to a writable repository when the remembered choice is read only', async () => {
    window.localStorage.setItem('relampo.studio.distributed.repository:github:github.com:owner', 'other/read');
    render(<DistributedConnection {...props()} />);
    await waitFor(() => expect(onRepository).toHaveBeenLastCalledWith('owner/first'));
  });
});
