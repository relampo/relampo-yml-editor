import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import type { YAMLNode } from '../../types/yaml';
import { applyNodeUpdateToTree } from '../../utils/nodeUpdate';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { validateYAMLSemantics } from '../../utils/yamlSemanticValidation';
import { createNodeByType } from './nodeFactory';
import {
  addNodeToTree, cloneNodeSnapshot, cloneNodeWithNewIds, duplicateNodeInTree,
  insertNodesAfterTarget, moveNodeInTree, refreshTreePaths, removeNodeFromTree,
} from './treeOperations';
import { buildParentMap, canAddNodeToTarget, canDuplicateNode, findNodeById } from './treeViewHelpers';

const input = `test: {name: contexts, description: keep, future_test: preserved}
variables: {user: global}
http_defaults: {base_url: https://example.test}
data_source: {type: csv, file: global.csv, variable_names: user, mode: shared}
scenarios:
- name: Source
  future_scenario: {nested: [keep]}
  data_source: {type: csv, file: own.csv, variable_names: user, mode: per_vu}
  cookies: {persist_across_iterations: true}
  cache_manager: {enabled: true}
  error_policy: {on_error: continue}
  load: {type: constant, users: 2, iterations: 3}
  steps:
  - request: {name: Shared request name, method: GET, url: /health}
    future_step: keep
- name: Unbounded
  load: {type: constant, users: 1, run_until_stopped: true}
  steps: [{request: {name: Shared request name, method: GET, url: /health}}]
`;

function container(tree: YAMLNode) {
  return tree.children!.find(node => node.type === 'scenarios')!;
}
function document(tree: YAMLNode) {
  return yaml.load(treeToYAML(tree)) as { test: Record<string, unknown>; scenarios: Array<Record<string, any>> };
}

describe('scenario authoring contract', () => {
  it.each(['parallel', 'sequential'])('persists %s scheduling for plans created from an empty tree', mode => {
    let tree = createNodeByType('root_plan');
    tree = addNodeToTree(tree, container(tree).id, createNodeByType('scenario'));
    tree = applyNodeUpdateToTree(tree, tree.id, { ...tree.data, scenario_mode: mode });
    expect(tree.type).toBe('test');
    expect(document(tree).test).toEqual({ name: 'Test Plan', scenario_mode: mode });
    expect(validateYAMLSemantics(parseYAMLToTree(treeToYAML(tree)))).toEqual([]);
  });

  it('adds multiple uniquely named scenarios in execution order and requires an explicit mode', () => {
    let tree = parseYAMLToTree(input)!;
    for (let count = 0; count < 3; count += 1) {
      tree = addNodeToTree(tree, container(tree).id, createNodeByType('scenario'));
    }
    expect(container(tree).children!.map(node => node.name)).toEqual([
      'Source', 'Unbounded', 'New Scenario', 'New Scenario 2', 'New Scenario 3',
    ]);
    expect(validateYAMLSemantics(tree).map(issue => issue.message)).toEqual([
      'Choose sequential or parallel scenario scheduling for multiple scenarios.',
    ]);
    expect(document(tree).test.scenario_mode).toBeUndefined();
    expect(canAddNodeToTarget(container(tree), 'scenario')).toBe(true);
    expect(canAddNodeToTarget(container(tree).children![0], 'scenario')).toBe(false);
    expect(canDuplicateNode(container(tree))).toBe(false);
    expect(canDuplicateNode(undefined)).toBe(false);
  });

  it.each(['parallel', 'sequential'])('duplicates, renames, moves, deletes and round-trips %s contexts', mode => {
    const original = parseYAMLToTree(input)!;
    const originalDocument = document(original);
    const source = container(original).children![0];
    let tree = applyNodeUpdateToTree(original, original.id, { ...original.data, scenario_mode: mode });
    tree = duplicateNodeInTree(tree, source.id, 'Copy');
    tree = duplicateNodeInTree(tree, source.id, 'Copy');
    const copies = container(tree).children!.slice(1, 3);
    expect(copies.map(node => [node.name, node.data?.name])).toEqual([
      ['Source (Copy) 2', 'Source (Copy) 2'], ['Source (Copy)', 'Source (Copy)'],
    ]);
    expect(validateYAMLSemantics(tree)).toEqual([]);
    const ids = [...buildParentMap(tree).keys()];
    const count = (node: YAMLNode): number => 1 + (node.children || []).reduce((sum, child) => sum + count(child), 0);
    expect(new Set(ids).size).toBe(count(tree));
    const serialized = document(tree);
    for (const copy of serialized.scenarios.slice(1, 3)) {
      expect({ ...copy, name: 'Source' }).toEqual(originalDocument.scenarios[0]);
    }
    expect(serialized.scenarios[3]).toEqual(originalDocument.scenarios[1]);

    tree = applyNodeUpdateToTree(tree, copies[0].id, { ...copies[0].data, __name: 'Renamed' });
    expect(findNodeById(tree, copies[0].id)?.data?.name).toBe('Renamed');
    tree = moveNodeInTree(tree, copies[0].id, source.id, 'before');
    tree = refreshTreePaths(removeNodeFromTree(tree, copies[1].id));
    expect(container(tree).children!.map(node => [node.name, node.path])).toEqual([
      ['Renamed', ['scenarios', 0]], ['Source', ['scenarios', 1]], ['Unbounded', ['scenarios', 2]],
    ]);
    const exported = treeToYAML(tree);
    const imported = parseYAMLToTree(exported)!;
    expect(document(imported)).toEqual(document(tree));
    expect(validateYAMLSemantics(imported)).toEqual([]);
    expect(document(original)).toEqual(originalDocument);
  });

  it('keeps clipboard context snapshots independent and avoids collisions when pasting repeatedly', () => {
    let tree = parseYAMLToTree(input)!;
    const source = container(tree).children![0];
    const snapshot = cloneNodeSnapshot(source);
    source.data!.data_source!.file = 'changed.csv';
    expect(snapshot.data!.data_source!.file).toBe('own.csv');
    const pasted = cloneNodeWithNewIds(snapshot, 'Copy');
    tree = insertNodesAfterTarget(tree, source.id, [pasted, cloneNodeWithNewIds(snapshot, 'Copy')]);
    tree = addNodeToTree(tree, container(tree).id, cloneNodeWithNewIds(snapshot, 'Copy'));
    expect(container(tree).children!.map(node => node.name)).toEqual([
      'Source', 'Source (Copy)', 'Source (Copy) 2', 'Unbounded', 'Source (Copy) 3',
    ]);
    expect(pasted.data!.data_source).not.toBe(snapshot.data!.data_source);
    const request = container(tree).children![0].children!.find(node => node.type === 'steps')!.children![0];
    const invalid = insertNodesAfterTarget(tree, request.id, [cloneNodeWithNewIds(snapshot)]);
    expect(document(invalid)).toEqual(document(tree));
  });

  it('validates renames against persisted names, including blanks and duplicates', () => {
    let tree = parseYAMLToTree(input.replace('description: keep', 'description: keep, scenario_mode: parallel'))!;
    const second = container(tree).children![1];
    for (const name of ['Source', ' ']) {
      tree = applyNodeUpdateToTree(tree, second.id, { ...second.data, __name: name });
      expect(validateYAMLSemantics(tree).map(issue => issue.message)).toContain(
        'Multiple scenarios require unique, non-empty names.',
      );
    }
    tree = applyNodeUpdateToTree(tree, second.id, { ...second.data, __name: 'Independent' });
    expect(validateYAMLSemantics(tree)).toEqual([]);
  });
});
