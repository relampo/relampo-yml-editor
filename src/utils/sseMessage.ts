import { AGENT_STREAM_CLOSED, agentEventStream } from './agentTransport';
import { AgentAnswerLost } from './relayTransport';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSSEMessage<T>(message: Event, isValid: (value: unknown) => value is T): T | null {
  const data = (message as MessageEvent).data;
  if (typeof data !== 'string') return null;

  try {
    const value: unknown = JSON.parse(data);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

export function createValidatedEventStream(
  path: string,
  reconnectGraceMs: number,
  onConnectionError: () => void,
) {
  const source = agentEventStream(path);
  let finished = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };
  const close = () => {
    finished = true;
    clearReconnectTimer();
    source.close();
  };
  const fail = () => {
    if (finished) return;
    close();
    onConnectionError();
  };
  const parse = <T>(message: Event, isValid: (value: unknown) => value is T): T | null => {
    if (finished) return null;
    const parsed = parseSSEMessage(message, isValid);
    if (parsed === null) fail();
    return parsed;
  };

  source.addEventListener('open', clearReconnectTimer);
  source.onerror = () => {
    if (finished) return;
    if (source.readyState === AGENT_STREAM_CLOSED) {
      fail();
      return;
    }
    if (reconnectTimer === null) {
      reconnectTimer = setTimeout(fail, reconnectGraceMs);
    }
  };

  return { source, close, isFinished: () => finished, parse };
}

const START_LIMIT_MS = 30_000;
const FIND_RUN_MS = 10_000;

/**
 * Contract, section 8, "Lost frames": Studio chooses the id of a run, so a
 * start with no answer can be found again. A start has 30 seconds before its
 * answer. After that, or after a lost answer, the events of that id tell:
 * - the stream opens: the agent has the run, and this returns null;
 * - `404`: the run did not start;
 * - no answer in 10 seconds: the first error.
 * A start that got an answer returns it.
 */
export async function startRun(
  send: (signal: AbortSignal) => Promise<Response>,
  eventsPath: string,
): Promise<Response | null> {
  const limit = new AbortController();
  const late = new AgentAnswerLost(
    'The machine did not confirm the start. It can have done the work: check before you try again.',
  );
  const timer = setTimeout(() => limit.abort(late), START_LIMIT_MS);
  try {
    return await send(limit.signal).finally(() => clearTimeout(timer));
  } catch (cause) {
    if (!(cause instanceof AgentAnswerLost)) throw cause;
    await runStarted(cause, eventsPath);
    return null;
  }
}

function runStarted(cause: AgentAnswerLost, eventsPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = agentEventStream(eventsPath);
    const settle = (end: () => void) => {
      clearTimeout(timer);
      source.close();
      end();
    };
    const timer = setTimeout(() => settle(() => reject(cause)), FIND_RUN_MS);
    source.addEventListener('open', () => settle(resolve));
    source.onerror = () => {
      if (source.readyState === AGENT_STREAM_CLOSED)
        settle(() => reject(new Error('The run did not start. Try again.')));
    };
  });
}
