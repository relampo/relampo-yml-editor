import { studioAuthHeaders, withStudioToken } from './studioAuth';
import { getRuntimeConfig } from './runtimeConfig';
import type { YAMLValue } from '../types/yaml';
export interface GRPCField {
  name: string;
  type: string;
  message?: string;
  repeated?: boolean;
  map?: boolean;
  mapKey?: string;
  required?: boolean;
  optional?: boolean;
  oneof?: string;
  enumValues?: string[];
  description?: string;
}
export interface GRPCMessage {
  name: string;
  fields: GRPCField[];
  description?: string;
  jsonKind?: string;
}
export interface GRPCMethod {
  name: string;
  path: string;
  kind: 'unary' | 'server_streaming' | 'client_streaming' | 'bidi';
  input: string;
  output: string;
  description?: string;
  template?: YAMLValue;
  responseTemplate?: YAMLValue;
}
export interface GRPCCatalog {
  services: { name: string; description?: string; methods: GRPCMethod[] }[];
  messages: Record<string, GRPCMessage>;
  descriptorSet: string;
}
export interface GRPCConnection {
  target: string;
  plaintext?: boolean;
  tls?: { caFile?: string; serverName?: string; clientCert?: string; clientKey?: string };
}
export interface GRPCImported {
  id: string;
  catalog: GRPCCatalog;
  descriptorPath: string;
}
export interface GRPCGenerated {
  id: string;
  yaml: string;
  descriptorPath?: string;
  warnings: string[];
}
export interface GRPCRecording {
  active: boolean;
  listen?: string;
  calls: { method: string; type: string; status: string; messages: number; durationMs: number; truncated: boolean }[];
  truncated?: boolean;
}
export async function grpcRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(getRuntimeConfig().apiBaseUrl + '/api/grpc/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: studioAuthHeaders(body === undefined ? undefined : { 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'gRPC operation failed' }));
    throw new Error(error.error || 'gRPC operation failed');
  }
  return response.json();
}
export function grpcBundleURL(id: string): string {
  return withStudioToken(getRuntimeConfig().apiBaseUrl + '/api/grpc/bundles/' + encodeURIComponent(id));
}

export interface GRPCBrowserRecording {
  active: boolean;
  applicationUrl?: string;
  proxyAddress?: string;
  caPath?: string;
  detected: 'none' | 'http' | 'grpc_web' | 'grpc_native';
  counts: { http: number; https: number; grpcWeb: number; grpcNative: number };
  totalRequests: number;
  tlsFailures: number;
  requests: { method: string; url: string; protocol: string }[];
  grpcWebReplaySupported: boolean;
  firefoxAvailable: boolean;
  firefoxRunning?: boolean;
  firefoxPreparing?: boolean;
  firefoxCertificateManaged?: boolean;
  firefoxCertificateReady?: boolean;
}
export function grpcBrowserCAURL(): string {
  return withStudioToken(getRuntimeConfig().apiBaseUrl + '/api/grpc/browser-recordings/ca');
}
