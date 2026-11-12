import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLDistributedRun } from './YAMLDistributedRun';

const mocks = vi.hoisted(() => ({
  probe: vi.fn(),
  prepare: vi.fn(),
  request: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('../utils/debugApi', () => ({ probeStudio: mocks.probe }));
vi.mock('../utils/distributedApi', async original => ({
  ...(await original<typeof import('../utils/distributedApi')>()),
  prepareDistributed: mocks.prepare,
  distributedRequest: mocks.request,
  uploadDistributedFile: mocks.upload,
}));
const yaml = 'test:\n  name: qa\n';
const plan = {
  repository_exists: true,
  nodes: 2,
  users: 10,
  duration: '5s',
  max_nodes: 4,
  max_users: 500,
  max_duration: '1h',
  files: ['scenarios/test.yaml', 'scenarios/data/users.csv'],
};
const flush = vi.fn(() => yaml);
async function selectRepository() {
  const selector = screen.getByRole('combobox', { name: 'Repositorio' });
  await waitFor(() => expect(selector).toBeEnabled());
  fireEvent.change(selector, { target: { value: 'owner/repo' } });
}

function mount(code = yaml, enabled = true) {
  return render(
    <LanguageProvider>
      <YAMLDistributedRun
        enabled={enabled}
        yamlCode={code}
        flushPendingEdits={flush}
        documentReady
        validationErrors={[]}
      />
    </LanguageProvider>,
  );
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
  sessionStorage.clear();
  window.history.replaceState({}, '', '/?lang=es');
  mocks.probe.mockResolvedValue({ capabilities: { distributedRun: true } });
  mocks.upload.mockImplementation(async (file: File) => `.relampo/datasources/${file.name}`);
  mocks.prepare.mockResolvedValue({ repository: 'owner/repo', plan });
  mocks.request.mockImplementation(async (path: string) => {
    if (path === 'requirements')
      return {
        events: [
          {
            type: 'connection',
            connection: { git_installed: true, cli_installed: true, authenticated: true, user: 'owner', max_nodes: 4 },
          },
        ],
      };
    if (path === 'repositories')
      return {
        events: [
          {
            type: 'repositories',
            data: {
              repositories: [{ name: 'owner/repo', url: 'https://github.com/owner/repo', writable: true }],
              namespaces: [{ id: 'owner', name: 'owner' }],
              has_more: false,
            },
          },
        ],
      };
    if (path === 'run') return { id: 'drun-1' };
    return {
      id: 'drun-1',
      status: 'completed',
      stage: 'reports_ready',
      reports_ready: true,
      report_formats: ['html', 'csv'],
      run_id: 42,
      repository: 'owner/repo',
      url: 'https://github.com/owner/repo/actions/runs/42',
      reports_url: 'https://github.com/owner/repo/releases/tag/relampo-report-42-1',
      started_at: new Date().toISOString(),
      nodes: [],
      scopes: [],
      history: [],
    };
  });
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
describe('distributed execution', () => {
  it('reviews the current YAML before publishing and exposes reports after completion', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled());
    fireEvent.change(screen.getByLabelText('Archivos del equipo'), {
      target: { files: [new File(['id\n1'], 'users.csv')] },
    });
    expect(screen.getByRole('button', { name: 'Aplicar acción a los archivos' })).toBeDisabled();
    await selectRepository();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByText('scenarios/data/users.csv');
    expect(mocks.prepare).toHaveBeenCalledWith(
      expect.objectContaining({ yaml, nodes: 2, provider: 'github', report_formats: ['html'] }),
    );
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('vus');
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('duration');
    expect(screen.queryByRole('spinbutton', { name: 'Usuarios totales' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Duración' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar y ejecutar' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'He revisado el repositorio y los archivos que se publicarán.' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByRole('link', { name: 'Abrir el reporte completo' });
    expect(mocks.request).toHaveBeenCalledWith(
      'run',
      expect.objectContaining({ yaml, repository: 'owner/repo', prepare_only: false }),
    );
    expect(screen.getByRole('link', { name: 'Descargar CSV' })).toHaveAttribute(
      'href',
      expect.stringContaining('/api/distributed/run/drun-1/report/csv?download=1'),
    );
    expect(screen.queryByRole('link', { name: 'Descargar JSON' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver reportes en el repositorio' })).toHaveAttribute(
      'href',
      expect.stringContaining('relampo-report-42-1'),
    );
  });
  it('invalidates preparation when load settings change', async () => {
    mount();
    await selectRepository();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByText('scenarios/test.yaml');
    fireEvent.click(screen.getByRole('button', { name: 'Nodos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nodo 3' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Publicar y ejecutar' })).toBeDisabled();
    expect(screen.getByText(/preparación quedó desactualizada/)).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
  });
  it('uses authored resource settings without execution overrides', async () => {
    mount();
    await selectRepository();
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
    expect(screen.queryByRole('checkbox', { name: /Sobrescribir recursos embebidos/ })).not.toBeInTheDocument();
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('retrieve_embedded');
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('embedded_types');
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('embedded_blacklist');
  });
  it('keeps unsupported backends from starting a remote run', async () => {
    mocks.probe.mockResolvedValue({ capabilities: { loadRun: true } });
    mount(yaml, false);
    await screen.findByText(/no ofrece ejecución distribuida/);
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
  });
  it('renders real received progress without inventing missing percentiles', async () => {
    sessionStorage.setItem(
      'relampo.studio.distributedRun',
      JSON.stringify({ id: 'drun-1', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
    );
    const stats = {
      requests: 47,
      failures: 2,
      latency_samples: 47,
      elapsed_seconds: 5,
      rps: 9.4,
      min_ms: 1,
      max_ms: 90,
      avg_ms: 12,
      p95_ms: null,
    };
    mocks.request.mockResolvedValue({
      id: 'drun-1',
      status: 'completed',
      stage: 'reports_ready',
      reports_ready: true,
      repository: 'owner/repo',
      started_at: new Date().toISOString(),
      nodes: [],
      scopes: [{ key: 'global', total: stats, window: stats }],
      history: [
        { at: new Date().toISOString(), requests: 47, failures: 2, rps: 9.4, active_vus: 0, avg_ms: 12, p95_ms: null },
      ],
    });
    mount();
    await screen.findByText('47');
    expect(
      within(screen.getByRole('region', { name: 'Resumen de la ejecución' })).getByText('9.4'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Latencia P95' }).parentElement).toHaveTextContent('—');
  });
  it('keeps nodes out of Connection and invalidates the plan when report selection changes', async () => {
    mount();
    await selectRepository();
    const nodes = screen.getByRole('button', { name: 'Nodos' });
    expect(nodes.closest('fieldset')).toBeNull();
    expect(nodes).toHaveTextContent('2');
    expect(screen.queryByRole('combobox', { name: 'Nodos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preparar repositorio' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByText('scenarios/test.yaml');
    fireEvent.click(screen.getByLabelText('Reportes'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'CSV' }));
    expect(screen.getByText(/preparación quedó desactualizada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await waitFor(() =>
      expect(mocks.prepare).toHaveBeenLastCalledWith(expect.objectContaining({ report_formats: ['html', 'csv'] })),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'HTML' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'CSV' }));
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
  });
  it('closes reports on an outside click and Escape while retaining checked formats', () => {
    mount();
    const summary = screen.getByLabelText('Reportes');
    const menu = summary.closest('details')!;
    fireEvent.click(summary);
    expect(menu.open).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'CSV' }));
    expect(menu.open).toBe(true);
    fireEvent.pointerDown(screen.getByText('Proyecto y archivos'));
    expect(menu.open).toBe(false);
    fireEvent.click(summary);
    expect(screen.getByRole('checkbox', { name: 'CSV' })).toBeChecked();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menu.open).toBe(false);
    expect(summary).toHaveFocus();
  });
  it('uploads the YAML and selected files on Apply, then runs without repeating the file operation', async () => {
    mount();
    const files = [new File(['id\n1'], 'users.csv'), new File(['{}'], 'support.json')];
    fireEvent.change(screen.getByLabelText('Archivos del equipo'), { target: { files } });
    const apply = screen.getByRole('button', { name: 'Aplicar acción a los archivos' });
    expect(apply).toBeDisabled();
    await selectRepository();
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    await screen.findByText('3 archivos subidos');
    expect(mocks.upload.mock.calls.map(call => call[0].name)).toEqual(['users.csv', 'support.json', 'studio.yaml']);
    expect(mocks.request).toHaveBeenCalledWith(
      'files',
      expect.objectContaining({
        repository: 'owner/repo',
        yaml,
        action: 'upload',
        files: [
          '.relampo/datasources/users.csv',
          '.relampo/datasources/support.json',
          '.relampo/datasources/studio.yaml',
        ],
      }),
    );
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByText('scenarios/support.json');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'He revisado el repositorio y los archivos que se publicarán.' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await screen.findByRole('link', { name: 'Abrir el reporte completo' });
    expect(mocks.request.mock.calls.filter(call => call[0] === 'files')).toHaveLength(1);
  });
  it('can upload the current YAML without choosing additional files', async () => {
    mount();
    await selectRepository();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        'files',
        expect.objectContaining({
          repository: 'owner/repo',
          files: ['.relampo/datasources/studio.yaml'],
          action: 'upload',
        }),
      ),
    );
    expect(mocks.upload.mock.calls[0][0].name).toBe('studio.yaml');
    expect(mocks.upload.mock.calls[0][0].size).toBe(new Blob([yaml]).size);
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
  });
  it('keeps chosen files available for retry when publication fails', async () => {
    mount();
    await selectRepository();
    fireEvent.change(screen.getByLabelText('Archivos del equipo'), {
      target: { files: [new File(['id\n1'], 'users.csv')] },
    });
    mocks.request.mockRejectedValueOnce(new Error('Publication failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await screen.findByText('Publication failed');
    expect(screen.queryByText(/archivos subidos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'users.csv' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar acción a los archivos' })).toBeEnabled());
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
  });
  it('always renders Connection, Repository and Project in that order', () => {
    mount(yaml, false);
    const panels = screen.getAllByRole('group').filter(panel => panel.tagName === 'FIELDSET');
    expect(panels.map(panel => panel.querySelector('legend')?.textContent)).toEqual([
      'Conexión',
      'Repositorio',
      'Proyecto y archivos',
    ]);
    expect(within(panels[0]).getByRole('combobox', { name: 'Proveedor' })).toBeInTheDocument();
    expect(within(panels[1]).getByRole('combobox', { name: 'Repositorio' })).toBeDisabled();
    expect(within(panels[1]).getByRole('button', { name: 'Crear repositorio' })).toBeDisabled();
    expect(within(panels[2]).getByRole('button', { name: 'Seleccionar archivos' })).toBeInTheDocument();
  });
});

it.each(['completed', 'errored', 'stopped'])('clears a %s run and removes its saved attachment', async status => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-1', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  const original = mocks.request.getMockImplementation()!;
  mocks.request.mockImplementation(async (...args) => {
    const result = await original(...args);
    return args[0].startsWith('run/')
      ? {
          ...result,
          status,
          reports_ready: false,
          error:
            status === 'errored' ? 'Refreshing run status every 3 seconds.\nJOBS prepare-context failed' : undefined,
        }
      : result;
  });
  mount();
  const clear = await screen.findByRole('button', { name: 'Clear' });
  expect(screen.getByRole('link', { name: 'Ver reportes en el repositorio' })).toHaveAttribute(
    'href',
    expect.stringContaining('relampo-report-42-1'),
  );
  if (status === 'errored') {
    expect(screen.queryByText(/Refreshing run status/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('terminó con un error');
  }
  fireEvent.click(clear);
  expect(screen.queryByRole('region', { name: 'Resultados distribuidos' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem('relampo.studio.distributedRun')).toBeNull();
  expect(screen.getByRole('combobox', { name: 'Repositorio' })).toBeInTheDocument();
});
