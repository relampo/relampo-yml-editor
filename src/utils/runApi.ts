// Client for the relampo studio load-run API: a full `relampo run` load test
// (the scenario's real load config) driven from the editor's Run view. Unlike
// the debug API (one pass, 1-2 VUs, per-request events) this streams aggregated
// per-second metric snapshots and a final summary. When the editor is served by
// `relampo studio` the API lives on the same origin; during `vite dev` point
// VITE_DEBUG_API_URL at a running studio.

import { studioAuthHeaders, withStudioToken } from './studioAuth';
import { getRuntimeConfig } from './runtimeConfig';
import { createValidatedEventStream, isRecord } from './sseMessage';

function apiBase(): string {
  return getRuntimeConfig().apiBaseUrl;
}

// EventSource auto-reconnects on transient drops; a multi-minute load run will
// hit some. Only surface a connection error if the stream stays down this long.
const RECONNECT_GRACE_MS = 10_000;

export type RunStatus = 'running' | 'completed' | 'stopped' | 'errored';

// One ~1s aggregate sample (mirrors the backend loadRunSnapshot /
// reporter.TimePoint shape: latency in ms, ts in unix seconds).
export interface RunMetricsSnapshot {
  ts: number;
  elapsed_ms: number;
  rps: number;
  active_users: number;
  executed_vus?: number;
  avg_latency: number;
  p95_latency: number;
  total_requests: number;
  total_failures: number;
  errors: number;
  requests?: RunRequestStat[];
}

interface RunState {
  status: RunStatus;
  started_at: string;
  elapsed_ms: number;
}

type RunLogLevel = 'request' | 'info' | 'error' | 'system';

// One line of the live log feed. Request events carry the structured fields;
// lifecycle/info events use `message`.
export interface RunLogLine {
  seq: number;
  ts: number; // unix milliseconds
  level: RunLogLevel;
  vu?: number;
  method?: string;
  path?: string;
  status?: number;
  latency_ms?: number;
  message?: string;
}

// Per-logical-request roll-up. Final summaries mirror reporter.RequestStat;
// live snapshots additionally carry runtime identity fields so the editor can
// map resolved URLs and redirects back to their stable YAML steps.
export interface RunRequestStat {
  name: string;
  method: string;
  path: string;
  request_id?: number;
  step_path?: string;
  chain_id?: string;
  chain_role?: string;
  redirect_index?: number;
  redirect_source?: string;
  count: number;
  failures: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms?: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms?: number;
}

interface RunHistoryPoint {
  ts: number;
  rps: number;
  active_users: number;
  avg_latency: number;
  p95_latency: number;
  errors: number;
}

// Final report (mirrors the subset of reporter.Summary the dashboard renders).
// `duration` is a Go time.Duration serialized as integer nanoseconds.
export interface RunSummary {
  test_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_requests: number;
  total_failures: number;
  executed_vus?: number;
  requests: RunRequestStat[];
  history?: RunHistoryPoint[];
}

interface RunDone {
  status: RunStatus;
  error: string | null;
  summary: RunSummary | null;
}

export interface RunStreamHandlers {
  onState: (state: RunState) => void;
  onMetrics: (snapshot: RunMetricsSnapshot) => void;
  onLog: (lines: RunLogLine[]) => void;
  onDone: (done: RunDone) => void;
  onConnectionError: () => void;
}

// Starts a load run. The backend executes the scenario's real load config from
// the YAML (no VU/duration override), so the payload is just the script.
export async function startLoadRun(yaml: string): Promise<string> {
  const response = await fetch(`${apiBase()}/api/run`, {
    method: 'POST',
    headers: studioAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ yaml }),
  });
  if (!response.ok) {
    let message = `load run failed to start (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const body = await response.json();
  if (!isRecord(body) || typeof body.id !== 'string' || body.id.length === 0) {
    throw new Error('load run did not return a run id');
  }
  return body.id;
}

// URL of the standalone HTML report the studio generates when a run finishes
// (the same report `relampo run` writes). Open it in a new tab.
export function loadRunReportUrl(runId: string): string {
  // Opened in a new tab, so it cannot send the token header — carry it in the
  // query string, which the studio server also accepts.
  return withStudioToken(`${apiBase()}/api/run/${runId}/report`);
}

// Asks the studio to cancel a running load run. The engine drains its VUs and
// the run finishes with status "stopped" carrying partial metrics. Best-effort:
// stopping an unknown/finished run is a no-op on the server.
export async function stopLoadRun(runId: string): Promise<void> {
  await fetch(`${apiBase()}/api/run/${runId}/stop`, { method: 'POST', headers: studioAuthHeaders() });
}

// Streams a run's state, metric snapshots, and terminal summary over SSE.
// Returns a function that closes the stream.
export function streamLoadRun(runId: string, handlers: RunStreamHandlers): () => void {
  const stream = createValidatedEventStream(
    withStudioToken(`${apiBase()}/api/run/${runId}/events`),
    RECONNECT_GRACE_MS,
    handlers.onConnectionError,
  );
  const { source } = stream;
  const seenLogSequences = new Set<number>();
  const seenMetricTimestamps = new Set<number>();

  source.addEventListener('state', message => {
    const state = stream.parse<RunState>(message, isRunState);
    if (state) handlers.onState(state);
  });
  source.addEventListener('metrics', message => {
    const metrics = stream.parse<RunMetricsSnapshot>(message, isRunMetricsSnapshot);
    if (metrics && !seenMetricTimestamps.has(metrics.ts)) {
      seenMetricTimestamps.add(metrics.ts);
      handlers.onMetrics(metrics);
    }
  });
  source.addEventListener('log', message => {
    const log = stream.parse<RunLogLine[]>(message, isRunLog);
    if (!log) return;
    const unseen = log.filter(line => {
      if (seenLogSequences.has(line.seq)) return false;
      seenLogSequences.add(line.seq);
      return true;
    });
    if (unseen.length > 0) handlers.onLog(unseen);
  });
  source.addEventListener('done', message => {
    const payload = stream.parse<RunDonePayload>(message, isRunDonePayload);
    if (!payload || stream.isFinished()) return;
    stream.close();
    handlers.onDone({
      status: payload.status,
      error: payload.error ?? null,
      summary: payload.summary ?? null,
    });
  });

  return stream.close;
}

interface RunDonePayload {
  status: RunStatus;
  error?: string | null;
  summary?: RunSummary | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRunStatus(value: unknown): value is RunStatus {
  return value === 'running' || value === 'completed' || value === 'stopped' || value === 'errored';
}

function isRunState(value: unknown): value is RunState {
  return (
    isRecord(value) &&
    isRunStatus(value.status) &&
    typeof value.started_at === 'string' &&
    isFiniteNumber(value.elapsed_ms)
  );
}

function isRunRequestStat(value: unknown): value is RunRequestStat {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.method === 'string' &&
    typeof value.path === 'string' &&
    isFiniteNumber(value.count) &&
    isFiniteNumber(value.failures) &&
    isFiniteNumber(value.avg_ms) &&
    isFiniteNumber(value.min_ms) &&
    isFiniteNumber(value.max_ms) &&
    isFiniteNumber(value.p90_ms) &&
    isFiniteNumber(value.p95_ms) &&
    (value.p99_ms === undefined || isFiniteNumber(value.p99_ms))
  );
}

function isRunMetricsSnapshot(value: unknown): value is RunMetricsSnapshot {
  return (
    isRecord(value) &&
    isFiniteNumber(value.ts) &&
    isFiniteNumber(value.elapsed_ms) &&
    isFiniteNumber(value.rps) &&
    isFiniteNumber(value.active_users) &&
    (value.executed_vus === undefined || isFiniteNumber(value.executed_vus)) &&
    isFiniteNumber(value.avg_latency) &&
    isFiniteNumber(value.p95_latency) &&
    isFiniteNumber(value.total_requests) &&
    isFiniteNumber(value.total_failures) &&
    isFiniteNumber(value.errors) &&
    (value.requests === undefined || (Array.isArray(value.requests) && value.requests.every(isRunRequestStat)))
  );
}

function isRunLogLine(value: unknown): value is RunLogLine {
  if (!isRecord(value)) return false;
  return (
    isFiniteNumber(value.seq) &&
    isFiniteNumber(value.ts) &&
    (value.level === 'request' || value.level === 'info' || value.level === 'error' || value.level === 'system') &&
    (value.vu === undefined || isFiniteNumber(value.vu)) &&
    (value.status === undefined || isFiniteNumber(value.status)) &&
    (value.latency_ms === undefined || isFiniteNumber(value.latency_ms)) &&
    (value.message === undefined || typeof value.message === 'string')
  );
}

function isRunLog(value: unknown): value is RunLogLine[] {
  return Array.isArray(value) && value.every(isRunLogLine);
}

function isRunHistoryPoint(value: unknown): value is RunHistoryPoint {
  return (
    isRecord(value) &&
    isFiniteNumber(value.ts) &&
    isFiniteNumber(value.rps) &&
    isFiniteNumber(value.active_users) &&
    isFiniteNumber(value.avg_latency) &&
    isFiniteNumber(value.p95_latency) &&
    isFiniteNumber(value.errors)
  );
}

function isRunSummary(value: unknown): value is RunSummary {
  return (
    isRecord(value) &&
    typeof value.test_name === 'string' &&
    typeof value.start_time === 'string' &&
    typeof value.end_time === 'string' &&
    isFiniteNumber(value.duration) &&
    isFiniteNumber(value.total_requests) &&
    isFiniteNumber(value.total_failures) &&
    (value.executed_vus === undefined || isFiniteNumber(value.executed_vus)) &&
    Array.isArray(value.requests) &&
    value.requests.every(isRunRequestStat) &&
    (value.history === undefined || (Array.isArray(value.history) && value.history.every(isRunHistoryPoint)))
  );
}

function isRunDonePayload(value: unknown): value is RunDonePayload {
  return (
    isRecord(value) &&
    isRunStatus(value.status) &&
    (value.error === undefined || value.error === null || typeof value.error === 'string') &&
    (value.summary === undefined || value.summary === null || isRunSummary(value.summary))
  );
}
