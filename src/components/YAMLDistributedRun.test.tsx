import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLDistributedRun } from './YAMLDistributedRun';

const mocks = vi.hoisted(() => ({
  probe: vi.fn(),
  prepare: vi.fn(),
  request: vi.fn(),
}));
vi.mock('../utils/debugApi', () => ({ probeStudio: mocks.probe }));
vi.mock('../utils/distributedApi', async original => ({
  ...(await original<typeof import('../utils/distributedApi')>()),
  prepareDistributed: mocks.prepare,
  distributedRequest: mocks.request,
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
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/?lang=es');
  mocks.probe.mockResolvedValue({ capabilities: { distributedRun: true } });
  mocks.prepare.mockResolvedValue({ repository: 'owner/repo', plan });
  mocks.request.mockImplementation(async (path: string) => {
    if (path === 'run') return { id: 'drun-1' };
    return {
      id: 'drun-1',
      status: 'completed',
      stage: 'reports_ready',
      reports_ready: true,
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' })).toBeDisabled());
    fireEvent.change(screen.getByRole('textbox', { name: 'Archivos' }), { target: { value: 'users.csv' } });
    expect(screen.getByRole('button', { name: 'Aplicar acción a los archivos' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Repositorio' }), { target: { value: 'owner/repo' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' }));
    await screen.findByText('scenarios/data/users.csv');
    expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ yaml, nodes: 2, provider: 'github' }));
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('vus');
    expect(mocks.prepare.mock.calls[0][0]).not.toHaveProperty('duration');
    expect(screen.queryByRole('spinbutton', { name: 'Usuarios totales' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Duración' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar y ejecutar' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'He revisado el repositorio y los archivos que se publicarán.' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' }));
    await screen.findByRole('link', { name: 'Abrir reporte HTML' });
    expect(mocks.request).toHaveBeenCalledWith(
      'run',
      expect.objectContaining({ yaml, repository: 'owner/repo', prepare_only: false }),
    );
    expect(screen.getByRole('link', { name: 'Descargar CSV' })).toHaveAttribute(
      'href',
      expect.stringContaining('/api/distributed/run/drun-1/report/csv?download=1'),
    );
    expect(screen.getByRole('link', { name: 'Ver reportes en el repositorio' })).toHaveAttribute(
      'href',
      expect.stringContaining('relampo-report-42-1'),
    );
  });
  it('invalidates preparation when load settings change', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Repositorio' }), { target: { value: 'owner/repo' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' }));
    await screen.findByText('scenarios/test.yaml');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Nodos' }), { target: { value: '3' } });
    expect(screen.getByRole('button', { name: 'Publicar y ejecutar' })).toBeDisabled();
    expect(screen.getByText(/preparación quedó desactualizada/)).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalledWith('run', expect.anything());
  });
  it('uses authored resource settings without execution overrides', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', { name: 'Repositorio' }), { target: { value: 'owner/repo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' }));
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
    expect(screen.getByRole('button', { name: 'Ejecutar prueba distribuida' })).toBeDisabled();
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
    expect(screen.getByText('9.4')).toBeInTheDocument();
    expect(screen.getByText('12.0 ms')).toBeInTheDocument();
    expect(screen.getAllByText('P95 ≈')[0].parentElement).toHaveTextContent('—');
  });
});
