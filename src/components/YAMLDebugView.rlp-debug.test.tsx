import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  sessionStorage.clear();
  debugApiMock.handlers.length = 0;
  debugApiMock.startDebugRun.mockClear();
  debugApiMock.streamDebugRun.mockClear();
});

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

describe('YAMLDebugSession RLP debug fixes', () => {
  it('does not render explanatory text under the selected debug request title', async () => {
    const { container } = render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: header-cleanup\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: 'Do not show this explanation', path: '/external' }));
    });

    expect(await screen.findByRole('heading', { name: '/external' })).toBeInTheDocument();

    const heading = container.querySelector('h3');
    const titleColumn = heading?.parentElement?.parentElement;
    expect(titleColumn?.querySelector('p')).toBeNull();
  });

  it('does not start a debug run with stale YAML when pending serialization fails', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: stale-debug\n'}
        documentReady
        validationErrors={[]}
        flushPendingEdits={() => {
          throw new Error('Error generating YAML: empty parallel');
        }}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));

    expect(await screen.findByText('Error generating YAML: empty parallel')).toBeInTheDocument();
    expect(debugApiMock.startDebugRun).not.toHaveBeenCalled();
  });

  it('counts only redirect follow-up steps in the Redirects summary (RLP-588)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-count\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      // A 304 Not Modified and a standalone 302 (e.g. a sign-off) both carry a
      // 3xx status but produce no labeled REDIRECTED step, so neither should be
      // counted. Only the chain "final" landing is a follow-up step.
      debugApiMock.handlers[0].onEvent(event({ name: '[1] GET /', status: 304 }));
      debugApiMock.handlers[0].onEvent(event({ name: '[13] GET /logout', status: 302 }));
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[14] GET /catalog',
          status: 200,
          chain_id: 'rc-13',
          chain_role: 'final',
          redirect_index: 1,
        }),
      );
    });

    const redirectsValue = await screen.findByText('Redirects');
    expect(redirectsValue.previousElementSibling).toHaveTextContent('1');
  });

  it('labels a redirect-chain final 200 as Redirect, not Passed (RLP-571)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-label\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      // A 200 that closes a redirect chain (chain_role "final"). The tree badges
      // it REDIRECTED, so the Debug status pill must read Redirect, not Passed.
      debugApiMock.handlers[0].onEvent(
        event({ name: '[14] GET /catalog', status: 200, chain_id: 'rc-13', chain_role: 'final', redirect_index: 1 }),
      );
    });

    // Exact "Redirect" is unique to the status pill (the summary uses "Redirects").
    expect(await screen.findByText('Redirect', { exact: true })).toBeInTheDocument();
  });

  it('still labels a plain 200 as Passed (RLP-571)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: plain-pass\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: '[1] GET /home', path: '/home', status: 200 }));
    });

    await screen.findByRole('heading', { name: '/home' });
    // A plain 200 (no redirect role) is not labeled Redirect.
    expect(screen.queryByText('Redirect', { exact: true })).toBeNull();
  });

  it('counts redirect finals identified only by step_path for older payloads (RLP-588)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-fallback\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      // Older/partial engine payload: the redirect final lands with only its
      // recorded `...redirects[N]` step path — no chain_role or redirect_index.
      // The tree still badges it REDIRECTED, so the summary must count it too.
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[5] GET /catalog',
          status: 200,
          step_path: 'scenarios[0].steps[4].redirects[1]',
        }),
      );
    });

    const redirectsValue = await screen.findByText('Redirects');
    expect(redirectsValue.previousElementSibling).toHaveTextContent('1');
  });

  it('shows redirected follow-up context in logs instead of a separate banner', async () => {
    const parentRequest: YAMLNode = {
      id: 'parent',
      type: 'request',
      name: '[10] POST /login',
      data: { request_id: 10, method: 'POST', url: '/login', chain_id: 'rc-10', chain_role: 'parent' },
      path: ['scenarios', 0, 'steps', 10],
    };
    const finalRequest: YAMLNode = {
      id: 'final',
      type: 'request',
      name: '[11] GET /dashboard',
      data: { request_id: 11, method: 'GET', url: '/dashboard', chain_id: 'rc-10', chain_role: 'final' },
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
        yamlCode={'test:\n  name: redirect-log\n'}
        documentReady
        validationErrors={[]}
        redirectedRequestMap={{
          final: {
            sourceNodeId: 'parent',
            sourceRequestLabel: '[10] POST /login',
            matchedLocation: '/dashboard',
          },
        }}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[10] GET /dashboard',
          path: 'http://example.test/dashboard',
          step_path: 'scenarios[0].steps[10].redirects[1]',
          chain_id: 'rc-10',
          chain_role: 'final',
          redirect_index: 1,
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'logs' }));

    expect(await screen.findByText(/redirected request launched by \[10\] POST \/login/)).toBeInTheDocument();
    expect(screen.getByText(/→ \/dashboard/)).toBeInTheDocument();
  });

  it('Overview shows the runtime URL, not the recorded one with the stale correlated value (RLP-593)', async () => {
    // The recorded step name bakes in the capture-time value of the {{NROEXP}}
    // placeholder. At runtime the extraction failed, so the request actually went
    // out with NROEXP=Regex+value+not+found. Overview read the node name and
    // showed the stale 2026-88-001-0168, contradicting the Request tab.
    const recordedName = 'Consulta Expediente - GET /servlet/exp?NROEXP=2026-88-001-0168';
    const request: YAMLNode = {
      id: 'exp',
      type: 'request',
      name: recordedName,
      data: { request_id: 12, method: 'GET', url: '/servlet/exp?NROEXP=2026-88-001-0168' },
      path: ['scenarios', 0, 'steps', 12],
    };
    const tree: YAMLNode = { id: 'root', type: 'root', name: 'root', children: [request] };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: overview-url\n'}
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
        event({ name: `[12] ${recordedName}`, path: '/servlet/exp?NROEXP=Regex+value+not+found' }),
      );
    });

    const stepValue = (await screen.findByText('Step')).nextElementSibling;
    expect(stepValue).toHaveTextContent('NROEXP=Regex+value+not+found');
    expect(stepValue).not.toHaveTextContent('2026-88-001-0168');
  });
});

describe('DebugSection RLP body layout', () => {
  it('keeps metadata compact and gives request bodies the primary reading area', () => {
    const { container } = render(
      <DebugSection
        rows={[
          ['Content-Type', 'application/x-www-form-urlencoded'],
          ['Authorization', 'Bearer token'],
        ]}
        body="javax.faces.ViewState=very-long-correlated-value"
      />,
    );

    const metadata = screen.getByText('Metadata and headers (2)').closest('details');
    expect(metadata).not.toHaveAttribute('open');

    const body = container.querySelector('pre');
    expect(body).toHaveClass('min-h-72');
    expect(body).toHaveClass('whitespace-pre-wrap');
    expect(body).toHaveTextContent('javax.faces.ViewState=very-long-correlated-value');
  });
});
