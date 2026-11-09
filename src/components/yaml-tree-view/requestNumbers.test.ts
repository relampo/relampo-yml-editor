import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { buildRequestNumbers, getNumberedRequestName } from './requestNumbers';
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

const node = (id: string, type: YAMLNode['type'], children?: YAMLNode[]): YAMLNode => ({ id, type, name: id, children });

describe('request numbering', () => {
  it('counts mixed samplers through collapsed and disabled controllers without counting containers or helpers', () => {
    const tree = node('root', 'root', [
      node('http', 'get'),
      { ...node('parallel', 'parallel', [node('ws', 'websocket'), node('group', 'group', [
        node('wait', 'think_time'), { ...node('grpc', 'grpc'), data: { enabled: false } },
      ])]), expanded: false },
      node('once', 'one_time', [node('sql', 'sql'), node('http2', 'request')]),
    ]);
    expect([...buildRequestNumbers(tree)]).toEqual([['http', 1], ['ws', 2], ['grpc', 3], ['sql', 4], ['http2', 5]]);
  });

  it('replaces an old recorder prefix only for display and preserves custom names', () => {
    expect(getNumberedRequestName('[12] GET /api', 3)).toBe('[3] GET /api');
    expect(getNumberedRequestName('My socket', 4)).toBe('[4] My socket');
    expect(getNumberedRequestName('Group', undefined)).toBe('Group');
  });
});
