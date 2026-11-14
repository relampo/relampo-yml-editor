import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agentEventStream, agentFileUrl, agentRequest, requestSavedStudioInfo } from './agentTransport';
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

describe('requestSavedStudioInfo', () => {
  it('uses the address and the token of the saved editor, not the session', async () => {
    useSession('session', '/studio');

    await requestSavedStudioInfo('http://127.0.0.1:4321/?token=saved');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:4321/api/studio/info');
    expect(init).toMatchObject({ headers: { 'X-Relampo-Studio-Token': 'saved' }, credentials: 'omit' });
  });
});
