import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentState } from '../../hooks/useAgentState';
import { agentUnavailableText } from '../../utils/agentHost';
import { isLostAnswer, stateAfterLostAnswer, timerRead, timerReadError, usesRelay } from '../../utils/agentTransport';
import { useInFront } from '../../hooks/useInFront';
import { probeStudio } from '../../utils/debugApi';
import {
  defaultHTTPRecordOptions,
  httpRecorderRequest,
  type HTTPRecordOptions,
  type HTTPRecordingState,
} from '../../utils/httpRecorderApi';
const idle: HTTPRecordingState = { active: false, totalRequests: 0, requests: [] };
/**
 * `embedded` is true inside the web app. There the agent keeps the recording
 * in memory: no output file, and the script goes to the test plan.
 */
export function useHTTPRecorder(embedded = false) {
  // Through the relay the machine can connect later: a new state starts again.
  const agentState = useAgentState();
  const captureRevision = useRef(0);
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
    const revision = captureRevision.current;
    const value = await httpRecorderRequest<HTTPRecordingState>('current', undefined, signal);
    if (!signal?.aborted && revision === captureRevision.current) setState(value);
    return value;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      const studio = await probeStudio();
      if (!studio && usesRelay()) throw new Error(agentUnavailableText());
      if (!studio?.capabilities?.httpRecorder)
        throw new Error(
          usesRelay()
            ? 'The HTTP recorder is not available with your plan or your agent version.'
            : 'A compatible local Relampo Studio is required.',
        );
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
        output: embedded ? '' : current.output || defaults.directory + '/recording.yaml',
        port: defaults.firefoxConfigured ? defaults.configuredPort || defaults.port : defaults.port,
      }));
      const current = await refresh(controller.signal);
      if (controller.signal.aborted) return;
      if (current.output && !embedded) setOptions(value => ({ ...value, output: current.output! }));
      setError('');
      setReady(true);
    }
    initialize().catch(cause => {
      if (!controller.signal.aborted) setError(cause.message);
    });
    return () => controller.abort();
  }, [refresh, generation, embedded, agentState]);
  const [inFront, cameBack] = useInFront();
  useEffect(() => {
    if (!ready || !inFront) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    // ponytail: one poll each second. Through the relay that is about 6
    // messages each second while this view is in front (accepted cost: about
    // 5 cents each hour). Upgrade path: an event stream from the agent with
    // the recorder state, read with agentEventStream.
    const report = timerReadError(setError);
    async function poll() {
      try {
        await timerRead(refresh, controller.signal);
        report();
      } catch (cause) {
        if (!controller.signal.aborted) report(cause);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 1000);
    }
    timer = setTimeout(poll, cameBack() ? 0 : 1000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [refresh, ready, inFront, cameBack]);
  async function action(name: string, body: unknown) {
    setBusy(name);
    setError('');
    // `record` is safe to repeat (contract, section 8): 3 tries, 10 seconds each.
    const repeat = name === 'record';
    try {
      for (let tries = repeat ? 3 : 1; ; tries--) {
        try {
          await (repeat
            ? timerRead(signal => httpRecorderRequest(name, body, signal))
            : httpRecorderRequest(name, body));
          return await timerRead(refresh);
        } catch (cause) {
          // With no answer, the agent can have done the work: the state decides.
          const current = await stateAfterLostAnswer(cause, refresh).catch(() => undefined);
          const done =
            name === 'start'
              ? current?.active
              : name === 'stop'
                ? current && !current.active && (embedded || !!current.savedPath)
                : repeat && current?.recording === true;
          if (done) return current;
          if (tries > 1 && isLostAnswer(cause)) continue;
          setError(cause instanceof Error ? cause.message : String(cause));
          // After an error with an answer, show the state of the agent.
          return current ?? (await timerRead(refresh).catch(() => undefined));
        }
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
    start: () => {
      const { output, force, ...kept } = options;
      return action('start', {
        ...kept,
        // The agent of the web app takes no output and no force: it writes no file.
        ...(embedded ? {} : { output, force }),
        prefix: options.prefixEnabled ? options.prefix : '',
        grouping: options.transactionsEnabled ? 'none' : options.grouping,
      });
    },
    stop: () => action('stop', state.active || embedded ? {} : { output: options.output, force: options.force }),
    /** Prefix, transaction and record: the controls of an active recording. */
    control: action,
    clear: async () => {
      setBusy('clear');
      setError('');
      captureRevision.current++;
      try {
        await httpRecorderRequest('clear', {});
        captureRevision.current++;
        setState({ ...idle });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        try {
          await refresh();
        } catch {
          /* Preserve the clear error. */
        }
      } finally {
        setBusy('');
      }
    },
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
