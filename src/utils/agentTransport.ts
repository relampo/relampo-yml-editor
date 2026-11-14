// The one place where Studio talks to the Relampo backend (the local agent).
//
// Callers pass a backend path ('/api/...'), never a URL. They get back the
// same shapes the browser gives: a fetch Response, an EventSource-like stream,
// or a link (see AgentFileLink). An upload is a request with a FormData body.
//
// Today there is one transport: same-origin HTTP with the Studio session token.
// Step 2 of the web and CLI contract adds a second one that speaks the relay
// protocol (section 8). It implements AgentTransport and replaces the
// `transport` constant below. No caller changes.

import { getRuntimeConfig } from './runtimeConfig';
import { studioAuthHeaders, withStudioToken } from './studioAuth';

/** The part of EventSource that Studio uses. */
export interface AgentEventStream {
  /** Same values as EventSource: 0 connecting, 1 open, 2 closed. */
  readonly readyState: number;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  close(): void;
}

/** Same value as EventSource.CLOSED. */
export const AGENT_STREAM_CLOSED = 2;

export interface AgentTransport {
  /** Like fetch. Rejects with a TypeError when the agent is unreachable. */
  request(path: string, init?: RequestInit): Promise<Response>;
  /** Like new EventSource: a server-sent event stream that reconnects by itself. */
  eventStream(path: string): AgentEventStream;
  /**
   * A URL the browser can open by itself (a report in a new tab, a download).
   * Null when the transport has no such URL.
   */
  fileUrl(path: string): string | null;
}

function url(path: string): string {
  return getRuntimeConfig().apiBaseUrl + path;
}

// Requests carry the token in a header. Streams and links carry it in the
// query string, because EventSource and <a href> cannot set headers.
const httpTransport: AgentTransport = {
  request: (path, init) => fetch(url(path), { ...init, headers: studioAuthHeaders(init?.headers) }),
  eventStream: path => new EventSource(withStudioToken(url(path))),
  fileUrl: path => withStudioToken(url(path)),
};

const transport: AgentTransport = httpTransport;

export function agentRequest(path: string, init?: RequestInit): Promise<Response> {
  return transport.request(path, init);
}

export function agentEventStream(path: string): AgentEventStream {
  return transport.eventStream(path);
}

export function agentFileUrl(path: string): string | null {
  return transport.fileUrl(path);
}

// A saved recording is served by a second Studio process on its own loopback
// port, with its own token in `editorURL`. This reads its /api/studio/info.
// ponytail: this does not use the transport, because the target is another
// process. Step 2 has no second process (the agent listens on no port), so the
// backend route must then return the script itself and this function goes away.
export function requestSavedStudioInfo(editorURL: string): Promise<Response> {
  const address = new URL(editorURL);
  const token = address.searchParams.get('token');
  return fetch(new URL('/api/studio/info', address.origin), {
    headers: token ? { 'X-Relampo-Studio-Token': token } : {},
    signal: AbortSignal.timeout(10000),
    credentials: 'omit',
  });
}
