import { afterEach, describe, expect, it, vi } from 'vitest';
import { distributedRequest, safeProviderURL, uploadDistributedFile } from './distributedApi';
import { resetStudioSessionForTests } from './studioAuth';
afterEach(() => {
  vi.unstubAllGlobals();
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
