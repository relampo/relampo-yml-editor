import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { DistributedIntentTick, DistributedState } from '../../utils/distributedApi';
import { DistributedIntentRuntime } from './DistributedIntentRuntime';
import { DistributedTimeline } from './DistributedTimeline';

afterEach(cleanup);
const tick = (node: number, index: number, next: number): DistributedIntentTick => ({
  node_id: node,
  scenario: 'Checkout',
  at: new Date(1000 + index * 1000).toISOString(),
  tick: index,
  elapsed_ms: index * 1000,
  state: next ? 'probing' : 'recovery',
  action: 'adjust',
  slo_ok: true,
  target_unit: 'vus',
  target_value: 5,
  current_vus: 3,
  next_vus: next,
  delta_vus: next - 3,
  rps: node * 2,
  p95_ms: 50 * node,
  violations: 0,
  recoveries: 0,
  target_streak: 0,
});
function state(ticks: DistributedIntentTick[]): DistributedState {
  return { intent_ticks: ticks, scopes: [{ key: 'global' }, { key: 'node:2', node_id: 2 }] } as DistributedState;
}
it.each([1, 2])('keeps the general timeline and Local Intent chart together for %i nodes', nodes => {
  const ticks = [tick(1, 1, 2), tick(1, 2, 4), tick(1, 3, 0)];
  if (nodes === 2) ticks.push(tick(2, 1, 1));
  const { container } = render(
    <LanguageProvider>
      <DistributedTimeline points={[]} />
      <DistributedIntentRuntime
        state={state(ticks)}
        scope="global"
      />
    </LanguageProvider>,
  );
  expect(screen.getByText('Timeline', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Intent runtime timeline')).toBeInTheDocument();
  expect(container.querySelectorAll('svg')).toHaveLength(nodes === 2 ? 3 : 2);
  expect(screen.getByText('3 -> 0')).toBeInTheDocument();
  // The VU series must end at zero when the controller explicitly drops to zero.
  const intent = screen.getByRole('region', { name: 'Load by Intent control' });
  const svg = intent.querySelector('svg[viewBox="0 0 400 200"]')!;
  expect(svg.innerHTML).toContain('3 -&gt; 0');
  expect(svg.querySelector('circle[cx="382"][cy="172"]')).not.toBeNull();
});
it('respects node scope without averaging independent node percentiles or targets', () => {
  render(
    <LanguageProvider>
      <DistributedIntentRuntime
        state={state([tick(1, 1, 4), tick(2, 1, 1)])}
        scope="node:2"
      />
    </LanguageProvider>,
  );
  expect(screen.getByText('Node 2 · Checkout')).toBeInTheDocument();
  expect(screen.getByText('3 -> 1')).toBeInTheDocument();
  expect(screen.queryByText('3 -> 4')).not.toBeInTheDocument();
  expect(screen.getByText('100ms')).toBeInTheDocument();
});
it('deduplicates overlapping polling tails and hides the chart without measurements', () => {
  const sample = tick(1, 1, 2);
  const { rerender } = render(
    <LanguageProvider>
      <DistributedIntentRuntime
        state={state([sample, sample])}
        scope="global"
      />
    </LanguageProvider>,
  );
  expect(screen.getAllByText('3 -> 2')).toHaveLength(1);
  rerender(
    <LanguageProvider>
      <DistributedIntentRuntime
        state={state([])}
        scope="global"
      />
    </LanguageProvider>,
  );
  expect(screen.queryByText('Intent runtime timeline')).not.toBeInTheDocument();
});
