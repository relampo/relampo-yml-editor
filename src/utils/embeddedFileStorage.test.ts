import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { persistEmbeddedScript } from './embeddedFileStorage';
const originalParent = window.parent;
let parent: { postMessage: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.useFakeTimers();
  parent = { postMessage: vi.fn() };
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
});
afterEach(() => {
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  vi.useRealTimers();
});
function reply(data: Record<string, unknown>, source: unknown = parent, origin = window.location.origin) {
  const requestId = parent.postMessage.mock.calls.find(([message]) => message.type === 'relampo:persist-script')![0]
    .requestId;
  window.dispatchEvent(new MessageEvent('message', { origin, source: source as Window, data: { requestId, ...data } }));
}
it('accepts merged YAML only from the matching host and request', async () => {
  const result = persistEmbeddedScript('one', { yaml: 'test: local', fileName: 'script.yaml' }, true);
  let finished = false;
  void result.then(() => {
    finished = true;
  });
  reply({ type: 'relampo:script-persisted', ok: true, yaml: 'test: wrong' }, window);
  reply({ type: 'relampo:script-persisted', ok: true, yaml: 'test: wrong' }, parent, 'https://other.test');
  reply({ type: 'relampo:script-persisted', requestId: 'other', ok: true, yaml: 'test: wrong' });
  await Promise.resolve();
  expect(finished).toBe(false);
  reply({ type: 'relampo:script-persisted', ok: true, yaml: 'test: merged' });
  await expect(result).resolves.toEqual({ yaml: 'test: merged' });
});
it('pauses the timeout for a human review and resumes after their choice', async () => {
  const result = persistEmbeddedScript('one', { yaml: 'test: local', fileName: 'script.yaml' }, true);
  let finished = false;
  void result.then(() => {
    finished = true;
  });
  reply({ type: 'relampo:script-review-state', reviewing: true });
  await vi.advanceTimersByTimeAsync(600000);
  reply({ type: 'relampo:script-persist-progress' });
  await vi.advanceTimersByTimeAsync(600000);
  expect(finished).toBe(false);
  expect(parent.postMessage).toHaveBeenCalledWith(
    { type: 'relampo:save-progress', reviewing: true },
    window.location.origin,
  );
  reply({ type: 'relampo:script-review-state', reviewing: false });
  reply({ type: 'relampo:script-persisted', ok: true });
  await expect(result).resolves.toBeUndefined();
});
it('keeps a real timeout for a stalled host outside the review popup', async () => {
  const result = persistEmbeddedScript('one', { yaml: 'test: local', fileName: 'script.yaml' }, true);
  const assertion = expect(result).rejects.toThrow('did not confirm');
  await vi.advanceTimersByTimeAsync(60001);
  await assertion;
});
it('propagates cancellation without treating it as a saved version', async () => {
  const result = persistEmbeddedScript('one', { yaml: 'test: local', fileName: 'script.yaml' }, true);
  reply({ type: 'relampo:script-persisted', ok: false, error: 'Save cancelled. Your draft is kept.' });
  await expect(result).rejects.toThrow('Your draft is kept');
});
