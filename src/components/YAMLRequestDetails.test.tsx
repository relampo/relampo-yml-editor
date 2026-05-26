import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { YAMLRequestDetails } from './YAMLRequestDetails';

describe('YAMLRequestDetails', () => {
  it('shows the HTTP method from short-form node type when method data is absent', () => {
    const node: YAMLNode = {
      id: 'post-1',
      type: 'post',
      name: 'POST: /login',
      data: { url: '/login' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByLabelText('Method')).toHaveTextContent('POST');
  });

  it('shows the path example as a placeholder for a new blank request', () => {
    const node: YAMLNode = {
      id: 'get-1',
      type: 'get',
      name: 'GET: /',
      data: { url: '' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByLabelText('Path')).toHaveValue('');
    expect(screen.getByPlaceholderText('/api/endpoint')).toBeInTheDocument();
  });

  it('keeps blank path edits empty in editor state so export can normalize to slash', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-2',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-2', expect.objectContaining({ url: '' }));
  });

  it('preserves protocol, host, and query when the path is cleared on an absolute URL', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-3',
      type: 'get',
      name: 'GET: https://api.example.com/login',
      data: { url: 'https://api.example.com/login?x=1' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith(
      'get-3',
      expect.objectContaining({ url: 'https://api.example.com/?x=1' }),
    );
  });

  it('preserves the query string when the path is cleared on a relative URL', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-4',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login?x=1' },
      children: [],
    };

    render(
      <YAMLRequestDetails
        node={node}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-4', expect.objectContaining({ url: '/?x=1' }));
  });
});
