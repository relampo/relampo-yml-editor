import { describe, expect, it } from 'vitest';
import { detectRedirectFollowUps, nodesStillFormRedirect } from './yamlEditorHelpers';
import { isRedirectStepEvent } from './debugRequests';
import type { YAMLNode } from '../types/yaml';

function req(
  id: string,
  url: string,
  opts: { status?: number; location?: string } = {},
): YAMLNode {
  const response: Record<string, unknown> = {};
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

  // Regression (RLP-419): a single 302 whose Location is a relative reference
  // (e.g. `authenticate`) must resolve against the source request URL, not a
  // fixed base, so the follow-up request still gets the REDIRECTED badge.
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

  // Regression: an ordinary repeated request to the same URL as a redirect
  // target must NOT inherit the redirect badge (no same-URL propagation).
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

// RLP-604: the tree badge must recognize redirect follow-ups by the recorded
// chain_id/chain_role, not only by status 3xx + Location↔URL matching. When
// correlation rewrites the redirect targets' query strings at runtime, the
// source Location no longer equals the follow-up URL, so the status/URL pass
// misses them — but chain_role: hop/final is still correct.
describe('detectRedirectFollowUps — chain metadata (RLP-604)', () => {
  function chainReq(
    id: string,
    url: string,
    role: 'parent' | 'hop' | 'final',
    chainId: string,
    opts: { status?: number; location?: string } = {},
  ): YAMLNode {
    const response: Record<string, unknown> = {};
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
    // Locations reference the RECORDED query strings; the follow-up URLs carry
    // correlation-rewritten LIVE values, so the status/URL pass cannot link them.
    const tree = root([
      chainReq('r123', '/login', 'parent', 'rc-123', { status: 302, location: '/step?token=RECORDED' }),
      chainReq('r124', '/step?token=LIVE1', 'hop', 'rc-123', { status: 302, location: '/done?token=RECORDED2' }),
      chainReq('r125', '/done?token=LIVE2', 'final', 'rc-123', { status: 200 }),
    ]);
    const map = detectRedirectFollowUps(tree);
    // The final (status 200) and the hop are badged via chain metadata...
    expect(map.r124).toBeDefined();
    expect(map.r125).toBeDefined();
    // ...the parent (chain origin) is not a follow-up.
    expect(map.r123).toBeUndefined();
    // Each follow-up is attributed to its preceding chain member.
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
    // matchedLocation comes from the status/URL pass (the resolved Location).
    expect(map.b.matchedLocation).toBe('/new');
  });

  it('badges chain members even when a non-chain request breaks document adjacency', () => {
    // The status/URL pass only links immediate neighbours; chain metadata must
    // survive an unrelated request landing between the chain members.
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
    // A lone final with no parent and no preceding chain member has no source to
    // attribute to; it must not crash or invent one.
    const tree = root([chainReq('only', '/done', 'final', 'rc-x', { status: 200 })]);
    expect(detectRedirectFollowUps(tree)).toEqual({});
  });

  // Root-cause guard: the tree detector and the Debug summary counter must agree
  // on what a redirect follow-up is. The regression happened because the tree
  // used status+URL while the counter used chain_role. Assert both recognize a
  // chain_role: final landing so the two predicates can't silently diverge again.
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
