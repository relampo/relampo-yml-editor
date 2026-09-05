import { afterEach, expect, it, vi } from 'vitest';
import { streamLoadRun } from './runApi';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function start() {
  class FakeEventSource {
    static instance: FakeEventSource;
    close = vi.fn();
    readyState = 1;
    onerror: (() => void) | null = null;
    listeners = new Map<string, (event: MessageEvent) => void>();
    constructor() {
      FakeEventSource.instance = this;
    }
    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      this.listeners.set(type, listener);
    }
    emit(type: string, data: unknown) {
      this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
  vi.stubGlobal('EventSource', FakeEventSource);
  const handlers = {
    onState: vi.fn(),
    onMetrics: vi.fn(),
    onLog: vi.fn(),
    onDone: vi.fn(),
    onConnectionError: vi.fn(),
  };
  const close = streamLoadRun('probe', handlers);
  return { source: FakeEventSource.instance, handlers, close };
}

it('delivers distinct subsecond metrics and suppresses a replay', () => {
  const { source, handlers, close } = start();
  const metrics = {
    ts: 1,
    ts_ms: 1100,
    interval_seconds: 0.1,
    elapsed_ms: 100,
    rps: 10,
    active_users: 1,
    avg_latency: 20,
    p95_latency: 20,
    total_requests: 1,
    total_failures: 0,
    errors: 0,
  };
  source.emit('metrics', metrics);
  source.emit('metrics', metrics);
  source.emit('metrics', { ...metrics, ts_ms: 1500, elapsed_ms: 500, total_requests: 2 });
  expect(handlers.onMetrics).toHaveBeenCalledTimes(2);
  expect(handlers.onConnectionError).not.toHaveBeenCalled();
  close();
});

it('delivers a valid version 2 summary with known-zero measurements', () => {
  const { source, handlers, close } = start();
  const summary = {
    report_schema_version: 2,
    status: 'completed',
    partial: false,
    test_name: 'probe',
    start_time: '',
    end_time: '',
    duration: 500000000,
    total_requests: 0,
    total_failures: 0,
    requests: [],
    transactions_configured: false,
    overview: {
      rps: 0,
      tps: null,
      tps_status: 'not_applicable',
      failure_percent: null,
      completed_transactions: 0,
      incomplete_transactions: 0,
    },
    node_resources: [
      {
        node: 'local',
        mem_peak_mb: 0,
        cpu_peak: 0,
        go_peak: 0,
        measurements: { rss_peak_mib: 0, cpu_percent_peak: 0 },
      },
    ],
  };
  source.emit('done', { status: 'completed', summary });
  expect(handlers.onDone).toHaveBeenCalledWith({ status: 'completed', error: null, summary });
  expect(handlers.onConnectionError).not.toHaveBeenCalled();
  close();
});

const request = {
  name: 'checkout',
  method: 'GET',
  path: '/',
  count: 1,
  failures: 0,
  avg_ms: 1,
  min_ms: 0,
  max_ms: 2,
  p50_ms: 1,
  p90_ms: 2,
  p95_ms: 2,
  p99_ms: 2,
};
const history = {
  ts: 1,
  ts_ms: 1100,
  interval_seconds: 0.1,
  rps: 10,
  active_users: 1,
  avg_latency: 1,
  p95_latency: 2,
  errors: 0,
};
const transaction = {
  name: 'checkout',
  count: 2,
  failures: 1,
  completed: 1,
  incomplete: 1,
  avg_ms: 1,
  p50_ms: 1,
  p90_ms: 2,
  p95_ms: 2,
  p99_ms: 2,
};
const measurements = {
  rss_peak_mib: 12,
  go_heap_peak_mib: 4,
  memory_capacity_mib: 100,
  rss_peak_percent: 12,
  cpu_capacity: 2,
  cpu_percent_peak: 25,
  goroutines_start: 2,
  goroutines_peak: 4,
  goroutines_end: 3,
};
const resource = { node: 'local', mem_peak_mb: 4, cpu_peak: 50, go_peak: 4, measurements };
const overview = {
  rps: 10,
  tps: 2,
  tps_status: 'available',
  failure_percent: 50,
  completed_transactions: 1,
  incomplete_transactions: 1,
};
const report = {
  test_name: 'Checkout',
  start_time: '',
  end_time: '',
  duration: 500000000,
  total_requests: 1,
  total_failures: 0,
  requests: [request],
  history: [history],
  transactions: [transaction],
  node_resources: [resource],
  overview,
  report_schema_version: 2,
  status: 'stopped',
  partial: true,
  expected_nodes: 2,
  received_nodes: ['local'],
  missing_nodes: ['other'],
  transactions_configured: true,
};

it.each(['available', 'not_applicable', 'unavailable'])(
  'accepts report availability %s and preserves every measurement',
  tps_status => {
    const { source, handlers } = start();
    const summary = {
      ...report,
      overview: {
        ...overview,
        tps_status,
        rps: tps_status === 'unavailable' ? null : overview.rps,
        tps: tps_status === 'available' ? overview.tps : null,
        failure_percent: tps_status === 'unavailable' ? null : overview.failure_percent,
      },
    };
    source.emit('done', { status: 'stopped', summary });
    expect(handlers.onDone).toHaveBeenCalledWith({ status: 'stopped', error: null, summary });
    expect(handlers.onConnectionError).not.toHaveBeenCalled();
  },
);

const invalidReports: [string, unknown][] = [
  ...['report_schema_version', 'status', 'partial', 'expected_nodes', 'transactions_configured'].map(
    key => [key, { ...report, [key]: {} }] as [string, unknown],
  ),
  ...['received_nodes', 'missing_nodes'].flatMap(key =>
    ['local', [42]].map(value => [key, { ...report, [key]: value }] as [string, unknown]),
  ),
  ...Object.keys(overview).map(
    key => [`overview.${key}`, { ...report, overview: { ...overview, [key]: 'invalid' } }] as [string, unknown],
  ),
  ['overview object', { ...report, overview: [] }],
  ['availability array', { ...report, overview: { ...overview, tps_status: ['available'] } }],
  ...Object.keys(measurements).map(
    key =>
      [
        `measurements.${key}`,
        { ...report, node_resources: [{ ...resource, measurements: { ...measurements, [key]: 'invalid' } }] },
      ] as [string, unknown],
  ),
  ['measurements object', { ...report, node_resources: [{ ...resource, measurements: [] }] }],
  ['resource object', { ...report, node_resources: [null] }],
  ...Object.keys(transaction).map(
    key => [`transaction.${key}`, { ...report, transactions: [{ ...transaction, [key]: {} }] }] as [string, unknown],
  ),
  ...['p50_ms', 'p99_ms'].map(
    key => [`request.${key}`, { ...report, requests: [{ ...request, [key]: 'invalid' }] }] as [string, unknown],
  ),
  ...['ts_ms', 'interval_seconds'].map(
    key => [`history.${key}`, { ...report, history: [{ ...history, [key]: 'invalid' }] }] as [string, unknown],
  ),
];
it.each(invalidReports)('rejects malformed %s before delivering the report', (_name, summary) => {
  const { source, handlers } = start();
  source.emit('done', { status: 'completed', summary });
  expect(handlers.onDone).not.toHaveBeenCalled();
  expect(handlers.onConnectionError).toHaveBeenCalledOnce();
  expect(source.close).toHaveBeenCalledOnce();
});

it.each(['ts_ms', 'interval_seconds'])('rejects malformed live %s', key => {
  const { source, handlers } = start();
  source.emit('metrics', { ...history, elapsed_ms: 100, total_requests: 1, total_failures: 0, [key]: 'invalid' });
  expect(handlers.onMetrics).not.toHaveBeenCalled();
  expect(handlers.onConnectionError).toHaveBeenCalledOnce();
});

it('delivers legacy metrics once per second when millisecond timestamps are absent', () => {
  const { source, handlers, close } = start();
  const metric = {
    ...history,
    ts_ms: undefined,
    interval_seconds: undefined,
    elapsed_ms: 1000,
    total_requests: 1,
    total_failures: 0,
  };
  source.emit('metrics', metric);
  source.emit('metrics', metric);
  source.emit('metrics', { ...metric, ts: 2 });
  expect(handlers.onMetrics.mock.calls.map(([value]) => value.ts)).toEqual([1, 2]);
  expect(handlers.onConnectionError).not.toHaveBeenCalled();
  close();
});

it('accepts a legacy report when all version 2 fields are absent', () => {
  const { source, handlers } = start();
  const summary = {
    test_name: 'Legacy',
    start_time: '',
    end_time: '',
    duration: 1000000000,
    total_requests: 1,
    total_failures: 0,
    requests: [
      {
        name: 'GET /',
        method: 'GET',
        path: '/',
        count: 1,
        failures: 0,
        avg_ms: 1,
        min_ms: 1,
        max_ms: 1,
        p90_ms: 1,
        p95_ms: 1,
      },
    ],
    history: [{ ts: 1, rps: 1, active_users: 1, avg_latency: 1, p95_latency: 1, errors: 0 }],
    transactions: [{ name: 'Checkout', count: 1, failures: 0 }],
    node_resources: [{ node: 'local', mem_peak_mb: 1, cpu_peak: 1, go_peak: 1 }],
  };
  source.emit('done', { status: 'completed', summary });
  expect(handlers.onDone).toHaveBeenCalledWith({ status: 'completed', error: null, summary });
  expect(handlers.onConnectionError).not.toHaveBeenCalled();
});

it.each(['received_nodes', 'missing_nodes'])('rejects mixed valid and invalid %s entries', key => {
  const { source, handlers } = start();
  source.emit('done', { status: 'completed', summary: { ...report, [key]: ['node-1', 42] } });
  expect(handlers.onDone).not.toHaveBeenCalled();
  expect(handlers.onConnectionError).toHaveBeenCalledOnce();
});
