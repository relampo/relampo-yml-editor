// An in-memory relay and agent for tests. They follow section 8 of the web
// and CLI contract (relampo-control-plane/docs/web-cli-contract.md):
// one-time tickets, the allow list, 16 KB data frames, `ack` after every 16
// frames and after the last one, a window of 64 unacknowledged frames, `err`
// codes, `agent_offline` with and with no `id`, the path checks, and frames
// that the relay drops with no answer. A test can also lose a chosen frame
// (`drop`), as the platform does when it has no free capacity.
//
// The fake agent records every rule that the web side breaks in `violations`.
// It does not have the 30-second timer of a sender; no test needs it.

const CHUNK = 16 * 1024;
const WINDOW = 64;
const ACK_EVERY = 16;
const MAX_FRAMES = 4096;
/** One message is at most 30 KB. */
const MAX_MESSAGE = 30 * 1024;
const WEB_FRAMES = ['req', 'data', 'end', 'cancel', 'ack'];

/** The decoded path with no query string, or null when the relay refuses it. */
function checkedPath(path: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path.split('?')[0]);
  } catch {
    return null;
  }
  const bad = [...decoded].some(character => character === '\\' || character < ' ' || character === '\x7f');
  const parts = decoded.split('/').slice(1);
  return bad || decoded.includes('//') || parts.some(part => part === '.' || part === '..') ? null : decoded;
}

const ALLOW_LIST: [prefix: string, feature: string | null][] = [
  ['/api/studio/info', null],
  ['/api/studio/data-source-', null],
  ['/api/debug/', 'debug'],
  ['/api/run', 'local_run'],
  ['/api/recorder/', 'record'],
  ['/api/grpc/', 'record'],
  ['/api/sql/', 'debug'],
  ['/api/correlate/apply', 'correlate_full'],
  ['/api/correlate/', 'correlate_detect'],
  ['/api/distributed/', 'distributed_run'],
];

export type RelayFrame = { t: string; id?: string; [field: string]: unknown };

export interface AgentRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface AgentResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: Uint8Array | string;
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), character => character.charCodeAt(0));
}

/** The sender side of a body: 16 KB frames, at most 64 without an `ack`. */
class Outgoing {
  private queue: Uint8Array[] = [];
  private sent = 0;
  private acked = 0;
  private ended = false;
  private endSent = false;

  constructor(private send: (frame: RelayFrame) => void) {}

  write(bytes: Uint8Array): void {
    for (let offset = 0; offset < bytes.length; offset += CHUNK) this.queue.push(bytes.subarray(offset, offset + CHUNK));
    this.pump();
  }

  end(): void {
    this.ended = true;
    this.pump();
  }

  ack(seq: number): void {
    this.acked = Math.max(this.acked, seq + 1);
    this.pump();
  }

  private pump(): void {
    while (this.queue.length > 0 && this.sent - this.acked < WINDOW) {
      this.send({ t: 'data', seq: this.sent++, b64: toBase64(this.queue.shift()!) });
    }
    if (this.ended && this.queue.length === 0 && !this.endSent) {
      this.endSent = true;
      this.send({ t: 'end', frames: this.sent });
    }
  }
}

/** An open event stream. A test writes to it after the agent returned it. */
export class FakeStream {
  /** The `Last-Event-ID` header of the request that opened this stream. */
  lastEventId: string | undefined;
  private outgoing: Outgoing | null = null;
  private encoder = new TextEncoder();

  attach(outgoing: Outgoing, lastEventId: string | undefined): void {
    this.outgoing = outgoing;
    this.lastEventId = lastEventId;
  }

  /** Sends raw event stream text, for example `id: 1\nevent: done\ndata: {}\n\n`. */
  send(text: string): void {
    this.outgoing!.write(this.encoder.encode(text));
  }

  end(): void {
    this.outgoing!.end();
  }
}

interface Incoming {
  frame: RelayFrame;
  chunks: Map<number, Uint8Array>;
  next: number;
  acked: number;
}

export class FakeAgent {
  /** Answers every request. Return a FakeStream to open an event stream. */
  handle: (request: AgentRequest) => AgentResponse | FakeStream = () => ({ status: 200 });
  /** Set to false to keep every `ack` for a request body. */
  sendAcks = true;
  readonly requests: AgentRequest[] = [];
  readonly cancelled: string[] = [];
  readonly violations: string[] = [];

  private incoming = new Map<string, Incoming>();
  private outgoing = new Map<string, Outgoing>();

  constructor(private toRelay: (frame: RelayFrame) => void) {}

  receive(frame: RelayFrame): void {
    const key = String(frame.from) + ':' + String(frame.id);
    const reply = (extra: RelayFrame) => this.toRelay({ ...extra, id: frame.id, to: frame.from });

    if (frame.t === 'req') {
      for (const name of Object.keys((frame.headers ?? {}) as object)) {
        if (name !== name.toLowerCase()) this.violations.push(`header name ${name} is not in lowercase`);
      }
      this.incoming.set(key, { frame, chunks: new Map(), next: 0, acked: 0 });
      return;
    }
    if (frame.t === 'ack') {
      this.outgoing.get(key)?.ack(Number(frame.seq));
      return;
    }
    if (frame.t === 'cancel') {
      this.cancelled.push(String(frame.id));
      this.incoming.delete(key);
      this.outgoing.delete(key);
      return;
    }

    const incoming = this.incoming.get(key);
    if (!incoming) return;
    const total = Number(incoming.frame.body_frames);

    if (frame.t === 'data') {
      const seq = Number(frame.seq);
      const chunk = fromBase64(String(frame.b64));
      if (chunk.length > CHUNK) this.violations.push(`data frame ${seq} is larger than 16 KB`);
      if (seq >= incoming.acked + WINDOW) this.violations.push(`data frame ${seq} is outside the window of 64`);
      if (seq >= total) this.violations.push(`data frame ${seq} is past body_frames ${total}`);
      incoming.chunks.set(seq, chunk);
      while (incoming.chunks.has(incoming.next)) incoming.next++;
      if (this.sendAcks && (incoming.next - incoming.acked >= ACK_EVERY || incoming.next === total)) {
        incoming.acked = incoming.next;
        reply({ t: 'ack', seq: incoming.next - 1 });
      }
      return;
    }

    if (frame.t === 'end') {
      if (Number(frame.frames) !== total) this.violations.push(`end has ${frame.frames} frames, req has ${total}`);
      if (incoming.next !== total) this.violations.push(`end came after ${incoming.next} of ${total} frames`);
      this.incoming.delete(key);

      const body = new Uint8Array([...incoming.chunks.values()].reduce((size, chunk) => size + chunk.length, 0));
      let offset = 0;
      for (let seq = 0; seq < incoming.next; seq++) {
        body.set(incoming.chunks.get(seq)!, offset);
        offset += incoming.chunks.get(seq)!.length;
      }
      const request: AgentRequest = {
        method: String(incoming.frame.method),
        path: String(incoming.frame.path),
        headers: incoming.frame.headers as Record<string, string>,
        body,
      };
      this.requests.push(request);

      const answer = this.handle(request);
      const outgoing = new Outgoing(reply);
      this.outgoing.set(key, outgoing);
      if (answer instanceof FakeStream) {
        reply({ t: 'res', status: 200, headers: { 'content-type': 'text/event-stream' } });
        const header = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'last-event-id');
        answer.attach(outgoing, header?.[1]);
        return;
      }
      reply({ t: 'res', status: answer.status ?? 200, headers: answer.headers ?? {} });
      const bytes = typeof answer.body === 'string' ? new TextEncoder().encode(answer.body) : answer.body;
      if (bytes) outgoing.write(bytes);
      outgoing.end();
    }
  }
}

/** The part of WebSocket that the relay transport uses. */
export class FakeSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    readonly connectionId: string,
    private relay: FakeRelay,
  ) {}

  send(text: string): void {
    if (this.readyState !== 1) return;
    queueMicrotask(() => this.relay.fromWeb(this, JSON.parse(text) as RelayFrame));
  }

  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    queueMicrotask(() => this.onclose?.());
  }
}

export class FakeRelay {
  agent: FakeAgent | null = new FakeAgent(frame => this.fromAgent(frame));
  /** Features of the plan. `connect` is implied by a valid ticket. */
  features = new Set(['debug', 'local_run', 'record', 'correlate_detect', 'correlate_full', 'distributed_run']);
  /** Deliver the frames of one batch to the web side in reverse order. */
  reorder = false;
  /** Return true to lose a frame and tell nobody. `to` is the side that does not get it. */
  drop: (frame: RelayFrame, to: 'web' | 'agent') => boolean = () => false;
  readonly url = 'wss://relay.test/';
  /** Every frame that the web side sent, in order. */
  readonly received: RelayFrame[] = [];
  readonly sockets: FakeSocket[] = [];
  ticketsIssued = 0;

  private tickets = new Set<string>();
  private batches = new Map<FakeSocket, RelayFrame[]>();

  /** What the web app gets from `POST /v1/relay/tickets`. */
  issueTicket = (): Promise<{ relayUrl: string; ticket: string }> => {
    const ticket = `ticket-${++this.ticketsIssued}`;
    this.tickets.add(ticket);
    return Promise.resolve({ relayUrl: this.url, ticket });
  };

  /** Use as the WebSocket factory of the transport. */
  createSocket = (address: string): WebSocket => {
    const socket = new FakeSocket(`web-${this.sockets.length + 1}`, this);
    this.sockets.push(socket);
    const ticket = new URL(address).searchParams.get('ticket') ?? '';
    // A ticket works once.
    const accepted = address.startsWith(this.url) && this.tickets.delete(ticket);
    queueMicrotask(() => {
      if (!accepted) {
        socket.readyState = 3;
        socket.onerror?.();
        socket.onclose?.();
        return;
      }
      socket.readyState = 1;
      socket.onopen?.();
    });
    return socket as unknown as WebSocket;
  };

  /** Frames of one type that the web side sent. */
  sent(type: string): RelayFrame[] {
    return this.received.filter(frame => frame.t === type);
  }

  /** Closes every web connection, like the 2-hour limit of the platform. */
  dropConnections(): void {
    for (const socket of this.sockets) socket.close();
  }

  /** The agent connection closes: every web connection gets `agent_offline` with no `id`. */
  agentGoesOffline(): void {
    this.agent = null;
    for (const socket of this.sockets) this.toWeb(socket, { t: 'err', code: 'agent_offline' });
  }

  agentComesBack(): FakeAgent {
    this.agent = new FakeAgent(frame => this.fromAgent(frame));
    return this.agent;
  }

  /** Sends one frame to a web connection, as if it came from the agent. */
  toWeb(socket: FakeSocket, frame: RelayFrame): void {
    if (this.drop(frame, 'web')) return;
    const batch = this.batches.get(socket);
    if (batch) {
      batch.push(frame);
      return;
    }
    const frames = [frame];
    this.batches.set(socket, frames);
    queueMicrotask(() => {
      this.batches.delete(socket);
      if (this.reorder) frames.reverse();
      for (const next of frames) if (socket.readyState === 1) socket.onmessage?.({ data: JSON.stringify(next) });
    });
  }

  fromWeb(socket: FakeSocket, frame: RelayFrame): void {
    this.received.push(frame);
    // The relay answers `ping` itself. It forwards neither `ping` nor `pong`.
    if (frame.t === 'ping') {
      this.toWeb(socket, { t: 'pong' });
      return;
    }
    if (this.drop(frame, 'agent')) return;
    // A frame that is not valid is dropped with no answer.
    if (typeof frame.id !== 'string' || frame.id.length > 128 || !WEB_FRAMES.includes(frame.t)) return;
    let refusal = JSON.stringify(frame).length > MAX_MESSAGE ? 'too_large' : '';
    if (!refusal && frame.t === 'req') {
      const path = checkedPath(String(frame.path));
      const rule = path === null ? undefined : ALLOW_LIST.find(([prefix]) => path.startsWith(prefix));
      refusal = !rule
        ? 'not_found'
        : rule[1] && !this.features.has(rule[1])
          ? 'plan_not_allowed'
          : Number(frame.body_frames) > MAX_FRAMES
            ? 'too_large'
            : '';
    }
    // With no agent, every frame that has an `id` gets `agent_offline` with that `id`.
    if (!refusal && !this.agent) refusal = 'agent_offline';
    if (refusal) {
      this.toWeb(socket, { t: 'err', id: frame.id, code: refusal });
      return;
    }
    // The relay adds the web connection as `from` on the way to the agent.
    this.agent!.receive({ ...frame, from: socket.connectionId });
  }

  private fromAgent(frame: RelayFrame): void {
    // The agent copied `from` to `to`. The relay routes by it and removes it.
    const socket = this.sockets.find(candidate => candidate.connectionId === frame.to);
    if (!socket) return;
    const { to: _to, ...rest } = frame;
    this.toWeb(socket, rest);
  }
}
