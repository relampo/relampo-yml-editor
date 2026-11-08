import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { buildRequestNumbers, getNumberedRequestName } from './requestNumbers';

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
