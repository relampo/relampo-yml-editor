import { describe, it, expect, vi } from 'vitest';
import { render as baseRender, screen, fireEvent } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
const render = (ui: ReactElement) => baseRender(<LanguageProvider>{ui}</LanguageProvider>);
import { YAMLWebSocketDetails } from './YAMLWebSocketDetails';
import type { YAMLNode } from '../types/yaml';
const node = {
  id: 'ws',
  type: 'websocket',
  name: 'Live auctions',
  data: {
    url: 'wss://example.com/ws',
    future_field: 'preserve',
    actions: [
      { send: { type: 'text', data: '{"action":"subscribe"}' } },
      { receive: { type: 'text', response: { data: '{"type":"subscribed","id":"s1"}' } } },
      { close: { code: 1000 } },
    ],
  },
} as YAMLNode;
describe('WebSocket visual conversation', () => {
  it('shows both directions and received evidence without turning it into an assertion', () => {
    render(<YAMLWebSocketDetails node={node} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit message 2' }));
    expect(screen.getByText('Client → Server')).toBeInTheDocument();
    expect(screen.getByText('Server → Client')).toBeInTheDocument();
    expect(screen.getByLabelText('Recorded message 2')).toHaveValue('{"type":"subscribed","id":"s1"}');
  });
  it('configures matching through fields and preserves unknown data', () => {
    const update = vi.fn();
    render(
      <YAMLWebSocketDetails
        node={node}
        onNodeUpdate={update}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit message 2' }));
    fireEvent.change(screen.getByLabelText('JSON field 2'), { target: { value: '$.type' } });
    expect(update).toHaveBeenLastCalledWith(
      'ws',
      expect.objectContaining({
        future_field: 'preserve',
        actions: expect.arrayContaining([
          expect.objectContaining({
            receive: expect.objectContaining({ match: expect.objectContaining({ jsonpath: '$.type' }) }),
          }),
        ]),
      }),
    );
  });
});

it('keeps invalid JSON drafts out of executable YAML', () => {
  const update = vi.fn();
  render(
    <YAMLWebSocketDetails
      node={node}
      onNodeUpdate={update}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit message 1' }));
  const payload = screen.getByLabelText('Message payload 1');
  fireEvent.change(payload, { target: { value: '{broken' } });
  fireEvent.blur(payload);
  expect(update).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Check JSON syntax');
});

it('keeps the chosen match operator when the JSON field changes', () => {
  const update = vi.fn();
  const contains = {
    ...node,
    data: { ...node.data, actions: [{ receive: { type: 'text', match: { contains: 'ok' } } }] },
  } as YAMLNode;
  render(
    <YAMLWebSocketDetails
      node={contains}
      onNodeUpdate={update}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit message 1' }));
  fireEvent.change(screen.getByLabelText('JSON field 1'), { target: { value: '$.type' } });
  const actions = update.mock.lastCall?.[1].actions;
  expect(actions[0].receive.match).toEqual({ contains: 'ok', jsonpath: '$.type' });
});

it('lets the user type a comma-separated subprotocol list', () => {
  function Harness() {
    const [current, setCurrent] = useState(node);
    return (
      <YAMLWebSocketDetails
        node={current}
        onNodeUpdate={(_, data) => setCurrent({ ...current, data })}
      />
    );
  }
  render(<Harness />);
  const input = screen.getByLabelText('Subprotocols');
  fireEvent.change(input, { target: { value: 'graphql-ws,' } });
  expect(input).toHaveValue('graphql-ws,');
  fireEvent.change(input, { target: { value: 'graphql-ws, chat' } });
  expect(input).toHaveValue('graphql-ws, chat');
});
