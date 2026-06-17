import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { collectDebugSelectableRequests, collectRequests } from './debugRequests';
import { matchEventToNode } from './debugEventMapping';
import { DebugSection } from './YAMLDebugView';
import type { YAMLNode } from '../types/yaml';
import type { EngineEvent } from '../utils/debugApi';

afterEach(cleanup);

function req(id: string, enabled?: boolean, data: Record<string, unknown> = {}): YAMLNode {
  return {
    id,
    type: 'request',
    name: id,
    data: {
      ...(enabled === undefined ? {} : { enabled }),
      ...data,
    },
  };
}

function engineEvent(overrides: Partial<EngineEvent>): EngineEvent {
  return {
    ts: '2026-06-17T20:56:37.000Z',
    name: 'GET /demo',
    method: 'GET',
    path: '/demo',
    status: 200,
    latency_ms: 12,
    concurrency: 1,
    ...overrides,
  };
}

describe('collectRequests', () => {
  it('collects enabled requests in document order', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [req('a'), req('b')],
    };
    expect(collectRequests(tree).map(n => n.id)).toEqual(['a', 'b']);
  });

  it('skips a disabled request', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [req('a'), req('b', false), req('c')],
    };
    expect(collectRequests(tree).map(n => n.id)).toEqual(['a', 'c']);
  });

  it('does not descend into a disabled controller', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        req('a'),
        {
          id: 'grp',
          type: 'group',
          name: 'grp',
          data: { enabled: false },
          children: [req('inner1'), req('inner2')],
        },
        req('b'),
      ],
    };
    expect(collectRequests(tree).map(n => n.id)).toEqual(['a', 'b']);
  });
});

describe('debug timeline tree matching', () => {
  it('keeps disabled requests selectable for debug navigation', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [req('a'), req('b', false), req('c')],
    };

    expect(collectRequests(tree).map(n => n.id)).toEqual(['a', 'c']);
    expect(collectDebugSelectableRequests(tree).map(n => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('maps a redirect final event to its disabled tree target', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        req('parent', undefined, {
          request_id: 1,
          method: 'GET',
          url: 'http://www.testingyes.com/demo',
          chain_id: 'rc-1',
          chain_role: 'parent',
        }),
        req('final', false, {
          request_id: 2,
          method: 'GET',
          url: 'http://www.testingyes.com/demo/',
          chain_id: 'rc-1',
          chain_role: 'final',
        }),
      ],
    };

    const match = matchEventToNode(
      engineEvent({
        name: '[vu-1] [1] GET /demo -> final 1 GET /demo/',
        request_id: 1,
        path: 'http://www.testingyes.com/demo/',
        status: 200,
        chain_id: 'rc-1',
        chain_role: 'final',
        redirect_index: 1,
      }),
      collectDebugSelectableRequests(tree),
    );

    expect(match?.id).toBe('final');
  });

  it('leaves the tree unchanged when no unique request matches the event', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        req('one', undefined, { method: 'GET', url: '/shared' }),
        req('two', undefined, { method: 'GET', url: '/shared' }),
      ],
    };

    const match = matchEventToNode(
      engineEvent({
        name: '[vu-1] GET /shared',
        path: '/shared',
      }),
      collectDebugSelectableRequests(tree),
    );

    expect(match).toBeNull();
  });

  it('does not fall back to the redirect parent when the target role is not present', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        req('parent', undefined, {
          request_id: 1,
          method: 'GET',
          url: 'http://www.testingyes.com/demo',
          chain_id: 'rc-1',
          chain_role: 'parent',
        }),
      ],
    };

    const match = matchEventToNode(
      engineEvent({
        name: '[vu-1] [1] GET /demo -> final 1 GET /demo/',
        request_id: 1,
        path: 'http://www.testingyes.com/demo/',
        status: 200,
        chain_id: 'rc-1',
        chain_role: 'final',
        redirect_index: 1,
      }),
      collectDebugSelectableRequests(tree),
    );

    expect(match).toBeNull();
  });
});

describe('DebugSection highlighting', () => {
  // The query "x" appears once per row; with three rows the matches are global
  // indexes 0, 1, 2. Selecting index 1 must mark exactly the second row's match
  // as active — not the first match of every fragment.
  it('marks the active match by its global index across fragments', () => {
    const rows: Array<[string, string]> = [
      ['ra', 'x'],
      ['rb', 'x'],
      ['rc', 'x'],
    ];
    const { container } = render(
      <DebugSection rows={rows} searchText="x" searchMode="text" currentMatchIndex={1} />,
    );

    const marks = Array.from(container.querySelectorAll('mark'));
    // Three value matches (one per row); labels ra/rb/rc contain no "x".
    expect(marks).toHaveLength(3);

    const active = marks.filter(m => m.className.includes('ring-amber-500'));
    expect(active).toHaveLength(1);
    // The active mark is the second occurrence (global index 1).
    expect(marks.indexOf(active[0])).toBe(1);
  });
});
