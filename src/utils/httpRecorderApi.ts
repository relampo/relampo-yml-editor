import { studioAuthHeaders } from './studioAuth';
import { getRuntimeConfig } from './runtimeConfig';
export interface HTTPRecordOptions {
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
}
export interface HTTPRecordingState {
  active: boolean;
  output?: string;
  saving?: boolean;
  applicationUrl?: string;
  proxyAddress?: string;
  firefoxRunning?: boolean;
  firefoxPreparing?: boolean;
  certificateReady?: boolean;
  tlsFailures?: number;
  startedAt?: string;
  prefix?: string;
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
  const response = await fetch(getRuntimeConfig().apiBaseUrl + '/api/recorder/http/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: studioAuthHeaders(body === undefined ? undefined : { 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({ error: 'Recorder operation failed' }));
    throw new Error(value.error || 'Recorder operation failed');
  }
  return response.json();
}
export const defaultHTTPRecordOptions: HTTPRecordOptions = {
  applicationUrl: '',
  baseUrls: '',
  port: 8888,
  output: '',
  name: '',
  responses: true,
  maskSensitive: true,
  include: '',
  exclude: [],
  prefix: '',
  grouping: 'none',
  redirectMode: 'jmeter',
  redirectDisabling: true,
  preserveCompressedResponses: false,
  force: false,
  openFirefox: true,
};
