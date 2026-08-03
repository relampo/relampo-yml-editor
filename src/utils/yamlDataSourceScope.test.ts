import { describe, expect, it } from 'vitest';
import { moveNodeInTree } from '../components/yaml-tree-view/treeOperations';
import type { YAMLNode } from '../types/yaml';
import { validateTreeStructure } from './yamlDragDropRules';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

function findNode(node: YAMLNode, type: YAMLNode['type']): YAMLNode | undefined {
  if (node.type === type) return node;
  for (const child of node.children || []) {
    const match = findNode(child, type);
    if (match) return match;
  }
  return undefined;
}

describe('request data source scopes', () => {
  it('round-trips a data source moved from root to request to steps', () => {
    const tree = parseYAMLToTree(`
test:
  name: scope-test
data_source:
  type: csv
  file: users.csv
  variable_names: user
scenarios:
  - name: scenario
    steps:
      - request:
          method: GET
          url: /users/{{user}}
`) as YAMLNode;

    const rootDataSource = findNode(tree, 'data_source');
    const request = findNode(tree, 'request');
    expect(rootDataSource).toBeDefined();
    expect(request).toBeDefined();

    const requestScopedTree = moveNodeInTree(tree, rootDataSource!.id, request!.id, 'inside');
    expect(validateTreeStructure(requestScopedTree).valid).toBe(true);

    const requestScopedYAML = treeToYAML(requestScopedTree);
    const requestScopedParsed = parseYAMLToTree(requestScopedYAML) as YAMLNode;
    const requestScopedRequest = findNode(requestScopedParsed, 'request');
    expect(requestScopedRequest?.children?.some(child => child.type === 'data_source')).toBe(true);
    expect(requestScopedYAML).not.toContain('\ndata_source:\n');

    const requestDataSource = requestScopedRequest?.children?.find(child => child.type === 'data_source');
    const steps = findNode(requestScopedParsed, 'steps');
    expect(requestDataSource).toBeDefined();
    expect(steps).toBeDefined();

    const stepScopedTree = moveNodeInTree(requestScopedParsed, requestDataSource!.id, steps!.id, 'inside');
    expect(validateTreeStructure(stepScopedTree).valid).toBe(true);

    const stepScopedYAML = treeToYAML(stepScopedTree);
    const stepScopedParsed = parseYAMLToTree(stepScopedYAML) as YAMLNode;
    const stepScopedRequest = findNode(stepScopedParsed, 'request');
    const stepScopedDataSource = findNode(stepScopedParsed, 'data_source');
    expect(stepScopedRequest?.children?.some(child => child.type === 'data_source')).toBe(false);
    expect(stepScopedDataSource).toBeDefined();
    expect(stepScopedYAML).toContain('steps:\n      - request:');
    expect(stepScopedYAML).toContain('      - data_source:');
  });
});
