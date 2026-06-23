import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewStudioDataSourceFile, probeStudio, startDebugRun, uploadStudioDataSourceFile } from './debugApi';

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: async () => body }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('probeStudio', () => {
  it('returns null when not served by studio (fetch fails)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no server')));
    expect(await probeStudio()).toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    mockFetch({ studio: true }, false);
    expect(await probeStudio()).toBeNull();
  });

  it('returns null when the body does not report studio', async () => {
    mockFetch({ studio: false });
    expect(await probeStudio()).toBeNull();
  });

  it('reports studio mode with no initial script', async () => {
    mockFetch({ studio: true });
    expect(await probeStudio()).toEqual({ studio: true, initialScript: undefined });
  });

  it('returns the CLI-mounted initial script', async () => {
    mockFetch({ studio: true, initialScript: { name: 'flow.yaml', yaml: 'test:\n  name: x\n' } });
    expect(await probeStudio()).toEqual({
      studio: true,
      initialScript: { name: 'flow.yaml', yaml: 'test:\n  name: x\n' },
    });
  });

  it('defaults the script name when only yaml is provided', async () => {
    mockFetch({ studio: true, initialScript: { yaml: 'a: 1\n' } });
    expect((await probeStudio())?.initialScript).toEqual({ name: 'script.yaml', yaml: 'a: 1\n' });
  });

  it('ignores a malformed initial script (no yaml string)', async () => {
    mockFetch({ studio: true, initialScript: { name: 'x.yaml' } });
    expect(await probeStudio()).toEqual({ studio: true, initialScript: undefined });
  });

  it('reports the loadRun capability when the studio advertises it', async () => {
    mockFetch({ studio: true, capabilities: { loadRun: true } });
    expect((await probeStudio())?.capabilities).toEqual({ loadRun: true });
  });

  it('defaults loadRun to false when capabilities are present without it', async () => {
    mockFetch({ studio: true, capabilities: {} });
    expect((await probeStudio())?.capabilities).toEqual({ loadRun: false });
  });

  it('omits capabilities for older studio builds that do not send them', async () => {
    mockFetch({ studio: true });
    expect((await probeStudio())?.capabilities).toBeUndefined();
  });
});

describe('startDebugRun', () => {
  it('posts the selected debug VUs with the YAML', async () => {
    mockFetch({ id: 'run-2' });

    await expect(startDebugRun('test:\n  name: debug\n', { vus: 2 })).resolves.toBe('run-2');

    expect(fetch).toHaveBeenCalledWith(
      '/api/debug/runs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ yaml: 'test:\n  name: debug\n', vus: 2 }),
      }),
    );
  });
});

describe('uploadStudioDataSourceFile', () => {
  it('uploads a file to Studio and returns the local path', async () => {
    mockFetch({ name: 'users.txt', path: '/tmp/relampo-studio/users.txt' });

    await expect(uploadStudioDataSourceFile(new File(['alice\n'], 'users.txt'))).resolves.toEqual({
      name: 'users.txt',
      path: '/tmp/relampo-studio/users.txt',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/studio/data-source-files',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
  });

  it('surfaces Studio upload errors', async () => {
    mockFetch({ error: 'only .csv and .txt data source files are supported' }, false);

    await expect(uploadStudioDataSourceFile(new File(['{}'], 'users.json'))).rejects.toThrow(
      'only .csv and .txt data source files are supported',
    );
  });
});

describe('previewStudioDataSourceFile', () => {
  it('loads a Studio data source preview', async () => {
    mockFetch({ path: '/tmp/users.txt', lines: ['alice', 'bob'], truncated: false });

    await expect(previewStudioDataSourceFile('/tmp/users.txt')).resolves.toEqual({
      path: '/tmp/users.txt',
      lines: ['alice', 'bob'],
      truncated: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/studio/data-source-preview?path=%2Ftmp%2Fusers.txt',
      expect.objectContaining({ signal: undefined }),
    );
  });

  it('surfaces Studio preview errors', async () => {
    mockFetch({ error: 'read data source: file not found' }, false);

    await expect(previewStudioDataSourceFile('/tmp/missing.txt')).rejects.toThrow('read data source: file not found');
  });
});
