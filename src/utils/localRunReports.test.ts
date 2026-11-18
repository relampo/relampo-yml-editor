import { afterEach, expect, it, vi } from 'vitest';
import { persistLocalRunReports } from './localRunReports';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('./agentTransport', () => ({ agentRequest: mocks.request }));
vi.mock('./embeddedPlanDraft', () => ({ embeddedPlanDraftKey: () => 'saas-plan:qa:plan-1' }));
afterEach(() => {
  vi.unstubAllGlobals();
  mocks.request.mockReset();
});
it('saves only selected formats, preserving report bytes and requiring acknowledgement from the plan owner', async () => {
  const bytes = new Uint8Array([0, 255, 65]);
  mocks.request.mockImplementation(async () => new Response(bytes));
  const parent = {
    postMessage: vi.fn(message => {
      queueMicrotask(() =>
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: location.origin,
            source: parent as unknown as Window,
            data: { type: 'relampo:run-reports-persisted', requestId: message.requestId, ok: true },
          }),
        ),
      );
    }),
  };
  vi.stubGlobal('parent', parent);
  await persistLocalRunReports('lrun-1', ['json', 'csv'], '2026-11-18T20:00:00Z', 'en');
  expect(mocks.request.mock.calls.map(call => call[0])).toEqual([
    '/api/run/lrun-1/report/json',
    '/api/run/lrun-1/report/csv',
  ]);
  const message = parent.postMessage.mock.calls[0][0];
  expect(message.planKey).toBe('saas-plan:qa:plan-1');
  expect(message.files.map((file: { path: string }) => file.path)).toEqual([
    'Reports/2026-11-18T20-00-00-000Z-lrun-1/report.json',
    'Reports/2026-11-18T20-00-00-000Z-lrun-1/report.csv',
  ]);
  expect([...atob(message.files[0].data)].map(c => c.charCodeAt(0))).toEqual([...bytes]);
});
it('does not publish partial reports when generation of a selected format fails', async () => {
  mocks.request.mockResolvedValue(new Response(JSON.stringify({ error: 'report not available yet' }), { status: 409 }));
  const parent = { postMessage: vi.fn() };
  vi.stubGlobal('parent', parent);
  await expect(persistLocalRunReports('lrun-1', ['txt'], '2026-11-18T20:00:00Z', 'en')).rejects.toThrow(
    'report not available yet',
  );
  expect(parent.postMessage).not.toHaveBeenCalled();
});

it('never writes an old execution into another plan or script after navigation', async () => {
  const parent = { postMessage: vi.fn() };
  vi.stubGlobal('parent', parent);
  await expect(
    persistLocalRunReports('lrun-1', ['json'], '2026-11-18T20:00:00Z', 'en', {
      planKey: 'saas-plan:qa:other',
      scriptId: 'default',
    }),
  ).rejects.toThrow('original Test Plan');
  expect(mocks.request).not.toHaveBeenCalled();
  expect(parent.postMessage).not.toHaveBeenCalled();
});
