import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRelay, FakeStream, type FakeSocket } from '../test/fakeRelay';
import { createRelayTransport, type RelayTransport } from './relayTransport';

const CHUNK = 16 * 1024;

let relay: FakeRelay;
let transport: RelayTransport;

function bytes(length: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.from({ length }, (_, index) => index % 251);
}

/** Lets every queued frame arrive. */
async function flush(): Promise<void> {
  for (let turn = 0; turn < 5; turn++) await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.useRealTimers();
});

describe('request', () => {
  it('sends req and end, and builds a Response from res, data and end', async () => {
    relay.agent!.handle = () => ({
      status: 201,
      headers: { 'content-type': 'application/json', 'x-run': '7' },
      body: '{"id":"7"}',
    });

    const response = await transport.request('/api/run/7/report?lang=es', { headers: { Accept: 'text/html' } });

    expect(response.status).toBe(201);
    expect(response.headers.get('x-run')).toBe('7');
    expect(await response.json()).toEqual({ id: '7' });
    const [req] = relay.sent('req');
    expect(req).toMatchObject({ method: 'GET', path: '/api/run/7/report?lang=es', body_frames: 0 });
    expect(req.headers).toMatchObject({ accept: 'text/html' });
    expect(req.id).toEqual(expect.any(String));
    expect(relay.sent('end')).toEqual([{ t: 'end', id: req.id, frames: 0 }]);
  });

  it('opens one connection with a one-time ticket and uses it again', async () => {
    await transport.request('/api/studio/info');
    await transport.request('/api/studio/info');

    expect(relay.ticketsIssued).toBe(1);
    expect(relay.sockets).toHaveLength(1);
  });

  it('cuts a request body into 16 KB data frames', async () => {
    const body = bytes(2 * CHUNK + 100);

    await transport.request('/api/run', { method: 'POST', body, headers: { 'Content-Type': 'text/yaml' } });

    expect(relay.sent('req')[0]).toMatchObject({ method: 'POST', body_frames: 3 });
    expect(relay.sent('data').map(frame => frame.seq)).toEqual([0, 1, 2]);
    expect(relay.sent('end')[0]).toMatchObject({ frames: 3 });
    const [request] = relay.agent!.requests;
    expect(request.headers['content-type']).toBe('text/yaml');
    expect(request.body).toEqual(body);
  });

  it('puts response frames in order by seq, also when res comes last', async () => {
    const body = bytes(5 * CHUNK + 1);
    relay.reorder = true;
    relay.agent!.handle = () => ({ body });

    const response = await transport.request('/api/grpc/bundles/b1');

    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
  });

  it('acknowledges a response after every 16 data frames and after the last one', async () => {
    const body = bytes(200 * CHUNK);
    relay.agent!.handle = () => ({ body });

    const response = await transport.request('/api/grpc/bundles/b1');

    // The fake agent stops at 64 unacknowledged frames, so a full body proves the window.
    expect((await response.arrayBuffer()).byteLength).toBe(body.length);
    const acks = relay.sent('ack').map(frame => frame.seq);
    expect(acks).toEqual([15, 31, 47, 63, 79, 95, 111, 127, 143, 159, 175, 191, 199]);
  });

  it('keeps at most 64 unacknowledged data frames and cancels after 30 seconds at the limit', async () => {
    relay.agent!.sendAcks = false;
    const result = transport.request('/api/run', { method: 'POST', body: bytes(100 * CHUNK) });
    const failure = expect(result).rejects.toThrow(TypeError);

    await flush();
    expect(relay.sent('data')).toHaveLength(64);
    expect(relay.sent('cancel')).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(29_000);
    expect(relay.sent('cancel')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    await flush();

    expect(relay.sent('data')).toHaveLength(64);
    expect(relay.sent('cancel')).toEqual([{ t: 'cancel', id: relay.sent('req')[0].id }]);
    await failure;
  });

  it('starts no timer below the limit', async () => {
    relay.agent!.sendAcks = false;
    let finished = false;
    void transport.request('/api/run', { method: 'POST', body: bytes(10 * CHUNK) }).then(() => {
      finished = true;
    });

    await vi.advanceTimersByTimeAsync(120_000);
    await flush();

    expect(relay.sent('cancel')).toHaveLength(0);
    expect(finished).toBe(true);
  });

  it('sends cancel and rejects with the abort reason when the caller aborts', async () => {
    const stream = new FakeStream();
    relay.agent!.handle = () => stream; // a response that never ends
    const controller = new AbortController();
    const result = transport.request('/api/debug/runs', { method: 'POST', body: '{}', signal: controller.signal });
    const failure = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await flush();

    controller.abort();
    await failure;
    await flush();

    expect(relay.agent!.cancelled).toEqual([relay.sent('req')[0].id]);
  });

  it('does not send anything for a signal that is already aborted', async () => {
    await expect(transport.request('/api/run', { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(relay.sockets).toHaveLength(0);
  });

  it('lets the caller give up while the connection opens', async () => {
    const getTicket = vi.fn(() => new Promise<never>(() => undefined)); // the web app never answers
    transport = createRelayTransport({ getTicket, createSocket: relay.createSocket });
    const controller = new AbortController();
    const failure = expect(transport.request('/api/studio/info', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });

    await flush();
    expect(getTicket).toHaveBeenCalledTimes(1);
    controller.abort();

    await failure;
    expect(relay.received).toEqual([]);
  });

  it('rejects like a failed fetch when the agent cancels', async () => {
    const result = transport.request('/api/run', { method: 'POST', body: '{}' });
    const failure = expect(result).rejects.toThrow(TypeError);
    relay.agent!.handle = () => new FakeStream();
    await flush();

    relay.toWeb(relay.sockets[0], { t: 'cancel', id: relay.sent('req')[0].id });

    await failure;
  });

  it('rejects like a failed fetch when the agent is offline', async () => {
    relay.agent = null;

    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
  });

  it('fails every open request when agent_offline comes with no id', async () => {
    relay.agent!.handle = () => new FakeStream();
    const first = expect(transport.request('/api/run', { method: 'POST', body: '{}' })).rejects.toThrow(TypeError);
    const second = expect(transport.request('/api/debug/runs', { method: 'POST', body: '{}' })).rejects.toThrow(
      TypeError,
    );
    await flush();

    relay.agentGoesOffline();

    await first;
    await second;
  });

  it.each([
    ['plan_not_allowed', '/api/distributed/run', 403],
    ['not_found', '/api/unknown', 404],
  ])('turns the relay error %s into a response with an error text', async (_code, path, status) => {
    relay.features.delete('distributed_run');

    const response = await transport.request(path, { method: 'POST', body: '{}' });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it('refuses a request body over 64 MB before it sends a frame', async () => {
    const response = await transport.request('/api/studio/data-source-files', {
      method: 'POST',
      body: new Uint8Array(4096 * CHUNK + 1),
    });

    expect(response.status).toBe(413);
    expect(relay.received).toEqual([]);
  });

  it('turns the relay error too_large into a 413 response', async () => {
    const result = transport.request('/api/run/7/report');
    relay.agent!.handle = () => new FakeStream();
    await flush();

    relay.toWeb(relay.sockets[0], { t: 'err', id: relay.sent('req')[0].id, code: 'too_large' });

    expect((await result).status).toBe(413);
    // The relay did not forward the frame: the sender ends the request with `cancel`.
    await flush();
    expect(relay.agent!.cancelled).toEqual([relay.sent('req')[0].id]);
  });

  it('cancels a request that gets no res in 150 seconds', async () => {
    // The relay drops an invalid frame with no answer, so only a timeout ends the request.
    relay.agent!.receive = () => undefined;
    const result = transport.request('/api/studio/info');
    const failure = expect(result).rejects.toThrow(TypeError);
    await flush();

    await vi.advanceTimersByTimeAsync(149_000);
    expect(relay.sent('cancel')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);

    await failure;
    expect(relay.sent('cancel')).toHaveLength(1);
  });

  it('starts no timer for the body after res', async () => {
    relay.agent!.handle = () => new FakeStream();
    void transport.request('/api/run/7/report').catch(() => undefined);
    await flush();

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(relay.sent('cancel')).toHaveLength(0);
  });

  it('sends the path as fetch does, with the query string', async () => {
    await transport.request('/api/debug/../studio/info?probe=1');

    expect(relay.sent('req')[0].path).toBe('/api/studio/info?probe=1');
  });

  it('gets a 404 response for a path that the relay refuses after decoding', async () => {
    const response = await transport.request('/api/debug/a%2F%2Fb');

    expect(response.status).toBe(404);
    expect(relay.agent!.requests).toEqual([]);
  });

  it('cancels a response that has more than 4,096 data frames', async () => {
    const result = transport.request('/api/run/7/report');
    relay.agent!.handle = () => new FakeStream();
    await flush();
    const id = relay.sent('req')[0].id;

    relay.toWeb(relay.sockets[0], { t: 'end', id, frames: 4097 });

    expect((await result).status).toBe(413);
    await flush();
    expect(relay.agent!.cancelled).toContain(id);
  });

  it('rejects every open request when the connection closes', async () => {
    relay.agent!.handle = () => new FakeStream();
    const failure = expect(transport.request('/api/run', { method: 'POST', body: '{}' })).rejects.toThrow(TypeError);
    await flush();

    relay.dropConnections();

    await failure;
  });
});

describe('connection', () => {
  it('accepts only a wss relay address', async () => {
    transport = createRelayTransport({
      getTicket: () => Promise.resolve({ relayUrl: 'ws://relay.test/', ticket: 't' }),
      createSocket: relay.createSocket,
    });

    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(relay.sockets).toHaveLength(0);
  });

  it('asks for one new ticket when the relay refuses the handshake, then stops', async () => {
    const getTicket = vi.fn(() => Promise.resolve({ relayUrl: relay.url, ticket: 'used-or-unknown' }));
    transport = createRelayTransport({ getTicket, createSocket: relay.createSocket });

    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(2);

    // No endless retry: Studio waits for the web app.
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(2);

    // "Retry" or a new `relampo:agent-state` lets Studio try again, with one ticket.
    transport.resetBackoff();
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(3);
  });

  it('tells its owner when it stops', async () => {
    const onRefused = vi.fn();
    transport = createRelayTransport({
      getTicket: () => Promise.resolve({ relayUrl: relay.url, ticket: 'used-or-unknown' }),
      createSocket: relay.createSocket,
      onRefused,
    });

    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);

    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it('connects with the second ticket when the relay refuses only the first', async () => {
    const getTicket = vi.fn(() =>
      getTicket.mock.calls.length === 1
        ? Promise.resolve({ relayUrl: relay.url, ticket: 'expired' })
        : relay.issueTicket(),
    );
    transport = createRelayTransport({ getTicket, createSocket: relay.createSocket });

    expect((await transport.request('/api/studio/info')).status).toBe(200);
    expect(getTicket).toHaveBeenCalledTimes(2);
  });

  it('waits with backoff when the web app gives no ticket, and asks again each time', async () => {
    const getTicket = vi.fn(() => Promise.reject<{ relayUrl: string; ticket: string }>(new Error('agent_offline')));
    transport = createRelayTransport({ getTicket, createSocket: relay.createSocket });

    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(2);

    // The second wait is longer than the first.
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(transport.request('/api/studio/info')).rejects.toThrow(TypeError);
    expect(getTicket).toHaveBeenCalledTimes(3);
  });

  it('reconnects with a new ticket after the connection closes', async () => {
    await transport.request('/api/studio/info');
    relay.dropConnections();
    await flush();
    await vi.advanceTimersByTimeAsync(1_000);

    const response = await transport.request('/api/studio/info');

    expect(response.status).toBe(200);
    expect(relay.ticketsIssued).toBe(2);
    expect(relay.sockets).toHaveLength(2);
  });

  it('sends ping every 5 minutes', async () => {
    await transport.request('/api/studio/info');

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await flush();

    // The relay answers with `pong`. Studio does not wait for it.
    expect(relay.sent('ping')).toHaveLength(1);
  });
});

describe('eventStream', () => {
  function open(path = '/api/run/7/events') {
    const streams: FakeStream[] = [];
    relay.agent!.handle = () => {
      const stream = new FakeStream();
      streams.push(stream);
      return stream;
    };
    const source = transport.eventStream(path);
    const events: { type: string; data: string; id: string }[] = [];
    for (const type of ['state', 'metrics', 'done']) {
      source.addEventListener(type, event => events.push({ type, data: event.data, id: event.lastEventId }));
    }
    const opened = vi.fn();
    source.addEventListener('open', opened);
    const errors: number[] = [];
    source.onerror = () => errors.push(source.readyState);
    return { source, streams, events, opened, errors };
  }

  it('asks for the stream and delivers its events by name', async () => {
    const { source, streams, events, opened } = open();
    expect(source.readyState).toBe(0);
    await flush();

    expect(relay.sent('req')[0]).toMatchObject({ method: 'GET', path: '/api/run/7/events', body_frames: 0 });
    expect(relay.sent('req')[0].headers).toMatchObject({ accept: 'text/event-stream' });
    expect(source.readyState).toBe(1);
    expect(opened).toHaveBeenCalledTimes(1);

    streams[0].send('id: 1\nevent: state\ndata: {"status":"running"}\n\n: comment\n\nid: 2\nevent: met');
    streams[0].send('rics\ndata: {"a":1}\ndata: {"b":2}\n\n');
    await flush();

    expect(events).toEqual([
      { type: 'state', data: '{"status":"running"}', id: '1' },
      { type: 'metrics', data: '{"a":1}\n{"b":2}', id: '2' },
    ]);
  });

  it('acknowledges after every 16 data frames of an open stream', async () => {
    const { streams } = open();
    await flush();

    for (let index = 0; index < 40; index++) streams[0].send(`id: ${index}\nevent: metrics\ndata: {}\n\n`);
    await flush();

    expect(relay.sent('ack').map(frame => frame.seq)).toEqual([15, 31]);
  });

  it('reconnects with Last-Event-ID and a new ticket when the connection closes', async () => {
    const { source, streams, events, opened, errors } = open();
    await flush();
    streams[0].send('id: 41\nevent: metrics\ndata: {"n":41}\n\n');
    await flush();

    relay.dropConnections();
    await flush();
    expect(errors).toEqual([0]);
    expect(source.readyState).toBe(0);

    await vi.advanceTimersByTimeAsync(1_000);
    await flush();

    expect(relay.ticketsIssued).toBe(2);
    expect(streams).toHaveLength(2);
    expect(streams[1].lastEventId).toBe('41');
    expect(relay.sent('req')[1].headers).toMatchObject({ 'Last-Event-ID': '41' });
    expect(source.readyState).toBe(1);
    expect(opened).toHaveBeenCalledTimes(2);

    streams[1].send('id: 42\nevent: done\ndata: {}\n\n');
    await flush();
    expect(events.map(event => event.id)).toEqual(['41', '42']);
  });

  it('asks again when the agent goes offline and comes back', async () => {
    const { source, events, errors } = open('/api/debug/runs/9/events');
    await flush();

    relay.agentGoesOffline();
    await flush();
    expect(errors).toEqual([0]);

    const streams: FakeStream[] = [];
    relay.agentComesBack().handle = () => {
      const stream = new FakeStream();
      streams.push(stream);
      return stream;
    };
    await vi.advanceTimersByTimeAsync(1_000);
    await flush();

    expect(source.readyState).toBe(1);
    expect(relay.sockets).toHaveLength(1);
    streams[0].send('event: done\ndata: {}\n\n');
    await flush();
    expect(events).toHaveLength(1);
  });

  it('asks again when the stream gets no res in 150 seconds', async () => {
    const { source, streams } = open();
    const agent = relay.agent!;
    const receive = agent.receive.bind(agent);
    agent.receive = () => undefined;
    await flush();
    expect(streams).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(150_000);
    expect(relay.sent('cancel')).toHaveLength(1);
    agent.receive = receive;
    await vi.advanceTimersByTimeAsync(1_000);
    await flush();

    expect(streams).toHaveLength(1);
    expect(source.readyState).toBe(1);
  });

  it('asks again when the agent ends the stream', async () => {
    const { source, streams, errors } = open();
    await flush();

    streams[0].send('id: 5\nevent: metrics\ndata: {}\n\n');
    streams[0].end();
    await flush();
    expect(errors).toEqual([0]);

    await vi.advanceTimersByTimeAsync(1_000);
    await flush();
    expect(streams).toHaveLength(2);
    expect(streams[1].lastEventId).toBe('5');
    expect(source.readyState).toBe(1);
  });

  it('closes for good when the relay refuses the path', async () => {
    relay.features.delete('local_run');
    const { source, errors } = open();
    await flush();

    expect(source.readyState).toBe(2);
    expect(errors).toEqual([2]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(relay.sent('req')).toHaveLength(1);
  });

  it('closes for good when the agent answers with an error status', async () => {
    relay.agent!.handle = () => ({ status: 404, body: '{"error":"run not found"}' });
    const source = transport.eventStream('/api/run/7/events');
    const errors: number[] = [];
    source.onerror = () => errors.push(source.readyState);
    await flush();

    expect(source.readyState).toBe(2);
    expect(errors).toEqual([2]);
  });

  it('sends cancel on close and delivers nothing after it', async () => {
    const { source, streams, events } = open();
    await flush();

    source.close();
    await flush();
    expect(source.readyState).toBe(2);
    expect(relay.agent!.cancelled).toEqual([relay.sent('req')[0].id]);

    relay.toWeb(relay.sockets[0] as FakeSocket, {
      t: 'data',
      id: relay.sent('req')[0].id,
      seq: 0,
      b64: btoa('event: done\ndata: {}\n\n'),
    });
    await flush();
    expect(events).toEqual([]);
    expect(streams).toHaveLength(1);
  });

  it('does not reconnect after close', async () => {
    const { source } = open();
    await flush();
    source.close();

    relay.dropConnections();
    await vi.advanceTimersByTimeAsync(60_000);
    await flush();

    expect(relay.ticketsIssued).toBe(1);
  });
});

describe('fileUrl', () => {
  it('has no direct URL', () => {
    expect(transport.fileUrl('/api/run/7/report')).toBeNull();
  });
});
