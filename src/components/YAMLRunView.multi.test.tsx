import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { YAMLLoadRunSession } from './YAMLRunView';
import { parseYAMLToTree } from '../utils/yamlParser';

class ServerStream {
  static instance: ServerStream;
  readyState = 1;
  onerror: (() => void) | null = null;
  listeners = new Map<string, (event: MessageEvent) => void>();
  constructor() { ServerStream.instance = this; }
  close() {}
  addEventListener(type: string, listener: (event: MessageEvent) => void) { this.listeners.set(type, listener); }
  emit(type: string, data: unknown) { this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent); }
}
const yaml = `test: {name: all, scenario_mode: sequential}
scenarios:
- name: A
  load: {type: constant, users: 1, iterations: 1}
  steps: [{get: /same}]
- name: B
  load: {type: constant, users: 1, iterations: 1}
  steps: [{get: /same}]
`;
const props = { tree: parseYAMLToTree(yaml), yamlCode: yaml, documentReady: true, validationErrors: [] };
const request = { name: 'same', method: 'GET', path: '/same', count: 1, failures: 0, avg_ms: 0, min_ms: 0, max_ms: 0, p50_ms: 0, p90_ms: 0, p95_ms: 0, p99_ms: 0 };
const latency = { count: 1, avg_ms: 0, min_ms: 0, max_ms: 0, p50_ms: 0, p90_ms: 0, p95_ms: 0, p99_ms: 0 };
const child = (name: string) => ({ test_name: name, status: 'completed', start_time: '', end_time: '', duration: 1e9, total_requests: 1, total_failures: 0, requests: [{ ...request, scenario_name: name }], history: [], request_latency: latency });
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

it('blocks multiple scenarios on an older backend, including flushed edits', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { rerender } = render(<YAMLLoadRunSession {...props} />);
  expect(screen.getByRole('button', { name: 'Run load test' })).toBeDisabled();
  expect(screen.getByText(/backend does not support multiple scenarios/)).toBeInTheDocument();
  const single = 'test: {name: single}\nscenarios: [{name: A, steps: [{get: /same}]}]';
  rerender(<YAMLLoadRunSession {...props} tree={parseYAMLToTree(single)} yamlCode={single} flushPendingEdits={() => yaml} />);
  fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
  await screen.findByText(/backend does not support multiple scenarios/);
  expect(fetch).not.toHaveBeenCalled();
});

it('keeps live identities and selects exact final scenario results', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'all' }) })));
  vi.stubGlobal('EventSource', ServerStream);
  render(<YAMLLoadRunSession {...props} multiScenarioRunEnabled />);
  fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
  await waitFor(() => expect(ServerStream.instance).toBeDefined());
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ yaml, multi_scenario_contract_version: 1 }) }));
  act(() => ServerStream.instance.emit('metrics', {
    ts: 1, ts_ms: 1000, elapsed_ms: 1000, rps: 2, active_users: 1, executed_vus: 2,
    avg_latency: 0, p95_latency: 0, total_requests: 2, total_failures: 0, errors: 0,
    scenarios: [{ name: 'A', status: 'finished', total_requests: 1, total_failures: 0, executed_vus: 1 }, { name: 'B', status: 'running', total_requests: 1, total_failures: 0, executed_vus: 1 }],
    requests: ['A', 'B'].map(name => ({ ...request, scenario_name: name, step_path: 'scenarios[0].steps[0]', request_key: name })),
  }));
  expect(screen.getByRole('table', { name: 'Scenario progress' })).toHaveTextContent('Afinished110Brunning110');
  expect(screen.getAllByText('/same')).toHaveLength(2);
  act(() => ServerStream.instance.emit('done', { status: 'errored', error: 'A failed', summary: {
    ...child('all'), status: 'failed', partial: false, complete: true, total_requests: 2,
    total_elapsed: 3e9, workload_duration: 2e9, request_latency: { ...latency, count: 2 },
    requests: [child('A').requests[0], child('B').requests[0]],
    node_resources: [{ node: 'local', mem_peak_mb: 0, cpu_peak: 0, go_peak: 0, measurements: { rss_peak_mib: 0 } }],
    scenarios: [{ name: 'A', outcome: 'failed', complete: true, error: 'A failed', result: { ...child('A'), status: 'failed' } }, { name: 'B', outcome: 'completed', complete: true, result: { ...child('B'), total_requests: 0, requests: [], request_latency: undefined } }],
  } }));
  expect(screen.getByText('Status').parentElement).toHaveTextContent('Failed');
  expect(screen.getByText('Evidence').parentElement).toHaveTextContent('Complete');
  expect(screen.getByText('Request p95').parentElement).toHaveTextContent('0ms');
  expect(screen.getByText('RSS Peak').parentElement).toHaveTextContent('0 MiB');
  fireEvent.change(screen.getByRole('combobox', { name: 'Result scope' }), { target: { value: 'B' } });
  expect(screen.getByText('Total Requests').parentElement).toHaveTextContent('0');
  expect(screen.getByText('Request p95').parentElement).toHaveTextContent('Unavailable');
  expect(screen.getByText('RSS Peak').parentElement).toHaveTextContent('Unavailable');
  expect(within(screen.getByRole('combobox', { name: 'Result scope' })).getByRole('option', { name: 'Global' })).toBeInTheDocument();
});

it('shows configured users separately from users executed before local Stop', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'early-stop' }) })));
  vi.stubGlobal('EventSource', ServerStream);
  render(<YAMLLoadRunSession {...props} multiScenarioRunEnabled />);
  fireEvent.click(screen.getByRole('button', { name: 'Run load test' }));
  await waitFor(() => expect(ServerStream.instance).toBeDefined());
  act(() => ServerStream.instance.emit('done', { status: 'stopped', summary: {
    ...child('all'), status: 'stopped', executed_vus: 2, total_elapsed: 1e9, workload_duration: 1e9,
    scenarios: [{ name: 'A', outcome: 'stopped', complete: false,
      load_contract: { scenario_name: 'A', peak_vus: 100, duration: 600e9, load: { users: 100, duration: '10m', ramp_up: '10m' } },
      result: { ...child('A'), status: 'stopped', executed_vus: 2, metadata: { configured_vus: '100' } },
    }, { name: 'B', outcome: 'stopped', complete: false,
      load_contract: { scenario_name: 'B', peak_vus: 2, duration: 0, load: { users: 2, iterations: 1 } },
      result: { ...child('B'), status: 'stopped', executed_vus: 0, metadata: { configured_vus: '2' } },
    }],
  } }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Result scope' }), { target: { value: 'A' } });
  expect(screen.getByText('VUs (exec/conf)').parentElement).toHaveTextContent('2/100');
  fireEvent.change(screen.getByRole('combobox', { name: 'Result scope' }), { target: { value: 'B' } });
  expect(screen.getByText('VUs (exec/conf)').parentElement).toHaveTextContent('0/2');
});
