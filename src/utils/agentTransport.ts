// The one place where Studio talks to the Relampo backend (the local agent).
//
// Callers pass a backend path ('/api/...'), never a URL. They get back the
// same shapes the browser gives: a fetch Response, an EventSource-like stream,
// or a link (see AgentFileLink). An upload is a request with a FormData body.
//
// There are two transports:
// - Inside the frame of the Relampo web app: the relay (relayTransport.ts,
//   section 8 of the web and CLI contract). The agent listens on no port.
// - Everywhere else: same-origin HTTP with the Studio session token. This is
//   the Studio that a CLI serves on loopback (`relampo studio`).

import { isEmbeddedStudio, markRelayRefused, requestRelayTicket, subscribeAgentState } from './agentHost';
import { createRelayTransport } from './relayTransport';
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
   * Null when the transport has no such URL: read the file with `request`.
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

// ponytail: the HTTP transport stays for the stable CLI, which still serves
// Studio and its HTTP API, and for the browser tests. Delete it, studioAuth.ts
// and the standalone recorder and Correlate pages at the cut-over, when no CLI
// serves Studio.
const relayTransport = createRelayTransport({ getTicket: requestRelayTicket, onRefused: markRelayRefused });
// A new machine state, or "Retry", ends the reconnect wait: the next request tries at once.
subscribeAgentState(() => relayTransport.resetBackoff());

/** True when the agent is reached through the relay and not over HTTP. */
export function usesRelay(): boolean {
  return isEmbeddedStudio();
}

function transport(): AgentTransport {
  return usesRelay() ? relayTransport : httpTransport;
}

export function agentRequest(path: string, init?: RequestInit): Promise<Response> {
  return transport().request(path, init);
}

export function agentEventStream(path: string): AgentEventStream {
  return transport().eventStream(path);
}

export function agentFileUrl(path: string): string | null {
  return transport().fileUrl(path);
}
