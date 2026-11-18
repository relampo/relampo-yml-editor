import { expect, it } from 'vitest';
import { distributedGlobalHistory, type DistributedState, type DistributedPoint } from './distributedApi';

it('corrects legacy final-window rates without losing the beginning of long runs or totals', () => {
  const earlier: DistributedPoint = {
    at: '2026-11-18T16:00:00Z',
    requests: 2,
    failures: 0,
    rps: 2,
    active_vus: 1,
    avg_ms: null,
    p95_ms: null,
  };
  const terminal = { ...earlier, at: '2026-11-18T16:06:00Z', requests: 364, rps: 62.3, active_vus: 0 };
  const canonical = { ...terminal, rps: 0 };
  const state = { scope_history: { global: [earlier, terminal] }, history: [canonical] } as unknown as DistributedState;
  expect(distributedGlobalHistory(state)).toEqual([earlier, canonical]);
  expect(state.scope_history?.global?.[1]?.rps).toBe(62.3);
});
it('uses canonical history when scoped history is unavailable', () => {
  expect(distributedGlobalHistory(null)).toEqual([]);
  expect(distributedGlobalHistory({ history: [] } as unknown as DistributedState)).toEqual([]);
});
