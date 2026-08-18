import jsyaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

describe('YAML document fidelity', () => {
  it('preserves unknown semantic fields while applying supported edits', () => {
    const input = `
test:
  name: Fidelity test
  future_test:
    enabled: true
future_root:
  owner: backend
scenarios:
  - name: Original scenario
    future_scenario: keep-me
    steps:
      - group:
          name: Original group
          future_group:
            mode: experimental
          steps:
            - request:
                method: GET
                url: https://example.com/original
                future_request: request-value
                assertions:
                  - type: status
                    value: 200
                    future_assertion: assertion-value
                extractors:
                  - type: regex
                    var: token
                    pattern: token=(.*)
                    future_extractor: extractor-value
              future_step: step-value
`;

    const tree = parseYAMLToTree(input)!;
    const scenario = tree.children!.find(node => node.type === 'scenarios')!.children![0];
    scenario.name = 'Edited scenario';
    const group = scenario.children!.find(node => node.type === 'steps')!.children![0];
    group.name = 'Edited group';
    const request = group.children![0];
    request.data!.url = 'https://example.com/edited';

    const output = jsyaml.load(treeToYAML(tree)) as Record<string, any>;
    const outputScenario = output.scenarios[0];
    const outputGroup = outputScenario.steps[0].group;
    const outputRequest = outputGroup.steps[0].request;

    expect(output.future_root).toEqual({ owner: 'backend' });
    expect(output.test.future_test).toEqual({ enabled: true });
    expect(outputScenario).toMatchObject({ name: 'Edited scenario', future_scenario: 'keep-me' });
    expect(outputGroup).toMatchObject({
      name: 'Edited group',
      future_group: { mode: 'experimental' },
    });
    expect(outputRequest).toMatchObject({
      url: 'https://example.com/edited',
      future_request: 'request-value',
    });
    expect(outputRequest.assertions[0].future_assertion).toBe('assertion-value');
    expect(outputRequest.extractors[0].future_extractor).toBe('extractor-value');
    expect(outputGroup.steps[0].future_step).toBe('step-value');
  });

  it('does not restore removed structural children from preserved controller data', () => {
    const tree = parseYAMLToTree(`
test:
  name: Structural edit
scenarios:
  - name: Scenario
    steps:
      - group:
          name: Group
          future_group: keep-me
          steps:
            - get: /first
            - get: /removed
`)!;
    const group = tree.children!.find(node => node.type === 'scenarios')!.children![0].children!.find(
      node => node.type === 'steps',
    )!.children![0];
    group.children = [group.children![0]];

    const output = jsyaml.load(treeToYAML(tree)) as Record<string, any>;
    const outputGroup = output.scenarios[0].steps[0].group;

    expect(outputGroup.future_group).toBe('keep-me');
    expect(outputGroup.steps).toEqual([{ get: '/first' }]);
  });

  it('preserves unknown balanced data and unknown if step fields', () => {
    const tree = parseYAMLToTree(`
test:
  name: Controller fidelity
scenarios:
  - name: Scenario
    steps:
      - balanced:
          name: Weighted
          type: total
          future_controller: keep-balanced
        future_balanced_step: keep-step
        steps:
          - get: /balanced
            percentage: 100
      - if: "true"
        future_if_step: keep-if
        steps:
          - get: /conditional
`)!;

    const output = jsyaml.load(treeToYAML(tree)) as Record<string, any>;
    const [balanced, conditional] = output.scenarios[0].steps;

    expect(balanced.balanced.future_controller).toBe('keep-balanced');
    expect(balanced.future_balanced_step).toBe('keep-step');
    expect(conditional.future_if_step).toBe('keep-if');
  });

  it('preserves unknown sibling fields on other controller steps', () => {
    const tree = parseYAMLToTree(`
test:
  name: Controller siblings
scenarios:
  - name: Scenario
    steps:
      - parallel:
          name: Parallel
        future_parallel: keep-parallel
        steps:
          - get: /parallel
      - loop: 1
        future_loop: keep-loop
        steps:
          - get: /loop
      - retry: 2
        future_retry: keep-retry
        steps:
          - get: /retry
      - one_time:
          name: Setup
        future_one_time: keep-one-time
        steps:
          - get: /setup
      - on_error: continue
        future_on_error: keep-on-error
        steps:
          - get: /recover
`)!;

    const output = jsyaml.load(treeToYAML(tree)) as Record<string, any>;
    const steps = output.scenarios[0].steps;

    expect(steps.map((step: Record<string, any>) => Object.entries(step).find(([key]) => key.startsWith('future_')))).toEqual([
      ['future_parallel', 'keep-parallel'],
      ['future_loop', 'keep-loop'],
      ['future_retry', 'keep-retry'],
      ['future_one_time', 'keep-one-time'],
      ['future_on_error', 'keep-on-error'],
    ]);
  });
});
