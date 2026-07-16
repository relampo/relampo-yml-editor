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

function expectPassedStatusPill() {
  expect(screen.getAllByText('Passed', { exact: true }).some(element => element.tagName.toLowerCase() === 'span')).toBe(
    true,
  );
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

  it('labels a redirect-chain final 200 as Passed in Debug (RLP-571)', async () => {
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
      // The tree can badge this recorded child as REDIRECTED, but Debug reports
      // the execution result family. A successful 200 remains Passed.
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[14] GET /catalog',
          path: '/catalog',
          status: 200,
          chain_id: 'rc-13',
          chain_role: 'final',
          redirect_index: 1,
        }),
      );
    });

    await screen.findByRole('heading', { name: '/catalog' });
    expectPassedStatusPill();
    expect(screen.queryByText('Redirect', { exact: true })).toBeNull();
  });

  it('labels a successful 302 as Passed in Debug (RLP-571)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-status\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: '[1] GET /logout', path: '/logout', status: 302 }));
    });

    await screen.findByRole('heading', { name: '/logout' });
    expectPassedStatusPill();
    expect(screen.queryByText('Redirect', { exact: true })).toBeNull();
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

  it('shows redirected follow-up context in logs with the execution timeline number', async () => {
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

    expect(
      await screen.findByText(
        /redirected request: \[10\] POST http:\/\/example\.test\/login → 200 GET http:\/\/example\.test\/dashboard/,
      ),
    ).toBeInTheDocument();
  });

  it('uses the source hop execution number for redirected follow-up logs (RLP-598)', async () => {
    const parentRequest: YAMLNode = {
      id: 'parent',
      type: 'request',
      name: '[10] POST /login',
      data: { request_id: 10, method: 'POST', url: '/login', chain_id: 'rc-10', chain_role: 'parent' },
      path: ['scenarios', 0, 'steps', 10],
    };
    const hopRequest: YAMLNode = {
      id: 'hop',
      type: 'request',
      name: '[11] GET /oauth/as-gestion',
      data: { request_id: 11, method: 'GET', url: '/oauth/as-gestion', chain_id: 'rc-10', chain_role: 'hop' },
      path: ['scenarios', 0, 'steps', 11],
    };
    const finalRequest: YAMLNode = {
      id: 'final',
      type: 'request',
      name: '[12] GET /flowSelector.xhtml',
      data: { request_id: 12, method: 'GET', url: '/flowSelector.xhtml', chain_id: 'rc-10', chain_role: 'final' },
      path: ['scenarios', 0, 'steps', 12],
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [parentRequest, hopRequest, finalRequest],
    };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: redirect-hop-log\n'}
        documentReady
        validationErrors={[]}
        redirectedRequestMap={{
          final: {
            sourceNodeId: 'hop',
            sourceRequestLabel: '[11] GET /oauth/as-gestion',
            matchedLocation: '/flowSelector.xhtml',
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
          name: '[10] GET /flowSelector.xhtml',
          path: 'http://example.test/flowSelector.xhtml',
          request_id: 10,
          step_path: 'scenarios[0].steps[10].redirects[2]',
          chain_id: 'rc-10',
          chain_role: 'final',
          redirect_index: 2,
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'logs' }));

    expect(
      await screen.findByText(
        /redirected request: \[10\.1\] GET http:\/\/example\.test\/oauth\/as-gestion → 200 GET http:\/\/example\.test\/flowSelector\.xhtml/,
      ),
    ).toBeInTheDocument();
  });

  it('breaks long redirect log URLs inside the log panel (RLP-598)', async () => {
    const longUrl = `https://example.test/oauth/as-gestion?${'state=abcdef'.repeat(20)}`;

    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-wrap\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      debugApiMock.handlers[0].onEvent(event({ name: longUrl, path: longUrl, status: 302 }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'logs' }));

    const requestLine = await screen.findByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.includes(longUrl);
    });
    expect(requestLine).toHaveClass('break-all');
    expect(requestLine.closest('div')).toHaveClass('overflow-hidden');
  });

  it('omits the redundant launched-by line on a final 200 that shows the hop chain (RLP-598)', async () => {
    const finalRequest: YAMLNode = {
      id: 'final',
      type: 'request',
      name: '[11] GET /dashboard',
      data: { request_id: 11, method: 'GET', url: '/dashboard', chain_id: 'rc-10', chain_role: 'final' },
      path: ['scenarios', 0, 'steps', 11],
    };
    const tree: YAMLNode = { id: 'root', type: 'root', name: 'root', children: [finalRequest] };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: redirect-hops\n'}
        documentReady
        validationErrors={[]}
        redirectedRequestMap={{
          final: { sourceNodeId: 'parent', sourceRequestLabel: '[10] POST /login', matchedLocation: '/dashboard' },
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
          status: 200,
          chain_id: 'rc-10',
          chain_role: 'final',
          redirect_index: 1,
          redirects: [
            {
              status: 302,
              method: 'POST',
              url: 'http://example.test/login',
              location: 'http://example.test/dashboard',
            },
          ],
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'logs' }));

    // The full hop chain is shown for the final 200...
    expect(await screen.findByText(/followed 1 redirect before this 200 response/)).toBeInTheDocument();
    // ...so the redundant "redirected request launched by" line is dropped.
    expect(screen.queryByText(/redirected request launched by/)).toBeNull();
  });

  it('uses absolute URLs for the final target in redirect hop logs (RLP-598)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: redirect-hosts\n'}
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
          name: 'GET /landing',
          path: 'https://app.example.test/landing',
          status: 200,
          redirects: [{ status: 302, method: 'GET', url: 'https://app.example.test/start', location: '/landing' }],
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'logs' }));

    expect(
      await screen.findByText(
        /↳ hop 1: 302 GET https:\/\/app\.example\.test\/start → 200 GET https:\/\/app\.example\.test\/landing/,
      ),
    ).toBeInTheDocument();
  });

  it('shows on a parent extractor the value captured by its redirected child (RLP-597)', async () => {
    const parentRequest: YAMLNode = {
      id: 'parent',
      type: 'request',
      name: '[2] GET /login',
      data: { request_id: 2, method: 'GET', url: '/login', chain_id: 'rc-2', chain_role: 'parent' },
      children: [
        {
          id: 'extractor',
          type: 'extractor',
          name: 'Extract ViewState',
          data: {
            type: 'regex',
            var: 'javax.faces.ViewState',
            pattern: 'name="javax\\.faces\\.ViewState" value="([^"]+)"',
            default: 'Regex value not found: javax.faces.ViewState',
          },
        },
      ],
    };
    const redirectedChild: YAMLNode = {
      id: 'child',
      type: 'request',
      name: '[3] GET /flowSelector.xhtml',
      data: {
        request_id: 3,
        method: 'GET',
        url: '/flowSelector.xhtml',
        enabled: false,
        chain_id: 'rc-2',
        chain_role: 'final',
      },
    };
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'root',
      children: [parentRequest, redirectedChild],
    };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: child-extractor\n'}
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
          name: '[2] GET /login',
          path: 'https://example.test/login',
          request_id: 2,
          chain_id: 'rc-2',
          chain_role: 'parent',
          variables: { 'javax.faces.ViewState': 'Regex value not found: javax.faces.ViewState' },
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[2] GET /flowSelector.xhtml',
          path: 'https://example.test/flowSelector.xhtml',
          request_id: 2,
          chain_id: 'rc-2',
          chain_role: 'final',
          redirect_index: 1,
          variables: { 'javax.faces.ViewState': 'captured-child-value' },
        }),
      );
    });

    const parentNumber = await screen.findByText('#2');
    fireEvent.click(parentNumber.closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'variables' }));

    expect(await screen.findByText('javax.faces.ViewState (RES)')).toBeInTheDocument();
    expect(screen.getByText('captured-child-value')).toBeInTheDocument();
    expect(screen.queryByText('Regex value not found: javax.faces.ViewState')).toBeNull();
  });

  it('shows variables captured earlier in a redirect even when its recorded URL is already resolved (RLP-597)', async () => {
    const parent: YAMLNode = {
      id: 'parent',
      type: 'request',
      name: '[2] GET /login',
      data: { request_id: 2, method: 'GET', url: '/login', chain_id: 'rc-2', chain_role: 'parent' },
    };
    const child: YAMLNode = {
      id: 'child',
      type: 'request',
      name: '[3] GET /oauth',
      data: {
        request_id: 3,
        method: 'GET',
        // Recorded redirect children contain the capture-time values, not the
        // original placeholders. The Variables tab must correlate those literal
        // values with the runtime snapshot, as in request #2.1 from the report.
        url: '/oauth?state=captured-state&code=captured-code',
        enabled: false,
        chain_id: 'rc-2',
        chain_role: 'hop',
      },
    };
    const tree: YAMLNode = { id: 'root', type: 'root', name: 'root', children: [parent, child] };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: child-variable-snapshot\n'}
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
          name: '[2] GET /login',
          path: '/login',
          request_id: 2,
          chain_role: 'parent',
          variables: { state1: 'captured-state', unrelated: 'must-not-leak' },
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[2] GET /oauth',
          path: '/oauth?state=captured-state&code=captured-code',
          request_id: 2,
          chain_id: 'legacy:scenarios[0].steps[0]',
          chain_role: 'hop',
          redirect_index: 1,
          variables: { code1: 'captured-code' },
        }),
      );
    });

    fireEvent.click((await screen.findByText('#2.1')).closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'variables' }));

    expect(await screen.findByText('state1 (REQ)')).toBeInTheDocument();
    expect(screen.getByText('captured-state')).toBeInTheDocument();
    expect(screen.getByText('code1 (REQ)')).toBeInTheDocument();
    expect(screen.getByText('captured-code')).toBeInTheDocument();
    expect(screen.queryByText(/unrelated/i)).toBeNull();
    expect(screen.queryByText('Not captured')).toBeNull();
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

  it('weaves a skipped placeholder for a recorded redirect hop the run never followed (RLP-607)', async () => {
    // The RLP-607 OAuth flow: [123] redirects to [124], which redirects to the
    // cross-site callback [125]. The engine follows [124] but stops at the
    // cross-site callback (redirect trust boundary, backend RLP-492), so [125]
    // emits no event and used to vanish from the timeline (#123.1 then a jump to
    // the next request). The recorded final must now show as a skipped #123.2.
    const parent: YAMLNode = {
      id: 'p123',
      type: 'request',
      name: '[123] Firmar - POST /authentication',
      data: { request_id: 123, method: 'POST', url: '/authentication', chain_id: 'rc-123', chain_role: 'parent' },
      path: ['scenarios', 0, 'steps', 122],
    };
    const hop: YAMLNode = {
      id: 'h124',
      type: 'request',
      name: '[124] Firmar - GET /oauth/authz/flow',
      data: {
        request_id: 124,
        enabled: false,
        method: 'GET',
        url: '/oauth/authz/flow',
        chain_id: 'rc-123',
        chain_role: 'hop',
      },
      path: ['scenarios', 0, 'steps', 123],
    };
    const final: YAMLNode = {
      id: 'f125',
      type: 'request',
      name: '[125] Firmar - GET /tuid/callback',
      data: {
        request_id: 125,
        enabled: false,
        method: 'GET',
        url: '/tuid/callback',
        chain_id: 'rc-123',
        chain_role: 'final',
      },
      path: ['scenarios', 0, 'steps', 124],
    };
    const tree: YAMLNode = { id: 'root', type: 'root', name: 'root', children: [parent, hop, final] };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: skipped-hop\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    act(() => {
      // Parent (#123) and one hop (#123.1) fire; the callback [125] never does —
      // the backend stamps the parent's request_id on every chain event.
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[123] Firmar - POST /authentication',
          path: '/authentication',
          method: 'POST',
          status: 302,
          chain_id: 'rc-123',
          chain_role: 'parent',
          request_id: 123,
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[123] -> redirect',
          path: '/oauth/authz/flow',
          status: 302,
          chain_id: 'rc-123',
          chain_role: 'hop',
          redirect_index: 1,
          request_id: 123,
        }),
      );
    });

    expect(screen.queryByText('#123.2')).not.toBeInTheDocument();

    act(() => {
      debugApiMock.handlers[0].onDone(null);
    });

    // The recorded-but-unfollowed final is woven back in as a skipped #123.2 row.
    expect(await screen.findByText('#123.2')).toBeInTheDocument();
    expect(screen.getByText('Skipped · redirect not followed')).toBeInTheDocument();
    // The two real rows are still there.
    expect(screen.getByText('#123')).toBeInTheDocument();
    expect(screen.getByText('#123.1')).toBeInTheDocument();
  });

  it('keeps no-follow redirect children standalone in rows and variable snapshots (RLP-597)', async () => {
    const parent: YAMLNode = {
      id: 'p2',
      type: 'request',
      name: '[2] Login - GET /user/auth/login',
      data: {
        request_id: 2,
        method: 'GET',
        url: '/user/auth/login',
        follow_redirects: false,
        chain_id: 'rc-2',
        chain_role: 'parent',
      },
      path: ['scenarios', 0, 'steps', 1],
      children: [
        {
          id: 'parent-extractor',
          type: 'extractor',
          name: 'Extract token',
          data: { type: 'regex', var: 'token', pattern: 'token=([^&]+)' },
        },
      ],
    };
    const hop3: YAMLNode = {
      id: 'h3',
      type: 'request',
      name: '[3] Login - GET /trustedx-authserver/oauth/as-gestion',
      data: {
        request_id: 3,
        enabled: true,
        method: 'GET',
        url: '/trustedx-authserver/oauth/as-gestion',
        follow_redirects: false,
        chain_id: 'rc-2',
        chain_role: 'hop',
      },
      path: ['scenarios', 0, 'steps', 2],
    };
    const hop4: YAMLNode = {
      id: 'h4',
      type: 'request',
      name: '[4] Login - GET /trustedx-authserver/TuID-idp/oauth/as-gestion',
      data: {
        request_id: 4,
        enabled: true,
        method: 'GET',
        url: '/trustedx-authserver/TuID-idp/oauth/as-gestion',
        follow_redirects: false,
        chain_id: 'rc-2',
        chain_role: 'hop',
      },
      path: ['scenarios', 0, 'steps', 3],
    };
    const final5: YAMLNode = {
      id: 'f5',
      type: 'request',
      name: '[5] Login - GET /trustedx-authserver/TuID-idp/flowSelector.xhtml',
      data: {
        request_id: 5,
        enabled: true,
        method: 'GET',
        url: '/trustedx-authserver/TuID-idp/flowSelector.xhtml',
        follow_redirects: false,
        chain_id: 'rc-2',
        chain_role: 'final',
      },
      path: ['scenarios', 0, 'steps', 4],
    };
    const tree: YAMLNode = { id: 'root', type: 'root', name: 'root', children: [parent, hop3, hop4, final5] };

    render(
      <YAMLDebugSession
        tree={tree}
        yamlCode={'test:\n  name: no-follow-standalone-hops\n'}
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
          name: '[2] Login - GET /user/auth/login',
          path: '/user/auth/login',
          status: 302,
          chain_id: 'rc-2',
          chain_role: 'parent',
          request_id: 2,
          variables: { token: 'parent-value' },
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[3] Login - GET /trustedx-authserver/oauth/as-gestion',
          path: '/trustedx-authserver/oauth/as-gestion',
          status: 302,
          chain_id: 'rc-2',
          chain_role: 'hop',
          redirect_index: 1,
          request_id: 2,
          variables: { token: 'future-child-value' },
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[4] Login - GET /trustedx-authserver/TuID-idp/oauth/as-gestion',
          path: '/trustedx-authserver/TuID-idp/oauth/as-gestion',
          status: 302,
          chain_id: 'rc-2',
          chain_role: 'hop',
          redirect_index: 2,
          request_id: 2,
        }),
      );
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[5] Login - GET /trustedx-authserver/TuID-idp/flowSelector.xhtml',
          path: '/trustedx-authserver/TuID-idp/flowSelector.xhtml',
          status: 200,
          chain_id: 'rc-2',
          chain_role: 'final',
          redirect_index: 3,
          request_id: 2,
        }),
      );
      debugApiMock.handlers[0].onDone(null);
    });

    expect(await screen.findByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
    expect(screen.queryByText('#2.1')).not.toBeInTheDocument();
    expect(screen.queryByText('#2.2')).not.toBeInTheDocument();
    expect(screen.queryByText('#2.3')).not.toBeInTheDocument();
    expect(screen.queryByText('Skipped · redirect not followed')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('#2').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'variables' }));
    expect(await screen.findByText('token (RES)')).toBeInTheDocument();
    expect(screen.getByText('parent-value')).toBeInTheDocument();
    expect(screen.queryByText('future-child-value')).toBeNull();
  });

  it('shows a binary response body as a compact notice, not mojibake (RLP-555)', async () => {
    render(
      <YAMLDebugSession
        tree={null}
        yamlCode={'test:\n  name: binary-body\n'}
        documentReady
        validationErrors={[]}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
    await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

    const mojibake = '0' + String.fromCharCode(0xfffd) + String.fromCharCode(0xfffd) + 'B';
    act(() => {
      debugApiMock.handlers[0].onEvent(
        event({
          name: '[7] GET /cert.cer',
          path: '/cert.cer',
          response_body: mojibake,
          response_headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': '1765' },
        }),
      );
    });

    await screen.findByRole('heading', { name: '/cert.cer' });
    fireEvent.click(screen.getByRole('button', { name: 'response' }));

    const notice = '[binary content · 1765 bytes · application/octet-stream]';
    expect(
      await screen.findByText((_, el) => el?.tagName === 'PRE' && (el.textContent ?? '').includes(notice)),
    ).toBeInTheDocument();
    // The raw mojibake is not dumped.
    expect(screen.queryByText((_, el) => (el?.textContent ?? '').includes(mojibake))).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download response body bytes' })).not.toBeInTheDocument();
  });

  it('downloads exact response bytes when the debug event includes base64 bytes', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => 'blob:debug-response-body');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });

    try {
      render(
        <YAMLDebugSession
          tree={null}
          yamlCode={'test:\n  name: binary-body-download\n'}
          documentReady
          validationErrors={[]}
          onSelectNode={vi.fn()}
          onEditNode={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
      await waitFor(() => expect(debugApiMock.handlers).toHaveLength(1));

      const mojibake = '0' + String.fromCharCode(0xfffd) + String.fromCharCode(0xfffd) + 'B';
      act(() => {
        debugApiMock.handlers[0].onEvent(
          event({
            name: '[7] GET /cert.cer',
            path: '/cert.cer',
            response_body: mojibake,
            response_body_base64: 'MIIGzg==',
            response_headers: {
              'Content-Disposition': 'attachment; filename=Certificado.cer',
              'Content-Type': 'application/octet-stream',
              'Content-Length': '4',
            },
          }),
        );
      });

      await screen.findByRole('heading', { name: '/cert.cer' });
      fireEvent.click(screen.getByRole('button', { name: 'response' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Download response body bytes' }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/octet-stream');
      expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([48, 130, 6, 206]);
      expect(downloadedFilename).toBe('Certificado.cer');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:debug-response-body');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
    }
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
