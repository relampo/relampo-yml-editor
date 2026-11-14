import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRelay, FakeStream, type RelayFrame } from '../test/fakeRelay';
import { startDebugRun } from './debugApi';
import { createRelayTransport, type RelayTransport } from './relayTransport';
import { startLoadRun } from './runApi';

// Contract 0.16, section 8, "Lost frames": Studio chooses the id of a run. So
// a start with no answer can be found again with the events of that id.

let relay: FakeRelay;
let transport: RelayTransport;
/** The runs of the agent, by id. */
let runs: Set<string>;

vi.mock('./agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('./agentTransport')>()),
  usesRelay: () => true,
  agentRequest: (path: string, init?: RequestInit) => transport.request(path, init),
  agentEventStream: (path: string) => transport.eventStream(path),
}));

const yaml = 'test:\n  name: checkout\n';
const starts = [
  ['a load run', '/api/run', () => startLoadRun(yaml)],
  ['a debug run', '/api/debug/runs', () => startDebugRun(yaml)],
] as const;

/** Loses the first frame of this type for a request to this path, and tells nobody. */
function lose(type: string, path: (text: string) => boolean) {
  const lost = new Set<string>();
  relay.drop = (frame: RelayFrame) => {
    const request = relay.sent('req').find(item => item.id === frame.id);
    const key = `${type} ${String(request?.path)}`;
    if (frame.t !== type || !request || !path(String(request.path)) || lost.has(key)) return false;
    lost.add(key);
    return true;
  };
}

function posts() {
  return relay.sent('req').filter(frame => frame.method === 'POST');
}

beforeEach(() => {
  vi.useFakeTimers();
  runs = new Set();
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  relay.agent!.handle = ({ method, path, body }) => {
    if (method === 'POST') {
      const { id } = JSON.parse(new TextDecoder().decode(body)) as { id: string };
      runs.add(id);
      return { status: 201, body: JSON.stringify({ id }) };
    }
    return runs.has(path.split('/').at(-2)!) ? new FakeStream() : { status: 404, body: '{"error":"run not found"}' };
  };
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.useRealTimers();
});

describe.each(starts)('the start of %s', (_name, path, start) => {
  it('sends an id that Studio chose', async () => {
    const id = await start();

    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect([...runs]).toEqual([id]);
  });

  it('finds the run by its id when the answer is lost, and does not start again', async () => {
    lose('res', text => text === path);

    const result = start();
    await vi.advanceTimersByTimeAsync(60_000);
    const id = await result;

    expect([...runs]).toEqual([id]);
    expect(posts()).toHaveLength(1);
    expect(relay.sent('req').at(-1)).toMatchObject({ method: 'GET', path: `${path}/${id}/events` });
  });

  it('says that the run did not start about 30 seconds after a lost req, not 150', async () => {
    // Contract 0.17: a start has 30 seconds before `res`. The id makes this safe.
    lose('req', text => text === path);
    let message = '';
    void start().catch((error: Error) => (message = error.message));

    await vi.advanceTimersByTimeAsync(29_900);
    expect(message).toBe('');
    expect(relay.sent('req')).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(10_100);
    expect(message).toBe('The run did not start. Try again.');
    expect([...runs]).toEqual([]);
    expect(posts()).toHaveLength(1);
    // Studio gave up the start: the agent must not hold it.
    expect(relay.sent('cancel')).toContainEqual({ t: 'cancel', id: posts()[0].id });
  });

  it('keeps the first error when the events give no answer in 10 seconds', async () => {
    // The start and the read of the events lose their `req`.
    lose('req', () => true);
    let message = '';
    void start().catch((error: Error) => (message = error.message));

    await vi.advanceTimersByTimeAsync(30_000 + 9_900);
    expect(message).toBe('');

    await vi.advanceTimersByTimeAsync(100);
    expect(message).toMatch(/did not confirm the start. It can have done the work/);
    expect(posts()).toHaveLength(1);
  });
});
