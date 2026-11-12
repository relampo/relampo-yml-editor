import { studioAuthHeaders, withStudioToken } from './studioAuth';
import { getRuntimeConfig } from './runtimeConfig';

export interface DistributedConfig {
  provider: 'github' | 'gitlab';
  repository: string;
  host?: string;
  runner_tags?: string[];
  yaml: string;
  file_name?: string;
  report_formats?: string[];
  files?: string[];
  nodes: number;
  vus?: number;
  duration?: string;
  language: string;
  retrieve_embedded?: boolean;
  embedded_types?: string[];
  embedded_blacklist?: string[];
}
export interface ProgressStats {
  requests: number;
  failures: number;
  latency_samples: number;
  elapsed_seconds: number;
  rps: number;
  min_ms: number | null;
  max_ms: number | null;
  avg_ms: number | null;
  p95_ms: number | null;
}
export interface DistributedPoint {
  at: string;
  requests: number;
  failures: number;
  rps: number;
  active_vus: number;
  avg_ms: number | null;
  p95_ms: number | null;
}
export interface DistributedScope {
  key: string;
  node_id?: number;
  scenario?: string;
  name?: string;
  total: ProgressStats;
  window: ProgressStats;
}
export interface DistributedNode {
  key: string;
  node_id: number;
  state: string;
  updated_at: string;
  progress: { final: boolean; active_vus: number; peak_vus: number; total: ProgressStats; window: ProgressStats };
}
export interface DistributedState {
  id: string;
  status: string;
  stage: string;
  error?: string;
  warning?: string;
  repository: string;
  run_id?: number;
  url?: string;
  reports_url?: string;
  reports_ready: boolean;
  report_formats?: string[];
  expected_nodes?: number;
  started_at: string;
  nodes: DistributedNode[];
  scopes: DistributedScope[];
  history: DistributedPoint[];
}
export interface DistributedPlan {
  repository_exists: boolean;
  nodes: number;
  users: number;
  duration: string;
  max_nodes: number;
  max_users: number;
  max_duration: string;
  files: string[];
}
interface OperationEvent {
  type: string;
  repository?: string;
  data?: DistributedPlan;
}

function base() {
  return getRuntimeConfig().apiBaseUrl;
}
export async function distributedRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base()}/api/distributed/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: studioAuthHeaders(body === undefined ? undefined : { 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Distributed request failed (${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}
export async function prepareDistributed(
  config: DistributedConfig,
): Promise<{ plan: DistributedPlan; repository: string }> {
  const response = await distributedRequest<{ events: OperationEvent[] }>('preflight', config);
  const event = response.events.find(item => item.type === 'preflight');
  if (!event?.data || !event.repository) throw new Error('Incomplete distributed preflight response');
  return { plan: event.data, repository: event.repository };
}
export function distributedReportUrl(id: string, format: string, download = false): string {
  return withStudioToken(
    `${base()}/api/distributed/run/${encodeURIComponent(id)}/report/${encodeURIComponent(format)}${download ? '?download=1' : ''}`,
  );
}
export function safeProviderURL(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// File inputs expose bytes, not absolute paths. Stage selected files in the
// Studio session, then pass the returned paths to the existing CLI operation.
export async function uploadDistributedFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${base()}/api/distributed/upload`, {
    method: 'POST',
    headers: studioAuthHeaders(),
    body: form,
    cache: 'no-store',
  });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'File upload failed');
  if (typeof body.path !== 'string' || !body.path) throw new Error('File upload did not return a path');
  return body.path;
}
