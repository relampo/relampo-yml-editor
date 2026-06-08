import { describe, expect, it } from 'vitest';
import { detectRedirectFollowUps, nodesStillFormRedirect } from './YAMLEditor';
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
