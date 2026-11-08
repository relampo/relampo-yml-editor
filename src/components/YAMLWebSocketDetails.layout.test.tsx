import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLWebSocketDetails } from './YAMLWebSocketDetails';
const node: YAMLNode = {
  id: 'ws',
  type: 'websocket',
  name: 'Auction',
  data: {
    url: 'wss://example.com:8443/ws?token={{token}}',
    timeout: '30s',
    actions: [{ send: { data: 'ping', delay_before: '21.809s' } }, { receive: { response: { data: 'pong' } } }],
  },
};
const show = (ws = node, update = vi.fn()) =>
  render(
    <LanguageProvider>
      <YAMLWebSocketDetails
        node={ws}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
describe('WebSocket HTTP-style details', () => {
  it('uses address fields, tabs and a separate headers element instead of inline headers or duplicate name', () => {
    show();
    expect(screen.getByRole('tab', { name: 'Connection' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Base URL')).toHaveValue('example.com:8443');
    expect(screen.getByLabelText('Path')).toHaveValue('/ws?token={{token}}');
    expect(screen.queryByLabelText('Step name')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add headers')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    expect(screen.getByLabelText('Message timeline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit message 1' }));
    expect(screen.getByLabelText('Message payload 1')).toHaveValue('ping');
    expect(screen.getByLabelText('Delay before 1')).toHaveValue('21.809s');
  });
  it('edits the address without changing variable placeholders, pauses or message data', () => {
    const update = vi.fn();
    show(node, update);
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'other.example:9443' } });
    expect(update).toHaveBeenLastCalledWith(
      'ws',
      expect.objectContaining({
        url: 'wss://other.example:9443/ws?token={{token}}',
        actions: node.data?.actions,
      }),
    );
  });
  it('exposes disabled fields for inspection and prevents editing', () => {
    show({ ...node, data: { ...node.data, enabled: false } });
    expect(screen.getByLabelText('Base URL')).toBeDisabled();
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit message 1' }));
    expect(screen.getByLabelText('Message payload 1')).toBeDisabled();
  });
});
