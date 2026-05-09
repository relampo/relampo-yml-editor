import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

    expect(screen.getByLabelText('Method')).toHaveValue('POST');
  });
});
