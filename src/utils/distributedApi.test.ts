import { afterEach, describe, expect, it, vi } from 'vitest';
import { distributedRequest, DistributedRequestError, safeProviderURL, uploadDistributedFile } from './distributedApi';
import { resetStudioSessionForTests } from './studioAuth';
import * as agentTransport from './agentTransport';
const planUpload = vi.hoisted(() => vi.fn());
vi.mock('./planDataSource', () => ({ uploadPlanDataSource: planUpload }));
const originalParent = window.parent;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  planUpload.mockReset();
  resetStudioSessionForTests();
  window.history.replaceState({}, '', '/');
});
describe('distributed API', () => {
  it('forwards the Studio token in headers and preserves typed errors', async () => {
    window.history.replaceState({}, '', '/?token=session-test');
    resetStudioSessionForTests();
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'license limit exceeded' }), { status: 422 }));
    vi.stubGlobal('fetch', fetch);
    await expect(distributedRequest('preflight', { nodes: 9 })).rejects.toThrow('license limit exceeded');
    expect(new Headers(fetch.mock.calls[0][1].headers).get('X-Relampo-Studio-Token')).toBe('session-test');
    expect(fetch.mock.calls[0][0]).not.toContain('session-test');
  });
  it('distinguishes a missing run from a temporary connection failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => Response.json({ error: 'distributed run not found' }, { status: 404 })),
    );
    await expect(distributedRequest('run/drun-old')).rejects.toBeInstanceOf(DistributedRequestError);
    await expect(distributedRequest('run/drun-old')).rejects.toMatchObject({
      status: 404,
      message: 'distributed run not found',
    });
  });
  it('rejects executable URLs and embedded credentials', () => {
    expect(safeProviderURL('javascript:alert(1)')).toBeUndefined();
    expect(safeProviderURL('https://secret@github.com/repo')).toBeUndefined();
    expect(safeProviderURL('https://github.com/owner/repo/actions/runs/42')).toContain('/runs/42');
  });
  it('sends picked file bytes as multipart with the session token and returns the staged path', async () => {
    window.history.replaceState({}, '', '/?token=upload-session');
    const file = new File(['id\n1'], 'users.csv', { type: 'text/csv' });
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ path: '.relampo/datasources/users.csv' }), { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await expect(uploadDistributedFile(file)).resolves.toBe('.relampo/datasources/users.csv');
    const options = fetch.mock.calls[0][1];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
    expect(new Headers(options.headers).get('X-Relampo-Studio-Token')).toBe('upload-session');
    expect(new Headers(options.headers).has('Content-Type')).toBe(false);
  });
});

it('persists a distributed CSV in the plan before staging it for CI', async () => {
  Object.defineProperty(window, 'parent', { configurable: true, value: {} });
  window.history.replaceState({}, '', '/?embedded=1&account=qa&plan=one');
  planUpload.mockResolvedValue({ path: 'Data/users.csv', name: 'users.csv' });
  const request = vi
    .spyOn(agentTransport, 'agentRequest')
    .mockResolvedValue(Response.json({ path: '.relampo/datasources/users.csv' }, { status: 201 }));
  const file = new File(['id\n1'], 'users.csv');
  await expect(uploadDistributedFile(file)).resolves.toBe('.relampo/datasources/users.csv');
  expect(planUpload).toHaveBeenCalledWith(file);
  expect(planUpload.mock.invocationCallOrder[0]).toBeLessThan(request.mock.invocationCallOrder[0]);
});
it('does not stage the CSV when its Test Plan cannot save it', async () => {
  Object.defineProperty(window, 'parent', { configurable: true, value: {} });
  window.history.replaceState({}, '', '/?embedded=1&account=qa&plan=one');
  planUpload.mockRejectedValue(Error('Folder access required'));
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(uploadDistributedFile(new File(['id'], 'users.csv'))).rejects.toThrow('Folder access required');
  expect(fetch).not.toHaveBeenCalled();
});
