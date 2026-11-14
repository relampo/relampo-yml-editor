import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRelay, FakeStream, type RelayFrame } from '../test/fakeRelay';
import { streamDebugRun } from './debugApi';
import { createRelayTransport, type RelayTransport } from './relayTransport';
import { streamLoadRun } from './runApi';

// Contract 0.18, section 8, "Lost frames": a try to open the stream again
// that gets no `res` in 10 seconds is a failed try, and the web side tries
// again with backoff. A view reports a lost connection only after 5 failed
// tries in a row. The Run view and the Debug view read their stream here.

let relay: FakeRelay;
let transport: RelayTransport;
let streams: FakeStream[];

vi.mock('./agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('./agentTransport')>()),
  usesRelay: () => true,
  agentEventStream: (path: string) => transport.eventStream(path),
}));
vi.mock('./analytics', () => ({ trackStudioRunStarted: vi.fn(), trackStudioRunCompleted: vi.fn() }));

const DONE = 'id: 9\nevent: done\ndata: {"status":"completed"}\n\n';
const views = [
  [
    'the Run view',
    (handlers: { onDone: () => void; onConnectionError: () => void }) =>
      streamLoadRun('run-1', { onState: vi.fn(), onMetrics: vi.fn(), onLog: vi.fn(), ...handlers }),
  ],
  [
    'the Debug view',
    (handlers: { onDone: () => void; onConnectionError: () => void }) =>
      streamDebugRun('debug-1', { onEvent: vi.fn(), ...handlers }),
  ],
] as const;

/** Loses the next frame of this type for the web side, or every one, and tells nobody. */
function lose(type: string, every = false) {
  let lost = false;
  relay.drop = (frame: RelayFrame, to) => {
    if (to !== 'web' || frame.t !== type || (lost && !every)) return false;
    lost = true;
    return true;
  };
}

const requests = () => relay.sent('req').length;

beforeEach(() => {
  vi.useFakeTimers();
  streams = [];
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  relay.agent!.handle = () => {
    const stream = new FakeStream();
    streams.push(stream);
    return stream;
  };
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.useRealTimers();
});

describe.each(views)('the stream of %s', (_name, subscribe) => {
  it('keeps the run when a frame is lost and the first new try gets no res', async () => {
    const handlers = { onDone: vi.fn(), onConnectionError: vi.fn() };
    subscribe(handlers);
    await vi.advanceTimersByTimeAsync(0);
    expect(streams).toHaveLength(1);

    // A `data` frame is lost. Studio sees it 5 seconds after the next frame.
    lose('data');
    streams[0].send(': lost\n\n');
    streams[0].send(': next\n\n');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(relay.sent('cancel')).toHaveLength(1);

    // The first new try: its `res` is lost.
    lose('res');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(requests()).toBe(2);
    await vi.advanceTimersByTimeAsync(9_900);
    expect(requests()).toBe(2);

    // 10 seconds with no `res`: a failed try. The next try opens the stream.
    await vi.advanceTimersByTimeAsync(100 + 2_000);
    expect(requests()).toBe(3);
    expect(relay.sent('cancel')).toHaveLength(2);
    streams.at(-1)!.send(DONE);
    await vi.advanceTimersByTimeAsync(0);

    expect(handlers.onDone).toHaveBeenCalledTimes(1);
    expect(handlers.onConnectionError).not.toHaveBeenCalled();
  });

  it('reports a lost connection only after 5 failed tries in a row', async () => {
    const handlers = { onDone: vi.fn(), onConnectionError: vi.fn() };
    subscribe(handlers);
    await vi.advanceTimersByTimeAsync(0);

    lose('res', true);
    streams[0].end();
    // 5 tries of 10 seconds, after waits of 1, 2, 4, 8 and 16 seconds.
    await vi.advanceTimersByTimeAsync(80_900);
    expect(requests()).toBe(6);
    expect(handlers.onConnectionError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(handlers.onConnectionError).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(requests()).toBe(6);
    expect(handlers.onDone).not.toHaveBeenCalled();
  });
});
