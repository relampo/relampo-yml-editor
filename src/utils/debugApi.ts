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
  Assertions?: EngineAssertionResult[];
  variables?: Record<string, string>;
}

export interface DebugStreamHandlers {
  onEvent: (event: EngineEvent) => void;
  onDone: (error: string | null) => void;
  onConnectionError: () => void;
}

const apiBase: string = import.meta.env.VITE_DEBUG_API_URL ?? '';

export async function startDebugRun(yaml: string, vus: number): Promise<string> {
  const response = await fetch(`${apiBase}/api/debug/runs`, {
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
