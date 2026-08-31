import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { YAMLLoadRunSession } from './YAMLRunView';
import type { RunLogLine, RunMetricsSnapshot, RunStreamHandlers, RunSummary } from '../utils/runApi';
import type { YAMLNode } from '../types/yaml';
import { LanguageProvider } from '../contexts/LanguageContext';

const runApiMock = vi.hoisted(() => {
  const handlers: RunStreamHandlers[] = [];
  return {
    handlers,
    startLoadRun: vi.fn(async () => 'lrun-1'),
    stopLoadRun: vi.fn(async () => {}),
    streamLoadRun: vi.fn((_runId: string, handler: RunStreamHandlers) => {
      handlers.push(handler);
      return vi.fn();
    }),
  };
});

vi.mock('../utils/runApi', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/runApi')>();
  return {
    ...actual,
    startLoadRun: runApiMock.startLoadRun,
    stopLoadRun: runApiMock.stopLoadRun,
    streamLoadRun: runApiMock.streamLoadRun,
  };
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  runApiMock.handlers.length = 0;
  runApiMock.startLoadRun.mockClear();
  runApiMock.stopLoadRun.mockClear();
  runApiMock.streamLoadRun.mockClear();
});

function metric(overrides: Partial<RunMetricsSnapshot> = {}): RunMetricsSnapshot {
  return {
    ts: 1,
    elapsed_ms: 1000,
    rps: 50,
    active_users: 5,
    avg_latency: 20,
    p95_latency: 100,
    total_requests: 50,
    total_failures: 0,
    errors: 0,
    ...overrides,
  };
}

function summary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    test_name: 'Studio load run',
    start_time: '2026-06-23T00:00:00Z',
    end_time: '2026-06-23T00:00:03Z',
    duration: 3_000_000_000,
    total_requests: 200,
    total_failures: 2,
    executed_vus: 8,
    metadata: { configured_vus: '10' },
    transactions: [{ name: 'Checkout', count: 100, failures: 2 }],
    node_resources: [{ node: 'local', mem_peak_mb: 64, cpu_peak: 42.5, go_peak: 12 }],
    requests: [
      {
        name: 'GET /x',
        method: 'GET',
        path: '/x',
        count: 200,
        failures: 2,
        avg_ms: 20,
        min_ms: 5,
        max_ms: 90,
        p50_ms: 18,
        p90_ms: 40,
        p95_ms: 60,
        p99_ms: 88,
      },
    ],
    ...overrides,
  };
}

const baseProps = {
  tree: null,
  yamlCode: 'test:\n  name: load\n',
  documentReady: true,
  validationErrors: [],
};

describe('YAMLLoadRunSession', () => {
  it('starts with the newest flushed tree revision instead of stale code', async () => {
    const flushPendingEdits = vi.fn(() => 'test:\n  name: newest-run\n');
    render(<YAMLLoadRunSession {...baseProps} yamlCode={'test:\n  name: stale-run\n'} flushPendingEdits={flushPendingEdits} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));

    await waitFor(() => expect(runApiMock.startLoadRun).toHaveBeenCalledWith('test:\n  name: newest-run\n'));
    expect(flushPendingEdits).toHaveBeenCalledTimes(1);
  });

  it('starts a load run with the current YAML and renders streamed metrics then the summary', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    expect(runApiMock.startLoadRun).toHaveBeenCalledWith('test:\n  name: load\n');

    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
      runApiMock.handlers[0].onMetrics(
        metric({
          rps: 123,
          total_requests: 200,
          active_users: 8,
          executed_vus: 8,
          requests: [
            {
              name: 'GET /api/x',
              method: 'GET',
              path: '/api/x',
              step_path: 'scenarios[0].steps[0]',
              count: 200,
              failures: 0,
              avg_ms: 15,
              min_ms: 12,
              max_ms: 18,
              p90_ms: 18,
              p95_ms: 18,
              p99_ms: 18,
            },
          ],
        }),
      );
      runApiMock.handlers[0].onLog([
        { seq: 0, ts: 1782249308000, level: 'request', vu: 1, method: 'GET', path: '/api/x', status: 200, latency_ms: 12 },
        { seq: 1, ts: 1782249309000, level: 'request', vu: 1, method: 'GET', path: '/api/x', status: 200, latency_ms: 18 },
      ]);
    });

    // The req/s value appears on the stat card (and the sparkline header).
    expect(screen.getAllByText('123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    // The summary appears before onDone from the backend's exact cumulative
    // aggregate rather than recounting the bounded log tail.
    expect(screen.getByText('Run summary')).toBeInTheDocument();
    expect(screen.queryByText('Executed requests')).not.toBeInTheDocument();
    const liveSummaryTable = screen.getByRole('table');
    expect(within(liveSummaryTable).getByText('/api/x')).toBeInTheDocument();
    expect(within(liveSummaryTable).getByText('200')).toBeInTheDocument();
    // The live log feed still renders the streamed engine line.
    expect(screen.getByText('Live logs')).toBeInTheDocument();
    expect(screen.getAllByText(/GET \/api\/x/)).toHaveLength(2);

    act(() => {
      runApiMock.handlers[0].onDone({ status: 'completed', error: null, summary: summary() });
    });

    expect(await screen.findByText('Run summary')).toBeInTheDocument();
    expect(screen.getByText('3.0s')).toBeInTheDocument();
    expect(screen.getByText('VUs (exec/conf)')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('TPS')).toBeInTheDocument();
    expect(screen.getByText('33.3')).toBeInTheDocument();
    expect(screen.getByText('MEM Peak')).toBeInTheDocument();
    expect(screen.getByText('64 MB')).toBeInTheDocument();
    expect(screen.getByText('CPU Peak')).toBeInTheDocument();
    expect(screen.getByText('42.5%')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('ERRs')).toBeInTheDocument();

    const summaryHeading = screen.getByText('Run summary');
    const logsHeading = screen.getByText('Live logs');
    expect(summaryHeading.compareDocumentPosition(logsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses RPS as the primary intent runtime chart metric when the intent target is RPS', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onMetrics(
        metric({
          intent_ticks: [
            {
              tick: 1,
              elapsed_ms: 1000,
              state: 'warmup',
              action: 'hold',
              reason: 'warmup_active',
              slo_ok: true,
              target_unit: 'rps',
              target_value: 10,
              current_vus: 2,
              next_vus: 2,
              delta_vus: 0,
              rps: 9.5,
              p95_ms: 180,
              error_rate_pct: 0,
              violations: 0,
              recoveries: 0,
              target_streak: 1,
            },
            {
              tick: 2,
              elapsed_ms: 2000,
              state: 'violation',
              action: 'decrease',
              reason: 'p95_max_ms',
              slo_ok: false,
              target_unit: 'rps',
              target_value: 10,
              current_vus: 5,
              next_vus: 2,
              delta_vus: -3,
              rps: 12,
              p95_ms: 950,
              error_rate_pct: 0,
              violations: 1,
              recoveries: 0,
              target_streak: 0,
            },
          ],
        }),
      );
    });

    expect(screen.getByText('Intent runtime timeline')).toBeInTheDocument();
    expect(screen.getByText(/RPS held against the target/i)).toBeInTheDocument();
    expect(screen.getByText('Target 10.0 RPS')).toBeInTheDocument();
    expect(screen.getAllByText('RPS').length).toBeGreaterThan(0);
    expect(screen.getByText('p95_max_ms')).toBeInTheDocument();
  });

  it('deduplicates replayed log batches and labels the retained tail', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    const lines: RunLogLine[] = Array.from({ length: 1002 }, (_, seq) => ({
      seq,
      ts: 1782249308000 + seq,
      level: 'request',
      method: 'GET',
      path: `/request-${seq}`,
      status: 200,
      latency_ms: 1,
    }));
    act(() => {
      runApiMock.handlers[0].onLog(lines);
      // EventSource can replay the retained batch after a reconnect. The
      // reducer must not append those sequence IDs a second time.
      runApiMock.handlers[0].onLog(lines);
    });

    expect(screen.getByText('Showing log lines 3–1002; earlier lines are not displayed.')).toBeInTheDocument();
    expect(screen.getAllByText(/GET \/request-1001/)).toHaveLength(1);
    expect(screen.queryByText(/GET \/request-0/)).not.toBeInTheDocument();
  });

  it('keeps the omitted-prefix notice out of the auto-scrolled log body', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onLog(logLines(Array.from({ length: 1200 }, (_, seq) => seq)));
    });

    // The panel auto-scrolls to the newest line on every batch, so a notice
    // placed inside the scrolling body would sit ~1000 rows above the viewport
    // exactly when it has something to say.
    const notice = screen.getByText(/Showing log lines/);
    const logBody = document.querySelector('.max-h-64.overflow-y-auto');
    expect(logBody).not.toBeNull();
    expect(logBody?.contains(notice)).toBe(false);
  });

  it('drops duplicate sequence ids that arrive inside a single batch', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onLog([...logLines([0, 1]), ...logLines([1, 2])]);
    });

    // Duplicates within one batch must collapse too, otherwise the list renders
    // the same line twice under a duplicated React key.
    expect(screen.getAllByText(/GET \/line-1 /)).toHaveLength(1);
    expect(screen.getAllByText(/GET \/line-/)).toHaveLength(3);
  });

  function logLines(seqs: number[]): RunLogLine[] {
    return seqs.map(seq => ({
      seq,
      ts: 1782249308000 + seq,
      level: 'request' as const,
      method: 'GET',
      path: `/line-${seq}`,
      status: 200,
      latency_ms: 1,
    }));
  }

  function balancedScenarioTree(mode: string): YAMLNode {
    return {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          children: [
            {
              id: 'scenario-0',
              type: 'scenario',
              name: 'Recorded Scenario',
              children: [
                {
                  id: 'load-0',
                  type: 'load',
                  name: 'Load',
                  data: { type: 'constant', users: '20', duration: '40s', iterations: '20' },
                },
                {
                  id: 'steps-0',
                  type: 'steps',
                  name: 'Steps',
                  children: [
                    { id: 'balanced-0', type: 'balanced', name: 'Balanced Controller', data: { type: 'total', mode } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it('flags on the planned profile when a Balanced Controller in Iterations mode caps the duration', async () => {
    render(
      <LanguageProvider>
        <YAMLLoadRunSession {...baseProps} tree={balancedScenarioTree('iteraciones')} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
      runApiMock.handlers[0].onMetrics(metric());
    });

    expect(screen.getByText(/Balanced Controller in Iterations mode/i)).toBeInTheDocument();
    expect(screen.getByText(/first configured limit.*Duration or Iterations/i)).toBeInTheDocument();
  });

  it('does not flag the planned profile when the Balanced Controller runs in Virtual Users mode', async () => {
    render(
      <LanguageProvider>
        <YAMLLoadRunSession {...baseProps} tree={balancedScenarioTree('usuarios_virtuales')} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
      runApiMock.handlers[0].onMetrics(metric());
    });

    expect(screen.queryByText(/first configured limit.*Duration or Iterations/i)).not.toBeInTheDocument();
  });

  it('keeps dynamic redirects grouped by stable script steps and exact backend counts', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'request-1',
          type: 'request',
          name: 'Start login',
          path: ['scenarios', 0, 'steps', 0, 'request'],
          data: {
            method: 'GET',
            url: '/login?vu={{__vu_idx}}',
            request_id: 41,
            chain_id: 'login',
            chain_role: 'parent',
          },
        },
        {
          id: 'request-2',
          type: 'request',
          name: 'Login callback',
          path: ['scenarios', 0, 'steps', 1, 'request'],
          data: {
            method: 'GET',
            url: '/callback?code={{code}}',
            request_id: 42,
            chain_id: 'login',
            chain_role: 'final',
            enabled: false,
          },
        },
        {
          id: 'request-3',
          type: 'request',
          name: 'Unexpected redirect',
          path: ['scenarios', 0, 'steps', 2, 'request'],
          data: {
            method: 'GET',
            url: '/unexpected?vu={{__vu_idx}}',
            request_id: 43,
            chain_id: 'unexpected',
            chain_role: 'parent',
          },
        },
      ],
    };
    render(<YAMLLoadRunSession {...baseProps} tree={tree} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onMetrics(
        metric({
          total_requests: 6,
          executed_vus: 3,
          requests: [
            {
              name: 'Start login',
              method: 'GET',
              path: '/login?vu=1',
              request_id: 41,
              step_path: 'scenarios[0].steps[0]',
              chain_id: 'login',
              chain_role: 'parent',
              count: 3,
              failures: 0,
              avg_ms: 10,
              min_ms: 9,
              max_ms: 11,
              p90_ms: 11,
              p95_ms: 11,
              p99_ms: 11,
            },
            {
              name: 'Follow redirect',
              method: 'GET',
              path: '/callback?code=runtime-value-3',
              request_id: 41,
              step_path: 'scenarios[0].steps[0].redirects[1]',
              chain_id: 'login',
              chain_role: 'final',
              redirect_index: 1,
              count: 3,
              failures: 1,
              avg_ms: 20,
              min_ms: 18,
              max_ms: 22,
              p90_ms: 22,
              p95_ms: 22,
              p99_ms: 22,
            },
            {
              name: 'Unexpected redirect landing',
              method: 'GET',
              path: '/unknown?token=runtime-value-3',
              request_id: 43,
              step_path: 'scenarios[0].steps[2].redirects[1]',
              chain_id: 'unexpected',
              chain_role: 'final',
              redirect_index: 1,
              count: 3,
              failures: 0,
              avg_ms: 20,
              min_ms: 18,
              max_ms: 22,
              p90_ms: 22,
              p95_ms: 22,
              p99_ms: 22,
            },
          ],
        }),
      );
      runApiMock.handlers[0].onLog([
        { seq: 0, ts: 1, level: 'request', method: 'GET', path: '/callback?code=runtime-value-1', status: 302, latency_ms: 10 },
        { seq: 1, ts: 2, level: 'error', method: 'GET', path: '/callback?code=runtime-value-2', status: 502, latency_ms: 20 },
      ]);
    });

    const table = await screen.findByRole('table');
    expect(within(table).getByText('/login?vu=1')).toBeInTheDocument();
    expect(within(table).getByText('/callback?code=runtime-value-3')).toBeInTheDocument();
    expect(within(table).queryByText('/login?vu={{__vu_idx}}')).not.toBeInTheDocument();
    expect(within(table).queryByText('/callback?code={{code}}')).not.toBeInTheDocument();
    expect(within(table).getByText('/unknown?token=runtime-value-3')).toBeInTheDocument();
    expect(within(table).queryByText('Redirect 1 from Unexpected redirect')).not.toBeInTheDocument();
    expect(within(table).getAllByText('3')).toHaveLength(3);
    expect(within(table).getAllByRole('row')).toHaveLength(4);

    act(() => {
      runApiMock.handlers[0].onDone({
        status: 'completed',
        error: null,
        summary: summary({
          total_requests: 6,
          requests: [
            {
              name: 'GET /login?vu=1',
              method: 'GET',
              path: '/login?vu=1',
              count: 3,
              failures: 0,
              avg_ms: 10,
              min_ms: 9,
              max_ms: 11,
              p90_ms: 11,
              p95_ms: 11,
              p99_ms: 11,
            },
            {
              name: 'GET /callback?code=runtime-value-3',
              method: 'GET',
              path: '/callback?code=runtime-value-3',
              count: 3,
              failures: 1,
              avg_ms: 20,
              min_ms: 18,
              max_ms: 22,
              p90_ms: 22,
              p95_ms: 22,
              p99_ms: 22,
            },
          ],
        }),
      });
    });

    const completedTable = await screen.findByRole('table');
    expect(within(completedTable).getByText('/login?vu=1')).toBeInTheDocument();
    expect(within(completedTable).getByText('/callback?code=runtime-value-3')).toBeInTheDocument();
    expect(within(completedTable).queryByText('/login?vu={{__vu_idx}}')).not.toBeInTheDocument();
    expect(within(completedTable).queryByText('/callback?code={{code}}')).not.toBeInTheDocument();
  });

  // RLP-655. An unexpected redirect chain — one the recording has no children
  // for — must survive the summary as one resolved-URL row per hop, ordered
  // under the step that spawned it. The rows are keyed by the runtime
  // `...redirects[N]` step path, never by the resolved URL, so a chain that
  // lands somewhere different on each iteration still collapses into a single
  // row with the summed count instead of fanning out one row per landing.
  it('keeps every unexpected redirect hop as its own resolved-URL row under its parent step', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'request-1',
          type: 'request',
          name: 'Start login',
          path: ['scenarios', 0, 'steps', 0, 'request'],
          data: {
            method: 'GET',
            url: '/login?vu={{__vu_idx}}',
            request_id: 41,
            chain_id: 'login',
            chain_role: 'parent',
          },
        },
      ],
    };
    const latency = { avg_ms: 20, min_ms: 18, max_ms: 22, p90_ms: 22, p95_ms: 22, p99_ms: 22 };
    render(<YAMLLoadRunSession {...baseProps} tree={tree} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onMetrics(
        metric({
          total_requests: 9,
          executed_vus: 3,
          requests: [
            {
              name: 'Start login',
              method: 'GET',
              path: '/login?vu=1',
              request_id: 41,
              step_path: 'scenarios[0].steps[0]',
              chain_id: 'login',
              chain_role: 'parent',
              count: 3,
              failures: 0,
              ...latency,
            },
            // Hop 1 leaves the recorded origin entirely: the absolute URL is the
            // only honest rendering of where the run actually went.
            {
              name: 'Authorize hop',
              method: 'GET',
              path: 'https://idp.example.com/authorize?client_id=abc',
              request_id: 41,
              step_path: 'scenarios[0].steps[0].redirects[1]',
              chain_id: 'login',
              chain_role: 'hop',
              redirect_index: 1,
              count: 3,
              failures: 0,
              ...latency,
            },
            // Two landings for the SAME hop: correlation gave each iteration a
            // different code, so the engine reports them as separate resolved
            // URLs under one step path.
            {
              name: 'Landing',
              method: 'GET',
              path: '/callback?code=runtime-value-1',
              request_id: 41,
              step_path: 'scenarios[0].steps[0].redirects[2]',
              chain_id: 'login',
              chain_role: 'final',
              redirect_index: 2,
              count: 2,
              failures: 0,
              ...latency,
            },
            {
              name: 'Landing',
              method: 'GET',
              path: '/callback?code=runtime-value-2',
              request_id: 41,
              step_path: 'scenarios[0].steps[0].redirects[2]',
              chain_id: 'login',
              chain_role: 'final',
              redirect_index: 2,
              count: 1,
              failures: 1,
              ...latency,
            },
          ],
        }),
      );
    });

    const table = await screen.findByRole('table');
    // One row per hop — never a synthetic "Redirect N from ..." label, and never
    // an extra row for the second landing of the same hop.
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map(row => row.textContent ?? '');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('/login?vu=1');
    expect(rows[1]).toContain('https://idp.example.com/authorize?client_id=abc');
    expect(rows[2]).toContain('/callback?code=runtime-value-1');
    expect(within(table).queryByText('/callback?code=runtime-value-2')).not.toBeInTheDocument();
    expect(within(table).queryByText(/Redirect \d+ from/)).not.toBeInTheDocument();
    // The two landings merged: 2 + 1 executions and 0 + 1 failures.
    const landingCells = within(table).getAllByRole('row')[3].querySelectorAll('td');
    expect(landingCells[1].textContent).toBe('3');
    expect(landingCells[2].textContent).toBe('1');
  });

  it('collapses rows that resolve to the same script request without moving them after logout', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'download',
          type: 'request',
          name: 'Download identity',
          path: ['scenarios', 0, 'steps', 0, 'request'],
          data: { method: 'GET', url: '/user/signIdentities/download?idGroup={{idGroup}}', request_id: 10 },
        },
        {
          id: 'logout',
          type: 'request',
          name: 'Logout redirect landing',
          path: ['scenarios', 0, 'steps', 1, 'request'],
          data: { method: 'GET', url: '/user/auth', request_id: 11 },
        },
      ],
    };
    render(<YAMLLoadRunSession {...baseProps} tree={tree} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onMetrics(
        metric({
          total_requests: 21,
          requests: [
            {
              name: 'Download identity', method: 'GET', path: '/user/signIdentities/download?idGroup=first', request_id: 10,
              step_path: 'scenarios[0].steps[0]', count: 10, failures: 0, avg_ms: 10, min_ms: 5, max_ms: 20, p90_ms: 18, p95_ms: 19, p99_ms: 20,
            },
            {
              name: 'Logout redirect landing', method: 'GET', path: '/user/auth', request_id: 11,
              step_path: 'scenarios[0].steps[1]', count: 10, failures: 0, avg_ms: 12, min_ms: 8, max_ms: 30, p90_ms: 25, p95_ms: 28, p99_ms: 30,
            },
            {
              name: 'Download identity duplicate', method: 'GET', path: '/user/signIdentities/download?idGroup=late', request_id: 10,
              count: 1, failures: 1, avg_ms: 100, min_ms: 100, max_ms: 100, p90_ms: 100, p95_ms: 100, p99_ms: 100,
            },
          ],
        }),
      );
    });

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText('/user/signIdentities/download?idGroup=first')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('/user/signIdentities/download?idGroup={{idGroup}}')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('11')).toBeInTheDocument();
    expect(within(rows[1]).getByText('1')).toBeInTheDocument();
    expect(within(rows[2]).getByText('/user/auth')).toBeInTheDocument();
  });

  it('orders balanced-controller branches by their structural step paths', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'branch-a',
          type: 'request',
          name: 'Utilities',
          path: ['scenarios', 0, 'steps', 1, 'balanced', 'steps', 0, 'request'],
          data: { method: 'GET', url: '/user/utilities', request_id: 21 },
        },
        {
          id: 'branch-b',
          type: 'request',
          name: 'Sign identities',
          path: ['scenarios', 0, 'steps', 1, 'balanced', 'steps', 1, 'request'],
          data: { method: 'GET', url: '/user/signIdentities', request_id: 22 },
        },
        {
          id: 'logout',
          type: 'request',
          name: 'Logout',
          path: ['scenarios', 0, 'steps', 2, 'request'],
          data: { method: 'GET', url: '/user/auth', request_id: 23 },
        },
      ],
    };
    render(<YAMLLoadRunSession {...baseProps} tree={tree} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onMetrics(
        metric({
          total_requests: 3,
          requests: [
            {
              name: 'Logout', method: 'GET', path: '/user/auth', request_id: 23,
              step_path: 'scenarios[0].steps[2]', count: 1, failures: 0, avg_ms: 12, min_ms: 12, max_ms: 12, p90_ms: 12, p95_ms: 12, p99_ms: 12,
            },
            {
              name: 'Sign identities', method: 'GET', path: '/user/signIdentities', request_id: 22,
              step_path: 'scenarios[0].steps[1].balanced.steps[1]', count: 1, failures: 0, avg_ms: 10, min_ms: 10, max_ms: 10, p90_ms: 10, p95_ms: 10, p99_ms: 10,
            },
            {
              name: 'Utilities', method: 'GET', path: '/user/utilities', request_id: 21,
              step_path: 'scenarios[0].steps[1].balanced.steps[0]', count: 1, failures: 0, avg_ms: 11, min_ms: 11, max_ms: 11, p90_ms: 11, p95_ms: 11, p99_ms: 11,
            },
          ],
        }),
      );
    });

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getByText('/user/utilities')).toBeInTheDocument();
    expect(within(rows[2]).getByText('/user/signIdentities')).toBeInTheDocument();
    expect(within(rows[3]).getByText('/user/auth')).toBeInTheDocument();
  });

  it('falls back to the final summary rows when snapshots carry no per-request aggregate', async () => {
    // A backend older than the RLP-629 contract streams metrics without the
    // `requests` field. buildLiveRunSummary then yields no rows, so once the run
    // finishes the completed view must fall back to the final summary's own rows
    // instead of rendering an empty table.
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
      // metric() intentionally omits `requests` — the pre-contract snapshot shape.
      runApiMock.handlers[0].onMetrics(metric({ total_requests: 200 }));
      runApiMock.handlers[0].onDone({ status: 'completed', error: null, summary: summary() });
    });

    const table = await screen.findByRole('table');
    expect(within(table).getByText('/x')).toBeInTheDocument();
    expect(within(table).getByText('200')).toBeInTheDocument();
  });

  it('asks the server to stop the active run when Stop is clicked', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(runApiMock.stopLoadRun).toHaveBeenCalledWith('lrun-1'));
  });

  it('labels a stopped run as a partial summary', async () => {
    render(<YAMLLoadRunSession {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));

    act(() => {
      runApiMock.handlers[0].onState({ status: 'running', started_at: '2026-06-23T00:00:00Z', elapsed_ms: 0 });
      runApiMock.handlers[0].onDone({ status: 'stopped', error: null, summary: summary() });
    });

    expect(await screen.findByText('Run stopped — partial summary')).toBeInTheDocument();
  });

  it('blocks the run and warns when there are validation errors', () => {
    render(<YAMLLoadRunSession {...baseProps} validationErrors={['load duration is invalid']} />);

    expect(screen.getByRole('button', { name: 'Run load test' })).toBeDisabled();
    expect(screen.getByText(/validation failed before the load run/i)).toBeInTheDocument();
  });

  it('blocks the run when the document is not ready', () => {
    render(<YAMLLoadRunSession {...baseProps} documentReady={false} />);

    const runButton = screen.getByRole('button', { name: 'Run load test' });
    expect(runButton).toBeDisabled();

    fireEvent.click(runButton);
    expect(runApiMock.startLoadRun).not.toHaveBeenCalled();
  });

  it('does not start a load run with stale YAML when pending serialization fails', async () => {
    render(
      <YAMLLoadRunSession
        {...baseProps}
        flushPendingEdits={() => {
          throw new Error('Error generating YAML: empty parallel');
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));

    expect(await screen.findByText('Error generating YAML: empty parallel')).toBeInTheDocument();
    expect(runApiMock.startLoadRun).not.toHaveBeenCalled();
  });
});
