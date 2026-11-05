import { describe, expect, it } from 'vitest';
import { nodeSearchOccurrences } from './searchOccurrences';
import { buildScopedSearch } from './search';
import { getReplaceableMatchNodeIds } from './treeOperations';
import type { YAMLNode } from '../../types/yaml';

describe('search occurrence locations', () => {
  it('keeps distinct offsets and fields in the same order as replacement', () => {
    const node: YAMLNode = {
      id: 'request',
      type: 'request',
      name: 'needle needle',
      data: {
        name: 'needle needle',
        method: 'GET',
        url: '/needle?next=needle',
        body_raw: 'one needle\ntwo needle',
        response: { body: 'needle response' },
      },
    };
    const matches = nodeSearchOccurrences(node, 'needle', 'requests');
    expect(matches.map(match => [match.path.join('.'), match.start, match.fieldIndex])).toEqual([
      ['name', 0, 0],
      ['name', 7, 1],
      ['url', 1, 0],
      ['url', 13, 1],
      ['body_raw', 4, 0],
      ['body_raw', 15, 1],
    ]);
    expect(new Set(matches.map(match => match.id)).size).toBe(6);
    expect(buildScopedSearch(node, 'needle', 'requests').replaceableMatchNodeIds).toEqual(
      getReplaceableMatchNodeIds(node, 'needle', true),
    );
  });
  it('handles encoded URLs and response-only locations', () => {
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'Request',
      data: { url: '/hello%20world', response: { body: 'hello world\nhello world' } },
    };
    expect(nodeSearchOccurrences(node, 'hello world', 'requests')[0]).toMatchObject({
      path: ['url'],
      start: 1,
      end: 14,
    });
    expect(nodeSearchOccurrences(node, 'hello world', 'responses').map(match => match.bodyIndex)).toEqual([0, 1]);
    expect(nodeSearchOccurrences(node, 'hello world', 'responses').every(match => !match.replaceable)).toBe(true);
  });
  it('counts built-in component names in Requests without adding response matches', () => {
    for (const type of ['load', 'cookies', 'headers', 'steps', 'http_defaults'] as const) {
      const node: YAMLNode = { id: type, type, name: `${type} component`, data: {} };
      const search = buildScopedSearch(node, type, 'requests');
      expect(search.matches).toHaveLength(1);
      expect(search.matches[0]).toMatchObject({ nodeId: type, path: ['name'], replaceable: false });
      expect(search.index.get(type)?.directMatch).toBe(true);
      expect(buildScopedSearch(node, type, 'responses').matches).toHaveLength(0);
    }
  });

});
