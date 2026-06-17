import { afterEach, describe, expect, it, vi } from 'vitest';
import { probeStudio } from './debugApi';

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
});
