import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { applyNodeUpdateToTree } from './nodeUpdate';

describe('applyNodeUpdateToTree', () => {
  it('updates multiple balanced children in a single mutation', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'Root',
      children: [
        {
          id: 'balanced-1',
          type: 'balanced',
          name: 'Balanced Controller',
          data: { type: 'total', mode: 'iteraciones' },
          children: [
            {
              id: 'request-1',
              type: 'get',
              name: 'GET: /first',
              data: { url: '/first', __balancedPercentage: 10 },
            },
            {
              id: 'request-2',
              type: 'post',
              name: 'POST: /second',
              data: { url: '/second', __balancedPercentage: 20 },
            },
          ],
        },
      ],
    };

    const updatedTree = applyNodeUpdateToTree(tree, 'balanced-1', {
      type: 'total',
      mode: 'iteraciones',
      __batchChildUpdates: [
        { nodeId: 'request-1', data: { url: '/first', __balancedPercentage: 50 } },
        { nodeId: 'request-2', data: { url: '/second', __balancedPercentage: 50 } },
      ],
    });

    const balanced = updatedTree.children?.[0];
    expect(balanced?.children?.[0].data.__balancedPercentage).toBe(50);
    expect(balanced?.children?.[1].data.__balancedPercentage).toBe(50);
  });
});
