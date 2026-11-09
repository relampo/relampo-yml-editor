import { expect, it, vi } from 'vitest';
import { createCorrelateSource } from './correlateBridge';
it('sends the live document and refuses to replace an editor that has changed', async () => {
  let channel: any;
  let current = { yaml: 'original: true', fileName: 'source.yaml', revision: 1 };
  const update = vi.fn();
  const source = createCorrelateSource(
    () => current,
    update,
    () => (channel = { onmessage: null, postMessage: vi.fn(), close: vi.fn() }),
  );
  source.connect('session');
  await channel.onmessage({ data: { kind: 'ready' } });
  expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'source', document: current }));
  current = { ...current, yaml: 'edited: true', revision: 2 };
  await channel.onmessage({
    data: { kind: 'commit', requestId: 'a', yaml: 'correlated: true', fileName: 'result.yaml' },
  });
  expect(update).not.toHaveBeenCalled();
  expect(channel.postMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'conflict', requestId: 'a' }));
  source.close();
});
it('acknowledges the saved result only after the source update succeeds', async () => {
  let channel: any;
  const current = { yaml: 'original: true', fileName: 'source.yaml', revision: 1 };
  const update = vi.fn(async () => {});
  const source = createCorrelateSource(
    () => current,
    update,
    () => (channel = { onmessage: null, postMessage: vi.fn(), close: vi.fn() }),
  );
  source.connect('session');
  await channel.onmessage({
    data: { kind: 'commit', requestId: 'a', yaml: 'correlated: true', fileName: 'result.yaml' },
  });
  expect(update).toHaveBeenCalledWith('correlated: true', 'result.yaml');
  expect(channel.postMessage).toHaveBeenCalledWith({ kind: 'committed', requestId: 'a' });
  source.close();
});
