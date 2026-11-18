import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistributedChart } from './DistributedFeedback';
import type { DistributedPoint } from '../../utils/distributedApi';

const point = (seconds: number, rps: number): DistributedPoint => ({
  at: new Date(1700000000000 + seconds * 1000).toISOString(),
  requests: seconds,
  failures: 0,
  rps,
  active_vus: 1,
  avg_ms: 1,
  p95_ms: 2,
});
describe('distributed live charts', () => {
  it('preserves elapsed spacing when intermediate worker measurements arrive together', () => {
    const { rerender } = render(
      <DistributedChart
        label="Rate"
        points={[point(0, 1), point(1, 2), point(10, 3)]}
        field="rps"
        color="#facc15"
      />,
    );
    const chart = screen.getByRole('img', { name: 'Rate' });
    const path = chart.querySelector('path[fill="none"]');
    expect(path?.getAttribute('d')).toContain('L30,');
    expect(chart).toHaveClass('h-16');
    rerender(
      <DistributedChart
        label="Rate"
        points={[point(0, 1), point(1, 2), point(10, 3)]}
        field="rps"
        color="#facc15"
      />,
    );
    expect(screen.getByRole('img', { name: 'Rate' })).toBe(chart);
    expect(chart.querySelector('path[fill="none"]')).toBe(path);
  });
  it('keeps missing latency measurements as gaps', () => {
    const points = [point(0, 1), { ...point(1, 2), p95_ms: null }, point(2, 3)];
    render(
      <DistributedChart
        label="Latency"
        points={points}
        field="p95_ms"
        color="#60a5fa"
      />,
    );
    const path = screen.getByRole('img', { name: 'Latency' }).querySelector('path[fill="none"]');
    expect(path?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(path?.getAttribute('d')).not.toContain('NaN');
  });
});
