import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { DistributedState } from '../utils/distributedApi';
import { useDistributedReportStorage } from './useDistributedReportStorage';

const mocks = vi.hoisted(() => ({ save: vi.fn(), available: vi.fn(), context: vi.fn() }));
vi.mock('../utils/localRunReports', () => ({
  persistDistributedRunReports: mocks.save,
  localReportStorageAvailable: mocks.available,
  localReportContext: mocks.context,
}));
const ready = {
  id: 'drun-1',
  reports_ready: true,
  report_formats: ['html', 'json'],
  started_at: '2026-11-19T20:00:00Z',
  repository: 'owner/executor',
  run_id: 123,
} as DistributedState;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.context.mockReturnValue({ planKey: 'saas-plan:account:plan', scriptId: 'login' });
  mocks.available.mockResolvedValue(true);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

it('waits for published reports, then saves all formats exactly once across remounts', async () => {
  const { rerender, unmount } = renderHook(({ state }) => useDistributedReportStorage(state, 'drun-1', 'en'), {
    initialProps: { state: { ...ready, reports_ready: false } },
  });
  expect(mocks.save).not.toHaveBeenCalled();
  rerender({ state: ready });
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  expect(mocks.save).toHaveBeenCalledWith('drun-1', ['html', 'json'], ready.started_at, 'en', {
    planKey: 'saas-plan:account:plan',
    scriptId: 'login',
  });
  await waitFor(() => expect(sessionStorage.length).toBe(1));
  unmount();
  renderHook(() => useDistributedReportStorage(ready, 'drun-1', 'en'));
  expect(mocks.save).toHaveBeenCalledTimes(1);
});
it('preserves provider reports and allows retry after destination failure', async () => {
  mocks.save.mockRejectedValueOnce(Error('Reconnect this repository to continue.'));
  const { result } = renderHook(() => useDistributedReportStorage(ready, 'drun-1', 'en'));
  await waitFor(() => expect(result.current.error).toContain('Reconnect'));
  expect(sessionStorage.length).toBe(0);
  act(() => result.current.retry());
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.error).toBe(''));
});
it('does not mark old HTML-only runs as saved or attach standalone runs to another plan', async () => {
  const { result, unmount } = renderHook(() =>
    useDistributedReportStorage({ ...ready, report_formats: ['html'] }, 'drun-1', 'en'),
  );
  await waitFor(() => expect(result.current.error).toContain('did not generate Analysis JSON'));
  expect(mocks.save).not.toHaveBeenCalled();
  unmount();
  mocks.context.mockReturnValue(undefined);
  renderHook(() => useDistributedReportStorage(ready, 'drun-1', 'en'));
  expect(mocks.save).not.toHaveBeenCalled();
});
