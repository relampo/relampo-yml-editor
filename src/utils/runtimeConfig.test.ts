import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRuntimeConfig, loadRuntimeConfig, resetRuntimeConfigForTests } from './runtimeConfig';

afterEach(() => {
  resetRuntimeConfigForTests();
  vi.unstubAllGlobals();
});

describe('loadRuntimeConfig', () => {
  it('loads public Studio settings before the app starts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: 'studio',
          apiBaseUrl: 'http://127.0.0.1:4400',
          statsigClientKey: 'client-public-key',
          statsigEnvironment: 'production',
        }),
      }),
    );

    await loadRuntimeConfig();

    expect(fetch).toHaveBeenCalledWith(
      '/runtime-config.json',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    );
    expect(getRuntimeConfig()).toEqual({
      mode: 'studio',
      apiBaseUrl: 'http://127.0.0.1:4400',
      statsigClientKey: 'client-public-key',
      statsigEnvironment: 'production',
    });
  });

  it('rejects cross-origin API URLs from runtime data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mode: 'studio', apiBaseUrl: 'https://attacker.example' }),
      }),
    );

    await loadRuntimeConfig();

    expect(getRuntimeConfig().apiBaseUrl).toBe('');
  });

  it('keeps safe build defaults when the endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(loadRuntimeConfig()).resolves.toBeUndefined();
    expect(getRuntimeConfig().mode).toBe('web');
  });
});
