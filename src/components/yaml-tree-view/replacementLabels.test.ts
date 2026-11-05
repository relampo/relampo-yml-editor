import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { buildScopedSearch } from './search';
import { replaceTextInEnabledRequestsAtMatch } from './treeOperations';

function flatten(node: YAMLNode): YAMLNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

describe('replacement labels in the tree', () => {
  it('updates generated extractor and assertion labels immediately, before save/reload', () => {
    const tree = parseYAMLToTree(`test:
  name: Labels
scenarios:
  - name: Main
    steps:
      - request:
          method: GET
          url: /health
          extractors:
            - type: regex
              var: needle
              pattern: id=([0-9]+)
          assertions:
            - type: contains
              value: needle
`)!;
    const result = replaceTextInEnabledRequestsAtMatch(tree, 'needle', 'updated', undefined, true).result;
    const nodes = flatten(result.tree);
    expect(nodes.find(node => node.type === 'extractor')?.data?.var).toBe('updated');
    expect(nodes.find(node => node.type === 'extractor')?.name).toBe('Extract: updated');
    expect(nodes.find(node => node.type === 'assertion')?.name).toBe('Assert: contains = updated');
    expect(buildScopedSearch(result.tree, 'needle', 'requests').matchNodeIds).toHaveLength(0);
    const reloaded = flatten(parseYAMLToTree(treeToYAML(result.tree))!);
    expect(nodes.find(node => node.type === 'extractor')?.name).toBe(
      reloaded.find(node => node.type === 'extractor')?.name,
    );
  });
});

it('marks and replaces the actual displayed component name even when data.name is stale', () => {
  const tree: YAMLNode = {
    id: 'root',
    type: 'test',
    name: 'Test',
    children: [
      { id: 'component', type: 'group', name: 'Custom needle flow', data: { name: 'Old label' }, children: [] },
    ],
  };
  const before = buildScopedSearch(tree, 'needle', 'requests');
  expect(before.index.get('component')?.directMatch).toBe(true);
  expect(before.replaceableMatchNodeIds).toEqual(['component']);
  const result = replaceTextInEnabledRequestsAtMatch(tree, 'needle', 'updated', undefined, true).result;
  expect(result.replacements).toBe(1);
  expect(result.tree.children?.[0].name).toBe('Custom updated flow');
  expect(result.tree.children?.[0].data?.name).toBe('Custom updated flow');
  expect(buildScopedSearch(result.tree, 'updated', 'requests').index.get('component')?.directMatch).toBe(true);
});
