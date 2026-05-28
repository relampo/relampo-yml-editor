import type { YAMLNodeType } from '../types/yaml';

const HTTP_METHOD_NODE_TYPE_LIST = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;
type HttpMethodNodeType = (typeof HTTP_METHOD_NODE_TYPE_LIST)[number];
const HTTP_METHOD_NODE_TYPES = new Set<string>(HTTP_METHOD_NODE_TYPE_LIST);

type RequestNodeData = Record<string, unknown> | undefined;

function readMethod(method: unknown): string | null {
  return typeof method === 'string' && method.trim() !== '' ? method.trim().toUpperCase() : null;
}

function normalizeMethod(method: unknown): string {
  return readMethod(method) || 'GET';
}

function isHttpMethodNodeType(value: string): value is HttpMethodNodeType {
  return HTTP_METHOD_NODE_TYPES.has(value);
}

function getMethodNodeType(nodeType: YAMLNodeType, data: RequestNodeData): YAMLNodeType {
  if (nodeType === 'request') {
    return 'request';
  }

  const method = readMethod(data?.method);
  if (!method) {
    return nodeType;
  }

  const nextType = method.toLowerCase();
  return isHttpMethodNodeType(nextType) ? nextType : nodeType;
}

function normalizeUrlForLabel(url: unknown): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '/';

  try {
    const parsed = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'http://relampo.local');
    return `${parsed.pathname || '/'}${parsed.search || ''}` || '/';
  } catch {
    const withoutHost = trimmed.replace(/^[a-z]+:\/\/[^/]+/i, '');
    if (!withoutHost) return '/';
    return withoutHost.startsWith('/') ? withoutHost : `/${withoutHost}`;
  }
}

export function isHttpRequestNodeType(nodeType: YAMLNodeType): boolean {
  return nodeType === 'request' || HTTP_METHOD_NODE_TYPES.has(nodeType);
}

/**
 * Extract the host (authority) from a request URL when it is absolute.
 *
 * Recorded requests that target a host other than `http_defaults.base_url`
 * are written with an absolute URL by the recorder, while requests against the
 * base host stay relative. Returning the host for absolute URLs lets the tree
 * surface every host involved in a multi-host recording instead of collapsing
 * them into a single implicit host.
 *
 * @param url - Raw request URL (absolute or relative).
 * @returns The host (e.g. `api.example.com`) for absolute URLs, or `''` for relative ones.
 */
export function getRequestNodeHost(url: unknown): string {
  const trimmed = String(url || '').trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return '';

  try {
    return new URL(trimmed).host || '';
  } catch {
    const match = trimmed.match(/^[a-z]+:\/\/([^/?#]+)/i);
    return match ? match[1] : '';
  }
}

/**
 * Build the auto-generated label for an HTTP request node.
 *
 * The label is host-stripped (`METHOD: /path?query`) so that the tree name stays
 * compact and consistent regardless of whether the request URL is absolute (a
 * secondary host) or relative (the base host). The host itself is surfaced
 * separately as a badge in the tree, keeping every host visible.
 */
export function buildRequestNodeLabel(nodeType: YAMLNodeType, data: RequestNodeData): string {
  const method = nodeType === 'request' ? normalizeMethod(data?.method) : nodeType.toUpperCase();
  return `${method}: ${normalizeUrlForLabel(data?.url)}`;
}

export function getUpdatedRequestNodePresentation(params: {
  nodeType: YAMLNodeType;
  currentName: string;
  currentData: RequestNodeData;
  updatedData: RequestNodeData;
  explicitName?: string;
}): { type: YAMLNodeType; name: string } {
  const { nodeType, currentName, currentData, updatedData, explicitName } = params;
  const nextType = getMethodNodeType(nodeType, updatedData);
  const currentAutoName = buildRequestNodeLabel(nodeType, currentData);
  const nextAutoName = buildRequestNodeLabel(nextType, updatedData);

  if (explicitName !== undefined) {
    return {
      type: nextType,
      name: explicitName,
    };
  }

  return {
    type: nextType,
    name: currentName === currentAutoName || currentName.trim() === '' ? nextAutoName : currentName,
  };
}
