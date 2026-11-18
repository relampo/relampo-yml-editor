import { expect, it } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
for (const type of ['intent', 'segments'])
  it(`preserves additional ${type} data when editing a request`, () => {
    const input = `test: {name: future}\nscenarios:\n- name: S\n  load: {type: ${type}, duration: 1m, future_scalar: keep, future_object: {strategy: next}}\n  steps: [{get: /health}]`;
    const tree = parseYAMLToTree(input)!;
    tree.name = 'Renamed';
    const output = load(treeToYAML(tree)) as any;
    expect(output.scenarios[0].load.future_scalar).toBe('keep');
    expect(output.scenarios[0].load.future_object).toEqual({ strategy: 'next' });
  });
