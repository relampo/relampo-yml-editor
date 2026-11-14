import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRelay, type RelayFrame } from '../../test/fakeRelay';
import { advance } from '../../test/lostFrames';
import { createRelayTransport, type RelayTransport } from '../../utils/relayTransport';
import { useHTTPRecorder } from './useHTTPRecorder';

// Contract 0.15, section 8, "Lost frames": the relay can lose a frame and tell
// nobody. The recorder reads its state on a timer. A lost frame must end in a
// new read, never in a view that waits for ever.

let relay: FakeRelay;
let transport: RelayTransport;
let recording: { active: boolean; totalRequests: number; requests: unknown[] };
let posts: string[];

vi.mock('../../utils/agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/agentTransport')>()),
  usesRelay: () => true,
  agentRequest: (path: string, init?: RequestInit) => transport.request(path, init),
}));
vi.mock('../../utils/debugApi', () => ({
  probeStudio: vi.fn(async () => ({ studio: true, capabilities: { httpRecorder: true } })),
}));

const idle = { active: false, totalRequests: 0, requests: [] };
const ROOT = '/api/recorder/http/';

/** Loses the first frame that matches, and tells nobody. */
function loseOnce(to: 'web' | 'agent', type: string, path = 'current') {
  let lost = false;
  relay.drop = (frame: RelayFrame, side) => {
    const request = relay.sent('req').find(item => item.id === frame.id);
    if (lost || side !== to || frame.t !== type || request?.path !== ROOT + path) return false;
    lost = true;
    return true;
  };
}

async function openRecorder() {
  const view = renderHook(() => useHTTPRecorder(true));
  await advance(0);
  expect(view.result.current.ready).toBe(true);
  return view.result;
}

beforeEach(() => {
  vi.useFakeTimers();
  recording = idle;
  posts = [];
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  relay.agent!.handle = ({ method, path }) => {
    const name = path.slice(ROOT.length);
    if (name === 'options') return { body: JSON.stringify({ port: 8888, firefoxAvailable: true }) };
    if (method === 'POST') posts.push(name);
    if (name === 'start') recording = { ...idle, active: true };
    if (name === 'stop') recording = { ...idle, totalRequests: 3 };
    return { body: JSON.stringify(recording) };
  };
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.useRealTimers();
});

describe('the read on a timer', () => {
  // A lost `data` frame shows 5 seconds after `end`: the transport gives up first.
  it.each([
    ['req', 'agent', 10],
    ['res', 'web', 10],
    ['data', 'web', 5],
    ['end', 'web', 10],
  ] as const)('gives up when %s is lost, and reads again at the next tick', async (type, to, seconds) => {
    const recorder = await openRecorder();
    loseOnce(to, type);
    recording = { ...idle, totalRequests: 1 };

    await advance(1000);
    await advance(seconds * 1000 - 100);
    expect(recorder.current.state.totalRequests).toBe(0);
    expect(recorder.current.error).toBe('');
    expect(relay.sent('cancel')).toHaveLength(0);

    await advance(100);
    expect(recorder.current.error).toMatch(/did not answer in time|did not arrive/);
    expect(relay.sent('cancel')).toHaveLength(1);

    await advance(1000);
    expect(recorder.current.state.totalRequests).toBe(1);
    expect(recorder.current.error).toBe('');
  });
});

describe('a POST with no answer', () => {
  it('shows no error and sends start one time when the agent started the recording', async () => {
    const recorder = await openRecorder();
    loseOnce('web', 'res', 'start');

    act(() => void recorder.current.start());
    await advance(60_000);

    expect(posts).toEqual(['start']);
    expect(recorder.current.state.active).toBe(true);
    expect(recorder.current.error).toBe('');
    expect(recorder.current.busy).toBe('');
  });

  it('shows the error when the agent did not start the recording', async () => {
    const recorder = await openRecorder();
    loseOnce('agent', 'req', 'start');

    act(() => void recorder.current.start());
    await advance(150_000);

    expect(posts).toEqual([]);
    expect(relay.sent('req').filter(frame => frame.path === ROOT + 'start')).toHaveLength(1);
    expect(recorder.current.state.active).toBe(false);
    expect(recorder.current.error).not.toBe('');
    expect(recorder.current.busy).toBe('');
  });

  it('shows no error and sends stop one time when the agent stopped the recording', async () => {
    const recorder = await openRecorder();
    act(() => void recorder.current.start());
    await advance(1000);
    expect(recorder.current.state.active).toBe(true);
    loseOnce('web', 'end', 'stop');

    act(() => void recorder.current.stop());
    await advance(60_000);

    expect(posts).toEqual(['start', 'stop']);
    expect(recorder.current.state).toMatchObject({ active: false, totalRequests: 3 });
    expect(recorder.current.error).toBe('');
    expect(recorder.current.busy).toBe('');
  });
});
