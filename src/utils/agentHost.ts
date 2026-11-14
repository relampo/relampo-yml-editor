// What Studio asks from the web app that frames it (section 9 of the web and
// CLI contract): a one-time ticket for each relay connection, and the state of
// the customer's machine. Studio never sees a Cognito token and has no relay
// configuration. It accepts these messages only from the parent frame of its
// own origin.

import type { RelayTicket } from './relayTransport';

export type AgentUnavailableReason = 'plan' | 'offline' | 'not_selected';

export interface AgentState {
  connected: boolean;
  /** Why the machine is not available. */
  reason?: AgentUnavailableReason;
}

const REASONS: unknown[] = ['plan', 'offline', 'not_selected'];
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
  state = {
    connected: message.connected,
    ...(REASONS.includes(message.reason) ? { reason: message.reason as AgentUnavailableReason } : {}),
  };
  listeners.forEach(listener => listener());
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

/** Asks the web app for a relay ticket. One ticket opens one connection. */
export function requestRelayTicket(): Promise<RelayTicket> {
  if (state?.connected === false) return Promise.reject(new Error(agentUnavailableText()));
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    const receive = (event: MessageEvent) => {
      const message = messageFromHost(event);
      if (message?.type !== 'relampo:relay-ticket' || message.requestId !== requestId) return;
      cleanup();
      const { relayUrl, ticket, error } = message;
      if (typeof relayUrl === 'string' && relayUrl.length <= 2048 && typeof ticket === 'string' && ticket.length <= 4096) {
        resolve({ relayUrl, ticket });
      } else {
        reject(new Error(typeof error === 'string' ? error.slice(0, 300) : 'The web app sent no relay ticket.'));
      }
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('The web app did not answer the relay ticket request.'));
    }, TICKET_TIMEOUT_MS);
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'relampo:relay-ticket-request', requestId }, window.location.origin);
  });
}

const UNAVAILABLE: Record<AgentUnavailableReason | 'unknown', [en: string, es: string]> = {
  plan: ['Your plan does not include a connected machine.', 'Tu plan no incluye una máquina conectada.'],
  offline: [
    'Your machine is offline. Start `relampo connect` on it.',
    'Tu máquina está desconectada. Ejecuta `relampo connect` en ella.',
  ],
  not_selected: [
    'No machine is selected. Select one in Relampo.',
    'No hay una máquina seleccionada. Selecciona una en Relampo.',
  ],
  unknown: [
    'Could not reach your machine. Check that `relampo connect` is running on it.',
    'No se pudo conectar con tu máquina. Revisa que `relampo connect` esté en ejecución.',
  ],
};

/** A short text that says why the machine is not available. */
export function agentUnavailableText(language: string = 'en'): string {
  const texts = UNAVAILABLE[(state?.connected === false && state.reason) || 'unknown'];
  return texts[language === 'es' ? 1 : 0];
}
