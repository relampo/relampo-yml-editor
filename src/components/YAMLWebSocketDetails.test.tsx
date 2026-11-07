import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: 'WebSocket conversation' })).toBeInTheDocument();
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
