import { agentRequest } from './agentTransport';
export interface HTTPRecordOptions {
  paused: boolean;
  applicationUrl: string;
  baseUrls: string;
  port: number;
  output: string;
  name: string;
  responses: boolean;
  maskSensitive: boolean;
  include: string;
  exclude: string[];
  prefix: string;
  prefixEnabled: boolean;
  transactionsEnabled: boolean;
  grouping: string;
  redirectMode: string;
  redirectDisabling: boolean;
  preserveCompressedResponses: boolean;
  force: boolean;
  openFirefox: boolean;
}
export interface HTTPRecordedRow {
  id: number;
  name: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  time: string;
  transaction?: string;
  transactionId?: number;
}
export interface HTTPRecordingState {
  active: boolean;
  recording?: boolean;
  recordingStartedAt?: string;
  protocol?: string;
  upstreamTLSError?: { host: string; reason: string; expiresAt?: string };
  output?: string;
  saving?: boolean;
  applicationUrl?: string;
  proxyAddress?: string;
  firefoxRunning?: boolean;
  firefoxPreparing?: boolean;
  certificateReady?: boolean;
  tlsFailures?: number;
  upstreamTLSFailures?: number;
  startedAt?: string;
  prefix?: string;
  prefixEnabled?: boolean;
  transactionsEnabled?: boolean;
  transaction?: { id: number; name: string };
  requests: HTTPRecordedRow[];
  totalRequests: number;
  savedPath?: string;
  responses?: boolean;
}
export interface HTTPRecordingPreview {
  name: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  request: unknown;
  response: unknown;
}
export async function httpRecorderRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await agentRequest('/api/recorder/http/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({ error: 'Recorder operation failed' }));
    throw new Error(value.error || 'Recorder operation failed');
  }
  return response.json();
}
export const DEFAULT_EMBEDDED_EXCLUDE = String.raw`(?i).*\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)(\?.*)?$`;
export const defaultHTTPRecordOptions: HTTPRecordOptions = {
  paused: true,
  applicationUrl: '',
  baseUrls: '',
  port: 8888,
  output: '',
  name: '',
  responses: true,
  maskSensitive: true,
  include: '',
  exclude: [DEFAULT_EMBEDDED_EXCLUDE],
  prefix: '',
  prefixEnabled: false,
  transactionsEnabled: false,
  grouping: 'none',
  redirectMode: 'jmeter',
  redirectDisabling: true,
  preserveCompressedResponses: false,
  force: false,
  openFirefox: true,
};

export function normalizeRecorderBaseURLs(value: string): string {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => (/^[a-z][a-z0-9+.-]*:\/\//i.test(part) ? part : 'https://' + part))
    .join(',');
}
export function recorderURLProtocol(value: string): string {
  try {
    const protocol = new URL(normalizeRecorderBaseURLs(value).split(',')[0]).protocol;
    return protocol === 'http:' ? 'HTTP' : protocol === 'https:' ? 'HTTPS' : '';
  } catch {
    return '';
  }
}
export function recorderTLSFailureText(
  failure: NonNullable<HTTPRecordingState['upstreamTLSError']>,
  language: string,
): string {
  const es = language === 'es',
    host = failure.host;
  if (failure.reason === 'expired') {
    const date = (failure.expiresAt || '').slice(0, 10);
    return es
      ? `El certificado HTTPS de ${host} venció el ${date}.`
      : `The HTTPS certificate for ${host} expired on ${date}.`;
  }
  if (failure.reason === 'not_yet_valid')
    return es
      ? `El certificado HTTPS de ${host} todavía no es válido.`
      : `The HTTPS certificate for ${host} is not yet valid.`;
  if (failure.reason === 'untrusted')
    return es
      ? `La CA del certificado HTTPS de ${host} no es de confianza.`
      : `The HTTPS certificate issuer for ${host} is not trusted.`;
  if (failure.reason === 'hostname')
    return es ? `El certificado HTTPS no corresponde a ${host}.` : `The HTTPS certificate does not match ${host}.`;
  return es
    ? `No se pudo establecer la conexión HTTPS con ${host}.`
    : `The HTTPS connection to ${host} could not be established.`;
}
