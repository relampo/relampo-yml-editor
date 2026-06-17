// Client for the relampo studio debug-run API (RLP-507 Phase 1).
// When the editor is served by `relampo studio` the API lives on the same
// origin; during `vite dev` point VITE_DEBUG_API_URL at a running studio.

export interface EngineAssertionResult {
  Name: string;
  Passed: boolean;
  Message: string;
}

export interface EngineRedirectHop {
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

const apiBase: string = import.meta.env.VITE_DEBUG_API_URL ?? '';

// A YAML script the CLI asked the editor to mount on startup, supplied via
// `relampo studio <script.yaml>`.
export interface StudioInitialScript {
  name: string;
  yaml: string;
}

export interface StudioInfo {
  studio: boolean;
  initialScript?: StudioInitialScript;
}

// Detects whether the editor is being served by `relampo studio`. Standalone
// deployments have no /api and the probe simply fails (returns null), keeping
// the editor an independent tool with the Debug view hidden. When studio passed
// a script (`relampo studio file.yaml`) it is returned so the editor mounts it.
export async function probeStudio(): Promise<StudioInfo | null> {
  try {
    const response = await fetch(`${apiBase}/api/studio/info`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const body = await response.json();
    if (body?.studio !== true) return null;
    const raw = body.initialScript;
    const initialScript =
      raw && typeof raw.yaml === 'string'
        ? { name: typeof raw.name === 'string' && raw.name ? raw.name : 'script.yaml', yaml: raw.yaml }
        : undefined;
    return { studio: true, initialScript };
  } catch {
    return null;
  }
}

// A debug run is always a single VU doing one pass through the flow; the
// backend forces this and ignores the scenario's load, so no parameters
// beyond the YAML are sent.
export async function startDebugRun(yaml: string): Promise<string> {
  const response = await fetch(`${apiBase}/api/debug/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml }),
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

// Streams a run's events over SSE. Returns a function that closes the stream.
export function streamDebugRun(runId: string, handlers: DebugStreamHandlers): () => void {
  const source = new EventSource(`${apiBase}/api/debug/runs/${runId}/events`);
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
