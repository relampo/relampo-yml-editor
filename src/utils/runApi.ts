// Client for the relampo studio load-run API: a full `relampo run` load test
// (the scenario's real load config) driven from the editor's Run view. Unlike
// the debug API (one pass, 1-2 VUs, per-request events) this streams aggregated
// per-second metric snapshots and a final summary. When the editor is served by
// `relampo studio` the API lives on the same origin; during `vite dev` point
// VITE_DEBUG_API_URL at a running studio.

import { studioAuthHeaders, withStudioToken } from './studioAuth';

const apiBase: string = import.meta.env.VITE_DEBUG_API_URL ?? '';

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
  const response = await fetch(`${apiBase}/api/run`, {
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
  return body.id as string;
}

// URL of the standalone HTML report the studio generates when a run finishes
// (the same report `relampo run` writes). Open it in a new tab.
export function loadRunReportUrl(runId: string): string {
  // Opened in a new tab, so it cannot send the token header — carry it in the
  // query string, which the studio server also accepts.
  return withStudioToken(`${apiBase}/api/run/${runId}/report`);
}

// Asks the studio to cancel a running load run. The engine drains its VUs and
// the run finishes with status "stopped" carrying partial metrics. Best-effort:
// stopping an unknown/finished run is a no-op on the server.
export async function stopLoadRun(runId: string): Promise<void> {
  await fetch(`${apiBase}/api/run/${runId}/stop`, { method: 'POST', headers: studioAuthHeaders() });
}

// Streams a run's state, metric snapshots, and terminal summary over SSE.
// Returns a function that closes the stream.
export function streamLoadRun(runId: string, handlers: RunStreamHandlers): () => void {
  const source = new EventSource(withStudioToken(`${apiBase}/api/run/${runId}/events`));
  let finished = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
  const close = () => {
    finished = true;
    clearReconnectTimer();
    source.close();
  };

  // A successful (re)connection clears any pending grace timer.
  source.addEventListener('open', () => clearReconnectTimer());
  source.addEventListener('state', message => {
    handlers.onState(JSON.parse((message as MessageEvent).data) as RunState);
  });
  source.addEventListener('metrics', message => {
    handlers.onMetrics(JSON.parse((message as MessageEvent).data) as RunMetricsSnapshot);
  });
  source.addEventListener('log', message => {
    handlers.onLog(JSON.parse((message as MessageEvent).data) as RunLogLine[]);
  });
  source.addEventListener('done', message => {
    const payload = JSON.parse((message as MessageEvent).data) as Partial<RunDone>;
    close();
    handlers.onDone({
      status: (payload.status as RunStatus) ?? 'completed',
      error: payload.error ?? null,
      summary: payload.summary ?? null,
    });
  });
  source.onerror = () => {
    if (finished) return;
    // Permanently closed: report immediately. Otherwise the browser is
    // reconnecting — only report if it fails to recover within the grace window.
    if (source.readyState === EventSource.CLOSED) {
      close();
      handlers.onConnectionError();
      return;
    }
    if (reconnectTimer === null) {
      reconnectTimer = setTimeout(() => {
        if (finished) return;
        close();
        handlers.onConnectionError();
      }, RECONNECT_GRACE_MS);
    }
  };

  return () => {
    close();
  };
}
