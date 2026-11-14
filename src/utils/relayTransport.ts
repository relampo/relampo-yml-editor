// The relay implementation of AgentTransport: HTTP requests and responses
// carried as JSON frames over one WebSocket. It follows section 8 of the web
// and CLI contract (relampo-control-plane/docs/web-cli-contract.md).
//
// Studio has no relay configuration. It gets the relay address with each
// one-time ticket (section 9), so every connection asks for a new ticket.

import type { AgentEventStream, AgentTransport } from './agentTransport';

const CHUNK_BYTES = 16 * 1024;
/** 64 MB: the limit of a body that is not an event stream. */
const MAX_FRAMES = 4096;
const ACK_EVERY = 16;
/** A sender has at most this many data frames without an `ack`. */
const WINDOW = 64;
const ACK_TIMEOUT_MS = 30_000;
/**
 * How long a request waits for `res`. The relay drops an invalid frame with no
 * answer, so this is the only signal. It is longer than every timeout that a
 * caller sets (the longest is 120 seconds, for Correlate).
 */
const RESPONSE_TIMEOUT_MS = 150_000;
const PING_INTERVAL_MS = 5 * 60_000;
const BACKOFF_START_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

const SOCKET_OPEN = 1;
const STREAM_CONNECTING = 0;
const STREAM_OPEN = 1;
const STREAM_CLOSED = 2;

export interface RelayTicket {
  relayUrl: string;
  ticket: string;
}

export interface RelayOptions {
  /** Asks the web app for a one-time ticket. Rejects when no machine is available. */
  getTicket: () => Promise<RelayTicket>;
  /** Tests pass a fake. The default is the WebSocket of the browser. */
  createSocket?: (address: string) => WebSocket;
  /** The relay refused the connection and the transport stopped. `resetBackoff` lets it try again. */
  onRefused?: () => void;
}

type Frame = { t?: unknown; id?: unknown; [field: string]: unknown };

/** Why an exchange stopped before its `end`. */
type Failure =
  | 'closed'
  | 'cancelled'
  | 'protocol'
  | 'ack_timeout'
  | 'no_response'
  | 'agent_offline'
  | 'plan_not_allowed'
  | 'not_found'
  | 'too_large';

interface ExchangeHandlers {
  /** An event stream has no frame limit. */
  stream: boolean;
  onResponse(status: number, headers: Record<string, string>): void;
  /** Body chunks, in order. */
  onChunk(chunk: Uint8Array<ArrayBuffer>): void;
  onEnd(): void;
  onFailure(reason: Failure): void;
}

function backoff(failures: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_START_MS * 2 ** (failures - 1));
}

function encodeBase64(bytes: Uint8Array): string {
  let text = '';
  for (let index = 0; index < bytes.length; index++) text += String.fromCharCode(bytes[index]);
  return btoa(text);
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function unreachable(detail: string): TypeError {
  // A TypeError, like a fetch that cannot connect. Callers already handle it.
  return new TypeError(`Could not reach the Relampo agent: ${detail}`);
}

/** One request and its response on the connection. */
class Exchange {
  // Receiving side.
  private buffered = new Map<number, string>();
  private next = 0;
  private acknowledged = 0;
  private total: number | null = null;
  private responded = false;
  // Sending side.
  private peerAcknowledged = 0;
  private ackWaiter: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private responseTimer: ReturnType<typeof setTimeout> | undefined;
  private done = false;

  constructor(
    readonly id: string,
    private send: (frame: Frame) => void,
    private handlers: ExchangeHandlers,
    private release: () => void,
  ) {}

  /** Sends `req`, the body as data frames, and `end`. It waits when 64 frames have no `ack`. */
  async sendRequest(method: string, path: string, headers: Record<string, string>, body: Uint8Array): Promise<void> {
    const frames = Math.ceil(body.length / CHUNK_BYTES);
    this.send({ t: 'req', id: this.id, method, path, headers, body_frames: frames });
    for (let seq = 0; seq < frames && !this.done; seq++) {
      while (seq - this.peerAcknowledged >= WINDOW) await this.waitForAck();
      this.send({
        t: 'data',
        id: this.id,
        seq,
        b64: encodeBase64(body.subarray(seq * CHUNK_BYTES, (seq + 1) * CHUNK_BYTES)),
      });
    }
    if (this.done) return;
    // Always, also with no body: the agent accepts the `end` that follows a request.
    this.send({ t: 'end', id: this.id, frames });
    if (!this.responded) this.responseTimer = setTimeout(() => this.cancel('no_response'), RESPONSE_TIMEOUT_MS);
  }

  // The 30-second timer runs only here, at the limit of the window.
  private waitForAck(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.cancel('ack_timeout'), ACK_TIMEOUT_MS);
      this.ackWaiter = {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  }

  receive(frame: Frame): void {
    if (this.done) return;
    if (frame.t === 'res') {
      const status = frame.status;
      if (typeof status !== 'number' || !Number.isInteger(status) || status < 200 || status > 599) {
        this.cancel('protocol');
        return;
      }
      const headers: Record<string, string> = {};
      if (frame.headers && typeof frame.headers === 'object') {
        for (const [name, value] of Object.entries(frame.headers)) if (typeof value === 'string') headers[name] = value;
      }
      this.responded = true;
      clearTimeout(this.responseTimer);
      this.handlers.onResponse(status, headers);
      this.deliver();
    } else if (frame.t === 'data') {
      this.receiveData(frame.seq, frame.b64);
    } else if (frame.t === 'end') {
      if (typeof frame.frames !== 'number' || !Number.isInteger(frame.frames) || frame.frames < this.next) {
        this.cancel('protocol');
      } else if (!this.handlers.stream && frame.frames > MAX_FRAMES) {
        this.cancel('too_large');
      } else {
        this.total = frame.frames;
        this.acknowledge();
      }
    } else if (frame.t === 'ack') {
      if (typeof frame.seq === 'number') this.peerAcknowledged = Math.max(this.peerAcknowledged, frame.seq + 1);
      const waiter = this.ackWaiter;
      this.ackWaiter = null;
      waiter?.resolve();
    } else if (frame.t === 'cancel') {
      // A `cancel` from the agent before `end` is a failed request, for example
      // a response that passed 64 MB after `res`.
      this.fail('cancelled');
    } else if (frame.t === 'err') {
      const code = frame.code;
      // The relay did not forward a frame that is too large. The agent can
      // hold the start of the request, so the sender ends it with `cancel`.
      if (code === 'too_large') this.cancel('too_large');
      else
        this.fail(code === 'agent_offline' || code === 'plan_not_allowed' || code === 'not_found' ? code : 'protocol');
    }
  }

  private receiveData(seq: unknown, b64: unknown): void {
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0 || typeof b64 !== 'string') {
      this.cancel('protocol');
      return;
    }
    if (!this.handlers.stream && seq >= MAX_FRAMES) {
      this.cancel('too_large');
      return;
    }
    // The sender may not be more than 64 frames past the last `ack`. This also
    // limits the frames that wait here for an earlier one.
    if (seq >= this.acknowledged + WINDOW) {
      this.cancel('protocol');
      return;
    }
    if (seq < this.next || this.buffered.has(seq)) return;
    this.buffered.set(seq, b64);
    this.deliver();
  }

  /**
   * Gives the body to the caller in order, after `res`. Frames can arrive out
   * of order, so `data` and `end` can come before `res`: they wait here until
   * `res` comes or the request ends (at the latest, the 150 seconds with no `res`).
   */
  private deliver(): void {
    while (!this.done && this.responded && this.buffered.has(this.next)) {
      const text = this.buffered.get(this.next)!;
      this.buffered.delete(this.next);
      this.next++;
      let chunk: Uint8Array<ArrayBuffer>;
      try {
        chunk = decodeBase64(text);
      } catch {
        this.cancel('protocol');
        return;
      }
      this.handlers.onChunk(chunk);
    }
    this.acknowledge();
  }

  /** Sends `ack` after every 16 data frames and after the last one. */
  private acknowledge(): void {
    if (this.done) return;
    const complete = this.total !== null && this.next >= this.total;
    if (this.next > this.acknowledged && (this.next - this.acknowledged >= ACK_EVERY || complete)) {
      this.acknowledged = this.next;
      this.send({ t: 'ack', id: this.id, seq: this.next - 1 });
    }
    if (complete && this.responded) {
      this.finish();
      this.handlers.onEnd();
    }
  }

  /** Stops the exchange from this side: the peer gets `cancel`. */
  cancel(reason: Failure = 'cancelled'): void {
    if (this.done) return;
    this.send({ t: 'cancel', id: this.id });
    this.fail(reason);
  }

  /** Stops the exchange because the peer, the relay or the connection ended it. */
  fail(reason: Failure): void {
    if (this.done) return;
    this.finish();
    this.ackWaiter?.reject(new Error(reason));
    this.ackWaiter = null;
    this.handlers.onFailure(reason);
  }

  private finish(): void {
    this.done = true;
    clearTimeout(this.responseTimer);
    this.buffered.clear();
    this.release();
  }
}

/** One WebSocket to the relay. It opens on demand and reconnects with backoff. */
class Connection {
  private socket: WebSocket | null = null;
  private opening: Promise<WebSocket> | null = null;
  private exchanges = new Map<string, Exchange>();
  private failures = 0;
  private retryAt = 0;
  /** The relay refused the connection. Studio waits for "Retry" or a new state from the web app. */
  private stopped = false;
  /** Tickets for the next connection: one, and one new ticket. After a stop: one. */
  private handshakes = 2;
  private pingTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private options: RelayOptions) {}

  /** Starts an exchange. Rejects with a TypeError when there is no connection. */
  async open(handlers: ExchangeHandlers): Promise<Exchange> {
    const socket = await this.connect();
    const id = crypto.randomUUID();
    const exchange: Exchange = new Exchange(
      id,
      frame => {
        if (socket.readyState === SOCKET_OPEN) socket.send(JSON.stringify(frame));
      },
      handlers,
      () => this.exchanges.delete(id),
    );
    this.exchanges.set(id, exchange);
    return exchange;
  }

  private connect(): Promise<WebSocket> {
    if (this.socket?.readyState === SOCKET_OPEN) return Promise.resolve(this.socket);
    if (this.opening) return this.opening;
    if (this.stopped) return Promise.reject(unreachable('the relay refused the connection'));
    if (Date.now() < this.retryAt) return Promise.reject(unreachable('the relay connection is not ready'));

    const opening = this.dial().then(
      socket => {
        this.failures = 0;
        this.socket = socket;
        return socket;
      },
      (error: unknown) => {
        this.wait();
        throw error instanceof TypeError ? error : unreachable(error instanceof Error ? error.message : String(error));
      },
    );
    this.opening = opening;
    void opening.then(
      () => (this.opening = null),
      () => (this.opening = null),
    );
    return opening;
  }

  /** Lets the next request connect at once, for example when the machine comes online. */
  reset(): void {
    this.failures = 0;
    this.retryAt = 0;
    this.stopped = false;
  }

  private wait(): void {
    this.failures++;
    this.retryAt = Date.now() + backoff(this.failures);
  }

  /** Opens a socket with a new ticket. Null when it closes before it opens. */
  private async handshake(): Promise<WebSocket | null> {
    // One ticket opens one connection, so every attempt asks for a new one.
    const { relayUrl, ticket } = await this.options.getTicket();
    const address = new URL(relayUrl);
    if (address.protocol !== 'wss:') throw unreachable('the relay address is not secure');
    address.searchParams.set('ticket', ticket);
    const socket = (this.options.createSocket ?? (target => new WebSocket(target)))(address.href);
    return new Promise(resolve => {
      socket.onopen = () => resolve(socket);
      socket.onclose = () => resolve(null);
    });
  }

  private async dial(): Promise<WebSocket> {
    // The relay refuses a bad ticket in the handshake (401 or 403). A browser
    // cannot read that status: the socket closes before it opens. Studio asks
    // for one new ticket, then stops. "Retry" or a new state from the web app
    // lets it try again, with one ticket.
    let socket: WebSocket | null = null;
    for (let attempt = 0; attempt < this.handshakes && !socket; attempt++) socket = await this.handshake();
    if (!socket) {
      this.stopped = true;
      this.handshakes = 1;
      this.options.onRefused?.();
      throw unreachable('the relay refused the connection');
    }
    this.handshakes = 2;

    socket.onmessage = event => this.receive(event.data);
    socket.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.socket === socket) this.socket = null;
      this.wait();
      for (const exchange of [...this.exchanges.values()]) exchange.fail('closed');
    };
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (socket.readyState === SOCKET_OPEN) socket.send(JSON.stringify({ t: 'ping' }));
    }, PING_INTERVAL_MS);
    return socket;
  }

  private receive(data: unknown): void {
    let frame: Frame;
    try {
      frame = JSON.parse(String(data)) as Frame;
    } catch {
      return;
    }
    if (!frame || typeof frame !== 'object') return;
    // With an `id`, a frame is about one request. The relay answers `ping`
    // itself, so no `ping` comes here, and Studio does not wait for `pong`.
    if (typeof frame.id === 'string') {
      this.exchanges.get(frame.id)?.receive(frame);
      return;
    }
    // With no `id`, `err` is about the connection. The agent closed, or a
    // second `relampo connect` replaced it: every open request fails.
    if (frame.t === 'err' && frame.code === 'agent_offline') {
      for (const exchange of [...this.exchanges.values()]) exchange.fail('agent_offline');
    }
  }
}

function errorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

/** The agent refuses a plan with status 403 and a JSON body with `code: plan_not_allowed`. */
function isPlanRefusal(status: number, body: Uint8Array): boolean {
  if (status !== 403) return false;
  try {
    return (JSON.parse(new TextDecoder().decode(body)) as { code?: unknown } | null)?.code === 'plan_not_allowed';
  } catch {
    return false;
  }
}

const REFUSALS: Partial<Record<Failure, [status: number, error: string]>> = {
  plan_not_allowed: [403, 'Your plan does not include this feature.'],
  not_found: [404, 'The Relampo agent does not serve this route.'],
  too_large: [413, 'The file is larger than 64 MB.'],
};

const FAILURE_DETAILS: Partial<Record<Failure, string>> = {
  closed: 'the relay connection closed',
  cancelled: 'the agent stopped the request',
  protocol: 'the answer did not follow the relay protocol',
  ack_timeout: 'the agent did not confirm the data in 30 seconds',
  no_response: 'the agent did not answer in 150 seconds',
  agent_offline: 'the machine is offline',
};

/** The path as fetch sends it: no `.` or `..` part, and the query string. The relay refuses other forms. */
function agentPath(path: string): string {
  const address = new URL(path, 'https://agent.invalid');
  return address.pathname + address.search;
}

function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | null | undefined): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    signal.addEventListener('abort', abort);
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

async function request(connection: Connection, path: string, init: RequestInit = {}): Promise<Response> {
  const { signal, ...rest } = init;
  signal?.throwIfAborted();
  // The browser builds the body and its content type (also the multipart
  // boundary of an upload), exactly as fetch does.
  const outgoing = new Request(new URL(path, 'https://agent.invalid'), rest);
  const body = new Uint8Array(await outgoing.arrayBuffer());
  signal?.throwIfAborted();
  if (body.length > MAX_FRAMES * CHUNK_BYTES) return errorResponse(...REFUSALS.too_large!);

  let status = 0;
  let headers: Record<string, string> = {};
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let settle!: { resolve: (response: Response) => void; reject: (error: unknown) => void };
  const result = new Promise<Response>((resolve, reject) => (settle = { resolve, reject }));
  // A request that the caller gave up can still fail later. That is not an unhandled error.
  result.catch(() => undefined);

  const opening = connection.open({
    stream: false,
    onResponse: (code, values) => {
      status = code;
      headers = values;
    },
    onChunk: chunk => chunks.push(chunk),
    onEnd: () => {
      const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const empty = status === 204 || status === 205 || status === 304;
      // One lock text for the plan, from the relay (`err`) or from the agent (403).
      if (isPlanRefusal(status, bytes)) {
        settle.resolve(errorResponse(...REFUSALS.plan_not_allowed!));
        return;
      }
      try {
        settle.resolve(new Response(empty ? null : bytes, { status, headers }));
      } catch {
        // For example a header that is not valid HTTP.
        settle.reject(unreachable(FAILURE_DETAILS.protocol!));
      }
    },
    onFailure: reason => {
      const refusal = REFUSALS[reason];
      if (signal?.aborted) settle.reject(signal.reason);
      else if (refusal) settle.resolve(errorResponse(...refusal));
      else settle.reject(unreachable(FAILURE_DETAILS[reason] ?? reason));
    },
  });

  let exchange: Exchange;
  try {
    // The caller can give up while the connection opens (a ticket, a handshake).
    exchange = await untilAborted(opening, signal);
  } catch (error) {
    void opening.then(
      late => late.fail('cancelled'),
      () => undefined,
    );
    throw error;
  }
  const abort = () => exchange.cancel();
  signal?.addEventListener('abort', abort);
  // A failure of the body reaches the caller through onFailure.
  // A Headers object gives its names in lowercase, as the relay protocol asks.
  void exchange
    .sendRequest(outgoing.method, agentPath(path), Object.fromEntries(outgoing.headers), body)
    .catch(() => undefined);
  try {
    return await result;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

/** Reads server-sent events from body chunks. `\n` and `\r\n` end a line. */
function eventParser(dispatch: (type: string, data: string, id: string) => void) {
  const decoder = new TextDecoder();
  let rest = '';
  let type = '';
  let data: string[] = [];
  let id = '';
  return (chunk: Uint8Array) => {
    const lines = (rest + decoder.decode(chunk, { stream: true })).split(/\r?\n/);
    rest = lines.pop()!;
    for (const line of lines) {
      if (line === '') {
        if (data.length > 0) dispatch(type || 'message', data.join('\n'), id);
        type = '';
        data = [];
        continue;
      }
      const colon = line.indexOf(':');
      if (colon === 0) continue;
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') type = value;
      else if (field === 'data') data.push(value);
      else if (field === 'id' && !value.includes('\0')) id = value;
    }
  };
}

/** The relay form of EventSource: it asks again with Last-Event-ID after a break. */
class RelayEventStream implements AgentEventStream {
  readyState = STREAM_CONNECTING;
  onerror: ((event: Event) => void) | null = null;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  private exchange: Exchange | null = null;
  private lastEventId = '';
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private connection: Connection,
    private path: string,
  ) {
    void this.start();
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  close(): void {
    if (this.readyState === STREAM_CLOSED) return;
    this.readyState = STREAM_CLOSED;
    clearTimeout(this.retryTimer);
    this.exchange?.cancel();
    this.exchange = null;
  }

  private emit(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event as MessageEvent);
  }

  private async start(): Promise<void> {
    const parse = eventParser((type, data, id) => {
      this.lastEventId = id;
      this.emit(type, new MessageEvent(type, { data, lastEventId: id }));
    });
    let exchange: Exchange;
    try {
      exchange = await this.connection.open({
        stream: true,
        onResponse: (status, headers) => {
          const type = Object.entries(headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? '';
          if (status !== 200 || !type.startsWith('text/event-stream')) {
            exchange.cancel('not_found');
            return;
          }
          this.attempts = 0;
          this.readyState = STREAM_OPEN;
          this.emit('open', new Event('open'));
        },
        onChunk: chunk => {
          if (this.readyState === STREAM_OPEN) parse(chunk);
        },
        // The agent ended a stream that Studio still wants: ask again.
        onEnd: () => this.retry(),
        onFailure: reason => {
          if (reason === 'plan_not_allowed' || reason === 'not_found' || reason === 'too_large') this.fail();
          else this.retry();
        },
      });
    } catch {
      this.retry();
      return;
    }
    if (this.readyState === STREAM_CLOSED) {
      exchange.cancel();
      return;
    }
    this.exchange = exchange;
    // Header names go in lowercase. The event id is opaque text: Studio only sends it back.
    const headers = { accept: 'text/event-stream', ...(this.lastEventId ? { 'last-event-id': this.lastEventId } : {}) };
    void exchange.sendRequest('GET', agentPath(this.path), headers, new Uint8Array()).catch(() => undefined);
  }

  private fail(): void {
    if (this.readyState === STREAM_CLOSED) return;
    this.readyState = STREAM_CLOSED;
    this.exchange = null;
    this.onerror?.(new Event('error'));
  }

  private retry(): void {
    if (this.readyState === STREAM_CLOSED) return;
    this.readyState = STREAM_CONNECTING;
    this.exchange = null;
    this.attempts++;
    this.retryTimer = setTimeout(() => void this.start(), backoff(this.attempts));
    this.onerror?.(new Event('error'));
  }
}

export interface RelayTransport extends AgentTransport {
  /** Forget the reconnect wait. Call it when the machine becomes available. */
  resetBackoff(): void;
}

export function createRelayTransport(options: RelayOptions): RelayTransport {
  const connection = new Connection(options);
  return {
    resetBackoff: () => connection.reset(),
    request: (path, init) => request(connection, path, init),
    eventStream: path => new RelayEventStream(connection, path),
    // A file from the agent has no URL. AgentFileLink reads it with `request`.
    fileUrl: () => null,
  };
}
