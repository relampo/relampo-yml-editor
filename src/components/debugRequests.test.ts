import { describe, expect, it } from 'vitest';
import { debugEventRequestNumber, matchDebugEventTarget, variableRowsForRequestNode } from './debugRequests';
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

  it('leaves the Tree unmarked when the chain has fewer children than the live run', () => {
    const nodes = chainNodes();
    const match = matchDebugEventTarget(
      event({ name: '[17] Home -> redirect', path: 'https://live.test/extra', chain_id: 'rc-17', chain_role: 'hop', redirect_index: 9, request_id: 17 }),
      nodes,
    );
    expect(match).toBeNull();
  });

  it('numbers every follow-up row with the parent request id, not the child id', () => {
    const nodes = chainNodes();
    const hopEvent = event({ chain_id: 'rc-17', chain_role: 'hop', redirect_index: 3, request_id: 17 });
    const hopNode = matchDebugEventTarget(hopEvent, nodes);
    expect(hopNode?.id).toBe('h20');
    expect(debugEventRequestNumber(hopEvent, hopNode, nodes)).toBe('17');

    const finalEvent = event({ chain_id: 'rc-17', chain_role: 'final', redirect_index: 4, request_id: 17 });
    expect(debugEventRequestNumber(finalEvent, matchDebugEventTarget(finalEvent, nodes), nodes)).toBe('17');
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

  it('lists only the variables the node extracts', () => {
    const node: YAMLNode = {
      id: 'r',
      type: 'request',
      name: 'r',
      data: { method: 'GET', url: '/r' },
      children: [{ id: 'e', type: 'extractor', name: 'e', data: { type: 'regex', var: 'token', pattern: 't=(.*)' } }],
    };
    expect(variableRowsForRequestNode(node, { token: 'abc', user: 'u', pass: 'p' })).toEqual([['token', 'abc']]);
  });
});
