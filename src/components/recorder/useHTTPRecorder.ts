import { useCallback, useEffect, useState } from 'react';
import { probeStudio } from '../../utils/debugApi';
import {
  defaultHTTPRecordOptions,
  httpRecorderRequest,
  type HTTPRecordOptions,
  type HTTPRecordingState,
} from '../../utils/httpRecorderApi';
const idle: HTTPRecordingState = { active: false, totalRequests: 0, requests: [] };
export function useHTTPRecorder() {
  const [options, setOptions] = useState<HTTPRecordOptions>({ ...defaultHTTPRecordOptions });
  const [state, setState] = useState<HTTPRecordingState>(idle),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [ready, setReady] = useState(false),
    [firefoxAvailable, setFirefoxAvailable] = useState(false),
    [generation, setGeneration] = useState(0);
  const update = useCallback(
    (patch: Partial<HTTPRecordOptions>) => setOptions(current => ({ ...current, ...patch })),
    [],
  );
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const value = await httpRecorderRequest<HTTPRecordingState>('current', undefined, signal);
    if (!signal?.aborted) setState(value);
    return value;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      const studio = await probeStudio();
      if (!studio?.capabilities?.httpRecorder) throw new Error('A compatible local Relampo Studio is required.');
      const defaults = await httpRecorderRequest<{ directory: string; port: number; firefoxAvailable: boolean }>(
        'options',
        undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setFirefoxAvailable(defaults.firefoxAvailable);
      setOptions(current => ({
        ...current,
        output: current.output || defaults.directory + '/recording.yaml',
        port: defaults.port,
      }));
      const current = await refresh(controller.signal);
      if (controller.signal.aborted) return;
      if (current.output) setOptions(value => ({ ...value, output: current.output! }));
      setReady(true);
    }
    initialize().catch(cause => {
      if (!controller.signal.aborted) setError(cause.message);
    });
    return () => controller.abort();
  }, [refresh, generation]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        await refresh(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 1000);
    }
    timer = setTimeout(poll, 1000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [refresh, ready]);
  async function action(name: string, body: unknown) {
    setBusy(name);
    setError('');
    try {
      await httpRecorderRequest(name, body);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      try {
        await refresh();
      } catch {
        /* Preserve the original operation error. */
      }
    } finally {
      setBusy('');
    }
  }
  return {
    options,
    update,
    state,
    error,
    setError,
    busy,
    ready,
    firefoxAvailable,
    refresh,
    start: () => action('start', options),
    stop: () => action('stop', state.active ? {} : { output: options.output, force: options.force }),
    applyPrefix: () => action('prefix', { prefix: options.prefix }),
    openFirefox: () => action('firefox', {}),
    retryInitialization: () => setGeneration(value => value + 1),
  };
}
