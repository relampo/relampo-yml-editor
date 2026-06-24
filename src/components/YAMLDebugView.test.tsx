import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  collectDebugEventTargets,
  collectRequests,
  debugEventRequestNumber,
  matchDebugEventTarget,
  variableRowsForRequestNode,
} from './debugRequests';
import { DebugSection } from './debugSection';
import { YAMLDebugSession } from './YAMLDebugView';
import type { YAMLNode } from '../types/yaml';
import type { EngineEvent } from '../utils/debugApi';

const debugApiMock = vi.hoisted(() => {
  const handlers: Array<{
    onEvent: (event: EngineEvent) => void;
    onDone: (error: string | null) => void;
    onConnectionError: () => void;
  }> = [];
  return {
    handlers,
    startDebugRun: vi.fn(async () => 'run-1'),
    streamDebugRun: vi.fn((_runId: string, handler: (typeof handlers)[number]) => {
      handlers.push(handler);
      return vi.fn();
    }),
  };
});

vi.mock('../utils/debugApi', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/debugApi')>();
  return {
    ...actual,
    startDebugRun: debugApiMock.startDebugRun,
    streamDebugRun: debugApiMock.streamDebugRun,
  };
});

afterEach(() => {
  cleanup();
  debugApiMock.handlers.length = 0;
  debugApiMock.startDebugRun.mockClear();
  debugApiMock.streamDebugRun.mockClear();
});

function req(id: string, enabled?: boolean): YAMLNode {
  return { id, type: 'request', name: id, data: enabled === undefined ? {} : { enabled } };
}

function event(overrides: Partial<EngineEvent>): EngineEvent {
  return {
    ts: '2026-06-17T21:00:00Z',
    name: 'Request A',
    method: 'GET',
    path: '/a',
    status: 200,
    latency_ms: 1,
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

describe('collectDebugEventTargets', () => {
  it('includes disabled request nodes for debug event mapping', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [req('a'), req('b', false), req('c')],
    };
    expect(collectDebugEventTargets(tree).map(n => n.id)).toEqual(['a', 'b', 'c']);
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
          children: [req('inner1'), req('inner2', false)],
        },
        req('b', false),
      ],
    };
    expect(collectDebugEventTargets(tree).map(n => n.id)).toEqual(['a', 'b']);
  });

  it('includes think time nodes for debug event mapping', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        req('a'),
        {
          id: 'think-1',
          type: 'think_time',
          name: 'Think Time',
          data: { duration: '1s' },
        },
      ],
    };

    expect(collectDebugEventTargets(tree).map(n => n.id)).toEqual(['a', 'think-1']);
  });

  it('keeps walking request children so inline think time nodes can be mapped', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'a',
          type: 'request',
          name: 'Request A',
          children: [
            {
              id: 'a-think',
              type: 'think_time',
              name: 'Think Time',
              data: { duration: '1s' },
            },
          ],
        },
      ],
    };

    expect(collectDebugEventTargets(tree).map(n => n.id)).toEqual(['a', 'a-think']);
  });

  it('excludes disabled think time nodes from debug event mapping', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [
        {
          id: 'disabled-think',
          type: 'think_time',
          name: 'Think Time',
          data: { duration: '1s', enabled: false },
        },
        {
          id: 'enabled-think',
          type: 'think_time',
          name: 'Think Time',
          data: { duration: '2s' },
        },
      ],
    };

    expect(collectDebugEventTargets(tree).map(n => n.id)).toEqual(['enabled-think']);
  });
});

describe('matchDebugEventTarget', () => {
  it('maps repeated request names by step_path before name or URL fallback', () => {
    const loginLikeRequest: YAMLNode = {
      id: 'login',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
      path: ['scenarios', 0, 'steps', 0],
    };
    const logoutRedirectRequest: YAMLNode = {
      id: 'logout-redirect',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=logoff' },
      path: ['scenarios', 0, 'steps', 12],
    };

    const match = matchDebugEventTarget(
      event({
        name: 'GET /demo/index.php?main_page=login',
        path: 'http://www.testingyes.com/demo/index.php?main_page=login',
        step_path: 'scenarios[0].steps[12]',
      }),
      [loginLikeRequest, logoutRedirectRequest],
    );

    expect(match?.id).toBe('logout-redirect');
  });

  it('does not map ambiguous repeated request names without exact step identity', () => {
    const firstRequest: YAMLNode = {
      id: 'first',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
    };
    const secondRequest: YAMLNode = {
      id: 'second',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
    };

    const match = matchDebugEventTarget(
      event({
        name: 'GET /demo/index.php?main_page=login',
        path: 'http://www.testingyes.com/demo/index.php?main_page=login',
      }),
      [firstRequest, secondRequest],
    );

    expect(match).toBeNull();
  });

  it('falls back to URL matching when a non-think-time step_path misses every node', () => {
    const firstRequest: YAMLNode = {
      id: 'first',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
      path: ['scenarios', 0, 'steps', 0],
    };
    const secondRequest: YAMLNode = {
      id: 'second',
      type: 'request',
      name: 'GET /demo/index.php?main_page=checkout',
      data: { method: 'GET', url: '/demo/index.php?main_page=checkout' },
      path: ['scenarios', 0, 'steps', 1],
    };

    const match = matchDebugEventTarget(
      event({
        name: 'GET /demo/index.php?main_page=checkout',
        path: 'http://www.testingyes.com/demo/index.php?main_page=checkout',
        step_path: 'scenarios[0].steps[99]',
      }),
      [firstRequest, secondRequest],
    );

    expect(match?.id).toBe('second');
  });

  it('ignores think-time children when resolving a request step_path', () => {
    const firstRequest: YAMLNode = {
      id: 'first',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
      path: ['scenarios', 0, 'steps', 0],
    };
    const firstThinkTime: YAMLNode = {
      id: 'first-think-time',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '2s' },
      path: ['scenarios', 0, 'steps', 0, 'think_time'],
    };
    const secondRequest: YAMLNode = {
      id: 'second',
      type: 'request',
      name: 'GET /demo/index.php?main_page=login',
      data: { method: 'GET', url: '/demo/index.php?main_page=login' },
      path: ['scenarios', 0, 'steps', 1],
    };

    const match = matchDebugEventTarget(
      event({
        name: 'GET /demo/index.php?main_page=login',
        path: 'http://www.testingyes.com/demo/index.php?main_page=login',
        step_path: 'scenarios[0].steps[0]',
      }),
      [firstRequest, firstThinkTime, secondRequest],
    );

    expect(match?.id).toBe('first');
  });
});

describe('redirect chain follow-up mapping', () => {
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

  it('keeps long labels expanded while search is active so matches stay visible', () => {
    const label = 'A long debug label with token at the end';
    const { container } = render(
      <DebugSection rows={[[label, 'value']]} searchText="token" searchMode="text" currentMatchIndex={0} />,
    );

    const labelMatch = container.querySelector('mark');
    expect(labelMatch).not.toBeNull();

    const labelCell = labelMatch?.closest('div');
    expect(labelCell).not.toHaveClass('truncate');
    expect(labelCell).toHaveClass('break-words');
    expect(labelCell).not.toHaveAttribute('title', label);
  });

  it('scrolls the active match into view when navigating search results', async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { container, rerender } = render(
        <DebugSection
          rows={[['Header', 'first token']]}
          body={'line one\nline two token'}
          searchText="token"
          searchMode="text"
          currentMatchIndex={0}
        />,
      );

      scrollIntoView.mockClear();

      rerender(
        <DebugSection
          rows={[['Header', 'first token']]}
          body={'line one\nline two token'}
          searchText="token"
          searchMode="text"
          currentMatchIndex={1}
        />,
      );

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' }));
      expect(container.querySelector('mark[data-match-index="1"]')).toHaveClass('ring-amber-500');
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        delete HTMLElement.prototype.scrollIntoView;
      }
    }
  });
});

describe('YAMLDebugSession tree selection sync', () => {
  it('maps a focused think time node to its debug timeline event', async () => {
    const thinkTime: YAMLNode = {
      id: 'think-1',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '1s' },
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [thinkTime],
    };
    const commonProps = {
      tree,
      yamlCode: 'test:\n  name: think-time\n',
      documentReady: true,
      validationErrors: [],
      onSelectNode: vi.fn(),
      onEditNode: vi.fn(),
    };

    render(
      <YAMLDebugSession {...commonProps} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Think Time',
          method: 'THINK_TIME',
          path: 'think_time',
          status: 0,
          latency_ms: 1000,
        }),
      );
    });

    expect(await screen.findAllByText('think_time')).not.toHaveLength(0);
    expect(screen.getAllByText('THINK_TIME')).not.toHaveLength(0);
  });

  it('maps repeated think time events by engine suffix', async () => {
    const firstThinkTime: YAMLNode = {
      id: 'think-1',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '1s' },
      path: ['scenarios', 0, 'steps', 0],
    };
    const secondThinkTime: YAMLNode = {
      id: 'think-2',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '2s' },
      path: ['scenarios', 0, 'steps', 1],
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [firstThinkTime, secondThinkTime],
    };
    const commonProps = {
      tree,
      yamlCode: 'test:\n  name: repeated-think-time\n',
      documentReady: true,
      validationErrors: [],
      onSelectNode: vi.fn(),
      onEditNode: vi.fn(),
    };

    render(
      <YAMLDebugSession {...commonProps} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Think Time',
          method: 'THINK_TIME',
          path: 'think_time',
          step_path: 'scenarios[0].steps[0]',
          status: 0,
          latency_ms: 1000,
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Think Time #2',
          method: 'THINK_TIME',
          path: 'think_time',
          step_path: 'scenarios[0].steps[1]',
          status: 0,
          latency_ms: 2000,
        }),
      );
    });

    expect(screen.getAllByText('2000ms')).not.toHaveLength(0);
  });

  it('maps unsuffixed grouped think time events by step path', async () => {
    const firstThinkTime: YAMLNode = {
      id: 'group-a-think',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '1s' },
      path: ['scenarios', 0, 'steps', 0, 'group', 'steps', 0],
    };
    const secondThinkTime: YAMLNode = {
      id: 'group-b-think',
      type: 'think_time',
      name: 'Think Time',
      data: { duration: '2s' },
      path: ['scenarios', 0, 'steps', 1, 'group', 'steps', 0],
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [firstThinkTime, secondThinkTime],
    };
    const commonProps = {
      tree,
      yamlCode: 'test:\n  name: grouped-think-time\n',
      documentReady: true,
      validationErrors: [],
      onSelectNode: vi.fn(),
      onEditNode: vi.fn(),
    };

    render(
      <YAMLDebugSession {...commonProps} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Group A:Think Time',
          method: 'THINK_TIME',
          path: 'think_time',
          step_path: 'scenarios[0].steps[0].group.steps[0]',
          status: 0,
          latency_ms: 1000,
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Group B:Think Time',
          method: 'THINK_TIME',
          path: 'think_time',
          step_path: 'scenarios[0].steps[1].group.steps[0]',
          status: 0,
          latency_ms: 2000,
        }),
      );
    });

    expect(screen.getAllByText('2000ms')).not.toHaveLength(0);
  });

  it('limits the variables tab to extractors declared by the mapped request node', async () => {
    const requestA: YAMLNode = {
      id: 'a',
      type: 'request',
      name: 'Request A',
      data: { method: 'POST', url: '/a' },
      children: [
        {
          id: 'a_extract_request2',
          type: 'extractor',
          name: 'Extract: request2',
          data: { type: 'regex', var: 'request2', pattern: 'request2=(.*)' },
        },
      ],
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [requestA],
    };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: variables\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: 'Request A',
          method: 'POST',
          path: '/a',
          variables: {
            'javax.faces.ViewState': 'view-state-value',
            REQUEST1: 'previous-request',
            request2: 'current-request',
            RESPONSE1: 'previous-response',
          },
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'variables' }));

    expect(await screen.findByText('request2')).toBeInTheDocument();
    expect(screen.getByText('current-request')).toBeInTheDocument();
    expect(screen.queryByText('REQUEST1')).not.toBeInTheDocument();
    expect(screen.queryByText('previous-request')).not.toBeInTheDocument();
    expect(screen.queryByText('RESPONSE1')).not.toBeInTheDocument();
    expect(screen.queryByText('javax.faces.ViewState')).not.toBeInTheDocument();
  });

  it('starts a debug run with the selected 2 VUs option', async () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [req('Request A')],
    };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: two-vus\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2 VUs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));

    await waitFor(() =>
      expect(debugApiMock.startDebugRun).toHaveBeenCalledWith('test:\n  name: two-vus\n', { vus: 2 }),
    );
  });

  it('shows the parent request number for redirected debug events', async () => {
    const parentRequest: YAMLNode = {
      id: 'parent',
      type: 'request',
      name: '[10] POST /demo/index.php?main_page=checkout_shipping',
      data: {
        request_id: 10,
        method: 'POST',
        url: '/demo/index.php?main_page=checkout_shipping',
        chain_id: 'rc-10',
        chain_role: 'parent',
      },
      path: ['scenarios', 0, 'steps', 10],
    };
    const finalRequest: YAMLNode = {
      id: 'final',
      type: 'request',
      name: '[11] GET /demo/index.php?main_page=checkout_payment',
      data: {
        request_id: 11,
        method: 'GET',
        url: '/demo/index.php?main_page=checkout_payment',
        enabled: false,
        chain_id: 'rc-10',
        chain_role: 'final',
      },
      path: ['scenarios', 0, 'steps', 11],
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [parentRequest, finalRequest],
    };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: request-id\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[10] GET /demo/index.php?main_page=checkout_payment',
          path: 'http://www.testingyes.com/demo/index.php?main_page=checkout_payment',
          request_id: 10,
          step_path: 'scenarios[0].steps[10].redirects[1]',
          chain_id: 'rc-10',
          chain_role: 'final',
          redirect_index: 1,
          redirect_source: 'runtime',
        }),
      );
    });

    // The final landing is a redirect follow-up, so it shows the parent's
    // number (#10), not the recorded final child's own id (#11). RLP-570.
    expect(await screen.findByText('#10')).toBeInTheDocument();
    expect(screen.queryByText('#11')).not.toBeInTheDocument();
    expect(screen.getAllByText('http://www.testingyes.com/demo/index.php?main_page=checkout_payment')).not.toHaveLength(0);
  });

  it('maps a disabled tree request when its debug event is selected', async () => {
    const requestA: YAMLNode = {
      id: 'a',
      type: 'request',
      name: 'Request A',
      data: { method: 'GET', url: '/a' },
    };
    const requestB: YAMLNode = {
      id: 'b',
      type: 'request',
      name: 'Request B',
      data: { enabled: false, method: 'GET', url: '/b' },
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [requestA, requestB],
    };
    const commonProps = {
      tree,
      yamlCode: 'test:\n  name: sync\n',
      documentReady: true,
      validationErrors: [],
      onSelectNode: vi.fn(),
      onEditNode: vi.fn(),
    };

    render(
      <YAMLDebugSession {...commonProps} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'Request B', path: '/b' }));
    });

    expect(screen.getAllByText('GET')).not.toHaveLength(0);
    expect(screen.getAllByText('/b')).not.toHaveLength(0);
  });

  it('clears the tree selection when a selected debug event has no matching tree request', async () => {
    const requestA: YAMLNode = {
      id: 'a',
      type: 'request',
      name: 'Request A',
      data: { method: 'GET', url: '/a' },
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [requestA],
    };
    const onSelectNode = vi.fn();

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: unmatched-debug-event\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={onSelectNode}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'External request', path: '/external' }));
    });

    const timelinePath = (await screen.findAllByText('/external')).find(element => element.closest('button'));
    expect(timelinePath).toBeDefined();
    fireEvent.click(timelinePath!.closest('button')!);

    expect(onSelectNode).toHaveBeenCalledWith(null);
  });

  it('moves timeline selection and focus with arrow keys', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: keyboard-timeline\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'First request', path: '/first' }));
      debugApiMock.handlers[0].onEvent(event({ name: 'Second request', path: '/second' }));
      debugApiMock.handlers[0].onEvent(event({ name: 'Third request', path: '/third' }));
    });

    const timelineButton = (path: string) =>
      screen.getAllByRole('button').find(button => button.textContent?.includes(path)) as HTMLButtonElement;

    const first = timelineButton('/first');
    const second = timelineButton('/second');

    fireEvent.click(first);
    first.focus();
    expect(first).toHaveAttribute('aria-current', 'true');

    fireEvent.keyDown(first, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(second).toHaveAttribute('aria-current', 'true');
      expect(document.activeElement).toBe(second);
    });

    fireEvent.keyDown(second, { key: 'ArrowUp' });

    await waitFor(() => {
      expect(first).toHaveAttribute('aria-current', 'true');
      expect(document.activeElement).toBe(first);
    });
  });

});
