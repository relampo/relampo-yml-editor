import { expect, it, vi } from 'vitest';
import { createTreeClipboard } from './treeClipboard';
import type { YAMLNode } from '../types/yaml';
function bus() {
  const channels: any[] = [];
  return () => {
    const channel: any = {
      onmessage: null,
      close: vi.fn(),
      postMessage(value: unknown) {
        channels.filter(c => c !== channel).forEach(c => c.onmessage?.({ data: structuredClone(value) }));
      },
    };
    channels.push(channel);
    return channel;
  };
}
it('shares snapshots in both directions and supplies the latest copy to a newly opened Studio', () => {
  const factory = bus(),
    a = createTreeClipboard(factory),
    b = createTreeClipboard(factory);
  const first: YAMLNode = {
    id: 'a',
    type: 'transaction',
    name: 'Checkout',
    children: [{ id: 'g', type: 'grpc', name: 'Reserve', data: { message: { eventId: 12 } } }],
  };
  a.subscribe(vi.fn());
  a.copy([first]);
  b.subscribe(vi.fn());
  expect(b.getSnapshot()).toEqual([first]);
  first.children![0].data!.message = { eventId: 99 };
  expect(b.getSnapshot()[0].children![0].data!.message).toEqual({ eventId: 12 });
  const next: YAMLNode = { id: 'b', type: 'request', name: 'Login', data: { method: 'POST', url: '/login' } };
  b.copy([next]);
  expect(a.getSnapshot()).toEqual([next]);
});
it('ignores malformed messages and works without BroadcastChannel', () => {
  let channel: any;
  const store = createTreeClipboard(() => (channel = { onmessage: null, postMessage: vi.fn() }));
  store.subscribe(vi.fn());
  channel.onmessage({ data: { kind: 'snapshot', clock: Date.now(), source: 'other', nodes: [{ type: 'grpc' }] } });
  expect(store.getSnapshot()).toEqual([]);
  const local = createTreeClipboard(() => null);
  local.copy([{ id: 'r', type: 'get', name: 'Health', data: { url: '/health' } }]);
  expect(local.getSnapshot()[0].name).toBe('Health');
});
it('keeps a newer copy when an older tab replies late and releases subscribers', () => {
  const sent: any[] = [];
  let channel: any;
  const store = createTreeClipboard(
    () => (channel = { onmessage: null, postMessage: (message: unknown) => sent.push(message) }),
  );
  const notify = vi.fn(),
    unsubscribe = store.subscribe(notify);
  store.copy([{ id: 'a', type: 'get', name: 'First' }]);
  const old = sent.at(-1);
  store.copy([{ id: 'b', type: 'grpc', name: 'Latest' }]);
  channel.onmessage({ data: old });
  expect(store.getSnapshot()[0].name).toBe('Latest');
  unsubscribe();
  notify.mockClear();
  store.copy([{ id: 'c', type: 'request', name: 'After unsubscribe' }]);
  expect(notify).not.toHaveBeenCalled();
});
it('ignores invalid subtree shapes and retains local copy if browser messaging is unavailable', () => {
  const store = createTreeClipboard(() => {
    throw new Error('browser messaging unavailable');
  });
  const node: YAMLNode = { id: 'r', type: 'request', name: 'Valid' };
  store.copy([node]);
  store.copy([{ ...node, data: null }] as unknown as YAMLNode[]);
  store.copy([{ ...node, children: {} }] as unknown as YAMLNode[]);
  expect(store.getSnapshot()).toEqual([node]);
});
