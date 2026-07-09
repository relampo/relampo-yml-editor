// Client for the relampo studio debug-run API (RLP-507 Phase 1).
// When the editor is served by `relampo studio` the API lives on the same
// origin; during `vite dev` point VITE_DEBUG_API_URL at a running studio.

import { studioAuthHeaders, withStudioToken } from './studioAuth';

interface EngineAssertionResult {
  Name: string;
  Passed: boolean;
  Message: string;
}

interface EngineRedirectHop {
  status: number;
  method?: string;
  url?: string;
  location?: string;
  target_url?: string;
  latency_ms?: number;
  headers?: Record<string, string[]>;
}

// Mirrors pkg/engine.Event JSON serialization.
export interface EngineEvent {
  ts: string;
  started_at?: string;
  name: string;
  request_id?: number;
  step_path?: string;
  method: string;
  path: string;
  status: number;
  latency_ms: number;
  err?: string;
  concurrency: number;
  vu?: number;
  rows_returned?: number;
  rows_affected?: number;
  transaction?: string;
  transaction_id?: number;
  request_body?: string;
  response_body?: string;
  response_body_base64?: string;
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  redirects?: EngineRedirectHop[];
  chain_id?: string;
  chain_role?: string;
  redirect_index?: number;
  redirect_source?: string;
  debug?: boolean;
  embedded?: boolean;
  // The outer key is lowercase (Event json tag), but the inner AssertionResult
  // fields are capitalized because pkg/runtime.AssertionResult has no json tags.
  assertions?: EngineAssertionResult[];
  variables?: Record<string, string>;
}

export interface DebugStreamHandlers {
  onEvent: (event: EngineEvent) => void;
  onDone: (error: string | null) => void;
  onConnectionError: () => void;
}

export type DebugVUs = 1 | 2;

export interface StartDebugRunOptions {
  vus?: DebugVUs;
}

const apiBase: string = import.meta.env.VITE_DEBUG_API_URL ?? '';

// When the local agent is not running, fetch rejects with a TypeError (Chrome:
// "Failed to fetch", Firefox: "NetworkError when attempting to fetch resource")
// before any HTTP status exists. That browser-internal string tells the user
// nothing, so we translate connection failures into actionable guidance
// (RLP-590) and re-throw anything else (HTTP errors, aborts) untouched.
export const AGENT_UNREACHABLE_MESSAGE =
  'Could not reach the local Relampo agent. Make sure it is running with `relampo debug` or `relampo studio` in your terminal.';

function isConnectionFailure(error: unknown): boolean {
  // AbortError (timeouts, user-cancelled runs) is a real outcome, not an
  // unreachable agent — leave it alone.
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  return error instanceof TypeError;
}

async function fetchAgent(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, headers: studioAuthHeaders(init?.headers) });
  } catch (error) {
    if (isConnectionFailure(error)) throw new Error(AGENT_UNREACHABLE_MESSAGE);
    throw error;
  }
}

// A YAML script the CLI asked the editor to mount on startup, supplied via
// `relampo studio <script.yaml>`.
interface StudioInitialScript {
  name: string;
  yaml: string;
}

// Optional studio features the backend advertises so the editor only shows UI
// it supports. Absent on older studio builds, so every flag defaults to false.
interface StudioCapabilities {
  // loadRun unlocks the Run (load test) view backed by POST /api/run.
  loadRun?: boolean;
}

export interface StudioInfo {
  studio: boolean;
  initialScript?: StudioInitialScript;
  capabilities?: StudioCapabilities;
}

export interface StudioDataSourceUpload {
  name: string;
  path: string;
}

export interface StudioDataSourcePreview {
  path: string;
  lines: string[];
  truncated: boolean;
}

// Detects whether the editor is being served by `relampo studio`. Standalone
// deployments have no /api and the probe simply fails (returns null), keeping
// the editor an independent tool with the Debug view hidden. When studio passed
// a script (`relampo studio file.yaml`) it is returned so the editor mounts it.
export async function probeStudio(): Promise<StudioInfo | null> {
  try {
    const response = await fetch(`${apiBase}/api/studio/info`, {
      signal: AbortSignal.timeout(2000),
      headers: studioAuthHeaders(),
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body?.studio !== true) return null;
    const raw = body.initialScript;
    const initialScript =
      raw && typeof raw.yaml === 'string'
        ? { name: typeof raw.name === 'string' && raw.name ? raw.name : 'script.yaml', yaml: raw.yaml }
        : undefined;
    const capabilities =
      body.capabilities && typeof body.capabilities === 'object'
        ? { loadRun: body.capabilities.loadRun === true }
        : undefined;
    return { studio: true, initialScript, capabilities };
  } catch {
    return null;
  }
}

// A debug run is one pass through the flow with a small, explicit VU count.
// The backend ignores the scenario's load, so duration/iterations stay out of
// this payload.
export async function startDebugRun(yaml: string, options: StartDebugRunOptions = {}): Promise<string> {
  const vus = options.vus ?? 1;
  const response = await fetchAgent(`${apiBase}/api/debug/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml, vus }),
  });
  if (!response.ok) {
    let message = `debug run failed to start (HTTP ${response.status})`;
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

export async function uploadStudioDataSourceFile(file: File): Promise<StudioDataSourceUpload> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetchAgent(`${apiBase}/api/studio/data-source-files`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    let message = `data source file upload failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const body = (await response.json()) as StudioDataSourceUpload;
  if (!body.path) {
    throw new Error('data source file upload did not return a path');
  }
  return body;
}

export async function previewStudioDataSourceFile(path: string, signal?: AbortSignal): Promise<StudioDataSourcePreview> {
  const params = new URLSearchParams({ path });
  const response = await fetchAgent(`${apiBase}/api/studio/data-source-preview?${params.toString()}`, { signal });
  if (!response.ok) {
    let message = `data source preview failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const body = (await response.json()) as StudioDataSourcePreview;
  return {
    path: body.path,
    lines: Array.isArray(body.lines) ? body.lines : [],
    truncated: Boolean(body.truncated),
  };
}

// Streams a run's events over SSE. Returns a function that closes the stream.
export function streamDebugRun(runId: string, handlers: DebugStreamHandlers): () => void {
  const source = new EventSource(withStudioToken(`${apiBase}/api/debug/runs/${runId}/events`));
  let finished = false;

  source.addEventListener('engine', message => {
    handlers.onEvent(JSON.parse((message as MessageEvent).data) as EngineEvent);
  });
  source.addEventListener('done', message => {
    finished = true;
    source.close();
    const payload = JSON.parse((message as MessageEvent).data) as { error?: string };
    handlers.onDone(payload.error ?? null);
  });
  source.onerror = () => {
    if (finished) return;
    finished = true;
    source.close();
    handlers.onConnectionError();
  };

  return () => {
    finished = true;
    source.close();
  };
}
