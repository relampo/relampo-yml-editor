import { studioAuthHeaders } from './studioAuth';
import { getRuntimeConfig } from './runtimeConfig';
export interface CorrelateLocation {
  StepIndex: number;
  RequestID: number;
  Method: string;
  URL: string;
  Location: string;
  Path: string;
  NodePath?: string;
}
export interface CorrelateCandidate {
  id: string;
  variable: string;
  type: string;
  kind: 'auto' | 'manual' | 'builtin';
  applicable: boolean;
  source: CorrelateLocation;
  targets: CorrelateLocation[] | null;
}
export interface CorrelateReport {
  digest: string;
  requests: number;
  responses: number;
  candidates: CorrelateCandidate[];
}
export async function correlateRequest<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(getRuntimeConfig().apiBaseUrl + '/api/correlate/' + path, {
    method: 'POST',
    headers: studioAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(120000),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error || 'Correlate failed');
  return value;
}
export function correlatedFileName(name: string): string {
  return (name || 'script.yaml').replace(/\.(yaml|yml)$/i, '').replace(/\.correlated$/i, '') + '.correlated.yaml';
}
