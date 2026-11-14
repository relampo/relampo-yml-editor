import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  agentUnavailableText,
  getAgentState,
  initializeAgentHost,
  isEmbeddedStudio,
  requestRelayTicket,
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

  it('rejects with the error of the web app', async () => {
    const result = requestRelayTicket();

    fromHost({ type: 'relampo:relay-ticket', requestId: ticketRequestId(), error: 'No machine is selected.' });

    await expect(result).rejects.toThrow('No machine is selected.');
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
