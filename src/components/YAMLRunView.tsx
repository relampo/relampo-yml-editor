import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Gauge,
  OctagonX,
  Play,
  Square,
  Terminal,
  TimerReset,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';
import {
  loadRunReportUrl,
  startLoadRun,
  stopLoadRun,
  streamLoadRun,
  type RunIntentResult,
  type RunIntentTick,
  type RunLogLine,
  type RunMetricsSnapshot,
  type RunRequestStat,
  type RunStatus,
  type RunSummary,
} from '../utils/runApi';
import { LoadVisualization } from './yaml-node-details/LoadVisualization';
import { normalizeLoadType, parseTimeToSeconds, toLoadData, type LoadType } from './yaml-node-details/loadUtils';
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

function formatSummaryRate(value: number): string {
  return formatRps(Number.isFinite(value) && value > 0 ? value : 0);
}

function summaryConfiguredVUs(summary: RunSummary): number {
  const configured = Number(summary.metadata?.configured_vus ?? summary.metadata?.requested_vus);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return summary.executed_vus ?? 0;
}

function maxNodeResource(summary: RunSummary, field: 'mem_peak_mb' | 'cpu_peak' | 'go_peak'): number | null {
  const resources = summary.node_resources ?? [];
  if (resources.length === 0) return null;
  return Math.max(...resources.map(resource => resource[field]));
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
      const knownSequences = new Set(state.logs.map(line => line.seq));
      // Growing the set while filtering also collapses repeats *within* a
      // batch, so `seq` stays unique — it is the list's React key.
      const newLines = action.lines.filter(line => {
        if (knownSequences.has(line.seq)) return false;
        knownSequences.add(line.seq);
        return true;
      });
      if (newLines.length === 0) return state;
      const merged = [...state.logs, ...newLines].sort((left, right) => left.seq - right.seq);
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
  const plannedLoadType = plannedLoadNode ? normalizeLoadType(plannedLoadNode.data?.type) : null;
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
  const intentTicks = useMemo(() => collectIntentTicks(snapshots, summary), [snapshots, summary]);
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
    if (!documentReady || hasValidationErrors || isRunning) return;
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
      {storedRunRef.current && (
        <span
          ref={reattachStoredRun}
          hidden
          aria-hidden="true"
        />
      )}
      <RunToolbar
        runStatus={runStatus}
        isStopping={isStopping}
        isRunning={isRunning}
        documentReady={documentReady}
        hasValidationErrors={hasValidationErrors}
        yamlCode={yamlCode}
        onStartRun={startRun}
        onStopRun={stopRun}
      />

      {hasValidationErrors && <ValidationErrorBanner errors={validationErrors} />}

      {runError && <RunErrorBanner message={runError} />}

      <StatsRow
        latest={latest}
        errorRate={errorRate}
      />

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

            {plannedLoadNode && plannedLoadType !== 'intent' && plannedLoadType !== 'segments' && (
              <PlannedLoadProfilePanel
                plannedLoadNode={plannedLoadNode}
                plannedLoadType={plannedLoadType}
                scenarioCount={loadNodes.length}
                iterationBudgetCapsDuration={iterationBudgetCapsDuration}
                isRunning={isRunning}
                elapsedMs={latest?.elapsed_ms ?? 0}
              />
            )}

            {intentTicks.length > 0 && (
              <IntentRuntimeTimeline
                ticks={intentTicks}
                summary={visibleSummary}
              />
            )}

            {visibleSummary?.intent_result && <IntentResultPanel result={visibleSummary.intent_result} />}

            {visibleSummary && (
              <RunSummaryPanel
                summary={visibleSummary}
                status={runStatus}
                reportUrl={summary && activeRunIdRef.current ? loadRunReportUrl(activeRunIdRef.current) : undefined}
              />
            )}

            <LiveLogPanel
              logs={logs}
              scrollRef={logScrollRef}
            />
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
  documentReady,
  hasValidationErrors,
  yamlCode,
  onStartRun,
  onStopRun,
}: {
  runStatus: RunStatus | null;
  isStopping: boolean;
  isRunning: boolean;
  documentReady: boolean;
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
            disabled={!documentReady || isRunning || hasValidationErrors || !yamlCode.trim()}
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
          <p className="mt-1 text-xs text-red-200/80">
            Fix these issues in the tree or code before running the load test.
          </p>
          <div className="mt-2 space-y-1">
            {errors.slice(0, 4).map((error, index) => (
              <p
                key={`${error}-${index}`}
                className="wrap-break-word font-mono text-xs text-red-100/90"
              >
                {error}
              </p>
            ))}
            {errors.length > 4 && (
              <p className="text-xs text-red-200/70">+{errors.length - 4} more validation issues</p>
            )}
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
      <StatCell
        icon={<Zap className="h-4 w-4 text-yellow-300" />}
        label="Req/s"
        value={latest ? formatRps(latest.rps) : '—'}
      />
      <StatCell
        icon={<Gauge className="h-4 w-4 text-blue-300" />}
        label="p95"
        value={latest ? formatMs(latest.p95_latency) : '—'}
      />
      <StatCell
        icon={<Activity className="h-4 w-4 text-emerald-300" />}
        label="Avg"
        value={latest ? formatMs(latest.avg_latency) : '—'}
      />
      <StatCell
        icon={<OctagonX className="h-4 w-4 text-red-300" />}
        label="Error rate"
        value={errorRate}
        tone={latest && latest.total_failures > 0 ? 'text-red-300' : 'text-zinc-100'}
      />
      <StatCell
        icon={<Users className="h-4 w-4 text-zinc-300" />}
        label="VUs"
        value={latest ? String(latest.active_users) : '—'}
      />
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
      <Sparkline
        title="Throughput"
        unit="req/s"
        color="#fde047"
        values={snapshots.map(s => s.rps)}
        format={formatRps}
      />
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
  plannedLoadType,
  scenarioCount,
  iterationBudgetCapsDuration,
  isRunning,
  elapsedMs,
}: {
  plannedLoadNode: YAMLNode;
  plannedLoadType: LoadType | null;
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
            This scenario uses a Balanced Controller in Iterations mode. The run stops when the first configured limit —
            Duration or Iterations — is reached, so the run and its live metrics may stop before the duration shown
            below elapses.
          </span>
        </div>
      )}
      <LoadVisualization
        data={toLoadData(plannedLoadNode.data as Record<string, unknown> | undefined)}
        loadType={plannedLoadType ?? normalizeLoadType(plannedLoadNode.data?.type)}
        progressSeconds={isRunning ? elapsedMs / 1000 : undefined}
      />
    </div>
  );
}

function collectIntentTicks(snapshots: RunMetricsSnapshot[], summary: RunSummary | null): RunIntentTick[] {
  const seen = new Set<string>();
  const merged: RunIntentTick[] = [];
  const add = (tick: RunIntentTick) => {
    const key = `${tick.tick}:${tick.elapsed_ms ?? ''}:${tick.state}:${tick.next_vus}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(tick);
  };
  snapshots.forEach(snapshot => snapshot.intent_ticks?.forEach(add));
  summary?.intent_ticks?.forEach(add);
  return merged.sort((left, right) => {
    const leftElapsed = left.elapsed_ms ?? left.tick;
    const rightElapsed = right.elapsed_ms ?? right.tick;
    return leftElapsed - rightElapsed || left.tick - right.tick;
  });
}

const INTENT_STATE_STYLE: Record<string, { stroke: string; text: string }> = {
  warmup: { stroke: '#22d3ee', text: 'text-cyan-200' },
  rampup: { stroke: '#38bdf8', text: 'text-sky-200' },
  probing: { stroke: '#fde047', text: 'text-yellow-200' },
  sustain: { stroke: '#a78bfa', text: 'text-violet-200' },
  stable: { stroke: '#34d399', text: 'text-emerald-200' },
  violation: { stroke: '#fb7185', text: 'text-rose-200' },
  recovery: { stroke: '#f59e0b', text: 'text-amber-200' },
};

function intentStateStyle(state: string) {
  return INTENT_STATE_STYLE[state.toLowerCase()] ?? { stroke: '#a1a1aa', text: 'text-zinc-300' };
}

function intentStateLabel(state: string, t: (key: string) => string): string {
  const normalized = state.toLowerCase();
  return t(
    `yamlEditor.intent.runtime.states.${Object.hasOwn(INTENT_STATE_STYLE, normalized) ? normalized : 'unknown'}`,
  );
}

function firstPositiveFiniteNumber(values: Array<number | string | undefined>, fallback = 0): number {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return fallback;
}

function intentRuntimeTarget(summary: RunSummary | null, ticks: RunIntentTick[]) {
  const metadata = summary?.metadata ?? {};
  const tickWithTarget = ticks.find(tick => tick.target_unit || tick.target_value);
  const unit = String(
    tickWithTarget?.target_unit ?? metadata.intent_target_unit ?? metadata.target_unit ?? 'vus',
  ).toLowerCase();
  const value = firstPositiveFiniteNumber(
    [
      tickWithTarget?.target_value,
      metadata.intent_target_value,
      metadata.target_value,
      unit === 'rps' ? metadata.target_rps : metadata.target_vus,
    ],
    0,
  );
  return {
    unit: unit === 'rps' ? 'rps' : 'vus',
    value,
  };
}

function intentRuntimeThresholds(summary: RunSummary | null, t: (key: string) => string) {
  const metadata = summary?.metadata ?? {};
  const p95Max = firstPositiveFiniteNumber(
    [metadata.intent_p95_max_ms, metadata.latency_max_ms, metadata.p95_max_ms],
    0,
  );
  const errorMax = firstPositiveFiniteNumber([metadata.intent_error_rate_max_pct, metadata.error_rate_max_pct], 0);
  const parts: string[] = [];
  if (p95Max > 0)
    parts.push(formatRuntimeText(t, 'yamlEditor.intent.runtime.thresholdP95', { value: formatMs(p95Max) }));
  if (errorMax > 0) parts.push(formatRuntimeText(t, 'yamlEditor.intent.runtime.thresholdErrors', { value: errorMax }));
  return parts.join(' · ');
}

function formatRuntimeText(t: (key: string) => string, key: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [token, value]) => text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(value)),
    t(key),
  );
}

function IntentRuntimeTimeline({ ticks, summary }: { ticks: RunIntentTick[]; summary: RunSummary | null }) {
  const { t } = useLanguage();
  const width = 400;
  const height = 200;
  const left = 42;
  const right = 382;
  const top = 14;
  const bottom = 172;
  const durationMs = Math.max(summary ? summary.duration / 1e6 : 0, ...ticks.map(tick => tick.elapsed_ms ?? 0), 1000);
  const target = intentRuntimeTarget(summary, ticks);
  const isRpsTarget = target.unit === 'rps';
  const metricLabel = isRpsTarget ? t('yamlEditor.intent.runtime.rps') : t('yamlEditor.intent.runtime.vus');
  const subtitle = isRpsTarget
    ? t('yamlEditor.intent.runtime.subtitleRps')
    : t('yamlEditor.intent.runtime.subtitleVus');
  const thresholdSummary = intentRuntimeThresholds(summary, t);
  const metricValue = (tick: RunIntentTick) =>
    isRpsTarget ? Math.max(0, tick.rps ?? 0) : Math.max(0, tick.next_vus || tick.current_vus);
  const violationValue = (tick: RunIntentTick) =>
    isRpsTarget ? Math.max(0, tick.rps ?? 0) : Math.max(0, tick.current_vus);
  const maxMetric = Math.max(1, target.value * 1.2, ...ticks.map(metricValue), ...ticks.map(violationValue));
  const valueToY = (value: number) => bottom - (Math.max(0, value) / maxMetric) * (bottom - top);
  const targetY = target.value > 0 ? valueToY(target.value) : null;
  const points = ticks.map(tick => {
    const elapsed = Math.max(0, tick.elapsed_ms ?? tick.tick * 1000);
    const x = left + (Math.min(elapsed, durationMs) / durationMs) * (right - left);
    return { tick, x, y: valueToY(metricValue(tick)), violationY: valueToY(violationValue(tick)) };
  });
  const violations = points.filter(point => !point.tick.slo_ok);
  const recentTicks = ticks.slice().reverse();

  return (
    <div className="border border-white/10 bg-[#111111] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            {t('yamlEditor.intent.runtime.title')}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {t('yamlEditor.intent.runtime.target')}{' '}
            {target.value > 0 ? `${formatRps(target.value)} ${metricLabel}` : metricLabel}
            {thresholdSummary ? ` · ${thresholdSummary}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {Object.entries(INTENT_STATE_STYLE).map(([state, style]) => (
            <span
              key={state}
              className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/3 px-2 py-0.5 ${style.text}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: style.stroke }}
              />
              {intentStateLabel(state, t)}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
      >
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={bottom}
          stroke="#3f3f46"
          strokeWidth="2"
        />
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke="#3f3f46"
          strokeWidth="2"
        />
        {[0, 1, 2, 3, 4].map(index => {
          const y = top + index * ((bottom - top) / 4);
          const value = maxMetric - (maxMetric / 4) * index;
          return (
            <g key={`intent-grid-${index}`}>
              <line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray={index === 4 ? '0' : '3 5'}
              />
              <text
                x={left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-500 text-[9px]"
              >
                {isRpsTarget ? formatRps(value) : Math.round(value)}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4].map(index => {
          const x = left + index * ((right - left) / 4);
          const seconds = Math.round((durationMs / 1000 / 4) * index);
          return (
            <g key={`intent-time-${index}`}>
              <line
                x1={x}
                y1={top}
                x2={x}
                y2={bottom}
                stroke="#27272a"
                strokeWidth="1"
              />
              <text
                x={x}
                y={bottom + 14}
                textAnchor="middle"
                className="fill-zinc-500 text-[9px]"
              >
                {formatDurationSeconds(seconds)}
              </text>
            </g>
          );
        })}

        {isRpsTarget && targetY !== null && (
          <g>
            <line
              x1={left}
              y1={targetY}
              x2={right}
              y2={targetY}
              stroke="#facc15"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={right - 4}
              y={targetY - 5}
              textAnchor="end"
              className="fill-yellow-200 text-[9px]"
            >
              {t('yamlEditor.intent.runtime.target').toLowerCase()} {formatRps(target.value)}
            </text>
          </g>
        )}
        {points.slice(1).map((point, index) => {
          const previous = points[index];
          const style = intentStateStyle(point.tick.state);
          return (
            <line
              key={`intent-line-${point.tick.tick}-${index}`}
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke={style.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {points.length === 1 && (
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r="3"
            fill={intentStateStyle(points[0].tick.state).stroke}
          />
        )}
        {points.map(point => (
          <circle
            key={`intent-dot-${point.tick.tick}-${point.x}`}
            cx={point.x}
            cy={point.y}
            r="2.2"
            fill={intentStateStyle(point.tick.state).stroke}
          >
            <title>{intentTickTitle(point.tick, t)}</title>
          </circle>
        ))}
        {violations.map(point => (
          <g
            key={`intent-violation-${point.tick.tick}`}
            transform={`translate(${point.x} ${point.violationY})`}
          >
            <line
              x1="-4"
              y1="-4"
              x2="4"
              y2="4"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="-4"
              x2="-4"
              y2="4"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <title>{intentTickTitle(point.tick, t)}</title>
          </g>
        ))}
        <text
          x="12"
          y="96"
          transform="rotate(-90 12 96)"
          textAnchor="middle"
          className="fill-zinc-500 text-[10px]"
        >
          {metricLabel}
        </text>
        <text
          x="212"
          y="196"
          textAnchor="middle"
          className="fill-zinc-500 text-[10px]"
        >
          {t('yamlEditor.intent.runtime.time')}
        </text>
      </svg>

      <div className="mt-3 max-h-[13.75rem] overflow-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#111111]">
            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.time')}</th>
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.state')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.vus')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.rps')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.p95')}</th>
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.action')}</th>
            </tr>
          </thead>
          <tbody>
            {recentTicks.map(tick => {
              const style = intentStateStyle(tick.state);
              return (
                <tr
                  key={`intent-row-${tick.tick}-${tick.elapsed_ms ?? ''}`}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td className="px-3 py-2 font-mono text-zinc-400">
                    {formatDurationSeconds(Math.round((tick.elapsed_ms ?? 0) / 1000))}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${style.text}`}>{intentStateLabel(tick.state, t)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">
                    {tick.current_vus} {'->'} {tick.next_vus}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatRps(tick.rps ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(tick.p95_ms ?? 0)}</td>
                  <td className="max-w-80 px-3 py-2 text-zinc-300">
                    <span className="font-mono text-zinc-100">
                      {tick.action || t('yamlEditor.intent.runtime.hold')}
                    </span>
                    {tick.reason ? <span className="ml-2 text-zinc-500">{tick.reason}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function intentTickTitle(tick: RunIntentTick, t: (key: string) => string): string {
  const elapsed = formatDurationSeconds(Math.round((tick.elapsed_ms ?? 0) / 1000));
  return [
    `${t('yamlEditor.intent.runtime.time')}: ${elapsed}`,
    `${t('yamlEditor.intent.runtime.state')}: ${tick.state}`,
    `${t('yamlEditor.intent.runtime.vus')}: ${tick.current_vus} -> ${tick.next_vus}`,
    `${t('yamlEditor.intent.runtime.rps')}: ${formatRps(tick.rps ?? 0)}`,
    `${t('yamlEditor.intent.runtime.p95')}: ${formatMs(tick.p95_ms ?? 0)}`,
    `${t('yamlEditor.intent.runtime.error')}: ${(tick.error_rate_pct ?? 0).toFixed(2)}%`,
    tick.reason ? `${t('yamlEditor.intent.runtime.reason')}: ${tick.reason}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function IntentResultPanel({ result }: { result: RunIntentResult }) {
  const { t } = useLanguage();
  const tone = intentResultTone(result.verdict, t);
  const target =
    result.target_value && result.target_unit
      ? `${formatRps(result.target_value)} ${result.target_unit.toUpperCase()}`
      : '-';
  const estimatedCapacity = result.estimated_capacity || '-';
  const responseMetric = result.response_time_metric || 'p95';
  const bestResponseTime = result.best_response_time_ms ?? result.best_p95_ms ?? 0;

  return (
    <div className={`border ${tone.border} bg-[#111111] p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 items-center justify-center border ${tone.border} ${tone.bg}`}>
            {tone.icon}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {t('yamlEditor.intent.runtime.resultTitle')}
            </p>
            <p className={`mt-1 text-lg font-semibold ${tone.text}`}>{tone.label}</p>
            <p className="mt-1 max-w-4xl text-sm text-zinc-200">{result.message}</p>
            {result.recommendation ? (
              <p className="mt-2 max-w-4xl text-sm text-zinc-400">{result.recommendation}</p>
            ) : null}
          </div>
        </div>
        <div className="grid min-w-80 grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.target')}
            value={target}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.reached')}
            value={result.target_reached ? t('yamlEditor.intent.runtime.yes') : t('yamlEditor.intent.runtime.no')}
            tone={result.target_reached ? 'text-emerald-300' : 'text-rose-300'}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.sustained')}
            value={result.sustained ? t('yamlEditor.intent.runtime.yes') : t('yamlEditor.intent.runtime.no')}
            tone={result.sustained ? 'text-emerald-300' : 'text-amber-300'}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.estimatedCapacity')}
            value={estimatedCapacity}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.bestRps')}
            value={formatRps(result.best_rps ?? 0)}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.bestVus')}
            value={String(result.best_vus ?? 0)}
          />
          <IntentResultStat
            label={formatRuntimeText(t, 'yamlEditor.intent.runtime.response', { metric: responseMetric })}
            value={formatMs(bestResponseTime)}
          />
          <IntentResultStat
            label={t('yamlEditor.intent.runtime.violations')}
            value={String(result.violation_count ?? 0)}
            tone={(result.violation_count ?? 0) > 0 ? 'text-rose-300' : 'text-zinc-200'}
          />
        </div>
      </div>
    </div>
  );
}

function IntentResultStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-white/10 bg-white/3 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-sm ${tone ?? 'text-zinc-200'}`}>{value}</p>
    </div>
  );
}

function intentResultTone(verdict: string, t: (key: string) => string) {
  switch (verdict.trim().toUpperCase()) {
    case 'COMPLETED':
      return {
        label: t('yamlEditor.intent.runtime.verdicts.completed'),
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
      };
    case 'SUSTAINED':
      return {
        label: t('yamlEditor.intent.runtime.verdicts.sustained'),
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
      };
    case 'BEST_FEASIBLE':
      return {
        label: t('yamlEditor.intent.runtime.verdicts.bestFeasible'),
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        icon: <AlertTriangle className="h-4 w-4 text-amber-300" />,
      };
    case 'NOT_SUSTAINED':
      return {
        label: t('yamlEditor.intent.runtime.verdicts.notSustained'),
        text: 'text-rose-300',
        border: 'border-rose-500/30',
        bg: 'bg-rose-500/10',
        icon: <XCircle className="h-4 w-4 text-rose-300" />,
      };
    case 'PARTIALLY_SUSTAINED':
      return {
        label: t('yamlEditor.intent.runtime.verdicts.partiallySustained'),
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        icon: <AlertTriangle className="h-4 w-4 text-amber-300" />,
      };
    default:
      return {
        label: t('yamlEditor.intent.runtime.verdicts.inconclusive'),
        text: 'text-sky-300',
        border: 'border-sky-500/30',
        bg: 'bg-sky-500/10',
        icon: <Gauge className="h-4 w-4 text-sky-300" />,
      };
  }
}

function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
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
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-2 h-16 w-full"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={color}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {points && (
          <>
            <polygon
              points={`0,${height} ${points} ${width},${height}`}
              fill={`url(#${gradientId})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
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
  const firstSequence = logs[0]?.seq;
  const lastSequence = logs[logs.length - 1]?.seq;
  const hasOmittedPrefix = firstSequence != null && firstSequence > 0;
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
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {logs.length.toLocaleString()} {hasOmittedPrefix ? 'latest ' : ''}
          {logs.length === 1 ? 'line' : 'lines'}
        </span>
      </button>
      {/* The notice sits outside the scrolling body: that body is auto-scrolled
          to its newest line, so a notice inside it would be ~1000 rows out of
          view exactly when there is something to say. */}
      {!collapsed && hasOmittedPrefix && lastSequence != null && (
        <p className="border-b border-amber-400/20 px-3 py-2 font-mono text-xs text-amber-200/80">
          Showing log lines {firstSequence + 1}–{lastSequence + 1}; earlier lines are not displayed.
        </p>
      )}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-5"
        >
          {logs.length === 0 ? (
            <p className="text-zinc-600">Waiting for engine events…</p>
          ) : (
            logs.map(line => (
              <div
                key={line.seq}
                className="flex gap-2 break-all whitespace-pre-wrap"
              >
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
  const durationSeconds = summary.duration / 1e9;
  const transactionCount = summary.transactions?.reduce((total, transaction) => total + transaction.count, 0);
  const executedVUs = summary.executed_vus ?? 0;
  const configuredVUs = Math.max(summaryConfiguredVUs(summary), executedVUs);
  const memPeakMB = maxNodeResource(summary, 'mem_peak_mb');
  const cpuPeak = maxNodeResource(summary, 'cpu_peak');
  const goPeak = maxNodeResource(summary, 'go_peak');
  const metrics = [
    { label: 'Duration', value: formatDurationNs(summary.duration) },
    { label: 'VUs (exec/conf)', value: `${executedVUs}/${configuredVUs}` },
    { label: 'Total Requests', value: summary.total_requests.toLocaleString() },
    {
      label: 'ERRs',
      value: summary.total_failures.toLocaleString(),
      tone: summary.total_failures > 0 ? 'text-red-300' : undefined,
    },
    { label: 'RPS', value: formatSummaryRate(durationSeconds > 0 ? summary.total_requests / durationSeconds : 0) },
    {
      label: 'TPS',
      value:
        transactionCount == null
          ? '—'
          : formatSummaryRate(durationSeconds > 0 ? transactionCount / durationSeconds : 0),
    },
    { label: 'MEM Peak', value: memPeakMB == null ? '—' : `${memPeakMB.toLocaleString()} MB` },
    { label: 'CPU Peak', value: cpuPeak == null ? '—' : `${cpuPeak.toFixed(1)}%` },
    { label: 'Go', value: goPeak == null ? '—' : goPeak.toLocaleString() },
  ];
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

      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map(metric => (
          <SummaryStat
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
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
              {/* The index is part of the key on purpose: this table is a static,
                  never-reordered snapshot, and the same request can legitimately
                  appear twice (reached through two scenarios), which would make a
                  purely field-derived key collide. */}
              {requests.map((request, index) => (
                <tr
                  key={`${request.method}-${request.name}-${request.path ?? ''}-${request.step_path ?? ''}-${index}`}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td
                    className="max-w-72 truncate px-4 py-2 text-zinc-200"
                    title={request.name}
                  >
                    <span className="mr-2 rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      {request.method}
                    </span>
                    {request.path || request.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{request.count.toLocaleString()}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${request.failures > 0 ? 'text-red-300' : 'text-zinc-500'}`}
                  >
                    {request.failures.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.avg_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.p90_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(request.p95_ms)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">
                    {request.p99_ms != null ? formatMs(request.p99_ms) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildLiveRunSummary(latest: RunMetricsSnapshot | null, requestTargets: YAMLNode[]): RunSummary | null {
  if (!latest) return null;
  const requests = new Map<string, RunRequestStat>();
  (latest.requests ?? []).forEach(request => {
    const target = matchDebugEventTarget(request, requestTargets);
    if (target) {
      addLiveRunSummaryRequest(requests, `target:${target.id}`, {
        ...request,
        name: target.name,
        method: String(target.data?.method ?? target.type ?? request.method).toUpperCase(),
        path: request.path || String(target.data?.path ?? target.data?.url ?? ''),
      });
      return;
    }
    // An unexpected redirect has no recorded chain child to map onto. Keep the
    // executed method and URL in the summary instead of replacing them with a
    // synthetic "Redirect N from ..." label: the method badge already conveys
    // the method, while the runtime path is the only reliable resolved URL. Its
    // `...redirects[N]` step_path still keys the row, so each hop stays a
    // distinct row that sorts directly under the step that spawned it, and two
    // iterations landing on different URLs still collapse into one row rather
    // than splitting on the volatile resolved path.
    addLiveRunSummaryRequest(requests, liveRunSummaryFallbackKey(request), request);
  });
  return {
    test_name: 'Live run',
    start_time: '',
    end_time: '',
    duration: latest.elapsed_ms * 1e6,
    total_requests: latest.total_requests,
    total_failures: latest.total_failures,
    executed_vus: latest.executed_vus,
    metadata: latest.configured_vus ? { configured_vus: String(latest.configured_vus) } : undefined,
    requests: sortRunSummaryRequests([...requests.values()]),
  };
}

function sortRunSummaryRequests(requests: RunRequestStat[]): RunRequestStat[] {
  return requests
    .map((request, index) => ({ request, index }))
    .sort((left, right) => {
      const leftPath = left.request.step_path;
      const rightPath = right.request.step_path;
      if (!leftPath && !rightPath) return left.index - right.index;
      if (!leftPath) return 1;
      if (!rightPath) return -1;
      return leftPath.localeCompare(rightPath, undefined, { numeric: true });
    })
    .map(({ request }) => request);
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

function addLiveRunSummaryRequest(requests: Map<string, RunRequestStat>, key: string, request: RunRequestStat): void {
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
