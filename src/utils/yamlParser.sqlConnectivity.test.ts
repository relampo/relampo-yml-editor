import { dump, load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { createNodeByType } from '../components/yaml-tree-view/nodeFactory';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { collectUnknownFieldPaths } from './unknownYamlFields';

describe('SQL connectivity field placement', () => {
  it.each([
    { connection: { validate_connectivity: true }, expected: true },
    { connection: { validate_connectivity: false }, expected: false },
    { validate_connectivity: false, connection: { validate_connectivity: true }, expected: false },
    { validate_connectivity: true, connection: {}, expected: true },
  ])('saves canonical connectivity and accepts legacy nesting: %j', ({ expected, ...input }) => {
    const sql = { dialect: 'postgres', query: 'SELECT 1', ...input };
    const tree = parseYAMLToTree(dump({ scenarios: [{ steps: [{ sql }] }] }))!;
    expect(collectUnknownFieldPaths(tree)).toEqual([]);
    const saved = load(treeToYAML(tree)) as { scenarios: Array<{ steps: Array<{ sql: Record<string, unknown> }> }> };
    expect(saved.scenarios[0].steps[0].sql).toMatchObject({ validate_connectivity: expected });
    expect(saved.scenarios[0].steps[0].sql.connection).not.toHaveProperty('validate_connectivity');
  });

  it('creates SQL nodes with the engine field location', () => {
    const node = createNodeByType('sql');
    expect(node.data?.validate_connectivity).toBe(true);
    expect(node.data?.connection).not.toHaveProperty('validate_connectivity');
  });
});
