import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

describe('HTTP request extractor round-trip', () => {
  it('keeps extractor children when a manually created POST node is exported and reloaded', () => {
    const tree = {
      id: 'root',
      type: 'root',
      name: 'Test Plan',
      children: [
        {
          id: 'scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          children: [
            {
              id: 'scenario',
              type: 'scenario',
              name: 'Autenticacion',
              children: [
                {
                  id: 'steps',
                  type: 'steps',
                  name: 'Steps',
                  children: [
                    {
                      id: 'login',
                      type: 'post',
                      name: 'POST: /tuid-authn-login/authenticate',
                      data: {
                        url: 'https://eidas.tuid-preproduccion.uy/tuid-authn-login/authenticate',
                        body: '{}',
                      },
                      children: [
                        {
                          id: 'viewstate',
                          type: 'extractor',
                          name: 'ViewState_1',
                          data: {
                            type: 'regex',
                            from: 'body',
                            var: 'ViewState_1',
                            variable: 'ViewState_1',
                            pattern: 'ViewState-0" value="(.*):(::*)"',
                            capture_mode: 'index',
                            capture_index: '2',
                            group: 1,
                            default: 'NO_ViewState_1',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const yaml = treeToYAML(tree);

    expect(yaml).toContain('request:');
    expect(yaml).toContain('method: POST');
    expect(yaml).toContain('extractors:');
    expect(yaml).toContain('var: ViewState_1');

    const reparsed = parseYAMLToTree(yaml)!;
    const step = reparsed.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];
    const extractor = step.children?.find(c => c.type === 'extractor');

    expect(step.type).toBe('request');
    expect(step.data.method).toBe('POST');
    expect(extractor?.data?.var).toBe('ViewState_1');
    expect(extractor?.data?.pattern).toBe('ViewState-0" value="(.*):(::*)"');
  });

  it('loads backend short-form POST request maps with extractor config', () => {
    const yaml = `
scenarios:
  - name: s
    steps:
      - post:
          url: https://example.com/login
          body: "{}"
          extractors:
            - type: regex
              from: body
              var: token
              pattern: "token=(\\\\w+)"
              capture_mode: index
              capture_index: 2
              group: 1
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];
    const extractor = step.children?.find(c => c.type === 'extractor');

    expect(step.type).toBe('post');
    expect(step.data.method).toBe('POST');
    expect(step.data.url).toBe('https://example.com/login');
    expect(step.data.body).toBe('{}');
    expect(extractor?.data?.capture_mode).toBe('index');
    expect(extractor?.data?.capture_index).toBe(2);
  });
});
