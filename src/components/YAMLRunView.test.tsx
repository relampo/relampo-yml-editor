import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { YAMLLoadRunSession } from './YAMLRunView';
import type { RunMetricsSnapshot, RunStreamHandlers, RunSummary } from '../utils/runApi';
import type { YAMLNode } from '../types/yaml';

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

    const summaryHeading = screen.getByText('Run summary');
    const logsHeading = screen.getByText('Live logs');
    expect(summaryHeading.compareDocumentPosition(logsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(within(table).getByText('/login?vu={{__vu_idx}}')).toBeInTheDocument();
    expect(within(table).getByText('/callback?code={{code}}')).toBeInTheDocument();
    expect(within(table).getByText('Redirect 1 from Unexpected redirect')).toBeInTheDocument();
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
    expect(within(completedTable).getByText('/login?vu={{__vu_idx}}')).toBeInTheDocument();
    expect(within(completedTable).getByText('/callback?code={{code}}')).toBeInTheDocument();
    expect(within(completedTable).queryByText('/callback?code=runtime-value-3')).not.toBeInTheDocument();
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
