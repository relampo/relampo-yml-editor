import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { collectDebugEventTargets, collectRequests } from './debugRequests';
import { DebugSection, YAMLDebugSession } from './YAMLDebugView';
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

    const { rerender } = render(
      <YAMLDebugSession {...commonProps} selectedNode={null} treeFocusNodeId={null} />,
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

    rerender(
      <YAMLDebugSession {...commonProps} selectedNode={thinkTime} treeFocusNodeId={thinkTime.id} />,
    );

    expect(await screen.findAllByText('think_time')).not.toHaveLength(0);
    expect(screen.getAllByText('THINK_TIME')).not.toHaveLength(0);
    expect(screen.queryByText('No debug event for "Think Time" in the current run.')).not.toBeInTheDocument();
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
        selectedNode={null}
        treeFocusNodeId={null}
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
        selectedNode={null}
        treeFocusNodeId={null}
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

  it('shows an empty debug-event state when a focused tree node did not run', async () => {
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
      data: { method: 'GET', url: '/b' },
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

    const { rerender } = render(
      <YAMLDebugSession {...commonProps} selectedNode={null} treeFocusNodeId={null} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'Request A', path: '/a' }));
    });

    expect(await screen.findAllByText('/a')).not.toHaveLength(0);

    rerender(
      <YAMLDebugSession {...commonProps} selectedNode={requestB} treeFocusNodeId={requestB.id} />,
    );

    expect(screen.getByText('No debug event for "Request B" in the current run.')).toBeInTheDocument();
  });

  it('maps a focused disabled tree request to its debug event', async () => {
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

    const { rerender } = render(
      <YAMLDebugSession {...commonProps} selectedNode={null} treeFocusNodeId={null} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'Request B', path: '/b' }));
    });

    rerender(
      <YAMLDebugSession {...commonProps} selectedNode={requestB} treeFocusNodeId={requestB.id} />,
    );

    expect(screen.getAllByText('GET')).not.toHaveLength(0);
    expect(screen.getAllByText('/b')).not.toHaveLength(0);
    expect(screen.queryByText('No debug event for "Request B" in the current run.')).not.toBeInTheDocument();
  });
});
