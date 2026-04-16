import type { YAMLNodeType } from '../types/yaml';

const HTTP_METHOD_NODE_TYPES = new Set<YAMLNodeType>(['get', 'post', 'put', 'delete', 'patch', 'head', 'options']);

type RequestNodeData = Record<string, unknown> | undefined;

function normalizeMethod(method: unknown): string {
  return typeof method === 'string' && method.trim() !== '' ? method.trim().toUpperCase() : 'GET';
}

function getMethodNodeType(nodeType: YAMLNodeType, data: RequestNodeData): YAMLNodeType {
  if (nodeType === 'request') {
    return 'request';
  }

  const nextType = normalizeMethod(data?.method).toLowerCase();
  return HTTP_METHOD_NODE_TYPES.has(nextType as YAMLNodeType) ? (nextType as YAMLNodeType) : nodeType;
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
