import { expect, it } from 'vitest';
import { dump } from 'js-yaml';
import {
  collectDebugEventTargets,
  matchDebugEventTarget,
  requestExtractorVariableNames,
  variableRowsForRequestNode,
} from './debugRequests';
import { parseYAMLToTree } from '../utils/yamlParser';
const extractor = { type: 'jsonpath', var: 'captured', expression: '$.value' };
const nativeDebugCases = [
  {
    label: 'HTTP',
    kind: 'request',
    method: 'POST',
    body: { name: 'Capture', url: 'http://example.test/check', method: 'POST', extractors: [extractor] },
  },
  {
    label: 'gRPC',
    kind: 'grpc',
    method: 'GRPC',
    body: { name: 'Capture', method: '/demo.Service/Call', extractors: [extractor] },
  },
  {
    label: 'WebSocket',
    kind: 'websocket',
    method: 'WS',
    body: {
      name: 'Capture',
      url: 'ws://example.test/ws',
      actions: [{ receive: { type: 'text', extractors: [extractor] } }],
    },
  },
  {
    label: 'SQL',
    kind: 'sql',
    method: 'SQL',
    body: {
      name: 'Capture',
      kind: 'query',
      query: 'SELECT 7 AS value',
      extractors: [{ type: 'sql', var: 'captured', column: 'value', row: 1 }],
    },
  },
  {
    label: 'gRPC streaming',
    kind: 'grpc',
    method: 'GRPC',
    body: {
      name: 'Capture',
      method: '/demo.Service/Watch',
      stream: { type: 'server_streaming', receive: [{ index: 1, extractors: [extractor] }] },
    },
  },
];
it.each(nativeDebugCases)('maps $label capture variables to the exact debug event', test => {
  const tree = parseYAMLToTree(dump({ scenarios: [{ steps: [{ [test.kind]: test.body }] }] }))!;
  const targets = collectDebugEventTargets(tree);
  const node = matchDebugEventTarget(
    { name: 'Capture', method: test.method, path: '/runtime', step_path: 'scenarios[0].steps[0]' },
    targets,
  )!;
  expect(node).toBeTruthy();
  expect(requestExtractorVariableNames(node)).toContain('captured');
  expect(variableRowsForRequestNode(node, { captured: 'runtime-7', unrelated: 'hidden' })).toEqual([
    ['captured (RES)', 'runtime-7'],
  ]);
});
it('uses the actual earlier WebSocket captures rather than re-extracting from the latest message', () => {
  const tree = parseYAMLToTree(
    dump({
      scenarios: [
        {
          steps: [
            {
              websocket: {
                actions: [
                  { receive: { extractors: [{ type: 'regex', var: 'first', pattern: '(\\d+)', group: 1 }] } },
                  { receive: { extractors: [{ type: 'regex', var: 'second', pattern: '(\\d+)', group: 1 }] } },
                ],
              },
            },
          ],
        },
      ],
    }),
  )!;
  const node = collectDebugEventTargets(tree)[0];
  expect(variableRowsForRequestNode(node, { first: '11', second: '22' }, { responseBody: '22' })).toEqual([
    ['first (RES)', '11'],
    ['second (RES)', '22'],
  ]);
});
it('keeps gRPC stream captures scoped to the real rule and ignores response template placeholders', () => {
  const tree = parseYAMLToTree(
    dump({
      scenarios: [
        {
          steps: [
            {
              grpc: {
                method: '/demo/Watch',
                stream: { receive: [{ extractors: [extractor, { ...extractor, var: 'disabled', enabled: false }] }] },
                response_template: { message: { id: '{{not_executed}}' } },
                response: { message: { id: '{{also_not_executed}}' } },
              },
            },
          ],
        },
      ],
    }),
  )!;
  const node = collectDebugEventTargets(tree)[0];
  expect(
    variableRowsForRequestNode(node, { captured: '%2F', not_executed: 'x', also_not_executed: 'x', disabled: 'old' }),
  ).toEqual([['captured (RES)', '%2F']]);
});
it('shows destination variable names from data sources rather than CSV column names', () => {
  const tree = parseYAMLToTree(
    dump({
      scenarios: [
        {
          steps: [
            {
              grpc: {
                method: '/demo/Call',
                data_source: { type: 'csv', file: 'names.csv', bind: { csv_column: 'actual_name' } },
              },
            },
          ],
        },
      ],
    }),
  )!;
  expect(variableRowsForRequestNode(collectDebugEventTargets(tree)[0], { actual_name: 'Ada' })).toEqual([
    ['actual_name (REQ)', 'Ada'],
  ]);
});
