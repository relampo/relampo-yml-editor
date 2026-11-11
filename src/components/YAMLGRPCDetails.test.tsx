import type { ReactElement } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { describe, it, expect, vi } from 'vitest';
import { render as baseRender, screen, fireEvent } from '@testing-library/react';
import { YAMLGRPCDetails } from './YAMLGRPCDetails';
import type { YAMLNode } from '../types/yaml';
const render = (ui: ReactElement) => baseRender(<LanguageProvider>{ui}</LanguageProvider>);
const node: YAMLNode = {
  id: 'rpc1',
  type: 'grpc',
  name: 'Login',
  data: {
    method: '/practice.Shop/Login',
    metadata: { 'x-tags': ['a', 'b'] },
    message: { username: 'user001' },
    response: { status: 'OK', message: { token: '***' } },
  },
};
describe('gRPC request details', () => {
  it('shows the RPC method, typed message, metadata and recorded response', () => {
    render(<YAMLGRPCDetails node={node} />);
    expect(screen.getByRole('region', { name: 'gRPC Request' })).toBeInTheDocument();
    expect(screen.getByLabelText('RPC method')).toHaveValue('/practice.Shop/Login');
    expect(screen.getByLabelText('Message (JSON)')).toHaveValue(JSON.stringify({ username: 'user001' }, null, 2));
    expect(screen.getByLabelText('Metadata (JSON)')).toHaveValue(JSON.stringify({ 'x-tags': ['a', 'b'] }, null, 2));
    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    expect(screen.getByLabelText('Recorded response')).toHaveValue(JSON.stringify(node.data?.response, null, 2));
  });
  it('updates valid message JSON without losing metadata or the recorded response', () => {
    const update = vi.fn();
    render(
      <YAMLGRPCDetails
        node={node}
        onNodeUpdate={update}
      />,
    );
    const input = screen.getByLabelText('Message (JSON)');
    fireEvent.change(input, { target: { value: '{"username":"user002"}' } });
    fireEvent.blur(input);
    expect(update).toHaveBeenLastCalledWith(
      'rpc1',
      expect.objectContaining({
        message: { username: 'user002' },
        metadata: node.data?.metadata,
        response: node.data?.response,
      }),
    );
  });
  it('keeps invalid JSON as a draft and never writes it to the YAML', () => {
    const update = vi.fn();
    render(
      <YAMLGRPCDetails
        node={node}
        onNodeUpdate={update}
      />,
    );
    const input = screen.getByLabelText('Message (JSON)');
    fireEvent.change(input, { target: { value: '{broken' } });
    fireEvent.blur(input);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

it('shows a saved contract response without presenting it as server evidence', () => {
  const contract = { message_type: 'practice.Shop.LoginResponse', message: { token: '', username: '', expiresIn: 0 } };
  const draft = { ...node, data: { ...node.data, response: undefined, response_template: contract } } as YAMLNode;
  render(<YAMLGRPCDetails node={draft} />);
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByLabelText('Contract response template')).toHaveValue(JSON.stringify(contract.message, null, 2));
  expect(screen.getByText(/not an actual server response/i)).toBeInTheDocument();
  expect(screen.queryByLabelText('Recorded response')).not.toBeInTheDocument();
});

it('uses the HTTP tabs and makes disabled requests inspectable without editing', () => {
  render(<YAMLGRPCDetails node={{ ...node, data: { ...node.data, enabled: false } }} />);
  expect(screen.getByRole('button', { name: 'Request' })).toHaveClass('border-b-2', 'border-yellow-400');
  expect(screen.getByLabelText('RPC method')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByRole('button', { name: 'Response' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Recorded response')).toHaveAttribute('readonly');
});

it('does not write default JSON on focus and removes cleared inherited fields', () => {
  const update = vi.fn();
  const withTarget = { ...node, data: { ...node.data, target: 'localhost:50051' } } as YAMLNode;
  render(
    <YAMLGRPCDetails
      node={withTarget}
      onNodeUpdate={update}
    />,
  );
  fireEvent.blur(screen.getByLabelText('Metadata (JSON)'));
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Target'), { target: { value: '' } });
  expect(update.mock.lastCall?.[1]).not.toHaveProperty('target');
});
