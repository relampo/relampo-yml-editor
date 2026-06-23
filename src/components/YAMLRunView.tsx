import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Gauge, OctagonX, Play, Square, Terminal, TimerReset, Users, XCircle, Zap } from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import {
  loadRunReportUrl,
  startLoadRun,
  stopLoadRun,
  streamLoadRun,
  type RunLogLine,
  type RunMetricsSnapshot,
  type RunStatus,
  type RunSummary,
} from '../utils/runApi';
import { LoadVisualization } from './yaml-node-details/LoadVisualization';
import { normalizeLoadType } from './yaml-node-details/loadUtils';

// The live sparklines only need a recent window; keeping every snapshot for a
// long run would bloat state and slow re-render. Cumulative totals live on the
// latest snapshot, so trimming the head never loses the running totals.
const MAX_LIVE_POINTS = 600;

// The live log feed keeps the most recent lines; older ones scroll off. The
// server already caps emission, but a long run still produces many lines.
const MAX_LIVE_LOGS = 1000;

// The last load run is parked in sessionStorage so a reload can re-attach and
// let the studio replay the run (history + final summary). Only the id and a
// document fingerprint are stored; the metrics stay on the server. The
// fingerprint guards against replaying a run against a different script.
const RUN_STORAGE_KEY = 'relampo.studio.loadRun';

interface StoredRun {
  id: string;
  fp: string;
}

// Cheap, stable (djb2) fingerprint of the document.
function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

function readStoredRun(): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.fp === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function storeRun(run: StoredRun): void {
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  } catch {
    // Private-mode / disabled storage: persistence is best-effort.
  }
}

function clearStoredRun(): void {
  try {
    sessionStorage.removeItem(RUN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

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
  const [snapshots, setSnapshots] = useState<RunMetricsSnapshot[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [logs, setLogs] = useState<RunLogLine[]>([]);

  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const startTokenRef = useRef(0);
  const activeRunIdRef = useRef<string | null>(null);
  const storedRunRef = useRef<StoredRun | null | undefined>(undefined);
  if (storedRunRef.current === undefined) {
    storedRunRef.current = readStoredRun();
  }

  const loadNodes = useMemo(() => collectLoadNodes(tree), [tree]);
  const plannedLoadNode = loadNodes[0] ?? null;
  const hasValidationErrors = validationErrors.length > 0;
  const latest = snapshots[snapshots.length - 1] ?? null;

  // Wires a run's SSE stream into the dashboard. Shared by a fresh Run and by
  // re-attaching to a stored run after a reload. `quiet` suppresses the error
  // banner for auto re-attach: a stored run that no longer exists (server
  // restarted) should clear silently rather than alarm the user.
  const subscribe = useCallback((runId: string, quiet: boolean) => {
    stopStreamRef.current?.();
    activeRunIdRef.current = runId;
    stopStreamRef.current = streamLoadRun(runId, {
      onState: state => {
        setRunStatus(state.status);
        setIsRunning(state.status === 'running');
        if (state.status !== 'running') setIsStopping(false);
      },
      onMetrics: snapshot => {
        setSnapshots(previous => {
          const next = previous.length >= MAX_LIVE_POINTS ? previous.slice(previous.length - MAX_LIVE_POINTS + 1) : previous;
          return [...next, snapshot];
        });
      },
      onLog: lines => {
        setLogs(previous => {
          const merged = [...previous, ...lines];
          return merged.length > MAX_LIVE_LOGS ? merged.slice(merged.length - MAX_LIVE_LOGS) : merged;
        });
      },
      onDone: done => {
        setIsRunning(false);
        setIsStopping(false);
        setRunStatus(done.status);
        setSummary(done.summary);
        setRunError(done.status === 'errored' ? (done.error ?? 'Load run failed.') : null);
      },
      onConnectionError: () => {
        setIsRunning(false);
        setIsStopping(false);
        if (quiet) {
          clearStoredRun();
          storedRunRef.current = null;
          activeRunIdRef.current = null;
          setSnapshots([]);
          setLogs([]);
          setRunStatus(null);
        } else {
          setRunError('Lost connection to the studio server.');
        }
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
        clearStoredRun();
        storedRunRef.current = null;
        return;
      }
      reattachedRef.current = true;
      setIsRunning(true);
      subscribe(storedRun.id, true);
    },
    [documentReady, subscribe, yamlCode],
  );

  const startRun = async () => {
    if (hasValidationErrors || isRunning) return;
    const scriptAtStart = flushPendingEdits ? flushPendingEdits() : yamlCode;
    if (!scriptAtStart.trim()) return;
    const token = (startTokenRef.current += 1);
    stopStreamRef.current?.();
    setSnapshots([]);
    setLogs([]);
    setSummary(null);
    setRunError(null);
    setRunStatus('running');
    setIsStopping(false);
    setIsRunning(true);
    try {
      const runId = await startLoadRun(scriptAtStart);
      if (token === startTokenRef.current) {
        storeRun({ id: runId, fp: fingerprint(scriptAtStart) });
        subscribe(runId, false);
      }
    } catch (error) {
      if (token !== startTokenRef.current) return;
      setIsRunning(false);
      setRunStatus('errored');
      setRunError(error instanceof Error ? error.message : String(error));
    }
  };

  // Stop asks the server to cancel the run, then keeps the stream open so the
  // terminal `done` (status "stopped") delivers the partial summary. The
  // unmount cleanup never stops a run — Stop is a deliberate user action.
  const stopRun = async () => {
    const runId = activeRunIdRef.current;
    if (!runId || !isRunning) return;
    setIsStopping(true);
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
              onClick={startRun}
              disabled={isRunning || hasValidationErrors || !yamlCode.trim()}
              className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run load test
            </button>
            <button
              type="button"
              onClick={stopRun}
              disabled={!isRunning || isStopping}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/3 px-3 text-sm text-zinc-300 transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>
      </div>

      {hasValidationErrors && (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-200">YAML semantic validation failed before the load run</p>
              <p className="mt-1 text-xs text-red-200/80">Fix these issues in the tree or code before running the load test.</p>
              <div className="mt-2 space-y-1">
                {validationErrors.slice(0, 4).map((error, index) => (
                  <p key={`${error}-${index}`} className="wrap-break-word font-mono text-xs text-red-100/90">
                    {error}
                  </p>
                ))}
                {validationErrors.length > 4 && (
                  <p className="text-xs text-red-200/70">+{validationErrors.length - 4} more validation issues</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {runError && (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-200">Load run error</p>
              <p className="mt-1 wrap-break-word font-mono text-xs text-red-100/90">{runError}</p>
            </div>
          </div>
        </div>
      )}

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

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {snapshots.length === 0 && logs.length === 0 && !summary ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
            {isRunning
              ? 'Running… waiting for the first engine events.'
              : "Press Run load test to execute the scenario's full load profile."}
          </div>
        ) : (
          <div className="space-y-4">
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

            {plannedLoadNode && (
              <div className="border border-white/10 bg-[#111111] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Planned load profile</p>
                  {loadNodes.length > 1 && (
                    <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      {loadNodes.length} scenarios — showing the first
                    </span>
                  )}
                </div>
                <LoadVisualization
                  data={plannedLoadNode.data ?? {}}
                  loadType={normalizeLoadType(plannedLoadNode.data?.type)}
                  progressSeconds={isRunning ? (latest?.elapsed_ms ?? 0) / 1000 : undefined}
                />
              </div>
            )}

            <LiveLogPanel logs={logs} scrollRef={logScrollRef} />

            {summary && (
              <RunSummaryPanel
                summary={summary}
                status={runStatus}
                reportUrl={activeRunIdRef.current ? loadRunReportUrl(activeRunIdRef.current) : undefined}
              />
            )}
          </div>
        )}
      </div>
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
        {status === 'stopped' ? (
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
              {requests.map((request, index) => (
                <tr key={`${request.name}-${index}`} className="border-b border-white/5 last:border-b-0">
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

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#111111] px-4 py-3">
      <p className={`text-base font-semibold ${tone ?? 'text-zinc-100'}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
    </div>
  );
}
