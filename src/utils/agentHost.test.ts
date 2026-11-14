import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  agentUnavailableText,
  getAgentState,
  initializeAgentHost,
  isEmbeddedStudio,
  LogicError,
  markRelayRefused,
  requestLogic,
  requestRelayTicket,
  retryRelay,
  resetAgentHostForTests,
  subscribeAgentState,
} from './agentHost';

const originalParent = window.parent;
let parent: { postMessage: ReturnType<typeof vi.fn> };

function fromHost(data: Record<string, unknown>, source: unknown = parent, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent('message', { origin, source: source as Window, data }));
}

function ticketRequestId(): string {
  return parent.postMessage.mock.calls.find(([message]) => message.type === 'relampo:relay-ticket-request')![0]
    .requestId;
}

beforeEach(() => {
  vi.useFakeTimers();
  parent = { postMessage: vi.fn() };
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  window.history.replaceState({}, '', '/?embedded=1');
  initializeAgentHost();
});

afterEach(() => {
  resetAgentHostForTests();
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  window.history.replaceState({}, '', '/');
  vi.useRealTimers();
});

describe('isEmbeddedStudio', () => {
  it('is true only inside a frame that asks for the embedded view', () => {
    expect(isEmbeddedStudio()).toBe(true);

    window.history.replaceState({}, '', '/');
    expect(isEmbeddedStudio()).toBe(false);

    window.history.replaceState({}, '', '/?embedded=1');
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    expect(isEmbeddedStudio()).toBe(false);
  });
});

describe('requestRelayTicket', () => {
  it('asks the parent frame of the same origin and returns its ticket', async () => {
    const result = requestRelayTicket();

    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: 'relampo:relay-ticket-request', requestId: expect.any(String) },
      window.location.origin,
    );
    fromHost({ type: 'relampo:relay-ticket', requestId: ticketRequestId(), relayUrl: 'wss://relay.test', ticket: 't1' });

    await expect(result).resolves.toEqual({ relayUrl: 'wss://relay.test', ticket: 't1' });
  });

  it('ignores a ticket from another window, another origin or another request', async () => {
    const result = requestRelayTicket();
    let finished = false;
    void result.then(() => {
      finished = true;
    });
    const ticket = { type: 'relampo:relay-ticket', relayUrl: 'wss://evil.test', ticket: 'bad' };

    fromHost({ ...ticket, requestId: ticketRequestId() }, window);
    fromHost({ ...ticket, requestId: ticketRequestId() }, parent, 'https://other.test');
    fromHost({ ...ticket, requestId: 'other' });
    await Promise.resolve();
    expect(finished).toBe(false);

    fromHost({ type: 'relampo:relay-ticket', requestId: ticketRequestId(), relayUrl: 'wss://relay.test', ticket: 't1' });
    await expect(result).resolves.toEqual({ relayUrl: 'wss://relay.test', ticket: 't1' });
  });

  it.each([
    ['plan_not_allowed', 'Your plan does not include a connected machine.'],
    ['feature_not_enabled', 'Your plan does not include a connected machine.'],
    ['license_revoked', 'Your Relampo license is not active.'],
    ['license_expired', 'Your Relampo license is not active.'],
    ['not_selected', 'No machine is selected. Select one in Relampo.'],
    ['activation_not_found', 'No machine is selected. Select one in Relampo.'],
    ['agent_offline', 'Your machine is offline. Start `relampo connect` on it.'],
    ['timeout', 'Relampo could not connect to your machine. Try again.'],
    ['relay_not_configured', 'Relampo could not connect to your machine. Try again.'],
    ['invalid_request', 'Relampo could not connect to your machine. Try again.'],
    ['<b>Token eyJhbGciOi</b>', 'Relampo could not connect to your machine. Try again.'],
    [404, 'Relampo could not connect to your machine. Try again.'],
    [{ code: 'x' }, 'Relampo could not connect to your machine. Try again.'],
    [undefined, 'Relampo could not connect to your machine. Try again.'],
  ])('rejects with a sentence, not the error %j of the web app', async (error, sentence) => {
    const result = requestRelayTicket();

    fromHost({ type: 'relampo:relay-ticket', requestId: ticketRequestId(), error });

    await expect(result).rejects.toThrow(new TypeError(sentence));
  });

  it('rejects when the web app does not answer', async () => {
    const result = requestRelayTicket();
    const failure = expect(result).rejects.toThrow('did not answer');

    await vi.advanceTimersByTimeAsync(10_000);

    await failure;
  });

  it('asks for nothing when the web app said that the machine is not connected', async () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'offline' });

    await expect(requestRelayTicket()).rejects.toThrow('relampo connect');
    expect(parent.postMessage).not.toHaveBeenCalled();
  });
});

describe('agent state', () => {
  it('keeps the last state from the parent frame and tells its listeners', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAgentState(listener);
    expect(getAgentState()).toBeNull();

    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'plan' });
    expect(getAgentState()).toEqual({ connected: false, reason: 'plan' });
    expect(agentUnavailableText()).toBe('Your plan does not include a connected machine.');
    expect(agentUnavailableText('es')).toBe('Tu plan no incluye una máquina conectada.');

    fromHost({ type: 'relampo:agent-state', connected: true, reason: 'made-up' });
    expect(getAgentState()).toEqual({ connected: true });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'not_selected' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores a state from another window or origin, and a state with no boolean', () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'offline' }, window);
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'offline' }, parent, 'https://other.test');
    fromHost({ type: 'relampo:agent-state', connected: 'no' });

    expect(getAgentState()).toBeNull();
  });
});

describe('a connection that the relay refused', () => {
  it('asks for no ticket until the user retries', async () => {
    const listener = vi.fn();
    subscribeAgentState(listener);

    markRelayRefused();

    expect(getAgentState()).toEqual({ connected: false, reason: 'refused' });
    expect(agentUnavailableText('es')).toBe('Relampo no pudo conectar con tu máquina. Intenta de nuevo.');
    await expect(requestRelayTicket()).rejects.toThrow('Relampo could not connect to your machine. Try again.');
    expect(parent.postMessage).not.toHaveBeenCalled();

    retryRelay();

    expect(getAgentState()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the state of the web app when the user retries with no refusal', () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'offline' });

    retryRelay();

    expect(getAgentState()).toEqual({ connected: false, reason: 'offline' });
  });

  it('does not take the refused reason from the web app', () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'refused' });

    expect(getAgentState()).toEqual({ connected: false });
  });
});

describe('reasons of the web app', () => {
  it('has a text for a license that is not active', () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'license' });

    expect(getAgentState()).toEqual({ connected: false, reason: 'license' });
    expect(agentUnavailableText()).toBe('Your Relampo license is not active.');
    expect(agentUnavailableText('es')).toBe('Tu licencia de Relampo no está activa.');
  });

  it('shows a generic text for a reason that it does not know', () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'maintenance' });

    expect(getAgentState()).toEqual({ connected: false });
    expect(agentUnavailableText('es')).toMatch(/^No se pudo conectar con tu máquina\./);
  });
});

// Contract 0.20, section 10, "Web app and Studio".
describe('requestLogic', () => {
  const input = { yaml: 'test: {}' };
  const sent = () => parent.postMessage.mock.calls.find(([message]) => message.type === 'relampo:logic-request')![0];

  it('sends the kind and the input document to the parent frame and returns the result document', async () => {
    const result = requestLogic('correlate.analyze', input);

    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: 'relampo:logic-request', requestId: expect.any(String), kind: 'correlate.analyze', input },
      window.location.origin,
    );
    const document = { digest: 'd1', requests: 2, responses: 2, candidates: [] };
    fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, result: document });

    await expect(result).resolves.toEqual(document);
  });

  it('rejects with the error code and the message of the web app', async () => {
    const result = requestLogic('correlate.apply', input);

    fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, error: 'script_changed', message: 'changed' });

    await expect(result).rejects.toEqual(new LogicError('script_changed', 'changed'));
    await expect(result).rejects.toMatchObject({ code: 'script_changed', detail: 'changed' });
  });

  it.each([{}, { result: 'text' }, { result: null }, { error: 404 }])(
    'rejects with internal for the answer %j, which has no result and no code',
    async answer => {
      const result = requestLogic('correlate.analyze', input);

      fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, ...answer });

      await expect(result).rejects.toMatchObject({ code: 'internal' });
    },
  );

  it('waits 160 seconds, then rejects with timeout and ignores a late answer', async () => {
    const result = requestLogic('correlate.analyze', input);
    let failure: unknown;
    result.catch(cause => (failure = cause));

    await vi.advanceTimersByTimeAsync(159_900);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(100);
    expect(failure).toMatchObject({ code: 'timeout' });

    fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, result: { candidates: [] } });
    await expect(result).rejects.toMatchObject({ code: 'timeout' });
  });

  it('ignores a result from another window, another origin or another request', async () => {
    const result = requestLogic('correlate.analyze', input);
    let finished = false;
    void result.then(() => {
      finished = true;
    });
    const wrong = { type: 'relampo:logic-result', result: { candidates: ['bad'] } };

    fromHost({ ...wrong, requestId: sent().requestId }, window);
    fromHost({ ...wrong, requestId: sent().requestId }, parent, 'https://other.test');
    fromHost({ ...wrong, requestId: 'other' });
    fromHost({ type: 'relampo:relay-ticket', requestId: sent().requestId, result: { candidates: ['bad'] } });
    await Promise.resolve();
    expect(finished).toBe(false);

    fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, result: { candidates: [] } });
    await expect(result).resolves.toEqual({ candidates: [] });
  });

  it('needs no machine: it asks also when the web app said that the machine is not connected', async () => {
    fromHost({ type: 'relampo:agent-state', connected: false, reason: 'offline' });

    const result = requestLogic('correlate.analyze', input);
    fromHost({ type: 'relampo:logic-result', requestId: sent().requestId, result: { candidates: [] } });

    await expect(result).resolves.toEqual({ candidates: [] });
  });
});
