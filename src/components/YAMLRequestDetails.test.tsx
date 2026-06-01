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

  it('shows the inherited base host as the editable Base URL value for relative requests', () => {
    const node: YAMLNode = {
      id: 'get-base',
      type: 'get',
      name: 'GET: /assets/intro.mp4',
      data: { url: '/assets/intro.mp4' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://video-cdn.example.net" />);

    // Uniform with secondary (absolute) hosts: the field surfaces the inherited
    // host as a value rather than leaving it blank. See RLP-414.
    expect(screen.getByLabelText('Base URL')).toHaveValue('video-cdn.example.net');
  });

  it('rewrites to a relative URL when the Base URL is set back to the inherited host', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-base-keep',
      type: 'get',
      name: 'GET: https://api.other.com/login',
      data: { url: 'https://api.other.com/login?x=1' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://relax.beaire.com" onNodeUpdate={onNodeUpdate} />);

    // Pointing a secondary-host request back at the inherited host drops the
    // absolute URL so it inherits from http_defaults again.
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'relax.beaire.com' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith('get-base-keep', expect.objectContaining({ url: '/login?x=1' }));
  });

  it('writes an absolute URL when the Base URL is changed to a different host', () => {
    const onNodeUpdate = vi.fn();
    const node: YAMLNode = {
      id: 'get-base-change',
      type: 'get',
      name: 'GET: /login',
      data: { url: '/login?x=1' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} baseUrl="https://relax.beaire.com" onNodeUpdate={onNodeUpdate} />);

    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'api.other.com' } });

    expect(onNodeUpdate).toHaveBeenLastCalledWith(
      'get-base-change',
      expect.objectContaining({ url: 'https://api.other.com/login?x=1' }),
    );
  });

  it('falls back to the generic Base URL placeholder when no base_url is configured', () => {
    const node: YAMLNode = {
      id: 'get-nobase',
      type: 'get',
      name: 'GET: /',
      data: { url: '' },
      children: [],
    };

    render(<YAMLRequestDetails node={node} />);

    expect(screen.getByPlaceholderText('api.example.com')).toBeInTheDocument();
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
