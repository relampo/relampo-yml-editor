// What Studio asks from the web app that frames it (section 9 of the web and
// CLI contract): a one-time ticket for each relay connection, and the state of
// the customer's machine. Studio never sees a Cognito token and has no relay
// configuration. It accepts these messages only from the parent frame of its
// own origin.

import type { RelayTicket } from './relayTransport';

export type AgentUnavailableReason = 'plan' | 'license' | 'offline' | 'not_selected';

export interface AgentState {
  connected: boolean;
  /**
   * Why the machine is not available. `refused` does not come from the web
   * app: Studio sets it when the relay refused the connection (see markRelayRefused).
   */
  reason?: AgentUnavailableReason | 'refused';
}

const REASONS: unknown[] = ['plan', 'license', 'offline', 'not_selected'];
const TICKET_TIMEOUT_MS = 10_000;

let state: AgentState | null = null;
let listening = false;
const listeners = new Set<() => void>();

/** True inside the frame of the Relampo web app. There, the agent is reached through the relay. */
export function isEmbeddedStudio(): boolean {
  return window.parent !== window && new URLSearchParams(window.location.search).get('embedded') === '1';
}

function messageFromHost(event: MessageEvent): Record<string, unknown> | null {
  if (event.origin !== window.location.origin || event.source !== window.parent) return null;
  return event.data && typeof event.data === 'object' ? (event.data as Record<string, unknown>) : null;
}

function receiveAgentState(event: MessageEvent): void {
  const message = messageFromHost(event);
  if (message?.type !== 'relampo:agent-state' || typeof message.connected !== 'boolean') return;
  setState({
    connected: message.connected,
    ...(REASONS.includes(message.reason) ? { reason: message.reason as AgentUnavailableReason } : {}),
  });
}

function setState(next: AgentState | null): void {
  state = next;
  listeners.forEach(listener => listener());
}

/**
 * The relay refused a ticket and one new ticket. Studio stops: it asks for no
 * ticket until the user clicks "Retry" or the web app sends a new state.
 */
export function markRelayRefused(): void {
  setState({ connected: false, reason: 'refused' });
}

/** The "Retry" button. Studio forgets the refusal, and the open views ask again. */
export function retryRelay(): void {
  if (state?.reason === 'refused') setState(null);
}

/** Starts to listen for `relampo:agent-state`. Call it once, before the app renders. */
export function initializeAgentHost(): void {
  if (listening || !isEmbeddedStudio()) return;
  listening = true;
  window.addEventListener('message', receiveAgentState);
}

/** The last state from the web app. Null when the web app sent none yet. */
export function getAgentState(): AgentState | null {
  return state;
}

export function subscribeAgentState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetAgentHostForTests(): void {
  window.removeEventListener('message', receiveAgentState);
  listening = false;
  state = null;
}

/**
 * Sends one request to the web app and waits for the answer with the same
 * `requestId`. Null when the web app does not answer in time. An answer from
 * another window, another origin or another request is ignored.
 */
function askHost(
  type: string,
  answerType: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<Record<string, unknown> | null> {
  const requestId = crypto.randomUUID();
  return new Promise(resolve => {
    const finish = (answer: Record<string, unknown> | null) => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
      resolve(answer);
    };
    const receive = (event: MessageEvent) => {
      const message = messageFromHost(event);
      if (message?.type === answerType && message.requestId === requestId) finish(message);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    window.addEventListener('message', receive);
    window.parent.postMessage({ ...payload, type, requestId }, window.location.origin);
  });
}

/** Asks the web app for a relay ticket. One ticket opens one connection. */
export async function requestRelayTicket(): Promise<RelayTicket> {
  if (state?.connected === false) throw new Error(agentUnavailableText());
  const answer = await askHost('relampo:relay-ticket-request', 'relampo:relay-ticket', {}, TICKET_TIMEOUT_MS);
  if (!answer) throw new Error('The web app did not answer the relay ticket request.');
  const { relayUrl, ticket, error } = answer;
  if (typeof relayUrl === 'string' && relayUrl.length <= 2048 && typeof ticket === 'string' && ticket.length <= 4096)
    return { relayUrl, ticket };
  // A sentence, not the code. A TypeError, like a fetch that cannot connect: the views show it as it is.
  throw new TypeError(UNAVAILABLE[TICKET_ERRORS.get(error) ?? 'refused'][0]);
}

/** The logic that the cloud runs for Studio (contract, section 10, "Kinds"). */
export type LogicKind = 'correlate.analyze' | 'correlate.apply';

/** A logic job gave no result. `code` is a short code of section 10, never a text for the user. */
export class LogicError extends Error {
  constructor(
    readonly code: string,
    readonly detail?: string,
  ) {
    super(code);
  }
}

// The web app answers within 150 seconds. Studio waits 10 seconds more.
const LOGIC_TIMEOUT_MS = 160_000;

/**
 * Asks the web app to run a logic job in the cloud (contract, section 10).
 * `input` is the input document. Resolves with the result document, and
 * rejects with a LogicError. Studio holds no token: the web app runs the job.
 */
export async function requestLogic(kind: LogicKind, input: unknown): Promise<object> {
  const answer = await askHost('relampo:logic-request', 'relampo:logic-result', { kind, input }, LOGIC_TIMEOUT_MS);
  if (!answer) throw new LogicError('timeout');
  const { result, error, message } = answer;
  if (typeof result === 'object' && result !== null) return result;
  throw new LogicError(typeof error === 'string' ? error : 'internal', typeof message === 'string' ? message : undefined);
}

const UNAVAILABLE: Record<AgentUnavailableReason | 'refused' | 'unknown', [en: string, es: string]> = {
  plan: ['Your plan does not include a connected machine.', 'Tu plan no incluye una máquina conectada.'],
  license: ['Your Relampo license is not active.', 'Tu licencia de Relampo no está activa.'],
  offline: [
    'Your machine is offline. Start `relampo connect` on it.',
    'Tu máquina está desconectada. Ejecuta `relampo connect` en ella.',
  ],
  not_selected: [
    'No machine is selected. Select one in Relampo.',
    'No hay una máquina seleccionada. Selecciona una en Relampo.',
  ],
  refused: [
    'Relampo could not connect to your machine. Try again.',
    'Relampo no pudo conectar con tu máquina. Intenta de nuevo.',
  ],
  unknown: [
    'Could not reach your machine. Check that `relampo connect` is running on it.',
    'No se pudo conectar con tu máquina. Revisa que `relampo connect` esté en ejecución.',
  ],
};

/**
 * The ticket errors of the web app (contract, section 9) that have their own
 * text. Every other one, for example `timeout` or `relay_not_configured`, can
 * go away: the text asks the user to try again.
 */
const TICKET_ERRORS = new Map<unknown, AgentUnavailableReason>([
  ['plan_not_allowed', 'plan'],
  ['feature_not_enabled', 'plan'],
  ['license_revoked', 'license'],
  ['license_expired', 'license'],
  ['not_selected', 'not_selected'],
  ['activation_not_found', 'not_selected'],
  ['agent_offline', 'offline'],
]);

/** A short text that says why the machine is not available. */
export function agentUnavailableText(language: string = 'en'): string {
  const texts = UNAVAILABLE[(state?.connected === false && state.reason) || 'unknown'];
  return texts[language === 'es' ? 1 : 0];
}
