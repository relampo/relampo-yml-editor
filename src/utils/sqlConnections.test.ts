import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { componentCapabilityError } from './componentConfiguration';
import { effectiveSQLConnection, sqlConnectionNames, validateSQLConnections } from './sqlConnections';
const script = `test: {name: SQL defaults}
sql_defaults:
  connections:
    tickets:
      dialect: postgres
      timeout: 5s
      future: {keep: true}
      connection: {host: localhost, database: tickets, user: reader, password: "{{password}}"}
scenarios:
- name: flow
  steps:
  - sql: {connection_ref: tickets, kind: query, query: "SELECT 1", params: []}
`;
describe('SQL connection authoring', () => {
  it('preserves names, references and unknown options on save and reopen', () => {
    const tree = parseYAMLToTree(script)!;
    expect(sqlConnectionNames(tree)).toEqual(['tickets']);
    expect(effectiveSQLConnection(tree)).toBe('tickets');
    expect(load(treeToYAML(tree))).toEqual(load(script));
    expect(validateSQLConnections(tree)).toEqual([]);
    expect(componentCapabilityError(script, { version: 1, features: [] })).toContain('SQL connection defaults');
    expect(componentCapabilityError(script, { version: 1, features: ['sql_connection_defaults'] })).toBeNull();
  });
  it('reports missing references instead of silently switching databases', () => {
    const tree = parseYAMLToTree(script.replace('connection_ref: tickets', 'connection_ref: missing'))!;
    expect(effectiveSQLConnection(tree, 'missing')).toBe('missing');
    expect(validateSQLConnections(tree)).toHaveLength(1);
  });
  it('keeps existing inline connections executable without SQL Defaults', () => {
    const input =
      'test: {name: Legacy}\nscenarios: [{name: flow, steps: [{sql: {dialect: mysql, kind: query, connection: {host: localhost, database: old, user: reader}, query: SELECT 1}}]}]';
    const tree = parseYAMLToTree(input)!;
    expect(load(treeToYAML(tree))).toEqual(load(input));
    expect(validateSQLConnections(tree)).toEqual([]);
  });
});
