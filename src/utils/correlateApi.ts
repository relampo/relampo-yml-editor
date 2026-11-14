import { agentRequest } from './agentTransport';
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
  value: string;
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
  const response = await agentRequest('/api/correlate/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(120000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(value.error || `Correlate failed (HTTP ${response.status})`);
  return value;
}
export function correlatedFileName(name: string): string {
  return (name || 'script.yaml').replace(/\.(yaml|yml)$/i, '').replace(/\.correlated$/i, '') + '.correlated.yaml';
}

export interface AppliedCorrelation {
  variable: string;
  placeholder: string;
  type: string;
  from: string;
  pattern: string;
  expression: string;
  header: string;
  configuration: string;
  source: CorrelateLocation;
  targets: CorrelateLocation[] | null;
}
export interface CorrelatedDocument {
  yaml: string;
  applied: AppliedCorrelation[];
}
export function correlationRequestLabel(location: CorrelateLocation): string {
  return location.URL ? `#${location.RequestID || location.StepIndex + 1} ${location.Method} ${location.URL}` : '—';
}
