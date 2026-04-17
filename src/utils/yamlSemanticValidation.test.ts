import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { validateYAMLSemantics } from './yamlSemanticValidation';

describe('validateYAMLSemantics', () => {
  it('flags transactions with fewer than 2 related steps', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Checkout',
          data: { name: 'Checkout' },
          children: [{ id: 'req-1', type: 'post', name: 'POST /cart', data: { url: '/cart' }, children: [] }],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'transaction-1',
        message: '"Checkout" must contain at least 2 related steps.',
      },
    ]);
  });

  it('accepts transactions with two or more ordered steps', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Checkout',
          data: { name: 'Checkout' },
          children: [
            { id: 'req-1', type: 'post', name: 'POST /cart', data: { url: '/cart' }, children: [] },
            { id: 'req-2', type: 'post', name: 'POST /payment', data: { url: '/payment' }, children: [] },
          ],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });
});
