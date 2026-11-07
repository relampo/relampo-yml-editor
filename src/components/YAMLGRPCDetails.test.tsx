import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YAMLGRPCDetails } from './YAMLGRPCDetails';
import type { YAMLNode } from '../types/yaml';
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
    expect(screen.getByText('gRPC Request')).toBeInTheDocument();
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
