import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { DistributedSummary } from './DistributedSummary';
import type { DistributedState } from '../../utils/distributedApi';
afterEach(cleanup);
it('shows merged request percentiles, total RPS and real per-node resource peaks', () => {
  const stats = {
    requests: 100,
    failures: 2,
    latency_samples: 100,
    elapsed_seconds: 10,
    rps: 10,
    avg_ms: 20,
    min_ms: 1,
    max_ms: 99,
    p50_ms: 15,
    p90_ms: 30,
    p95_ms: 40,
    p99_ms: 80,
  };
  const state = {
    id: 'fixture',
    status: 'completed',
    stage: 'reports_ready',
    scopes: [
      { key: 'global', total: stats, window: { ...stats, rps: 0 } },
      { key: 'request-global:login', scenario: 'A', name: 'GET /login', total: stats, window: stats },
      {
        key: 'request:1:login',
        scenario: 'A',
        name: 'GET /login',
        node_id: 1,
        total: { ...stats, requests: 60 },
        window: stats,
      },
    ],
    nodes: [
      {
        key: 'one',
        node_id: 1,
        progress: { peak_vus: 5, resource_measurements: { rss_peak_mib: 34, cpu_percent_peak: 0.4 } },
      },
    ],
    history: [],
  } as unknown as DistributedState;
  render(
    <DistributedSummary
      state={state}
      plan={null}
      scope="global"
      reportURL="/report"
      hasTransactions={false}
      es
    />,
  );
  const table = screen.getByRole('table', { name: 'Resumen por petición' });
  expect(within(table).getAllByRole('row')).toHaveLength(2);
  for (const value of ['15.0ms', '30.0ms', '40.0ms', '80.0ms'])
    expect(within(table).getByText(value)).toBeInTheDocument();
  expect(screen.getByText('RPS').parentElement).toHaveTextContent('10.0');
  expect(screen.getByText('34 MiB')).toBeInTheDocument();
  expect(screen.getByText('0.4%')).toBeInTheDocument();
  expect(screen.getByText('5/—')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Abrir el reporte completo' })).toHaveAttribute('href', '/report');
});
