import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initializeAgentHost, resetAgentHostForTests } from '../utils/agentHost';
import { agentRequest } from '../utils/agentTransport';
import { AgentUnavailableNotice } from './AgentUnavailableNotice';

const originalParent = window.parent;
let ticketRequests = 0;

/** A request to the agent that fails. The notice can change, so it runs inside act. */
async function failedRequest(): Promise<void> {
  await act(async () => {
    await expect(agentRequest('/api/studio/info')).rejects.toThrow(TypeError);
  });
}

/** A relay that refuses every handshake: the socket closes before it opens. */
class RefusedSocket {
  readyState = 3;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor() {
    queueMicrotask(() => this.onclose?.());
  }
}

beforeEach(() => {
  ticketRequests = 0;
  // The web app gives a ticket for every request.
  const parent = {
    postMessage: (message: { type: string; requestId: string }) => {
      if (message.type !== 'relampo:relay-ticket-request') return;
      ticketRequests++;
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          source: parent as unknown as Window,
          data: {
            type: 'relampo:relay-ticket',
            requestId: message.requestId,
            relayUrl: 'wss://relay.test/',
            ticket: 'used',
          },
        }),
      );
    },
  };
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  window.history.replaceState({}, '', '/?embedded=1');
  vi.stubGlobal('WebSocket', RefusedSocket);
  initializeAgentHost();
});

afterEach(() => {
  resetAgentHostForTests();
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

it('shows Retry after the relay refused two tickets, and one click asks for one new ticket', async () => {
  render(<AgentUnavailableNotice language="en" />);
  expect(screen.queryByRole('status')).toBeNull();

  await failedRequest();
  expect(ticketRequests).toBe(2);
  expect(screen.getByRole('status')).toHaveTextContent('Relampo could not connect to your machine.');

  // No endless retry: a new request asks for no ticket.
  await failedRequest();
  expect(ticketRequests).toBe(2);

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(screen.queryByRole('status')).toBeNull();
  // In Studio, the open views ask again when the state changes.
  await failedRequest();

  expect(ticketRequests).toBe(3);
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});

it('shows the reason from the web app with no Retry button', () => {
  render(<AgentUnavailableNotice language="es" />);

  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        source: window.parent,
        data: { type: 'relampo:agent-state', connected: false, reason: 'offline' },
      }),
    );
  });

  expect(screen.getByRole('status')).toHaveTextContent('Tu máquina está desconectada.');
  expect(screen.queryByRole('button')).toBeNull();
});
