import { afterEach, expect, it, vi } from 'vitest';
import { createStoredRunStore } from './studioRunStore';

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
it('keeps execution IDs separate for identical scripts in different plans and accounts', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const store = createStoredRunStore('run');
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-01');
  store.store({ id: 'first', fp: 'same-script' });
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-02');
  expect(store.read()).toBeNull();
  store.store({ id: 'second', fp: 'same-script' });
  window.history.replaceState({}, '', '/?embedded=1&account=user-b&plan=tp-01');
  expect(store.read()).toBeNull();
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-01');
  expect(store.read()?.id).toBe('first');
  store.clear();
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-02');
  expect(store.read()?.id).toBe('second');
});
