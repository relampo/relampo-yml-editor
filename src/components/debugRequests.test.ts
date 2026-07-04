import { describe, expect, it } from 'vitest';
import { debugEventRequestNumber, matchDebugEventTarget, skippedRedirectHops, variableRowsForRequestNode } from './debugRequests';
import type { YAMLNode } from '../types/yaml';

type EventInput = Parameters<typeof matchDebugEventTarget>[0] & { request_id?: number };
const event = (overrides: Partial<EventInput>): EventInput => ({ method: 'GET', name: 'evt', path: '/', ...overrides });

describe('matchDebugEventTarget — redirect chain follow-ups', () => {
  // A recorded chain like the one in RLP-570: an enabled parent that triggers
  // redirects, followed by the disabled hops it walks through and the disabled
  // final landing. The runtime re-walks them and emits redirect_index 1..N.
  const chainNodes = (): YAMLNode[] => {
    const parent: YAMLNode = {
      id: 'p17',
      type: 'request',
      name: '[17] Home - POST /auth',
      data: { request_id: 17, method: 'POST', url: '/auth', chain_id: 'rc-17', chain_role: 'parent' },
      path: ['scenarios', 0, 'steps', 16],
    };
    const hop18: YAMLNode = {
      id: 'h18',
      type: 'request',
      name: '[18] Home - GET /flow',
      data: { request_id: 18, enabled: false, method: 'GET', url: '/flow', chain_id: 'rc-17', chain_role: 'hop' },
      path: ['scenarios', 0, 'steps', 17],
    };
    const hop19: YAMLNode = {
      id: 'h19',
      type: 'request',
      name: '[19] Home - GET /code',
      data: { request_id: 19, enabled: false, method: 'GET', url: '/code', chain_id: 'rc-17', chain_role: 'hop' },
      path: ['scenarios', 0, 'steps', 18],
    };
    const hop20: YAMLNode = {
      id: 'h20',
      type: 'request',
      name: '[20] Home - GET /home',
      data: { request_id: 20, enabled: false, method: 'GET', url: '/home', chain_id: 'rc-17', chain_role: 'hop' },
      path: ['scenarios', 0, 'steps', 19],
    };
    const final21: YAMLNode = {
      id: 'f21',
      type: 'request',
      name: '[21] Home - GET /landing',
      data: { request_id: 21, enabled: false, method: 'GET', url: '/landing', chain_id: 'rc-17', chain_role: 'final' },
      path: ['scenarios', 0, 'steps', 20],
    };
    return [parent, hop18, hop19, hop20, final21];
  };

  it('maps every hop and the final landing to its own child by redirect_index', () => {
    const nodes = chainNodes();
    const matchAt = (redirect_index: number, chain_role: string) =>
      matchDebugEventTarget(
        event({ name: '[17] Home -> redirect', path: 'https://live.test/anything', chain_id: 'rc-17', chain_role, redirect_index, request_id: 17 }),
        nodes,
      );

    expect(matchAt(1, 'hop')?.id).toBe('h18');
    expect(matchAt(2, 'hop')?.id).toBe('h19');
    expect(matchAt(3, 'hop')?.id).toBe('h20');
    expect(matchAt(4, 'final')?.id).toBe('f21');
  });

  it('resolves a hop by chain position even when its live URL matches another node', () => {
    const nodes = chainNodes();
    // Correlation rewrote the live URL so it now equals hop20's recorded URL,
    // but redirect_index 1 must still resolve to the first hop, not /home.
    const match = matchDebugEventTarget(
      event({ name: '[17] Home -> redirect', path: 'https://live.test/home', chain_id: 'rc-17', chain_role: 'hop', redirect_index: 1, request_id: 17 }),
      nodes,
    );
    expect(match?.id).toBe('h18');
  });

  it('maps a final event with no redirect_index to the recorded final child', () => {
    const nodes = chainNodes();
    // chain_role 'final' but redirect_index omitted (the field is optional /
    // omitempty drops a 0): must still resolve to the chain's final child.
    const match = matchDebugEventTarget(
      event({ name: '[17] Home -> redirect', path: 'https://live.test/landing', chain_id: 'rc-17', chain_role: 'final', request_id: 17 }),
      nodes,
    );
    expect(match?.id).toBe('f21');
  });

  it('leaves the Tree unmarked when the chain has fewer children than the live run', () => {
    const nodes = chainNodes();
    const match = matchDebugEventTarget(
      event({ name: '[17] Home -> redirect', path: 'https://live.test/extra', chain_id: 'rc-17', chain_role: 'hop', redirect_index: 9, request_id: 17 }),
      nodes,
    );
    expect(match).toBeNull();
  });

  it('numbers each follow-up with the parent id plus its position in the chain', () => {
    // RLP-586: hops and the final landing keep the parent's number (#17) so the
    // chain stays grouped, but each gets a sub-index (#17.1, #17.2, ...) so the
    // parent and its children are individually identifiable even when several
    // VUs interleave their chains on the timeline.
    const nodes = chainNodes();
    const hopEvent = event({ chain_id: 'rc-17', chain_role: 'hop', redirect_index: 3, request_id: 17 });
    const hopNode = matchDebugEventTarget(hopEvent, nodes);
    expect(hopNode?.id).toBe('h20');
    expect(debugEventRequestNumber(hopEvent, hopNode, nodes)).toBe('17.3');

    const finalEvent = event({ chain_id: 'rc-17', chain_role: 'final', redirect_index: 4, request_id: 17 });
    expect(debugEventRequestNumber(finalEvent, matchDebugEventTarget(finalEvent, nodes), nodes)).toBe('17.4');
  });

  it('sub-indexes a final follow-up that arrives without a redirect_index', () => {
    // chain_role 'final' with redirect_index omitted (omitempty drops a 0): the
    // position must still be derived from the matched child's order in the
    // chain, so the final landing reads #17.4 rather than collapsing to #17.
    const nodes = chainNodes();
    const finalEvent = event({ chain_id: 'rc-17', chain_role: 'final', request_id: 17 });
    const finalNode = matchDebugEventTarget(finalEvent, nodes);
    expect(finalNode?.id).toBe('f21');
    expect(debugEventRequestNumber(finalEvent, finalNode, nodes)).toBe('17.4');
  });

  it('keeps the normal node number for non-redirect rows', () => {
    const nodes = chainNodes();
    const normal = nodes[0];
    expect(debugEventRequestNumber(event({ request_id: 99 }), normal, nodes)).toBe('17');
  });
});

describe('variableRowsForRequestNode', () => {
  it('shows nothing when the event has no mapped node instead of dumping every variable', () => {
    // RLP-585 #5: unmapped events used to dump all in-scope variables, leaking
    // data-source columns (user/pass) onto requests that never touch them.
    expect(variableRowsForRequestNode(null, { user: 'u', pass: 'p', REQUEST1: 'x' })).toEqual([]);
  });

  it('shows no variables for a redirect hop that maps to an extractor-less child', () => {
    // RLP-575: a redirect follow-up event (e.g. the chain rc-17 hop landing on
    // /user/authCode/response) carries the full accumulated correlation map the
    // engine stamps on every event. It resolves to a recorded REDIRECTED-DISABLED
    // hop child that extracts nothing, so the Variables tab must stay empty
    // instead of dumping javax.faces.ViewState/REQUEST1/RESPONSE1/... onto it.
    const hop: YAMLNode = {
      id: 'h',
      type: 'request',
      name: '[19] Home - GET /user/authCode/response',
      data: { request_id: 19, enabled: false, method: 'GET', url: '/user/authCode/response', chain_id: 'rc-17', chain_role: 'hop' },
    };
    const accumulated = {
      'javax.faces.ViewState': 'v',
      request1: 'a',
      request2: 'b',
      response1: 'c',
      x_correlation_id: 'd',
    };
    expect(variableRowsForRequestNode(hop, accumulated)).toEqual([]);
  });

  it('lists the variables the node extracts and ignores unrelated values', () => {
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: { method: 'GET', url: '/r' },
      children: [{ id: 'e', type: 'extractor', name: 'e', data: { type: 'regex', var: 'token', pattern: 't=(.*)' } }],
    };
    expect(variableRowsForRequestNode(node, { token: 'abc', user: 'u', pass: 'p' })).toEqual([['token (RES)', 'abc']]);
  });

  it('also lists variables the request uses via {{placeholders}} in headers/url/body', () => {
    // RLP-584: a request that references {{tenant_id}} in a header and {{user_id}}
    // in its url consumes those variables even though it extracts nothing — they
    // must appear in the Variables tab with their accumulated values.
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: {
        method: 'POST',
        url: '/catalog/items/{{user_id}}',
        headers: { 'X-Tenant-Id': '{{tenant_id}}' },
        body: 'name={{user_id}}',
      },
    };
    // Order follows the request config traversal (url before headers), so
    // user_id (in the url) precedes tenant_id (in a header).
    expect(variableRowsForRequestNode(node, { tenant_id: 't-1', user_id: '42', unrelated: 'x' })).toEqual([
      ['user_id (REQ)', '42'],
      ['tenant_id (REQ)', 't-1'],
    ]);
  });

  it('surfaces correlation variables whose names contain dots or hyphens', () => {
    // RLP-597: JSF/correlation variables are named `javax.faces.ViewState`,
    // `x-correlation-id`, etc. The placeholder scan used to require an identifier
    // charset, so a body re-posting `{{javax.faces.ViewState}}` never listed it —
    // it read as "intermittent" because plain names worked and dotted ones didn't.
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: {
        method: 'POST',
        url: '/jsf/page',
        body: 'javax.faces.ViewState={{javax.faces.ViewState}}',
        headers: { 'X-Correlation-Id': '{{x-correlation-id}}' },
      },
    };
    expect(
      variableRowsForRequestNode(node, {
        'javax.faces.ViewState': 'vs-token',
        'x-correlation-id': 'cid-9',
        unrelated: 'x',
      }),
    ).toEqual([
      ['javax.faces.ViewState (REQ)', 'vs-token'],
      ['x-correlation-id (REQ)', 'cid-9'],
    ]);
  });

  it('lists placeholders stored on the headers child node, not just node.data', () => {
    // Headers edited through the UI live on the `headers` child and are
    // serialized from there, so an Authorization header
    // referencing {{token}} must surface even though node.data has no headers.
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: { method: 'GET', url: '/me' },
      children: [{ id: 'h', type: 'headers', name: 'Headers', data: { Authorization: 'Bearer {{token}}' } }],
    };
    expect(variableRowsForRequestNode(node, { token: 'abc', unrelated: 'x' })).toEqual([['token (REQ)', 'abc']]);
  });

  it('lists data-source bound variables for a request that owns the data source', () => {
    // RLP-584: a request with its own data source should surface the bound
    // variable names (the bind keys), so values pulled per-iteration show up.
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: { method: 'POST', url: '/login' },
      children: [
        {
          id: 'ds',
          type: 'data_source',
          name: 'Data Source',
          data: { type: 'csv', file: 'users.csv', bind: { username: 'username', password: 'password' } },
        },
      ],
    };
    expect(variableRowsForRequestNode(node, { username: 'neo', password: 'pw', pass: 'leak' })).toEqual([
      ['username (REQ)', 'neo'],
      ['password (REQ)', 'pw'],
    ]);
  });

  it('keeps extractor output first, then used variables, without duplicates', () => {
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: { method: 'GET', url: '/u/{{user_id}}', headers: { Authorization: 'Bearer {{token}}' } },
      children: [{ id: 'e', type: 'extractor', name: 'e', data: { type: 'regex', var: 'token', pattern: 't=(.*)' } }],
    };
    // token is both extracted and referenced — it must appear once, extractor-first,
    // carrying both role tags.
    expect(variableRowsForRequestNode(node, { token: 'abc', user_id: '7' })).toEqual([
      ['token (REQ, RES)', 'abc'],
      ['user_id (REQ)', '7'],
    ]);
  });

  it('tags a correlation variable RES where it is extracted and REQ where it is used', () => {
    // RLP-597: the same variable must surface in two Variables tabs — the request
    // that captures it (RES) and the request that re-sends it (REQ) — so the user
    // sees where it lives vs. where it is consumed. Mirrors request 2 (extracts
    // javax.faces.ViewState) and request 8 (posts it back).
    const extractor: YAMLNode = {
      id: 'r2',
      type: 'request',
      name: '[2] GET /jsf/page',
      data: { method: 'GET', url: '/jsf/page' },
      children: [
        {
          id: 'e',
          type: 'extractor',
          name: 'e',
          data: { type: 'regex', var: 'javax.faces.ViewState', pattern: 'ViewState" value="(.*?)"' },
        },
      ],
    };
    const consumer: YAMLNode = {
      id: 'r8',
      type: 'request',
      name: '[8] POST /jsf/page',
      data: { method: 'POST', url: '/jsf/page', body: 'javax.faces.ViewState={{javax.faces.ViewState}}' },
    };
    const snapshot = { 'javax.faces.ViewState': 'vs-token' };
    expect(variableRowsForRequestNode(extractor, snapshot)).toEqual([['javax.faces.ViewState (RES)', 'vs-token']]);
    expect(variableRowsForRequestNode(consumer, snapshot)).toEqual([['javax.faces.ViewState (REQ)', 'vs-token']]);
  });
});

describe('skippedRedirectHops — recorded chain longer than the live run (RLP-607)', () => {
  // Mirrors the RLP-607 OAuth flow: an enabled parent, one hop the engine
  // follows, and further hops/final it does NOT (the callback is cross-site, so
  // the redirect trust boundary — backend RLP-492 — stops the walk). The
  // unfollowed children emit no event.
  const chain = (): YAMLNode[] => [
    {
      id: 'p17',
      type: 'request',
      name: '[17] Home - POST /auth',
      data: { request_id: 17, method: 'POST', url: '/auth', chain_id: 'rc-17', chain_role: 'parent' },
      path: ['scenarios', 0, 'steps', 16],
    },
    {
      id: 'h18',
      type: 'request',
      name: '[18] Home - GET /flow',
      data: { request_id: 18, enabled: false, method: 'GET', url: '/flow', chain_id: 'rc-17', chain_role: 'hop' },
      path: ['scenarios', 0, 'steps', 17],
    },
    {
      id: 'f19',
      type: 'request',
      name: '[19] Home - GET /callback',
      data: { request_id: 19, enabled: false, method: 'GET', url: '/callback', chain_id: 'rc-17', chain_role: 'final' },
      path: ['scenarios', 0, 'steps', 18],
    },
  ];

  it('reports the recorded children the live run never followed', () => {
    const events = [
      event({ chain_id: 'rc-17', chain_role: 'parent', redirect_index: 0, request_id: 17, vu: 1 }),
      event({ chain_id: 'rc-17', chain_role: 'hop', redirect_index: 1, request_id: 17, vu: 1 }),
    ];
    const skipped = skippedRedirectHops(events, chain());
    expect(skipped.map(hop => hop.node.id)).toEqual(['f19']);
    expect(skipped[0].position).toBe(2); // #17.2
    expect(skipped[0].afterEventIndex).toBe(1); // slots in after the last real row
  });

  it('reports nothing when every recorded hop executed', () => {
    const events = [
      event({ chain_id: 'rc-17', chain_role: 'parent', redirect_index: 0, request_id: 17, vu: 1 }),
      event({ chain_id: 'rc-17', chain_role: 'hop', redirect_index: 1, request_id: 17, vu: 1 }),
      event({ chain_id: 'rc-17', chain_role: 'final', redirect_index: 2, request_id: 17, vu: 1 }),
    ];
    expect(skippedRedirectHops(events, chain())).toEqual([]);
  });

  it('reports nothing for a chain that never ran', () => {
    // No event carries the chain id (e.g. it sits in a disabled controller): do
    // not invent skipped rows for a chain that did not execute.
    expect(skippedRedirectHops([event({ chain_id: '', request_id: 99 })], chain())).toEqual([]);
  });

  it('keeps interleaved VUs independent', () => {
    const events = [
      event({ chain_id: 'rc-17', chain_role: 'parent', redirect_index: 0, request_id: 17, vu: 1 }),
      event({ chain_id: 'rc-17', chain_role: 'parent', redirect_index: 0, request_id: 17, vu: 2 }),
      event({ chain_id: 'rc-17', chain_role: 'hop', redirect_index: 1, request_id: 17, vu: 1 }),
    ];
    // VU1 followed one hop then stopped (skips f19); VU2 fired only the parent
    // (skips h18 and f19). Two independent walks → 1 + 2 = 3 placeholders.
    expect(skippedRedirectHops(events, chain())).toHaveLength(3);
  });
});
