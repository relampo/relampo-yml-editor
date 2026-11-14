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

/** Contract, section 8, "Lost frames": a view reports a lost connection only after 5 failed tries in a row. */
const FAILED_TRIES = 5;

export function createValidatedEventStream(path: string, onConnectionError: () => void) {
  const source = agentEventStream(path);
  let finished = false;
  // An error on an open stream is a break. The stream opens again by itself;
  // every error after that, until it is open, is a failed try.
  let open = false;
  let failedTries = 0;

  const close = () => {
    finished = true;
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

  source.addEventListener('open', () => {
    open = true;
    failedTries = 0;
  });
  source.onerror = () => {
    if (finished) return;
    if (source.readyState === AGENT_STREAM_CLOSED) fail();
    else if (open) open = false;
    else if (++failedTries >= FAILED_TRIES) fail();
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
 * - `404`: the run did not start. The agent knows the id, so the start is safe
 *   to repeat: Studio sends it once more, and reports the error after that;
 * - no answer in 10 seconds: the first error.
 * A start that got an answer returns it.
 */
export async function startRun(
  send: (signal: AbortSignal) => Promise<Response>,
  eventsPath: string,
): Promise<Response | null> {
  for (let tries = 2; ; tries--) {
    const limit = new AbortController();
    const late = new AgentAnswerLost(
      'The machine did not confirm the start. It can have done the work: check before you try again.',
    );
    const timer = setTimeout(() => limit.abort(late), START_LIMIT_MS);
    try {
      return await send(limit.signal).finally(() => clearTimeout(timer));
    } catch (cause) {
      if (!(cause instanceof AgentAnswerLost)) throw cause;
      if (await runStarted(cause, eventsPath)) return null;
      if (tries === 1) throw new Error('The run did not start. Try again.');
    }
  }
}

/** True when the agent has the run, false when it has not (`404`). */
function runStarted(cause: AgentAnswerLost, eventsPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const source = agentEventStream(eventsPath);
    const settle = (end: () => void) => {
      clearTimeout(timer);
      source.close();
      end();
    };
    const timer = setTimeout(() => settle(() => reject(cause)), FIND_RUN_MS);
    source.addEventListener('open', () => settle(() => resolve(true)));
    source.onerror = () => {
      if (source.readyState === AGENT_STREAM_CLOSED) settle(() => resolve(false));
    };
  });
}
