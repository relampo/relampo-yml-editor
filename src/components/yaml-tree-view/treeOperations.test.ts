import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { getTransactionWrapValidation, wrapNodesInTransaction } from './treeOperations';

function createBaseTree(): YAMLNode {
  return {
    id: 'root',
    type: 'test',
    name: 'Test',
    children: [
      {
        id: 'scenarios',
        type: 'scenarios',
        name: 'Scenarios',
        children: [
          {
            id: 'scenario-1',
            type: 'scenario',
            name: 'Scenario 1',
            children: [
              {
                id: 'steps-1',
                type: 'steps',
                name: 'Steps',
                children: [
                  { id: 'step-a', type: 'get', name: 'GET /a', children: [], data: { url: '/a' } },
                  { id: 'step-b', type: 'post', name: 'POST /b', children: [], data: { url: '/b' } },
                  { id: 'step-c', type: 'think_time', name: 'Think Time', data: { duration: '1s' } },
                  { id: 'step-d', type: 'sql', name: 'SQL', children: [], data: { query: 'SELECT 1' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function findNodeById(node: YAMLNode, nodeId: string): YAMLNode | null {
  if (node.id === nodeId) return node;
  for (const child of node.children || []) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

describe('transaction grouping operations', () => {
  it('wraps a valid contiguous sibling selection into a transaction preserving order and position', () => {
    const tree = createBaseTree();

    const result = wrapNodesInTransaction(tree, ['step-c', 'step-a', 'step-b']);

    expect(result).not.toBeNull();
    const stepsNode = findNodeById(result!.tree, 'steps-1');
    expect(stepsNode?.children?.map(child => child.id)).toEqual([result!.transactionNode.id, 'step-d']);
    expect(result!.transactionNode.children?.map(child => child.id)).toEqual(['step-a', 'step-b', 'step-c']);
    expect(result!.transactionNode.type).toBe('transaction');
    expect(result!.transactionNode.name).toBe('Transaction');
  });

  it('rejects non-contiguous selections', () => {
    const tree = createBaseTree();

    const validation = getTransactionWrapValidation(tree, ['step-a', 'step-c']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('contiguous');
  });

  it('rejects selections from different parents', () => {
    const tree = createBaseTree();
    const stepsNode = findNodeById(tree, 'steps-1')!;
    stepsNode.children!.push({
      id: 'group-1',
      type: 'group',
      name: 'Group',
      children: [{ id: 'nested-step', type: 'get', name: 'GET /nested', children: [], data: { url: '/nested' } }],
      data: { name: 'Group' },
    });

    const validation = getTransactionWrapValidation(tree, ['step-a', 'nested-step']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('same_parent');
  });

  it('rejects selections that do not belong to a compatible steps container', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'scenario-1',
          type: 'scenario',
          name: 'Scenario 1',
          children: [
            { id: 'load-1', type: 'load', name: 'Load', data: { type: 'constant' } },
            { id: 'cookies-1', type: 'cookies', name: 'Cookies', data: {} },
          ],
        },
      ],
    };

    const validation = getTransactionWrapValidation(tree, ['load-1', 'cookies-1']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('supported_parent');
  });

  it('rejects unsupported child node types even when selected under steps', () => {
    const tree = createBaseTree();
    const stepsNode = findNodeById(tree, 'steps-1')!;
    stepsNode.children = [
      { id: 'invalid-load', type: 'load', name: 'Load', data: { type: 'constant' } },
      { id: 'step-a', type: 'get', name: 'GET /a', children: [], data: { url: '/a' } },
    ];

    const validation = getTransactionWrapValidation(tree, ['invalid-load', 'step-a']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('supported_child');
  });
});
