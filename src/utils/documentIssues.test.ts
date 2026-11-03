import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { expandAncestorsInTree } from '../components/yaml-tree-view/treeOperations';
import { indexDocumentIssues, nextIssueNodeId, previewIssueValue } from './documentIssues';
import { parseYAMLToTree } from './yamlParser';

const tree = parseYAMLToTree(`
test:
  name: doc
  future_root: true
scenarios:
  - name: smoke
    steps:
      - group:
          name: checkout
          steps:
            - request:
                method: GET
                url: /health
                response:
                  status: 200
                  future_response: {a: 1}
            - request:
                method: GET
                url: /cart
`)!;

function find(node: YAMLNode, predicate: (node: YAMLNode) => boolean): YAMLNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

const health = find(tree, node => node.data?.url === '/health')!;
const cart = find(tree, node => node.data?.url === '/cart')!;
const group = find(tree, node => node.name === 'checkout')!;

describe('indexDocumentIssues', () => {
  it('links each unrecognized field to its nearest node with a relative path and value', () => {
    const { issues, markers } = indexDocumentIssues(tree, [], []);

    expect(issues).toEqual([
      expect.objectContaining({
        nodeId: health.id,
        severity: 'info',
        relativePath: 'request.response.future_response',
        value: { a: 1 },
      }),
      expect.objectContaining({ nodeId: tree.id, relativePath: 'test.future_root', value: true }),
    ]);
    expect(markers[group.id]).toEqual({ issues: [], descendantSeverity: 'info' });
  });

  it('orders navigation by severity, then tree order, and wraps around', () => {
    const { navigationOrder, errorCount, infoCount, markers } = indexDocumentIssues(
      tree,
      ['URL is required.'],
      [cart.id],
    );

    expect([errorCount, infoCount]).toEqual([1, 2]);
    expect(navigationOrder).toEqual([cart.id, tree.id, health.id]);
    expect(markers[group.id].descendantSeverity).toBe('error');
    expect(nextIssueNodeId(navigationOrder, undefined)).toBe(cart.id);
    expect(nextIssueNodeId(navigationOrder, health.id)).toBe(cart.id);
    expect(nextIssueNodeId(navigationOrder, group.id)).toBe(cart.id);
  });
});

describe('previewIssueValue', () => {
  it('names the value type and cuts long values to 80 characters', () => {
    expect(previewIssueValue('x'.repeat(100))).toEqual({ type: 'text', preview: 'x'.repeat(80), truncated: true });
    expect(previewIssueValue([1])).toEqual({ type: 'list', preview: '[1]', truncated: false });
    expect(previewIssueValue({ a: 1 })).toMatchObject({ type: 'object' });
  });
});

describe('expandAncestorsInTree', () => {
  it('expands collapsed ancestors and keeps the tree when nothing changes', () => {
    const collapse = (node: YAMLNode): YAMLNode => ({ ...node, expanded: false, children: node.children?.map(collapse) });
    const expanded = expandAncestorsInTree(collapse(tree), health.id);

    expect(find(expanded, node => node.id === group.id)?.expanded).toBe(true);
    expect(find(expanded, node => node.type === 'scenario')?.expanded).toBe(true);
    expect(find(expanded, node => node.id === health.id)?.expanded).toBe(false);
    expect(find(expanded, node => node.id === cart.id)?.expanded).toBe(false);
    expect(expandAncestorsInTree(expanded, health.id)).toBe(expanded);
  });
});
