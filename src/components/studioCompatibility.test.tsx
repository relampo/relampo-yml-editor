import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { collectUnknownFieldPaths } from '../utils/unknownYamlFields';
import { validateYAMLSemantics } from '../utils/yamlSemanticValidation';
import { componentCapabilityError } from '../utils/componentConfiguration';
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

describe('SPRINT 6 runtime compatibility', () => {
 it('RLP-811 preserves metadata, aliases, disabled extractors and genuinely unknown fields', () => {
  const tree = parseYAMLToTree(source)!;
  expect(collectUnknownFieldPaths(tree)).toEqual([]);
  const request = collectDebugEventTargets(tree)[0];
  request.data = {...request.data, timeout:'3s'};
  const saved = treeToYAML(tree);
  for (const field of ['name: Credentials', 'jar_scope: vu', 'persist_across_iterations: true', 'enabled: false']) expect(saved).toContain(field);
  const unknown = parseYAMLToTree(source.replace('method: POST','method: POST\n      future_field: keep'))!;
  expect(collectUnknownFieldPaths(unknown)).toContain('scenarios[0].steps[0].request.future_field');
  expect(treeToYAML(unknown)).toContain('future_field: keep');
 });
 it('RLP-811 blocks disabling on older runtimes and diagnoses unsupported jar scopes', () => {
  expect(componentCapabilityError(source)).toMatch(/cannot disable extractors/);
  expect(componentCapabilityError(source, {version:1,features:['extractor_enabled']})).toBeNull();
  expect(validateYAMLSemantics(parseYAMLToTree(source.replace('jar_scope: vu','jar_scope: shared'))).some(issue=>issue.message.includes('jar_scope'))).toBe(true);
 });

});
