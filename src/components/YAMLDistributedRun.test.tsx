import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLDistributedRun } from './YAMLDistributedRun';
import { DistributedRequestError } from '../utils/distributedApi';
import { selectOption } from '../test/selectOption';
import { advance, lostAnswer } from '../test/lostFrames';
import { InFrontWhen } from '../contexts/InFrontContext';

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

const noErrors: string[] = [];
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
    await selectRepository();
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
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
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
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
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeEnabled());
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
    fireEvent.click(screen.getByRole('button', { name: 'P95' }));
    expect(screen.getByRole('group', { name: 'Valores del timeline' })).toHaveTextContent('P95: —');
  });
  it('keeps nodes out of Connection and invalidates the plan when report selection changes', async () => {
    mount();
    await selectRepository();
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeEnabled());
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
  it('drops a staged upload when it is removed by its bare file name', async () => {
    mount();
    await selectRepository();
    fireEvent.change(screen.getByLabelText('Archivos del equipo'), {
      target: { files: [new File(['id\n1'], 'users.csv')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await screen.findByText('2 archivos subidos');
    await selectOption('Acción de archivos', 'Eliminar');
    fireEvent.change(screen.getByLabelText('Archivos del repositorio'), { target: { value: 'users.csv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
    await screen.findByText('2 cambios aplicados');
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled());
    expect(mocks.prepare.mock.calls.at(-1)?.[0].files).toEqual(['.relampo/datasources/studio.yaml']);
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
    expect(screen.getByRole('button', { name: 'Ejecutar' })).toBeDisabled();
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

// Contract 0.15, section 8, "Lost frames".
it('gives up a read of the run state after 10 seconds and reads again at the next tick', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-1', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  vi.useFakeTimers();
  try {
    let reads = 0;
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
      if (!path.startsWith('run/')) return original(path, body, signal);
      if (++reads === 2) return lostAnswer(signal);
      return { ...(await original(path, body, signal)), status: 'running', reports_ready: false };
    });
    mount();
    await advance(0);
    await advance(1000);
    expect(reads).toBe(2);

    await advance(10_000);
    expect(screen.getByText(/The machine did not answer in time\./)).toBeInTheDocument();

    await advance(5000);
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/The machine did not answer in time\./)).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

// Contract 0.18, section 8, "Lost frames": a hidden view sends no frame.
it('reads no run state while the view is hidden, and reads at once when it is in front again', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-1', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  vi.useFakeTimers();
  try {
    let reads = 0;
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
      if (!path.startsWith('run/')) return original(path, body, signal);
      reads++;
      return { ...(await original(path, body, signal)), status: 'running', reports_ready: false };
    });
    const view = (shown: boolean) => (
      <LanguageProvider>
        <InFrontWhen shown={shown}>
          <YAMLDistributedRun
            enabled
            yamlCode={yaml}
            flushPendingEdits={flush}
            documentReady
            validationErrors={noErrors}
          />
        </InFrontWhen>
      </LanguageProvider>
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
  } finally {
    vi.useRealTimers();
  }
});

it('updates counters before completion and retains received metrics when report generation fails', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-live', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  const original = mocks.request.getMockImplementation()!;
  let reads = 0;
  mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
    if (!path.startsWith('run/')) return original(path, body, signal);
    reads++;
    const requests = Math.min(reads, 2) * 10;
    const measuredAt = new Date().toISOString();
    const stats = {
      requests,
      failures: 0,
      latency_samples: requests,
      elapsed_seconds: 5,
      rps: 2,
      min_ms: 1,
      max_ms: 9,
      avg_ms: 4,
      p95_ms: 8,
    };
    return {
      id: 'drun-live',
      run_id: 42,
      status: reads < 3 ? 'running' : 'errored',
      stage: reads < 3 ? 'in_progress' : 'generating_report',
      error: reads < 3 ? undefined : 'Report generation failed',
      warning: reads < 3 ? undefined : 'Live metrics temporarily unavailable; the remote execution continues.',
      reports_ready: false,
      repository: 'owner/repo',
      started_at: measuredAt,
      nodes: [],
      scopes: [{ key: 'global', total: stats, window: stats }],
      history: [
        {
          at: measuredAt,
          requests,
          failures: 0,
          rps: reads < 3 ? 2 : 0,
          active_vus: reads < 3 ? 1 : 0,
          avg_ms: 4,
          p95_ms: 8,
        },
      ],
      // Legacy coordinators retained the finished workers' short closing
      // windows in scoped history. Global charts must match the live log.
      scope_history: {
        global: [
          {
            at: measuredAt,
            requests,
            failures: 0,
            rps: reads < 3 ? 2 : 62.3,
            active_vus: reads < 3 ? 1 : 0,
            avg_ms: 4,
            p95_ms: 8,
          },
        ],
      },
    };
  });
  vi.useFakeTimers();
  try {
    mount();
    await advance(0);
    const summary = screen.getByRole('region', { name: 'Resumen de la ejecución' });
    expect(within(summary).getByText('10', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar ejecución remota' })).toBeEnabled();
    expect(screen.queryByRole('img', { name: 'Tasa de peticiones (intervalo)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Latencia P95' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'VUs activos' })).not.toBeInTheDocument();
    await advance(1000);
    expect(within(summary).getByText('20', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar ejecución remota' })).toBeEnabled();
    await advance(1000);
    expect(
      screen.queryByText(/La carga terminó; falló la generación o publicación del reporte/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Error en el reporte').length).toBeGreaterThan(0);
    expect(screen.queryByText(/remote execution continues/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Valores del timeline' })).toHaveTextContent('RPS: 0 req/s');
    expect(screen.getByRole('group', { name: 'Valores del timeline' })).not.toHaveTextContent('62.3');
    expect(within(summary).getByText('20', { exact: true })).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('requires Apply again when the script or selected files change', async () => {
  const view = (code: string) => (
    <LanguageProvider>
      <YAMLDistributedRun
        enabled
        yamlCode={code}
        flushPendingEdits={() => code}
        documentReady
        validationErrors={[]}
      />
    </LanguageProvider>
  );
  const { rerender } = render(view(yaml));
  await selectRepository();
  const run = screen.getByRole('button', { name: 'Ejecutar' });
  expect(run).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
  await waitFor(() => expect(run).toBeEnabled());
  rerender(view(yaml.replace('qa', 'changed')));
  expect(run).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
  await waitFor(() => expect(run).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Archivos del equipo'), {
    target: { files: [new File(['a,b'], 'new-data.csv')] },
  });
  expect(run).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar acción a los archivos' }));
  await waitFor(() => expect(run).toBeEnabled());
  expect(mocks.prepare).not.toHaveBeenCalled();
});

it('stops reconnecting to a missing pre-restart run without relaunching the remote test', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-old', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  const original = mocks.request.getMockImplementation()!;
  let reads = 0;
  mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
    if (!path.startsWith('run/')) return original(path, body, signal);
    reads++;
    throw new DistributedRequestError('distributed run not found', 404);
  });
  vi.useFakeTimers();
  try {
    mount();
    await advance(0);
    expect(screen.getByText(/El agente ya no conserva el seguimiento/)).toBeInTheDocument();
    expect(screen.queryByText(/Reconectando;/)).not.toBeInTheDocument();
    await advance(60_000);
    expect(reads).toBe(1);
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
    expect(JSON.parse(sessionStorage.getItem('relampo.studio.distributedRun')!).lost).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a configurar' }));
    expect(sessionStorage.getItem('relampo.studio.distributedRun')).toBeNull();
    expect(screen.queryByText(/El agente ya no conserva el seguimiento/)).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('retains the verified remote link when the agent loses an observed run', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-old', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  const original = mocks.request.getMockImplementation()!;
  let reads = 0;
  mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
    if (!path.startsWith('run/')) return original(path, body, signal);
    if (++reads > 1) throw new DistributedRequestError('distributed run not found', 404);
    return {
      ...(await original(path, body, signal)),
      status: 'running',
      url: 'https://github.com/owner/repo/actions/runs/42',
    };
  });
  vi.useFakeTimers();
  try {
    const view = mount();
    await advance(0);
    await advance(1000);
    expect(screen.getByRole('link', { name: 'Ver ejecución remota' })).toHaveAttribute(
      'href',
      'https://github.com/owner/repo/actions/runs/42',
    );
    expect(screen.getAllByText('Sin seguimiento').length).toBeGreaterThan(0);
    view.unmount();
    mount();
    await advance(60_000);
    expect(reads).toBe(2);
    expect(screen.getByRole('link', { name: 'Ver ejecución remota' })).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('keeps one-second polling cadence including relay response time without overlapping reads', async () => {
  sessionStorage.setItem(
    'relampo.studio.distributedRun',
    JSON.stringify({ id: 'drun-1', fp: (await import('../utils/studioRunStore')).fingerprint(yaml) }),
  );
  vi.useFakeTimers();
  const now = vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  try {
    const original = mocks.request.getMockImplementation()!;
    const reads: number[] = [];
    mocks.request.mockImplementation(async (path: string, body: unknown, signal?: AbortSignal) => {
      if (!path.startsWith('run/')) return original(path, body, signal);
      reads.push(Date.now());
      await new Promise(resolve => setTimeout(resolve, 600));
      return { ...(await original(path, body, signal)), status: 'running', reports_ready: false };
    });
    mount();
    await advance(0);
    await advance(600);
    expect(reads).toHaveLength(1);
    await advance(400);
    expect(reads).toHaveLength(2);
    expect(reads[1] - reads[0]).toBe(1000);
  } finally {
    now.mockRestore();
    vi.useRealTimers();
  }
});
