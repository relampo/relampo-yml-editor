import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useHTTPRecorder } from './useHTTPRecorder';
vi.mock('../../hooks/useAgentState', () => ({ useAgentState: () => 0 }));
vi.mock('../../hooks/useInFront', () => ({ useInFront: () => [false, () => false] }));
vi.mock('../../utils/debugApi', () => ({ probeStudio: async () => ({ capabilities: { httpRecorder: true } }) }));
vi.mock('../../utils/httpRecorderApi', async original => ({
  ...(await original<typeof import('../../utils/httpRecorderApi')>()),
  httpRecorderRequest: async (path: string) =>
    path === 'options'
      ? { port: 8888, firefoxAvailable: true, firefoxConfigured: true }
      : {
          active: true,
          recording: true,
          baseUrls: 'http://fixture.test',
          applicationUrl: 'http://fixture.test/demo',
          prefixEnabled: true,
          transactionsEnabled: true,
          responses: false,
          totalRequests: 1,
          requests: [],
        },
}));
it('observes options displayed after reconnecting to an existing capture', async () => {
  const { result } = renderHook(() => useHTTPRecorder(true));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.state.applicationUrl).toBe('http://fixture.test/demo');
  expect(result.current.options.applicationUrl).toBe('http://fixture.test/demo');
  expect(result.current.options.baseUrls).toBe('http://fixture.test');
  expect(result.current.options.responses).toBe(false);
  expect(result.current.state.responses).toBe(false);
  expect(result.current.options.transactionsEnabled).toBe(true);
  expect(result.current.state.transactionsEnabled).toBe(true);
});
