import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

describe('balanced controller round-trip regressions', () => {
  it.each([
    ['total', 'virtual_users'],
    ['total', 'iterations'],
    ['partial', 'virtual_users'],
    ['partial', 'iterations'],
  ])('preserves a complete parallel branch for %s / %s without internal fields', (type, mode) => {
    const input = `test:
  name: balanced parallel
scenarios:
  - name: Traffic mix
    load:
      users: 4
      iterations: 1
    steps:
      - balanced:
          name: Traffic mix
          type: ${type}
          mode: ${mode}
        steps:
          - parallel:
              name: Concurrent reads
              steps:
                - get: https://example.com/a
                - get: https://example.com/b
            percentage: 50
          - get: https://example.com/c
            percentage: 50
`;
    const output = treeToYAML(parseYAMLToTree(input)!);
    const reparsed = parseYAMLToTree(output)!;
    const balanced = reparsed.children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).not.toContain('__balancedPercentage');
    expect(output.match(/percentage:/g)).toHaveLength(2);
    expect(balanced.children?.[0].type).toBe('parallel');
    expect(balanced.children?.[0].data?.__balancedPercentage).toBe(50);
    expect(balanced.children?.[0].children).toHaveLength(2);
    expect(balanced.children?.[0].children?.map(child => child.data?.__balancedPercentage)).toEqual([undefined, undefined]);
  });

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
    expect(balanced.children?.[1].data!.__balancedPercentage).toBe(45);
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
    expect(balanced.children?.[1].data!.__balancedPercentage).toBe(40);
  });
});
