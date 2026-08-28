import { describe, expect, it } from 'vitest';
import { parseYAMLToTree } from './yamlParser';
import { collectUnknownFieldPaths } from './unknownYamlFields';

describe('unknown YAML field warnings', () => {
  it('does not report recorder metadata at test scope', () => {
    const tree = parseYAMLToTree(`
test:
  name: recorded document
  recorded_at: 2026-08-27T21:34:06Z
  recorded_from: https://www.testingyes.com
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([]);
  });

  it('does not report fields supported by the backend contract', () => {
    const tree = parseYAMLToTree(`
test:
  name: supported
scenarios:
  - name: smoke
    profile: steady
    steps:
      - request:
          request_id: 7
          method: GET
          url: /health
          query_params:
            page: '1'
          recorded_at: 2026-08-18T00:00:00Z
          response:
            status: 200
          response_preview:
            status: 200
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([]);
  });

  it('reports paths without blocking forward-compatible documents', () => {
    const tree = parseYAMLToTree(`
test:
  name: warning
  future_test: true
future_root: true
scenarios:
  - name: smoke
    future_scenario: true
    steps:
      - group:
          name: group
          future_group: true
          steps:
            - request:
                method: GET
                url: /
                future_request: true
                assertions:
                  - type: status
                    value: 200
                    future_assertion: true
              future_step: true
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([
      'future_root',
      'scenarios[0].future_scenario',
      'scenarios[0].steps[0].group.future_group',
      'scenarios[0].steps[0].steps[0].future_step',
      'scenarios[0].steps[0].steps[0].request.assertions[0].future_assertion',
      'scenarios[0].steps[0].steps[0].request.future_request',
      'test.future_test',
    ]);
  });

  it('reports unknown fields inside every supported controller payload', () => {
    const tree = parseYAMLToTree(`
test:
  name: controller warnings
scenarios:
  - name: smoke
    steps:
      - parallel:
          name: parallel
          future_parallel: true
          steps: []
      - balanced:
          name: balanced
          type: total
          mode: virtual_users
          future_balanced: true
          steps: []
      - retry:
          attempts: 2
          future_retry: true
          steps: []
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([
      'scenarios[0].steps[0].parallel.future_parallel',
      'scenarios[0].steps[1].balanced.future_balanced',
      'scenarios[0].steps[2].retry.future_retry',
    ]);
  });
});
