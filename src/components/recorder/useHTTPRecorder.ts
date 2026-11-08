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
  const [firefoxConfigured, setFirefoxConfigured] = useState(false);
  const [state, setState] = useState<HTTPRecordingState>(idle),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [ready, setReady] = useState(false),
    [firefoxAvailable, setFirefoxAvailable] = useState(false),
    [generation, setGeneration] = useState(0);
  const update = useCallback((patch: Partial<HTTPRecordOptions>) => {
    if (patch.port !== undefined) setFirefoxConfigured(false);
    setOptions(current => ({ ...current, ...patch }));
  }, []);
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
      const defaults = await httpRecorderRequest<{
        directory: string;
        port: number;
        firefoxAvailable: boolean;
        firefoxConfigured?: boolean;
        configuredPort?: number;
      }>('options', undefined, controller.signal);
      if (controller.signal.aborted) return;
      setFirefoxAvailable(defaults.firefoxAvailable);
      setFirefoxConfigured(defaults.firefoxConfigured === true);
      setOptions(current => ({
        ...current,
        output: current.output || defaults.directory + '/recording.yaml',
        port: defaults.firefoxConfigured ? defaults.configuredPort || defaults.port : defaults.port,
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
      return await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      try {
        return await refresh();
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
    firefoxConfigured,
    refresh,
    start: () =>
      action('start', {
        ...options,
        prefix: options.prefixEnabled ? options.prefix : '',
        grouping: options.transactionsEnabled ? 'none' : options.grouping,
      }),
    stop: () => action('stop', state.active ? {} : { output: options.output, force: options.force }),
    applyPrefix: () => action('prefix', { prefix: options.prefix }),
    openFirefox: () => action('firefox', {}),
    configureFirefox: async () => {
      setBusy('configure-firefox');
      setError('');
      try {
        const configured = await httpRecorderRequest<{ configured: boolean; port: number }>('configure-firefox', {
          port: options.port,
        });
        setFirefoxConfigured(configured.configured);
        setOptions(current => ({ ...current, port: configured.port }));
      } catch (cause) {
        setFirefoxConfigured(false);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy('');
      }
    },
    chooseOutput: async () => {
      setBusy('choose-output');
      setError('');
      try {
        const selected = await httpRecorderRequest<{ cancelled: boolean; output?: string }>(
          'choose-output',
          { suggested: options.output },
          AbortSignal.timeout(300000),
        );
        if (!selected.cancelled && selected.output) setOptions(current => ({ ...current, output: selected.output! }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy('');
      }
    },
    retryInitialization: () => setGeneration(value => value + 1),
  };
}
