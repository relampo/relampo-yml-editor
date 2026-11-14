import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeAgentHost, resetAgentHostForTests } from './agentHost';
import { agentEventStream, agentFileUrl, agentRequest } from './agentTransport';
import { resetRuntimeConfigForTests } from './runtimeConfig';
import { resetStudioSessionForTests } from './studioAuth';

function useSession(token: string | null, apiBaseUrl = '') {
  window.history.replaceState({}, '', token === null ? '/' : `/?token=${encodeURIComponent(token)}`);
  resetStudioSessionForTests();
  vi.stubEnv('VITE_DEBUG_API_URL', apiBaseUrl);
  resetRuntimeConfigForTests();
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetRuntimeConfigForTests();
  resetStudioSessionForTests();
  window.history.replaceState({}, '', '/');
});

describe('agentRequest', () => {
  it('sends the token in a header and keeps the URL clean', async () => {
    useSession('secret', '/studio');
    const signal = new AbortController().signal;

    await agentRequest('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"yaml":""}',
      signal,
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/studio/api/run');
    expect(init).toMatchObject({ method: 'POST', body: '{"yaml":""}', signal });
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Relampo-Studio-Token')).toBe('secret');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('adds nothing when there is no token', async () => {
    useSession(null);

    await agentRequest('/api/studio/info');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/studio/info');
    expect([...new Headers(init?.headers).keys()]).toEqual([]);
  });

  it('leaves the content type of an upload to the browser', async () => {
    useSession('secret');
    const body = new FormData();
    body.append('file', new File(['id\n1'], 'users.csv'));

    await agentRequest('/api/studio/data-source-files', { method: 'POST', body });

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(init?.body).toBe(body);
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });

  it('passes a connection failure to the caller unchanged', async () => {
    useSession(null);
    const failure = new TypeError('Failed to fetch');
    vi.mocked(fetch).mockRejectedValue(failure);

    await expect(agentRequest('/api/run')).rejects.toBe(failure);
  });
});

describe('agentEventStream', () => {
  it('opens an EventSource with the token in the query string', () => {
    useSession('a+b/c', '/studio');
    const opened: string[] = [];
    class FakeEventSource {
      constructor(url: string) {
        opened.push(url);
      }
    }
    vi.stubGlobal('EventSource', FakeEventSource);

    const stream = agentEventStream('/api/run/7/events');

    expect(stream).toBeInstanceOf(FakeEventSource);
    expect(opened).toEqual(['/studio/api/run/7/events?token=a%2Bb%2Fc']);
  });
});

describe('agentFileUrl', () => {
  it('appends the token to a path that already has a query', () => {
    useSession('secret', '/studio');

    expect(agentFileUrl('/api/run/7/report?lang=es')).toBe('/studio/api/run/7/report?lang=es&token=secret');
  });

  it('returns the plain URL when there is no token', () => {
    useSession(null);

    expect(agentFileUrl('/api/grpc/bundles/b1')).toBe('/api/grpc/bundles/b1');
  });
});

describe('inside the web app frame', () => {
  const originalParent = window.parent;

  afterEach(() => {
    resetAgentHostForTests();
    Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  });

  it('closes the connection to machine A and asks for a new ticket for machine B', async () => {
    /** A relay socket that opens and keeps what Studio sends. */
    class OpenSocket {
      static all: OpenSocket[] = [];
      readyState = 0;
      frames: { t: string; id: string }[] = [];
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      constructor(readonly url: string) {
        OpenSocket.all.push(this);
        queueMicrotask(() => {
          this.readyState = 1;
          this.onopen?.();
        });
      }
      send(text: string) {
        this.frames.push(JSON.parse(text));
      }
      close() {
        this.readyState = 3;
        queueMicrotask(() => this.onclose?.());
      }
    }
    vi.stubGlobal('WebSocket', OpenSocket);
    const fromHost = (data: Record<string, unknown>) =>
      window.dispatchEvent(
        new MessageEvent('message', { origin: window.location.origin, source: parent as unknown as Window, data }),
      );
    let tickets = 0;
    const parent = {
      postMessage: (message: { type: string; requestId: string }) => {
        if (message.type !== 'relampo:relay-ticket-request') return;
        const ticket = `ticket-${++tickets}`;
        fromHost({ type: 'relampo:relay-ticket', requestId: message.requestId, relayUrl: 'wss://relay.test/', ticket });
      },
    };
    Object.defineProperty(window, 'parent', { configurable: true, value: parent });
    window.history.replaceState({}, '', '/?embedded=1');
    initializeAgentHost();
    const sent = (socket: OpenSocket) => vi.waitFor(() => expect(socket.frames.map(frame => frame.t)).toEqual(['req', 'end']));

    // No machine yet, then the user picks machine A.
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'not_selected' });
    fromHost({ type: 'relampo:agent-state', connected: true });
    const toMachineA = agentRequest('/api/studio/info');
    const failure = expect(toMachineA).rejects.toThrow(TypeError);
    await vi.waitFor(() => expect(OpenSocket.all).toHaveLength(1));
    const socketA = OpenSocket.all[0];
    await sent(socketA);

    // The user picks machine B.
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'not_selected' });
    await failure;
    expect(socketA.readyState).toBe(3);
    fromHost({ type: 'relampo:agent-state', connected: true });
    void agentRequest('/api/studio/info').catch(() => undefined);
    await vi.waitFor(() => expect(OpenSocket.all).toHaveLength(2));
    await sent(OpenSocket.all[1]);

    expect(tickets).toBe(2);
    expect(OpenSocket.all.map(socket => new URL(socket.url).searchParams.get('ticket'))).toEqual(['ticket-1', 'ticket-2']);
    // No frame went to the socket of machine A after the change.
    expect(socketA.frames).toHaveLength(2);
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'not_selected' });
  });

  it('uses the relay: no fetch, no file URL, and a ticket request to the parent frame', async () => {
    const parent = { postMessage: vi.fn() };
    Object.defineProperty(window, 'parent', { configurable: true, value: parent });
    window.history.replaceState({}, '', '/?embedded=1&token=secret');
    resetStudioSessionForTests();

    expect(agentFileUrl('/api/run/7/report')).toBeNull();
    const result = agentRequest('/api/studio/info', { signal: AbortSignal.timeout(50) });
    await expect(result).rejects.toThrow();

    expect(fetch).not.toHaveBeenCalled();
    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: 'relampo:relay-ticket-request', requestId: expect.any(String) },
      window.location.origin,
    );
  });
});
