import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { computeVisibleNodes } from './treeViewHelpers';

function node(id: string, name: string, children?: YAMLNode[]): YAMLNode {
  return { id, type: 'group', name, data: {}, children };
}

describe('computeVisibleNodes', () => {
  it('keeps matching descendants visible without rescanning each sibling subtree', () => {
    const tree = node('root', 'Root', [
      node('first', 'First', [node('first-request', 'GET /health')]),
      node('second', 'Second', [node('second-request', 'GET /users')]),
    ]);

    expect(computeVisibleNodes(tree, 'users').map(item => item.id)).toEqual(['root', 'second', 'second-request']);
  });

  it('shows all descendants when an ancestor name matches', () => {
    const tree = node('root', 'Root', [
      node('matching-group', 'Users', [
        node('request', 'GET /users'),
        node('nested', 'Nested', [node('nested-request', 'POST /users')]),
      ]),
      node('other-group', 'Other', [node('other-request', 'GET /health')]),
    ]);

    expect(computeVisibleNodes(tree, 'users').map(item => item.id)).toEqual([
      'root',
      'matching-group',
      'request',
      'nested',
      'nested-request',
    ]);
  });
});
