import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import type { RedirectedRequestInfo } from '../../types/yaml';
import {
  addNodeToTree,
  getTransactionWrapValidation,
  refreshTreePaths,
  replaceTextInEnabledRequests,
  syncRedirectSourceFollowRedirects,
  updateNodeEnabled,
  wrapNodesInTransaction,
} from './treeOperations';
import { parseYAMLToTree } from '../../utils/yamlParser';

function findRequest(node: YAMLNode): YAMLNode | undefined {
  if (node.type === 'request' || node.type === 'get' || node.type === 'post') return node;
  for (const child of node.children || []) {
    const found = findRequest(child);
    if (found) return found;
  }
  return undefined;
}

describe('replaceTextInEnabledRequests', () => {
  it('replaces request and header values but skips disabled requests', () => {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'enabled-request',
          type: 'request',
          name: 'Enabled',
          data: {
            url: '/users/xyz123',
            body: { id: 'xyz123' },
            response: { body: 'xyz123', headers: { 'X-Recorded': 'xyz123' } },
            enabled: true,
          },
          children: [{ id: 'enabled-headers', type: 'headers', name: 'Headers', data: { Authorization: 'xyz123' } }],
        },
        {
          id: 'disabled-request',
          type: 'request',
          name: 'Disabled',
          data: { url: '/disabled/xyz123', enabled: false },
          children: [{ id: 'disabled-headers', type: 'headers', name: 'Headers', data: { 'X-Test': 'xyz123' } }],
        },
      ],
    };

    const result = replaceTextInEnabledRequests(tree, 'xyz123', '{{rifa}}');

    expect(result.replacements).toBe(3);
    expect(result.tree.children?.[0].data.url).toBe('/users/{{rifa}}');
    expect(result.tree.children?.[0].data.body.id).toBe('{{rifa}}');
    expect(result.tree.children?.[0].children?.[0].data.Authorization).toBe('{{rifa}}');
    expect(result.tree.children?.[0].data.response).toEqual({
      body: 'xyz123',
      headers: { 'X-Recorded': 'xyz123' },
    });
    expect(result.tree.children?.[1].data.url).toBe('/disabled/xyz123');
    expect(result.tree.children?.[1].children?.[0].data['X-Test']).toBe('xyz123');
  });

  it('counts each header replacement once on a real parsed tree', () => {
    // The hand-built fixture above omits `headers` from the request node's own
    // data, which is not what the parser produces: it hands the very same
    // headers object to both `node.data.headers` and the `headers` child, so
    // both get visited. Building from parseYAMLToTree keeps this honest.
    const tree = parseYAMLToTree(`
test:
  name: count
scenarios:
  - name: s
    steps:
      - request:
          method: GET
          url: /u/xyz123
          headers:
            Authorization: xyz123
`) as YAMLNode;

    const request = findRequest(tree)!;
    expect(request.data.headers).toBe(request.children?.find(child => child.type === 'headers')?.data);

    const result = replaceTextInEnabledRequests(tree, 'xyz123', '{{tok}}');

    // Two user-visible values: the URL and the Authorization header.
    expect(result.replacements).toBe(2);

    const replaced = findRequest(result.tree)!;
    expect(replaced.data.url).toBe('/u/{{tok}}');
    // Both copies are still rewritten — YAMLRequestDetails reads
    // node.data.headers for Content-Type, so leaving it stale would be wrong.
    expect(replaced.data.headers).toEqual({ Authorization: '{{tok}}' });
    expect(replaced.children?.find(child => child.type === 'headers')?.data).toEqual({
      Authorization: '{{tok}}',
    });
  });

  it('still counts request headers that have no headers child node', () => {
    // The parser only emits the child for a non-empty object, so a request
    // carrying headers without one must keep owning its own tally.
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'request',
          type: 'request',
          name: 'R',
          data: { url: '/u/xyz123', headers: { Authorization: 'xyz123' } },
          children: [],
        },
      ],
    };

    const result = replaceTextInEnabledRequests(tree, 'xyz123', '{{tok}}');

    expect(result.replacements).toBe(2);
    expect(result.tree.children?.[0].data.headers).toEqual({ Authorization: '{{tok}}' });
  });

  it('returns the original tree for an empty search or no match', () => {
    const tree: YAMLNode = { id: 'steps', type: 'steps', name: 'Steps', children: [] };
    expect(replaceTextInEnabledRequests(tree, '', 'replacement')).toEqual({ tree, replacements: 0 });
    expect(replaceTextInEnabledRequests(tree, 'missing', 'replacement')).toEqual({ tree, replacements: 0 });
  });

  it.each([
    ['hello world', '{{space}}', '/search?q={{space}}&filter=a%3Db&tags%5B0%5D=active'],
    ['a=b', '{{equals}}', '/search?q=hello%20world&filter={{equals}}&tags%5B0%5D=active'],
    ['tags[0]', '{{key}}', '/search?q=hello%20world&filter=a%3Db&{{key}}=active'],
  ])('replaces URL-encoded request text for %j', (search, replacement, expectedUrl) => {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'request',
          type: 'request',
          name: 'Encoded request',
          data: {
            url: '/search?q=hello%20world&filter=a%3Db&tags%5B0%5D=active',
            enabled: true,
          },
          children: [],
        },
      ],
    };

    const result = replaceTextInEnabledRequests(tree, search, replacement);

    expect(result.replacements).toBe(1);
    expect(result.tree.children?.[0].data.url).toBe(expectedUrl);
  });

  it('replaces a query value when its space is encoded but its inner equals is literal', () => {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'request',
          type: 'request',
          name: 'DN request',
          data: {
            url: '/lists/API_Personalizacion?dataSource=organizacion&key=CN=Diana%20Monne',
            enabled: true,
          },
          children: [],
        },
      ],
    };

    const result = replaceTextInEnabledRequests(tree, 'CN=Diana Monne', '{{name}}');

    expect(result.replacements).toBe(1);
    expect(result.tree.children?.[0].data.url).toBe(
      '/lists/API_Personalizacion?dataSource=organizacion&key={{name}}',
    );
  });

  it.each([
    ['CN=Diana Monne', 'CN=Diana+Monne'],
    ['a_b-c', 'a%5Fb%2Dc'],
  ])('matches mixed URL encoding for %j', (search, encodedValue) => {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'request',
          type: 'request',
          name: 'Encoded request',
          data: { url: `/search?key=${encodedValue}`, enabled: true },
          children: [],
        },
      ],
    };

    const result = replaceTextInEnabledRequests(tree, search, '{{value}}');

    expect(result.replacements).toBe(1);
    expect(result.tree.children?.[0].data.url).toBe('/search?key={{value}}');
  });

  describe('regex metacharacters left literal by encodeURIComponent', () => {
    const urlTree = (url: string): YAMLNode => ({
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      children: [
        {
          id: 'request',
          type: 'request',
          name: 'Encoded request',
          data: { url, enabled: true },
          children: [],
        },
      ],
    });

    it.each([
      ['app.js', '/static/app.js', '/static/{{value}}'],
      ['app.js', '/static/app%2Ejs', '/static/{{value}}'],
      ['x*y', '/a/x*y/b', '/a/{{value}}/b'],
      ['x*y', '/a/x%2Ay/b', '/a/{{value}}/b'],
      ['w(1)', '/a/w(1)/b', '/a/{{value}}/b'],
      ['w(1)', '/a/w%281%29/b', '/a/{{value}}/b'],
      ["it's", "/a/it's/b", '/a/{{value}}/b'],
    ])('replaces %j in %j', (search, url, expectedUrl) => {
      const result = replaceTextInEnabledRequests(urlTree(url), search, '{{value}}');

      expect(result.replacements).toBe(1);
      expect(result.tree.children?.[0].data.url).toBe(expectedUrl);
    });

    it('treats a dot in the search text as a literal dot, not a wildcard', () => {
      const tree = urlTree('/static/appZjs');

      expect(replaceTextInEnabledRequests(tree, 'app.js', '{{value}}')).toEqual({
        tree,
        replacements: 0,
      });
    });
  });
});

function createBaseTree(): YAMLNode {
  return {
    id: 'root',
    type: 'test',
    name: 'Test',
    children: [
      {
        id: 'scenarios',
        type: 'scenarios',
        name: 'Scenarios',
        children: [
          {
            id: 'scenario-1',
            type: 'scenario',
            name: 'Scenario 1',
            children: [
              {
                id: 'steps-1',
                type: 'steps',
                name: 'Steps',
                children: [
                  { id: 'step-a', type: 'get', name: 'GET /a', children: [], data: { url: '/a' } },
                  { id: 'step-b', type: 'post', name: 'POST /b', children: [], data: { url: '/b' } },
                  { id: 'step-c', type: 'think_time', name: 'Think Time', data: { duration: '1s' } },
                  { id: 'step-d', type: 'sql', name: 'SQL', children: [], data: { query: 'SELECT 1' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function findNodeById(node: YAMLNode, nodeId: string): YAMLNode | null {
  if (node.id === nodeId) return node;
  for (const child of node.children || []) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

describe('transaction grouping operations', () => {
  it('does not add a second scenario under scenarios', () => {
    const tree = createBaseTree();

    const result = addNodeToTree(tree, 'scenarios', {
      id: 'scenario-2',
      type: 'scenario',
      name: 'Scenario 2',
      children: [],
    });

    expect(findNodeById(result, 'scenarios')?.children?.map(child => child.id)).toEqual(['scenario-1']);
  });

  it('reindexes step paths after inserting a data source before requests', () => {
    const tree = refreshTreePaths(createBaseTree());
    const updatedTree = addNodeToTree(tree, 'steps-1', {
      id: 'data-source',
      type: 'data_source',
      name: 'Data Source',
      data: { type: 'csv', file: 'data.csv' },
    });

    const normalizedTree = refreshTreePaths(updatedTree);
    const stepsNode = findNodeById(normalizedTree, 'steps-1');

    expect(stepsNode?.children?.map(child => [child.id, child.path])).toEqual([
      ['data-source', ['scenarios', 0, 'steps', 0]],
      ['step-a', ['scenarios', 0, 'steps', 1]],
      ['step-b', ['scenarios', 0, 'steps', 2]],
      ['step-c', ['scenarios', 0, 'steps', 3]],
      ['step-d', ['scenarios', 0, 'steps', 4]],
    ]);
  });

  it('wraps a valid contiguous sibling selection into a transaction preserving order and position', () => {
    const tree = createBaseTree();

    const result = wrapNodesInTransaction(tree, ['step-c', 'step-a', 'step-b']);

    expect(result).not.toBeNull();
    const stepsNode = findNodeById(result!.tree, 'steps-1');
    expect(stepsNode?.children?.map(child => child.id)).toEqual([result!.transactionNode.id, 'step-d']);
    expect(result!.transactionNode.children?.map(child => child.id)).toEqual(['step-a', 'step-b', 'step-c']);
    expect(result!.transactionNode.type).toBe('transaction');
    expect(result!.transactionNode.name).toBe('Transaction');
  });

  it('rejects non-contiguous selections', () => {
    const tree = createBaseTree();

    const validation = getTransactionWrapValidation(tree, ['step-a', 'step-c']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('contiguous');
  });

  it('rejects selections from different parents', () => {
    const tree = createBaseTree();
    const stepsNode = findNodeById(tree, 'steps-1')!;
    stepsNode.children!.push({
      id: 'group-1',
      type: 'group',
      name: 'Group',
      children: [{ id: 'nested-step', type: 'get', name: 'GET /nested', children: [], data: { url: '/nested' } }],
      data: { name: 'Group' },
    });

    const validation = getTransactionWrapValidation(tree, ['step-a', 'nested-step']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('same_parent');
  });

  it('rejects selections that do not belong to a compatible steps container', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'scenario-1',
          type: 'scenario',
          name: 'Scenario 1',
          children: [
            { id: 'load-1', type: 'load', name: 'Load', data: { type: 'constant' } },
            { id: 'cookies-1', type: 'cookies', name: 'Cookies', data: {} },
          ],
        },
      ],
    };

    const validation = getTransactionWrapValidation(tree, ['load-1', 'cookies-1']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('supported_parent');
  });

  it('rejects unsupported child node types even when selected under steps', () => {
    const tree = createBaseTree();
    const stepsNode = findNodeById(tree, 'steps-1')!;
    stepsNode.children = [
      { id: 'invalid-load', type: 'load', name: 'Load', data: { type: 'constant' } },
      { id: 'step-a', type: 'get', name: 'GET /a', children: [], data: { url: '/a' } },
    ];

    const validation = getTransactionWrapValidation(tree, ['invalid-load', 'step-a']);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('supported_child');
  });
});

describe('syncRedirectSourceFollowRedirects', () => {
  // source (302) -> target follow-up, with the target nested in a group.
  function createRedirectTree(): YAMLNode {
    return {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        { id: 'source', type: 'post', name: 'POST /login', children: [], data: { url: '/login', follow_redirects: false } },
        {
          id: 'group-1',
          type: 'group',
          name: 'Group',
          children: [
            { id: 'target', type: 'get', name: 'GET /home', children: [], data: { url: '/home' } },
          ],
        },
      ],
    };
  }

  const redirectedRequestMap: Record<string, RedirectedRequestInfo> = {
    target: { sourceNodeId: 'source', sourceRequestLabel: 'POST /login', matchedLocation: '/home' },
  };

  it('sets the source to follow redirects when the follow-up is disabled directly', () => {
    const tree = updateNodeEnabled(createRedirectTree(), 'target', false);
    const result = syncRedirectSourceFollowRedirects(tree, 'target', false, redirectedRequestMap);
    expect(findNodeById(result, 'source')?.data.follow_redirects).toBe(true);
  });

  it('restores the recorded behavior when the follow-up is re-enabled', () => {
    const tree = updateNodeEnabled(createRedirectTree(), 'target', true);
    const result = syncRedirectSourceFollowRedirects(tree, 'target', true, redirectedRequestMap);
    expect(findNodeById(result, 'source')?.data.follow_redirects).toBe(false);
  });

  it('syncs the source when a container holding the follow-up is toggled', () => {
    // Toggling the group cascades enabled:false onto its descendant target.
    const tree = updateNodeEnabled(createRedirectTree(), 'group-1', false);
    const result = syncRedirectSourceFollowRedirects(tree, 'group-1', false, redirectedRequestMap);
    expect(findNodeById(result, 'target')?.data.enabled).toBe(false);
    expect(findNodeById(result, 'source')?.data.follow_redirects).toBe(true);
  });

  it('is a no-op when the toggled subtree contains no recorded follow-up', () => {
    const tree = createRedirectTree();
    const result = syncRedirectSourceFollowRedirects(tree, 'source', false, redirectedRequestMap);
    expect(findNodeById(result, 'source')?.data.follow_redirects).toBe(false);
  });
});
