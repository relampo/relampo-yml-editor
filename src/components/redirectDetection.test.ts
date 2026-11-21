import { describe, expect, it } from 'vitest';
import { detectRedirectFollowUps, nodesStillFormRedirect } from './yamlEditorHelpers';
import { isRedirectStepEvent } from './debugRequests';
import { replaceTextInEnabledRequests } from './yaml-tree-view/treeOperations';
import type { YAMLNode, YAMLResponseData } from '../types/yaml';

function req(
  id: string,
  url: string,
  opts: { status?: number; location?: string } = {},
): YAMLNode {
  const response: YAMLResponseData = {};
  if (opts.status !== undefined) response.status = opts.status;
  if (opts.location !== undefined) response.headers = { Location: opts.location };
  return {
    id,
    type: 'request',
    name: id,
    data: { url, ...(Object.keys(response).length ? { response } : {}) },
  };
}

function root(children: YAMLNode[]): YAMLNode {
  return { id: 'root', type: 'root', name: 'root', children };
}

describe('detectRedirectFollowUps', () => {
  it('marks the request a 3xx Location resolves to', () => {
    const tree = root([
      req('a', '/old', { status: 302, location: '/new' }),
      req('b', '/new'),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(Object.keys(map)).toEqual(['b']);
    expect(map.b.sourceNodeId).toBe('a');
    expect(map.b.matchedLocation).toBe('/new');
  });

  it('resolves a relative Location against the source URL', () => {
    const tree = root([
      req('a', 'https://eidas.example.uy/tuid-authn-login/authenticate', {
        status: 302,
        location: 'authenticate',
      }),
      req('b', 'https://eidas.example.uy/tuid-authn-login/authenticate'),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(Object.keys(map)).toEqual(['b']);
    expect(map.b.sourceNodeId).toBe('a');
    expect(map.b.matchedLocation).toBe('/tuid-authn-login/authenticate');
  });

  it('ignores non-redirect status codes', () => {
    const tree = root([
      req('a', '/old', { status: 200, location: '/new' }),
      req('b', '/new'),
    ]);
    expect(detectRedirectFollowUps(tree)).toEqual({});
  });

  it('ignores a 3xx whose Location does not match the next URL', () => {
    const tree = root([
      req('a', '/old', { status: 302, location: '/somewhere-else' }),
      req('b', '/new'),
    ]);
    expect(detectRedirectFollowUps(tree)).toEqual({});
  });

  it('does not propagate the redirect to an unrelated repeated URL', () => {
    const tree = root([
      req('a', '/old', { status: 302, location: '/login' }),
      req('b', '/login'),
      req('c', '/login'),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(Object.keys(map)).toEqual(['b']);
    expect(map.c).toBeUndefined();
  });
});

describe('detectRedirectFollowUps — chain metadata (RLP-604)', () => {
  function chainReq(
    id: string,
    url: string,
    role: 'parent' | 'hop' | 'final',
    chainId: string,
    opts: { status?: number; location?: string } = {},
  ): YAMLNode {
    const response: YAMLResponseData = {};
    if (opts.status !== undefined) response.status = opts.status;
    if (opts.location !== undefined) response.headers = { Location: opts.location };
    return {
      id,
      type: 'request',
      name: id,
      data: {
        url,
        chain_id: chainId,
        chain_role: role,
        ...(Object.keys(response).length ? { response } : {}),
      },
    };
  }

  it('badges a chain_role: final (status 200) even when Location/URL no longer match', () => {
    const tree = root([
      chainReq('r123', '/login', 'parent', 'rc-123', { status: 302, location: '/step?token=RECORDED' }),
      chainReq('r124', '/step?token=LIVE1', 'hop', 'rc-123', { status: 302, location: '/done?token=RECORDED2' }),
      chainReq('r125', '/done?token=LIVE2', 'final', 'rc-123', { status: 200 }),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(map.r124).toBeDefined();
    expect(map.r125).toBeDefined();
    expect(map.r123).toBeUndefined();
    expect(map.r124.sourceNodeId).toBe('r123');
    expect(map.r125.sourceNodeId).toBe('r124');
  });

  it('does not override a status/URL match that already resolved', () => {
    const tree = root([
      chainReq('a', '/old', 'parent', 'rc-1', { status: 302, location: '/new' }),
      chainReq('b', '/new', 'final', 'rc-1', { status: 200 }),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(map.b.sourceNodeId).toBe('a');
    expect(map.b.matchedLocation).toBe('/new');
  });

  it('badges chain members even when a non-chain request breaks document adjacency', () => {
    const tree = root([
      chainReq('p', '/login', 'parent', 'rc-9', { status: 302, location: '/a' }),
      req('unrelated', '/health', { status: 200 }),
      chainReq('f', '/landing', 'final', 'rc-9', { status: 200 }),
    ]);
    const map = detectRedirectFollowUps(tree);
    expect(map.f).toBeDefined();
    expect(map.f.sourceNodeId).toBe('p');
    expect(map.unrelated).toBeUndefined();
  });

  it('leaves a chain with no parent/no preceding member unbadged rather than guessing', () => {
    const tree = root([chainReq('only', '/done', 'final', 'rc-x', { status: 200 })]);
    expect(detectRedirectFollowUps(tree)).toEqual({});
  });

  it('agrees with the Debug counter predicate on a chain_role: final (parity)', () => {
    expect(
      isRedirectStepEvent({ method: 'GET', name: '[125] GET /done', path: '/done', chain_id: 'rc-1', chain_role: 'final' }),
    ).toBe(true);
    const tree = root([
      chainReq('p', '/login', 'parent', 'rc-1', { status: 302, location: '/x' }),
      chainReq('f', '/done', 'final', 'rc-1', { status: 200 }),
    ]);
    expect(detectRedirectFollowUps(tree).f).toBeDefined();
  });
});

describe('nodesStillFormRedirect', () => {
  it('is true while the 3xx + Location still resolve to the target URL', () => {
    const source = req('a', '/old', { status: 302, location: '/new' });
    const target = req('b', '/new');
    expect(nodesStillFormRedirect(source, target)).toBe(true);
  });

  it('resolves a relative Location against the source URL', () => {
    const source = req('a', 'https://eidas.example.uy/tuid-authn-passwd/authenticate', {
      status: 302,
      location: 'authenticate',
    });
    const target = req('b', 'https://eidas.example.uy/tuid-authn-passwd/authenticate');
    expect(nodesStillFormRedirect(source, target)).toBe(true);
  });

  it('is false once the source status is edited off a 3xx', () => {
    const source = req('a', '/old', { status: 200, location: '/new' });
    const target = req('b', '/new');
    expect(nodesStillFormRedirect(source, target)).toBe(false);
  });

  it('is false once the Location no longer matches the target URL', () => {
    const source = req('a', '/old', { status: 302, location: '/new' });
    const target = req('b', '/changed');
    expect(nodesStillFormRedirect(source, target)).toBe(false);
  });
});

describe('nodesStillFormRedirect — correlated placeholders (RLP-663)', () => {
  it('still links a redirect whose target URL was correlated to a placeholder', () => {
    const source = req('src', 'https://api.test/login', { status: 302, location: '/home/xyz123' });
    const target = req('tgt', 'https://api.test/home/{{token}}');
    expect(nodesStillFormRedirect(source, target)).toBe(true);
  });

  it('links a placeholder in the query string too', () => {
    const source = req('src', 'https://api.test/login', { status: 302, location: '/next?sid=abc987' });
    const target = req('tgt', 'https://api.test/next?sid={{sid}}');
    expect(nodesStillFormRedirect(source, target)).toBe(true);
  });

  it('survives a Replace all over the whole tree', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'root',
      data: {},
      children: [
        req('src', 'https://api.test/login', { status: 302, location: '/home/xyz123' }),
        req('tgt', 'https://api.test/home/xyz123'),
      ],
    };
    const { tree: replaced } = replaceTextInEnabledRequests(tree, 'xyz123', '{{token}}');
    expect(replaced.children?.[1].data!.url).toBe('https://api.test/home/{{token}}');
    expect(replaced.children?.[0].data!.response?.headers?.Location).toBe('/home/xyz123');
    expect(detectRedirectFollowUps(replaced).tgt?.sourceNodeId).toBe('src');
  });

  it('does not let a placeholder match an unrelated path', () => {
    const source = req('src', 'https://api.test/login', { status: 302, location: '/somewhere/else' });
    const target = req('tgt', 'https://api.test/home/{{token}}');
    expect(nodesStillFormRedirect(source, target)).toBe(false);
  });

  it('does not let a placeholder swallow extra path segments', () => {
    const source = req('src', 'https://api.test/login', { status: 302, location: '/home/a/b' });
    const target = req('tgt', 'https://api.test/home/{{token}}');
    expect(nodesStillFormRedirect(source, target)).toBe(false);
  });

  it('still rejects a non-3xx source even when the URL has a placeholder', () => {
    const source = req('src', 'https://api.test/login', { status: 200, location: '/home/xyz123' });
    const target = req('tgt', 'https://api.test/home/{{token}}');
    expect(nodesStillFormRedirect(source, target)).toBe(false);
  });
});
