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
      runApiMock.handlers[0].onMetrics(metric({ rps: 123, total_requests: 200, active_users: 8 }));
      runApiMock.handlers[0].onLog([
        { seq: 0, ts: 1782249308000, level: 'request', vu: 1, method: 'GET', path: '/api/x', status: 200, latency_ms: 12 },
        { seq: 1, ts: 1782249309000, level: 'request', vu: 1, method: 'GET', path: '/api/x', status: 200, latency_ms: 18 },
      ]);
    });

    // The req/s value appears on the stat card (and the sparkline header).
    expect(screen.getAllByText('123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('200').length).toBeGreaterThan(0);
    // The summary appears before onDone, with repeated iterations aggregated.
    expect(screen.getByText('Run summary')).toBeInTheDocument();
    expect(screen.queryByText('Executed requests')).not.toBeInTheDocument();
    const liveSummaryTable = screen.getByRole('table');
    expect(within(liveSummaryTable).getByText('/api/x')).toBeInTheDocument();
    expect(within(liveSummaryTable).getByText('2')).toBeInTheDocument();
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

  it('groups dynamic request paths by their script request', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'request-1',
          type: 'request',
          name: 'GET item',
          data: { method: 'GET', url: '/api/items/{{item}}?vu={{__vu_idx}}&iteration={{__iteration_idx}}' },
        },
      ],
    };
    render(<YAMLLoadRunSession {...baseProps} tree={tree} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
    await waitFor(() => expect(runApiMock.handlers).toHaveLength(1));
    act(() => {
      runApiMock.handlers[0].onLog([
        { seq: 0, ts: 1, level: 'request', method: 'GET', path: '/api/items/a?iteration=1&vu=1', status: 200, latency_ms: 10 },
        { seq: 1, ts: 2, level: 'request', method: 'GET', path: '/api/items/b?iteration=2&vu=2', status: 200, latency_ms: 20 },
      ]);
    });

    const table = await screen.findByRole('table');
    expect(within(table).getByText('/api/items/{{item}}?vu={{__vu_idx}}&iteration={{__iteration_idx}}')).toBeInTheDocument();
    expect(within(table).getByText('2')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
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
