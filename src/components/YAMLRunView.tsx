import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Gauge, OctagonX, Play, Square, Terminal, TimerReset, Users, XCircle, Zap } from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import {
  loadRunReportUrl,
  startLoadRun,
  stopLoadRun,
  streamLoadRun,
  type RunLogLine,
  type RunMetricsSnapshot,
  type RunRequestStat,
  type RunStatus,
  type RunSummary,
} from '../utils/runApi';
import { LoadVisualization } from './yaml-node-details/LoadVisualization';
import { normalizeLoadType, parseTimeToSeconds } from './yaml-node-details/loadUtils';
import { normalizeBalancedExecutionMode } from '../utils/balancedController';
import { createStoredRunStore, fingerprint, type StoredRun } from '../utils/studioRunStore';
import { collectDebugEventTargets, matchDebugEventTarget } from './debugRequests';

// The live sparklines only need a recent window; keeping every snapshot for a
// long run would bloat state and slow re-render. Cumulative totals live on the
// latest snapshot, so trimming the head never loses the running totals.
const MAX_LIVE_POINTS = 600;

// The live log feed keeps the most recent lines; older ones scroll off. The
// server already caps emission, but a long run still produces many lines.
const MAX_LIVE_LOGS = 1000;

// The last load run is parked in sessionStorage so a reload can re-attach and
// let the studio replay it (history + final summary).
const runStore = createStoredRunStore('relampo.studio.loadRun');

// Collects every `load` node in the tree (one per scenario). The Run panel
// previews the first as the "planned profile" and notes when there are several.
function collectLoadNodes(node: YAMLNode | null): YAMLNode[] {
  if (!node) return [];
  const found: YAMLNode[] = [];
  const walk = (current: YAMLNode) => {
    if (current.type === 'load') found.push(current);
    current.children?.forEach(walk);
  };
  walk(node);
  return found;
}

// A Balanced Controller in Iterations mode ends the run once its iteration
// budget is consumed, so a configured Duration is only an upper bound: the run
// (and its live metrics) can stop well before the duration elapses. Detecting
// it lets the planned-profile preview flag that an early finish is expected, not
// a bug. Studio supports a single scenario, so a tree-wide walk is sufficient.
function hasIterationBudgetController(node: YAMLNode | null): boolean {
  if (!node || node.data?.enabled === false) return false;
  if (node.type === 'balanced' && normalizeBalancedExecutionMode(node.data?.mode) === 'iteraciones') {
    return true;
  }
  return (node.children ?? []).some(hasIterationBudgetController);
}

function formatRps(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  return value.toFixed(1);
}

function formatMs(value: number): string {
  if (!value) return '0ms';
  return value < 10 ? `${value.toFixed(1)}ms` : `${Math.round(value)}ms`;
}

function formatErrorRate(totalRequests: number, totalFailures: number): string {
  if (totalRequests <= 0) return '0%';
  return `${((totalFailures / totalRequests) * 100).toFixed(2)}%`;
}

// Go time.Duration serializes as integer nanoseconds.
function formatDurationNs(nanoseconds: number): string {
  const totalSeconds = nanoseconds / 1e9;
  if (totalSeconds < 1) return `${Math.round(nanoseconds / 1e6)}ms`;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(totalSeconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  stopped: 'Stopped',
  errored: 'Failed',
};

function statusTone(status: RunStatus): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
    case 'stopped':
      return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
    case 'errored':
      return 'text-red-300 border-red-400/30 bg-red-400/10';
    default:
      return 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10';
  }
}

// All these fields transition together off the same run-lifecycle events
// (start, SSE state/metrics/log/done, connection loss, stop) so they live in
// one reducer instead of seven independent useState calls.
interface LoadRunState {
  snapshots: RunMetricsSnapshot[];
  isRunning: boolean;
  isStopping: boolean;
  runError: string | null;
  runStatus: RunStatus | null;
  summary: RunSummary | null;
  logs: RunLogLine[];
}

const initialLoadRunState: LoadRunState = {
  snapshots: [],
  isRunning: false,
  isStopping: false,
  runError: null,
  runStatus: null,
  summary: null,
  logs: [],
};

type LoadRunAction =
  | { type: 'run_started' }
  | { type: 'run_start_failed'; error: string }
  | { type: 'flush_failed'; error: string }
  | { type: 'reattach_started' }
  | { type: 'state_changed'; status: RunStatus }
  | { type: 'metrics_received'; snapshot: RunMetricsSnapshot }
  | { type: 'log_received'; lines: RunLogLine[] }
  | { type: 'run_done'; status: RunStatus; summary: RunSummary | null; error: string | null }
  | { type: 'connection_error'; quiet: boolean }
  | { type: 'stop_requested' };

function loadRunReducer(state: LoadRunState, action: LoadRunAction): LoadRunState {
  switch (action.type) {
    case 'run_started':
      return {
        ...state,
        snapshots: [],
        logs: [],
        summary: null,
        runError: null,
        runStatus: 'running',
        isStopping: false,
        isRunning: true,
      };
    case 'run_start_failed':
      return { ...state, isRunning: false, isStopping: false, runStatus: 'errored', runError: action.error };
    case 'flush_failed':
      return { ...state, runStatus: 'errored', runError: action.error };
    case 'reattach_started':
      return { ...state, isRunning: true };
    case 'state_changed':
      return {
        ...state,
        runStatus: action.status,
        isRunning: action.status === 'running',
        isStopping: action.status === 'running' ? state.isStopping : false,
      };
    case 'metrics_received': {
      const trimmed =
        state.snapshots.length >= MAX_LIVE_POINTS
          ? state.snapshots.slice(state.snapshots.length - MAX_LIVE_POINTS + 1)
          : state.snapshots;
      return { ...state, snapshots: [...trimmed, action.snapshot] };
    }
    case 'log_received': {
      const merged = [...state.logs, ...action.lines];
      return { ...state, logs: merged.length > MAX_LIVE_LOGS ? merged.slice(merged.length - MAX_LIVE_LOGS) : merged };
    }
    case 'run_done':
      return {
        ...state,
        isRunning: false,
        isStopping: false,
        runStatus: action.status,
        summary: action.summary,
        runError: action.status === 'errored' ? (action.error ?? 'Load run failed.') : null,
      };
    case 'connection_error':
      return action.quiet
        ? { ...state, isRunning: false, isStopping: false, snapshots: [], logs: [], runStatus: null }
        : { ...state, isRunning: false, isStopping: false, runError: 'Lost connection to the studio server.' };
    case 'stop_requested':
      return { ...state, isStopping: true };
    default:
      return state;
  }
}

interface YAMLLoadRunSessionProps {
  tree: YAMLNode | null;
  yamlCode: string;
  // Flushes any pending debounced tree→code serialization and returns the
  // freshest YAML, so a run never POSTs stale YAML.
  flushPendingEdits?: () => string;
  documentReady: boolean;
  validationErrors: string[];
}

export function YAMLLoadRunSession({
  tree,
  yamlCode,
  flushPendingEdits,
  documentReady,
  validationErrors,
}: YAMLLoadRunSessionProps) {
  const [runState, dispatch] = useReducer(loadRunReducer, initialLoadRunState);
  const { snapshots, isRunning, isStopping, runError, runStatus, summary, logs } = runState;

  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const startTokenRef = useRef(0);
  const activeRunIdRef = useRef<string | null>(null);
  const stopRequestedRef = useRef(false);
  const storedRunRef = useRef<StoredRun | null | undefined>(undefined);
  if (storedRunRef.current === undefined) {
    storedRunRef.current = runStore.read();
  }

  const loadNodes = useMemo(() => collectLoadNodes(tree), [tree]);
  const runRequestTargets = useMemo(() => collectDebugEventTargets(tree), [tree]);
  const plannedLoadNode = loadNodes[0] ?? null;
  const iterationBudgetCapsDuration = useMemo(() => {
    if (!plannedLoadNode) return false;
    const duration = parseTimeToSeconds(String(plannedLoadNode.data?.duration ?? '').trim());
    return duration > 0 && hasIterationBudgetController(tree);
  }, [tree, plannedLoadNode]);
  const hasValidationErrors = validationErrors.length > 0;
  const latest = snapshots[snapshots.length - 1] ?? null;
  const liveSummary = useMemo(() => buildLiveRunSummary(latest, runRequestTargets), [latest, runRequestTargets]);
  // After `done` we keep the final summary's cumulative totals but override its
  // per-request rows with the last live snapshot's. The backend's final summary
  // records resolved literal URLs that carry no step_path/chain identity, so it
  // can't be correlated back to YAML template steps; the live snapshot can. Rows
  // therefore come from the last mapped snapshot, which — being cumulative up to
  // `done` — matches the totals in practice, at the cost of not being the literal
  // `done.summary` request list.
  const visibleSummary = useMemo(() => {
    if (!summary) return liveSummary;
    if (!liveSummary?.requests.length) return summary;
    return { ...summary, requests: liveSummary.requests };
  }, [liveSummary, summary]);
  const hasRunActivity = snapshots.length > 0 || logs.length > 0 || summary != null;

  // Wires a run's SSE stream into the dashboard. Shared by a fresh Run and by
  // re-attaching to a stored run after a reload. `quiet` suppresses the error
  // banner for auto re-attach: a stored run that no longer exists (server
  // restarted) should clear silently rather than alarm the user.
  const subscribe = useCallback((runId: string, quiet: boolean) => {
    stopStreamRef.current?.();
    activeRunIdRef.current = runId;
    stopStreamRef.current = streamLoadRun(runId, {
      onState: state => {
        dispatch({ type: 'state_changed', status: state.status });
      },
      onMetrics: snapshot => {
        dispatch({ type: 'metrics_received', snapshot });
      },
      onLog: lines => {
        dispatch({ type: 'log_received', lines });
      },
      onDone: done => {
        dispatch({ type: 'run_done', status: done.status, summary: done.summary, error: done.error });
      },
      onConnectionError: () => {
        if (quiet) {
          runStore.clear();
          storedRunRef.current = null;
          activeRunIdRef.current = null;
        }
        dispatch({ type: 'connection_error', quiet });
      },
    });
  }, []);

  useEffect(() => () => stopStreamRef.current?.(), []);

  // Auto-scroll the log panel to the newest line as logs stream in.
  useEffect(() => {
    const element = logScrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logs]);

  // Re-attach to a run started before a reload — but only once the editor has
  // settled the document, and only if the document still matches. A load run
  // belongs to a document, so a mismatched/empty document drops the stored id.
  const reattachedRef = useRef(false);
  const reattachStoredRun = useCallback(
    (element: HTMLSpanElement | null) => {
      if (!element || !documentReady || reattachedRef.current) return;
      const storedRun = storedRunRef.current;
      if (!storedRun) return;
      if (!yamlCode.trim() || storedRun.fp !== fingerprint(yamlCode)) {
        runStore.clear();
        storedRunRef.current = null;
        return;
      }
      reattachedRef.current = true;
      dispatch({ type: 'reattach_started' });
      subscribe(storedRun.id, true);
    },
    [documentReady, subscribe, yamlCode],
  );

  const startRun = async () => {
    if (hasValidationErrors || isRunning) return;
    let scriptAtStart: string;
    try {
      scriptAtStart = flushPendingEdits ? flushPendingEdits() : yamlCode;
    } catch (error) {
      dispatch({ type: 'flush_failed', error: error instanceof Error ? error.message : String(error) });
      return;
    }
    if (!scriptAtStart.trim()) return;
    const token = (startTokenRef.current += 1);
    stopStreamRef.current?.();
    activeRunIdRef.current = null;
    stopRequestedRef.current = false;
    dispatch({ type: 'run_started' });
    try {
      const runId = await startLoadRun(scriptAtStart);
      if (token !== startTokenRef.current) return;
      runStore.store({ id: runId, fp: fingerprint(scriptAtStart) });
      subscribe(runId, false);
      // The user hit Stop while the start request was in flight: the run now
      // exists on the server, so cancel it (the SSE delivers the stopped summary).
      if (stopRequestedRef.current) {
        dispatch({ type: 'stop_requested' });
        void stopLoadRun(runId);
      }
    } catch (error) {
      if (token !== startTokenRef.current) return;
      dispatch({ type: 'run_start_failed', error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Stop asks the server to cancel the run, then keeps the stream open so the
  // terminal `done` (status "stopped") delivers the partial summary. The
  // unmount cleanup never stops a run — Stop is a deliberate user action.
  const stopRun = async () => {
    if (!isRunning || isStopping) return;
    dispatch({ type: 'stop_requested' });
    const runId = activeRunIdRef.current;
    if (!runId) {
      // The start request is still in flight; cancel as soon as we get the id.
      stopRequestedRef.current = true;
      return;
    }
    try {
      await stopLoadRun(runId);
    } catch {
      // The run may already be finishing; the done event still settles the UI.
    }
  };

  const errorRate = latest ? formatErrorRate(latest.total_requests, latest.total_failures) : '0%';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0d0d]">
      {storedRunRef.current && <span ref={reattachStoredRun} hidden aria-hidden="true" />}
      <RunToolbar
        runStatus={runStatus}
        isStopping={isStopping}
        isRunning={isRunning}
        hasValidationErrors={hasValidationErrors}
        yamlCode={yamlCode}
        onStartRun={startRun}
        onStopRun={stopRun}
      />

      {hasValidationErrors && <ValidationErrorBanner errors={validationErrors} />}

      {runError && <RunErrorBanner message={runError} />}

      <StatsRow latest={latest} errorRate={errorRate} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!hasRunActivity ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
            {isRunning
              ? 'Running… waiting for the first engine events.'
              : "Press Run load test to execute the scenario's full load profile."}
          </div>
        ) : (
          <div className="space-y-4">
            <MetricsCharts snapshots={snapshots} />

            {plannedLoadNode && (
              <PlannedLoadProfilePanel
                plannedLoadNode={plannedLoadNode}
                scenarioCount={loadNodes.length}
                iterationBudgetCapsDuration={iterationBudgetCapsDuration}
                isRunning={isRunning}
                elapsedMs={latest?.elapsed_ms ?? 0}
              />
            )}

            {visibleSummary && (
              <RunSummaryPanel
                summary={visibleSummary}
                status={runStatus}
                reportUrl={summary && activeRunIdRef.current ? loadRunReportUrl(activeRunIdRef.current) : undefined}
              />
            )}

            <LiveLogPanel logs={logs} scrollRef={logScrollRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// Header/toolbar: title plus the status badge and Run/Stop controls.
function RunToolbar({
  runStatus,
  isStopping,
  isRunning,
  hasValidationErrors,
  yamlCode,
  onStartRun,
  onStopRun,
}: {
  runStatus: RunStatus | null;
  isStopping: boolean;
  isRunning: boolean;
  hasValidationErrors: boolean;
  yamlCode: string;
  onStartRun: () => void;
  onStopRun: () => void;
}) {
  return (
    <div className="border-b border-white/5 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Load test session</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">Run the scenario's full load profile</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {runStatus && (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(runStatus)}`}>
              {isStopping ? 'Stopping…' : STATUS_LABELS[runStatus]}
            </span>
          )}
          <button
            type="button"
            onClick={onStartRun}
            disabled={isRunning || hasValidationErrors || !yamlCode.trim()}
            className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run load test
          </button>
          <button
            type="button"
            onClick={onStopRun}
            disabled={!isRunning || isStopping}
            className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/3 px-3 text-sm text-zinc-300 transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationErrorBanner({ errors }: { errors: string[] }) {
  return (
    <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-200">YAML semantic validation failed before the load run</p>
          <p className="mt-1 text-xs text-red-200/80">Fix these issues in the tree or code before running the load test.</p>
          <div className="mt-2 space-y-1">
            {errors.slice(0, 4).map((error, index) => (
              <p key={`${error}-${index}`} className="wrap-break-word font-mono text-xs text-red-100/90">
                {error}
              </p>
            ))}
            {errors.length > 4 && <p className="text-xs text-red-200/70">+{errors.length - 4} more validation issues</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function RunErrorBanner({ message }: { message: string }) {
  return (
    <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-200">Load run error</p>
          <p className="mt-1 wrap-break-word font-mono text-xs text-red-100/90">{message}</p>
        </div>
      </div>
    </div>
  );
}

// The six live stat cards (req/s, p95, avg, error rate, VUs, requests).
function StatsRow({ latest, errorRate }: { latest: RunMetricsSnapshot | null; errorRate: string }) {
  return (
    <div className="grid grid-cols-2 border-b border-white/5 bg-[#0a0a0a] sm:grid-cols-3 lg:grid-cols-6">
      <StatCell icon={<Zap className="h-4 w-4 text-yellow-300" />} label="Req/s" value={latest ? formatRps(latest.rps) : '—'} />
      <StatCell icon={<Gauge className="h-4 w-4 text-blue-300" />} label="p95" value={latest ? formatMs(latest.p95_latency) : '—'} />
      <StatCell icon={<Activity className="h-4 w-4 text-emerald-300" />} label="Avg" value={latest ? formatMs(latest.avg_latency) : '—'} />
      <StatCell
        icon={<OctagonX className="h-4 w-4 text-red-300" />}
        label="Error rate"
        value={errorRate}
        tone={latest && latest.total_failures > 0 ? 'text-red-300' : 'text-zinc-100'}
      />
      <StatCell icon={<Users className="h-4 w-4 text-zinc-300" />} label="VUs" value={latest ? String(latest.active_users) : '—'} />
      <StatCell
        icon={<CheckCircle2 className="h-4 w-4 text-zinc-300" />}
        label="Requests"
        value={latest ? latest.total_requests.toLocaleString() : '—'}
      />
    </div>
  );
}

// Throughput / p95 latency / active VUs sparkline row.
function MetricsCharts({ snapshots }: { snapshots: RunMetricsSnapshot[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Sparkline title="Throughput" unit="req/s" color="#fde047" values={snapshots.map(s => s.rps)} format={formatRps} />
      <Sparkline
        title="Latency p95"
        unit="ms"
        color="#60a5fa"
        values={snapshots.map(s => s.p95_latency)}
        format={v => (v < 10 ? v.toFixed(1) : String(Math.round(v)))}
      />
      <Sparkline
        title="Active VUs"
        unit="VUs"
        color="#a3a3a3"
        values={snapshots.map(s => s.active_users)}
        format={v => String(Math.round(v))}
      />
    </div>
  );
}

function PlannedLoadProfilePanel({
  plannedLoadNode,
  scenarioCount,
  iterationBudgetCapsDuration,
  isRunning,
  elapsedMs,
}: {
  plannedLoadNode: YAMLNode;
  scenarioCount: number;
  iterationBudgetCapsDuration: boolean;
  isRunning: boolean;
  elapsedMs: number;
}) {
  return (
    <div className="border border-white/10 bg-[#111111] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Planned load profile</p>
        {scenarioCount > 1 && (
          <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            {scenarioCount} scenarios — showing the first
          </span>
        )}
      </div>
      {iterationBudgetCapsDuration && (
        <div className="mb-3 flex items-start gap-2 rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This scenario uses a Balanced Controller in Iterations mode. The run stops when the first
            configured limit — Duration or Iterations — is reached, so the run and its live metrics
            may stop before the duration shown below elapses.
          </span>
        </div>
      )}
      <LoadVisualization
        data={plannedLoadNode.data ?? {}}
        loadType={normalizeLoadType(plannedLoadNode.data?.type)}
        progressSeconds={isRunning ? elapsedMs / 1000 : undefined}
      />
    </div>
  );
}

function StatCell({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="border-r border-white/5 px-4 py-3 last:border-r-0">
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-lg font-semibold ${tone ?? 'text-zinc-100'}`}>{value}</p>
      </div>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    </div>
  );
}

// A minimal inline-SVG sparkline. No charting dependency — the same hand-rolled
// approach the load profile visualization uses.
function Sparkline({
  title,
  unit,
  color,
  values,
  format,
}: {
  title: string;
  unit: string;
  color: string;
  values: number[];
  format: (value: number) => string;
}) {
  const width = 280;
  const height = 72;
  const max = Math.max(1, ...values);
  const last = values.length ? values[values.length - 1] : 0;
  const points = values.length
    ? values
        .map((value, index) => {
          const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
          const y = height - (value / max) * (height - 6) - 3;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : '';
  const gradientId = `spark-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border border-white/10 bg-[#111111] p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
        <p className="font-mono text-sm text-zinc-200">
          {format(last)} <span className="text-[10px] text-zinc-500">{unit}</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-2 h-16 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {points && (
          <>
            <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientId})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}

function formatLogTime(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

const LOG_LEVEL_TONE: Record<RunLogLine['level'], string> = {
  request: 'text-zinc-300',
  info: 'text-blue-300',
  error: 'text-red-300',
  system: 'text-amber-300',
};

function logLineText(line: RunLogLine): string {
  if (line.method) {
    const vu = line.vu ? `VU${line.vu} ` : '';
    const status = line.status ? ` → ${line.status}` : '';
    const latency = line.latency_ms != null ? ` (${formatMs(line.latency_ms)})` : '';
    const error = line.message ? `  ${line.message}` : '';
    return `${vu}${line.method} ${line.path || ''}${status}${latency}${error}`;
  }
  return line.message || '';
}

// A live-tailing log feed of engine events (one panel, capped client-side and
// server-side). Auto-scrolls to the newest line via the parent's scroll ref.
function LiveLogPanel({ logs, scrollRef }: { logs: RunLogLine[]; scrollRef: RefObject<HTMLDivElement | null> }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="border border-white/10 bg-[#050505]">
      <button
        type="button"
        onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3 ${
          collapsed ? '' : 'border-b border-white/5'
        }`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
        <Terminal className="h-4 w-4 text-emerald-300" />
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Live logs</p>
        <span className="ml-auto font-mono text-[10px] text-zinc-600">{logs.length} lines</span>
      </button>
      {!collapsed && (
        <div ref={scrollRef} className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-5">
          {logs.length === 0 ? (
            <p className="text-zinc-600">Waiting for engine events…</p>
          ) : (
            logs.map(line => (
              <div key={line.seq} className="flex gap-2 break-all whitespace-pre-wrap">
                <span className="shrink-0 text-zinc-600">{formatLogTime(line.ts)}</span>
                <span className={LOG_LEVEL_TONE[line.level]}>{logLineText(line)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RunSummaryPanel({
  summary,
  status,
  reportUrl,
}: {
  summary: RunSummary;
  status: RunStatus | null;
  reportUrl?: string;
}) {
  const requests = summary.requests ?? [];
  return (
    <div className="border border-white/10 bg-[#111111]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        {status === 'running' ? (
          <Activity className="h-4 w-4 text-blue-300" />
        ) : status === 'stopped' ? (
          <TimerReset className="h-4 w-4 text-amber-300" />
        ) : status === 'errored' ? (
          <XCircle className="h-4 w-4 text-red-300" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        )}
        <p className="text-sm font-semibold text-zinc-100">
          {status === 'stopped' ? 'Run stopped — partial summary' : 'Run summary'}
        </p>
        {reportUrl && (
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-xs font-semibold text-yellow-300 transition-colors hover:bg-yellow-400/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open full report
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4">
        <SummaryStat label="Duration" value={formatDurationNs(summary.duration)} />
        <SummaryStat label="Total requests" value={summary.total_requests.toLocaleString()} />
        <SummaryStat label="Failures" value={summary.total_failures.toLocaleString()} tone={summary.total_failures > 0 ? 'text-red-300' : undefined} />
        <SummaryStat label="Executed VUs" value={summary.executed_vus != null ? String(summary.executed_vus) : '—'} />
      </div>

      {requests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                <th className="px-4 py-2">Request</th>
                <th className="px-3 py-2 text-right">Count</th>
                <th className="px-3 py-2 text-right">Fail</th>
                <th className="px-3 py-2 text-right">Avg</th>
                <th className="px-3 py-2 text-right">p90</th>
                <th className="px-3 py-2 text-right">p95</th>
                <th className="px-3 py-2 text-right">p99</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr
                  key={`${request.method}-${request.name}-${request.path ?? ''}-${request.step_path ?? ''}`}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td className="max-w-72 truncate px-4 py-2 text-zinc-200" title={request.name}>
                    <span className="mr-2 rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      {request.method}
                    </span>
                    {request.path || request.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{request.count.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-mono ${request.failures > 0 ? 'text-red-300' : 'text-zinc-500'}`}>
                    {request.failures.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.avg_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.p90_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.p95_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{request.p99_ms != null ? formatMs(request.p99_ms) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildLiveRunSummary(
  latest: RunMetricsSnapshot | null,
  requestTargets: YAMLNode[],
): RunSummary | null {
  if (!latest) return null;
  const requests = new Map<string, RunRequestStat>();
  (latest.requests ?? []).forEach(request => {
    const target = matchDebugEventTarget(request, requestTargets);
    if (target) {
      addLiveRunSummaryRequest(requests, `target:${target.id}`, {
        ...request,
        name: target.name,
        method: String(target.data?.method ?? target.type ?? request.method).toUpperCase(),
        path: String(target.data?.url ?? target.data?.path ?? request.path),
      });
      return;
    }
    const redirectStep = request.step_path?.match(/^(.*)\.redirects\[(\d+)\]$/);
    if (!redirectStep) {
      addLiveRunSummaryRequest(requests, liveRunSummaryFallbackKey(request), request);
      return;
    }
    // An unexpected redirect has no recorded chain child to map onto, so it
    // stays unmatched above. Re-run the matcher against the redirect's *parent*
    // step (step_path takes priority inside matchDebugEventTarget) to recover
    // the stable YAML request that spawned it, then label the row by its
    // position rather than the volatile resolved landing URL.
    const parent = matchDebugEventTarget(
      { ...request, step_path: redirectStep[1], chain_role: 'parent', redirect_index: 0 },
      requestTargets,
    );
    if (!parent) {
      addLiveRunSummaryRequest(requests, liveRunSummaryFallbackKey(request), request);
      return;
    }
    const label = `Redirect ${redirectStep[2]} from ${parent.name}`;
    addLiveRunSummaryRequest(requests, `redirect:${request.step_path}`, { ...request, name: label, path: label });
  });
  return {
    test_name: 'Live run',
    start_time: '',
    end_time: '',
    duration: latest.elapsed_ms * 1e6,
    total_requests: latest.total_requests,
    total_failures: latest.total_failures,
    executed_vus: latest.executed_vus,
    requests: [...requests.values()],
  };
}

function liveRunSummaryFallbackKey(request: RunRequestStat): string {
  if (request.step_path) return `step:${request.step_path}`;
  return [
    'request',
    request.request_id ?? '',
    request.chain_id ?? '',
    request.chain_role ?? '',
    request.redirect_index ?? '',
    request.method,
    request.path,
  ].join('\u0000');
}

function addLiveRunSummaryRequest(
  requests: Map<string, RunRequestStat>,
  key: string,
  request: RunRequestStat,
): void {
  const previous = requests.get(key);
  if (!previous) {
    requests.set(key, request);
    return;
  }
  const totalCount = previous.count + request.count;
  const weighted = (field: keyof RunRequestStat): number | undefined => {
    const previousValue = previous[field];
    const requestValue = request[field];
    if (typeof previousValue !== 'number') return typeof requestValue === 'number' ? requestValue : undefined;
    if (typeof requestValue !== 'number') return previousValue;
    return (previousValue * previous.count + requestValue * request.count) / totalCount;
  };
  requests.set(key, {
    ...previous,
    count: totalCount,
    failures: previous.failures + request.failures,
    avg_ms: weighted('avg_ms') ?? 0,
    min_ms: Math.min(previous.min_ms, request.min_ms),
    max_ms: Math.max(previous.max_ms, request.max_ms),
    p50_ms: weighted('p50_ms'),
    p90_ms: weighted('p90_ms') ?? 0,
    p95_ms: weighted('p95_ms') ?? 0,
    p99_ms: weighted('p99_ms'),
  });
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#111111] px-4 py-3">
      <p className={`text-base font-semibold ${tone ?? 'text-zinc-100'}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
    </div>
  );
}
