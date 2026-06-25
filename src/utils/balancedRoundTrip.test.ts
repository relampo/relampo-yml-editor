import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

describe('balanced controller round-trip regressions', () => {
  it('preserves percentages for direct group children with HTTP requests', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Traffic Mix
          type: total
          mode: iteraciones
        steps:
          - get: https://example.com/a
            percentage: 55
          - group:
              name: Wrapper
              steps:
                - post: https://example.com/b
            percentage: 45
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const balanced = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).toContain('percentage: 55');
    expect(output).toContain('percentage: 45');
    expect(balanced.children?.[1].type).toBe('group');
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(45);
  });

  it('preserves percentages through nested controllers inside a transaction', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Traffic Mix
          type: total
          mode: iteraciones
        steps:
          - get: https://example.com/a
            percentage: 60
          - transaction:
              name: Checkout
              steps:
                - group:
                    name: Nested wrapper
                    steps:
                      - post: https://example.com/checkout
            percentage: 40
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const balanced = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).toContain('percentage: 60');
    expect(output).toContain('percentage: 40');
    expect(balanced.children?.[1].type).toBe('transaction');
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(40);
  });
});
