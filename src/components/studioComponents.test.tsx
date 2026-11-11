import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { validateYAMLSemantics } from '../utils/yamlSemanticValidation';
import { createNodeByType } from './yaml-tree-view/nodeFactory';
import { addNodeToTree } from './yaml-tree-view/treeOperations';
import { canAddNodeToTarget } from './yaml-tree-view/treeViewHelpers';
import { getAddableItems } from './yaml-tree-view/addableItems';
import { collectDebugEventTargets } from './debugRequests';
const source = `test: {name: regression}
data_source: {type: csv, mode: shared, path: users.csv, variable_names: user, name: Credentials}
scenarios:
- name: one
  load: {type: constant, users: 1, iterations: 1}
  cookies: {mode: manual, jar_scope: vu, persist_across_iterations: true, clear_each_iteration: false}
  steps:
  - request:
      method: POST
      url: /test
      body: {id: '{{real_name}}'}
      extractors: [{type: regex, var: disabled, pattern: 'id=(.*)', enabled: false}]
`;

describe('SPRINT 6 component authoring', () => {
 it('RLP-813 creates SQL alongside a global policy without inheriting HTTP stop_user', () => {
  let tree = createNodeByType('root_plan');
  tree = addNodeToTree(tree, tree.id, createNodeByType('error_policy'));
  const scenario = tree.children!.find(node=>node.type==='scenarios')!.children![0];
  const steps = scenario.children!.find(node=>node.type==='steps')!;
  tree = addNodeToTree(tree, steps.id, createNodeByType('sql'));
  expect(validateYAMLSemantics(parseYAMLToTree(treeToYAML(tree)))).toEqual([]);
 });
 it('RLP-820 allows an uploaded file to be added, edited and saved in its request', () => {
  let tree = parseYAMLToTree(source)!;
  const request = collectDebugEventTargets(tree)[0];
  expect(canAddNodeToTarget(request, 'file')).toBe(true);
  const file = createNodeByType('file'); file.data = {...file.data,path:'fixture.txt'};
  tree = addNodeToTree(tree,request.id,file);
  expect(treeToYAML(tree)).toContain('path: fixture.txt');
  expect(collectDebugEventTargets(parseYAMLToTree(treeToYAML(tree)))[0].children?.some(node=>node.type==='file')).toBe(true);
 });
 it('RLP-821 offers gRPC from request and step menus and defaults at test scope', () => {
  for (const type of ['request','steps','balanced'] as const) expect(getAddableItems(type,key=>key).map(item=>item.type)).toContain('grpc');
  expect(getAddableItems('request',key=>key).map(item=>item.type)).toContain('grpc_defaults');
  expect(createNodeByType('grpc').type).toBe('grpc');
  expect(createNodeByType('grpc_defaults').type).toBe('grpc_defaults');
 });

});
