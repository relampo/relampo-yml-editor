import type { YAMLNode } from '../types/yaml';

export type DebugStatus = 'passed' | 'failed' | 'warning' | 'pending' | 'running';

export type DebugRequestNode = {
  node: YAMLNode;
  index: number;
  method: string;
  path: string;
  status: DebugStatus;
  statusCode: number;
  latencyMs: number;
  vu: number;
  startedAt: string;
};

const REQUEST_TYPES = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);

function getRequestMethod(node: YAMLNode): string {
  const rawMethod = node.data?.method || node.type;
  return String(rawMethod || 'GET').toUpperCase();
}

function getRequestPath(node: YAMLNode): string {
  const raw = String(node.data?.url || node.data?.path || node.name || '/');
  try {
    const parsed = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, 'https://relampo.local');
    return `${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch {
    return raw.replace(/^[A-Z]+\s+/i, '') || '/';
  }
}

export function collectRequests(tree: YAMLNode | null): YAMLNode[] {
  if (!tree) return [];
  const nodes: YAMLNode[] = [];
  const walk = (node: YAMLNode) => {
    // The runtime skips disabled samplers and never descends into a disabled
    // controller (see yamlSemanticValidation), so the debug run must mirror
    // that — otherwise it shows traffic/failures for steps that won't execute.
    if (node.data?.enabled === false) return;
    if (REQUEST_TYPES.has(node.type)) nodes.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  return nodes;
}

export function collectDebugSelectableRequests(tree: YAMLNode | null): YAMLNode[] {
  if (!tree) return [];
  const nodes: YAMLNode[] = [];
  const walk = (node: YAMLNode) => {
    if (REQUEST_TYPES.has(node.type)) nodes.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  return nodes;
}

export function buildDebugRequests(tree: YAMLNode | null, vus = 1): DebugRequestNode[] {
  const requests = collectRequests(tree);
  return requests.map((node, index) => {
    const method = getRequestMethod(node);
    const path = getRequestPath(node);
    const statusCode = index === 4 ? 302 : index === 2 || (/login|checkout/i.test(path) && index % 3 === 1) ? 500 : 200;
    const status: DebugStatus = statusCode >= 400 ? 'failed' : 'passed';

    return {
      node,
      index: index + 1,
      method,
      path,
      status,
      statusCode,
      latencyMs: status === 'failed' ? 612 : statusCode >= 300 ? 248 : 72 + index * 31,
      vu: vus === 2 && index % 2 === 1 ? 2 : 1,
      startedAt: `11:38:${String(12 + index * 2).padStart(2, '0')}.${String(120 + index * 37).slice(0, 3)}`,
    };
  });
}
