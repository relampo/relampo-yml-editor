import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { collectUnknownFieldPaths } from './unknownYamlFields';

describe('unknown YAML field warnings', () => {
  it('reports unknown gRPC fields under the grpc key', () => {
    const tree = parseYAMLToTree(`
scenarios:
  - name: rpc
    steps:
      - grpc:
          method: /practice.Shop/Login
          not_a_grpc_field: true
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual(['scenarios[0].steps[0].grpc.not_a_grpc_field']);
  });

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

  it('recognizes recorder cookies and response bodies and preserves them on save', () => {
    const yaml = `
test:
  name: recorded document
scenarios:
  - name: smoke
    cookies:
      mode: auto
    steps:
      - group:
          name: recorded group
          steps:
            - request:
                method: GET
                url: /health
                response:
                  status: 200
                  body: '<html>recorded response</html>'
            - request:
                method: GET
                url: /account
                response:
                  status: 200
                  body: {future_payload: {mode: custom}}
`;
    const tree = parseYAMLToTree(yaml)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([]);
    expect(load(treeToYAML(tree))).toEqual(load(yaml));
    expect(collectUnknownFieldPaths(parseYAMLToTree(treeToYAML(tree)))).toEqual([]);
  });

  it('still reports unknown siblings of recorder fields', () => {
    const tree = parseYAMLToTree(`
scenarios:
  - name: smoke
    cookies:
      mode: auto
      future_cookie: true
    steps:
      - request:
          method: GET
          url: /health
          response:
            status: 200
            body: recorded response
            future_response: true
`)!;

    expect(collectUnknownFieldPaths(tree)).toEqual([
      'scenarios[0].cookies.future_cookie',
      'scenarios[0].steps[0].request.response.future_response',
    ]);
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

it('RLP-802 recognizes saved Studio load profiles while warning about unrelated fields', () => {
  const tree = parseYAMLToTree(
    'scenarios:\n  - name: profiles\n    load: {type: constant, users: 1, iterations: 1}\n    x-studio-load-profiles: {linear: {type: ramp, start_users: 1, end_users: 2}}\n    future_scenario: true\n    steps: [{get: /}]\n',
  );
  expect(collectUnknownFieldPaths(tree)).toEqual(['scenarios[0].future_scenario']);
});

it('recognizes SQL extractor column and row fields while preserving future fields',()=>{
 const tree=parseYAMLToTree(`scenarios:
 - name: read
   steps:
    - sql:
        kind: query
        query: SELECT 1 AS event_id
        extractors:
          - {type: sql, var: event_id, column: event_id, row: 1, future_field: retained}
`)!;
 expect(collectUnknownFieldPaths(tree)).toEqual(['scenarios[0].steps[0].sql.extractors[0].future_field']);
});
