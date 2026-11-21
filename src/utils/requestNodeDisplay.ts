import type { YAMLNode, YAMLNodeType } from '../types/yaml';

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

export function buildRequestNodeLabel(nodeType: YAMLNodeType, data: RequestNodeData): string {
  const method = nodeType === 'request' ? normalizeMethod(data?.method) : nodeType.toUpperCase();
  return `${method}: ${normalizeUrlForLabel(data?.url)}`;
}

export function collectScenarioHosts(root: YAMLNode | null | undefined, baseUrl?: string): string[] {
  const hosts: string[] = [];
  const seen = new Set<string>();

  const add = (host: string) => {
    const trimmed = host.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      hosts.push(trimmed);
    }
  };

  add(getRequestNodeHost(baseUrl) || String(baseUrl || '').trim());

  const walk = (node: YAMLNode | null | undefined) => {
    if (!node) return;
    if (isHttpRequestNodeType(node.type)) {
      add(getRequestNodeHost(node.data?.url));
    }
    node.children?.forEach(walk);
  };
  walk(root);

  return hosts;
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
