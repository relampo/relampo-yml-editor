import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeAgentHost, resetAgentHostForTests } from './agentHost';
import { agentRequest } from './agentTransport';
import { correlateRequest } from './correlateApi';
import { grpcRequest } from './grpcApi';
import { httpRecorderRequest } from './httpRecorderApi';

// Contract 0.20, section 10: the cloud runs Correlate. Inside the web app
// Studio asks the web app for the job. The agent routes that get their result
// from a job have 150 seconds, and every error code is a sentence.

const originalParent = window.parent;
let parent: { postMessage: ReturnType<typeof vi.fn> };

const requests = () =>
  parent.postMessage.mock.calls.map(([message]) => message).filter(m => m.type === 'relampo:logic-request');

/** The web app answers the last `relampo:logic-request`. */
function answer(data: Record<string, unknown>) {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: window.location.origin,
      source: parent as unknown as Window,
      data: { type: 'relampo:logic-result', requestId: requests().at(-1).requestId, ...data },
    }),
  );
}

function embed(query = '') {
  parent = { postMessage: vi.fn() };
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  window.history.replaceState({}, '', '/?embedded=1' + query);
  initializeAgentHost();
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  resetAgentHostForTests();
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Correlate inside the web app', () => {
  beforeEach(() => embed());

  it.each([
    ['analyze', 'correlate.analyze', { yaml: 'a', minConfidence: 0.5 }],
    ['apply', 'correlate.apply', { yaml: 'a', digest: 'd1', selectedIds: ['c1'] }],
  ])('asks the web app for %s and sends nothing to the agent', async (route, kind, input) => {
    const result = correlateRequest(route, input);

    expect(requests()).toEqual([{ type: 'relampo:logic-request', requestId: expect.any(String), kind, input }]);
    answer({ result: { yaml: 'b', applied: [] } });

    await expect(result).resolves.toEqual({ yaml: 'b', applied: [] });
    // No relay ticket and no HTTP request: these routes need no machine.
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('gives the error of a job the shape of an agent error', async () => {
    const response = agentRequest('/api/correlate/apply', { method: 'POST', body: '{"yaml":"a"}' });
    answer({ error: 'script_changed', message: 'changed' });

    expect((await response).ok).toBe(false);
    await expect((await response).json()).resolves.toEqual({ error: 'script_changed', message: 'changed' });
  });

  it.each([
    ['feature_not_enabled', 'Your plan does not include this feature.'],
    ['limit_reached', 'You reached the limit of your plan for today. Try again tomorrow, or change your plan.'],
    ['too_large', 'This is larger than 128 MB. Relampo cannot process it.'],
    ['logic_not_configured', 'This service is not available now. Try again later.'],
    ['license_revoked', 'Your Relampo license is not active.'],
    ['license_expired', 'Your Relampo license is not active.'],
    ['activation_revoked', 'This machine is not signed in to Relampo. Run `relampo login` on it.'],
    ['invalid_input', 'Relampo could not read this script. Check that it is valid.'],
    ['script_changed', 'The script changed after the analysis. Analyze it again.'],
    ['unsupported_format', 'This Relampo version is too old for this. Update Relampo.'],
    ['timeout', 'Relampo took too long to process this. Try again.'],
    ['internal', 'Relampo could not process this. Try again.'],
    ['network', 'Could not reach Relampo. Check your internet connection and try again.'],
    // Codes that Studio does not know: no raw code on the screen.
    ['invalid_request', 'Relampo could not process this. Try again.'],
    ['job_not_found', 'Relampo could not process this. Try again.'],
  ])('shows a sentence for the error %s', async (error, sentence) => {
    const result = correlateRequest('analyze', { yaml: 'a' });
    answer({ error });

    await expect(result).rejects.toThrow(new Error(sentence));
  });

  it('adds the message of a job that could not read the script', async () => {
    const result = correlateRequest('analyze', { yaml: 'a' });
    answer({ error: 'invalid_input', message: 'The script has no requests.' });

    await expect(result).rejects.toThrow(
      new Error('Relampo could not read this script. Check that it is valid. The script has no requests.'),
    );
  });

  it('shows the sentence in Spanish when the page is in Spanish', async () => {
    embed('&lang=es');
    const result = correlateRequest('analyze', { yaml: 'a' });
    answer({ error: 'script_changed' });

    await expect(result).rejects.toThrow(new Error('El script cambió después del análisis. Analízalo de nuevo.'));
  });
});

describe('Correlate in a Studio that a CLI serves', () => {
  it('sends the route to that CLI, as before', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ digest: 'd1', requests: 1, responses: 1, candidates: [] }));

    await expect(correlateRequest('analyze', { yaml: 'a' })).resolves.toMatchObject({ digest: 'd1' });

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/correlate/analyze');
  });

  it('says where Correlate is when the CLI does not serve the route', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('404 page not found', { status: 404 }));

    await expect(correlateRequest('analyze', { yaml: 'a' })).rejects.toThrow(
      'This Relampo version runs Correlate in the Relampo web app. Open the script there.',
    );
  });
});

describe('agent routes that get their result from a job in the cloud', () => {
  const signals = () => vi.mocked(AbortSignal.timeout).mock.calls.map(([milliseconds]) => milliseconds);

  beforeEach(() => {
    vi.spyOn(AbortSignal, 'timeout');
    vi.mocked(fetch).mockImplementation(async () => Response.json({}));
  });

  it('gives 150 seconds to the two recorder routes, and 45 seconds to the others', async () => {
    await httpRecorderRequest('editor', {});
    await httpRecorderRequest('correlations', {});
    await httpRecorderRequest('stop', {});
    await httpRecorderRequest('current');

    expect(signals()).toEqual([150_000, 150_000, 45_000, 45_000]);
  });

  it('gives 150 seconds to the three gRPC routes, and 30 seconds to the others', async () => {
    await grpcRequest('recordings/stop', {});
    await grpcRequest('generate', {});
    await grpcRequest('correlations', {});
    await grpcRequest('recordings/start', {});
    await grpcRequest('recordings/current');

    expect(signals()).toEqual([150_000, 150_000, 150_000, 30_000, 30_000]);
  });

  it('keeps the 150 seconds when the page gives its own signal, and the page can still give up', async () => {
    const page = new AbortController();

    await grpcRequest('generate', {}, page.signal);

    expect(signals()).toEqual([150_000]);
    const sent = vi.mocked(fetch).mock.calls[0][1]!.signal!;
    expect(sent.aborted).toBe(false);
    page.abort();
    expect(sent.aborted).toBe(true);
  });

  it.each([
    [403, { error: 'feature_not_enabled' }, 'Your plan does not include this feature.'],
    [
      429,
      { error: 'limit_reached', message: 'x' },
      'You reached the limit of your plan for today. Try again tomorrow, or change your plan.',
    ],
    [
      422,
      { error: 'invalid_input', message: 'No calls.' },
      'Relampo could not read this script. Check that it is valid. No calls.',
    ],
    [422, { error: 'unsupported_format' }, 'This Relampo version is too old for this. Update Relampo.'],
    [
      502,
      { error: 'logic_unavailable' },
      'Your machine could not reach Relampo. Check its internet connection and try again.',
    ],
    [504, { error: 'logic_timeout' }, 'Relampo took too long to process this. Try again.'],
    // A sentence of the agent stays as it is.
    [409, { error: 'The recorder is not active.' }, 'The recorder is not active.'],
  ])('shows a sentence for status %i with %j', async (status, body, sentence) => {
    vi.mocked(fetch).mockImplementation(async () => Response.json(body, { status }));

    await expect(httpRecorderRequest('editor', {})).rejects.toThrow(new Error(sentence));
    await expect(grpcRequest('generate', {})).rejects.toThrow(new Error(sentence));
  });

  it('keeps the general text when the error has no body', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('', { status: 500 }));

    await expect(httpRecorderRequest('editor', {})).rejects.toThrow('Recorder operation failed');
    await expect(grpcRequest('generate', {})).rejects.toThrow('gRPC operation failed');
  });
});
