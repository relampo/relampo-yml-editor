import { expect, it } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { componentCapabilityError, inspectComponentConfiguration } from './componentConfiguration';
import type { YAMLNode } from '../types/yaml';
const yaml = `test: {name: SQL extraction}
scenarios:
 - name: read
   load: {type: constant, users: 1, iterations: 1}
   steps:
    - sql:
        kind: query
        query: SELECT id AS event_id FROM events LIMIT 1
        extractors:
         - {type: sql, var: event_id, column: event_id, row: 1, future_field: preserved}
`;
function find(node: YAMLNode, type: string): YAMLNode | undefined {
  return node.type === type ? node : node.children?.map(child => find(child, type)).find(Boolean);
}
it('parses SQL extractors as editable children and writes their changes without losing unknown fields', () => {
  const tree = parseYAMLToTree(yaml)!;
  const sql = find(tree, 'sql')!;
  const ext = find(sql, 'extractor')!;
  expect(ext.data).toMatchObject({ type: 'sql', column: 'event_id', var: 'event_id', row: 1 });
  ext.data!.column = 'id';
  const saved = load(treeToYAML(tree)) as {
    scenarios: Array<{ steps: Array<{ sql: { extractors: Array<Record<string, unknown>> } }> }>;
  };
  expect(saved.scenarios[0].steps[0].sql.extractors[0]).toMatchObject({ column: 'id', future_field: 'preserved' });
  sql.children = [];
  expect((load(treeToYAML(tree)) as typeof saved).scenarios[0].steps[0].sql.extractors).toEqual([]);
});
it('validates SQL extractor settings and rejects backends without the execution capability', () => {
  expect(inspectComponentConfiguration(load(yaml)).required).toContain('sql_extractors');
  expect(componentCapabilityError(yaml, { version: 1, features: [] })).toContain('SQL extractors');
  expect(componentCapabilityError(yaml, { version: 1, features: ['sql_extractors'] })).toBeNull();
  expect(
    inspectComponentConfiguration(load(yaml.replace('row: 1', 'row: 0'))).errors.some(issue =>
      issue.path.endsWith('.row'),
    ),
  ).toBe(true);
});
