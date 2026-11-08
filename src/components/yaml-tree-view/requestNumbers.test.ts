import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { buildRequestNumbers } from './requestNumbers';
import { parseYAMLToTree } from '../../utils/yamlParser';

describe('request display order', () => {
  it('numbers imported and recorded RPCs with HTTP requests, including disabled and nested steps', () => {
    const tree = parseYAMLToTree(`test: {name: Mixed}
scenarios:
  - name: Purchase
    steps:
      - request: {name: '[42] Login', method: POST, url: /login, request_id: 42}
      - grpc: {name: ListEvents, method: /practice.Shop/ListEvents, enabled: false}
      - group:
          name: Purchase
          steps:
            - grpc: {name: Reserve, method: /practice.Shop/Reserve}
      - get: /health
  - name: Other
    steps:
      - grpc: {name: Login, method: /practice.Shop/Login}
`);
    const before = JSON.stringify(tree);
    expect([...buildRequestNumbers(tree).values()]).toEqual([1, 2, 3, 4, 1]);
    expect(JSON.stringify(tree)).toBe(before);
  });
  it('recomputes after reorder and includes collapsed children', () => {
    const first: YAMLNode = { id: 'a', type: 'grpc', name: 'Login' };
    const second: YAMLNode = { id: 'b', type: 'grpc', name: 'ListEvents' };
    const tree: YAMLNode = { id: 'steps', type: 'steps', name: 'Steps', expanded: false, children: [first, second] };
    expect([...buildRequestNumbers(tree)]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect([...buildRequestNumbers({ ...tree, children: [second, first] })]).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
  });
});
