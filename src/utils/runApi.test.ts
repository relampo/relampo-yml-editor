import { afterEach, describe, expect, it, vi } from 'vitest';
import { startLoadRun, stopLoadRun, streamLoadRun } from './runApi';

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

describe('startLoadRun', () => {
  it('posts only the YAML (load config comes from the script) and returns the run id', async () => {
    mockFetch({ id: 'lrun-3' });

    await expect(startLoadRun('test:\n  name: load\n')).resolves.toBe('lrun-3');

    expect(fetch).toHaveBeenCalledWith(
      '/api/run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ yaml: 'test:\n  name: load\n' }),
      }),
    );
  });

  it('surfaces a server error message', async () => {
    mockFetch({ error: 'scenario has no load configuration' }, false);

    await expect(startLoadRun('test:\n')).rejects.toThrow('scenario has no load configuration');
  });

  it('falls back to a generic message when the error body is unreadable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );

    await expect(startLoadRun('test:\n')).rejects.toThrow('load run failed to start (HTTP 500)');
  });
});

describe('stopLoadRun', () => {
  it('posts to the run stop endpoint', async () => {
    mockFetch({ stopping: true });

    await stopLoadRun('lrun-7');

    expect(fetch).toHaveBeenCalledWith(
      '/api/run/lrun-7/stop',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('streamLoadRun', () => {
  it('closes and reports a connection error for malformed SSE data', () => {
    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      close = vi.fn();
      readyState = 1;
      onerror: (() => void) | null = null;
      private listeners = new Map<string, (event: Event) => void>();

      constructor() {
        FakeEventSource.instances.push(this);
      }

      addEventListener(type: string, listener: (event: Event) => void) {
        this.listeners.set(type, listener);
      }

      emit(type: string, data: string) {
        this.listeners.get(type)?.({ data } as unknown as MessageEvent);
      }
    }

    vi.stubGlobal('EventSource', FakeEventSource);
    const onConnectionError = vi.fn();
    const onState = vi.fn();
    const onMetrics = vi.fn();
    const onLog = vi.fn();
    const onDone = vi.fn();
    streamLoadRun('run-1', { onState, onMetrics, onLog, onDone, onConnectionError });

    FakeEventSource.instances[0].emit('metrics', '{bad json');

    expect(onMetrics).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onConnectionError).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances[0].close).toHaveBeenCalledTimes(1);
  });
});
