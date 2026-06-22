import type { YAMLNode } from '../types/yaml';

export type DebugStatus = 'passed' | 'failed' | 'warning' | 'pending' | 'running';

export type DebugEventLike = {
  method: string;
  name: string;
  path: string;
  chain_id?: string;
  chain_role?: string;
  redirect_index?: number;
  redirect_source?: string;
  step_path?: string;
};

const REQUEST_TYPES = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const DEBUG_EVENT_TYPES = new Set([...REQUEST_TYPES, 'think_time']);

function getRequestPath(node: YAMLNode): string {
  const raw = String(node.data?.url || node.data?.path || node.name || '/');
  return normalizePath(raw);
}

function normalizePath(raw: string): string {
  try {
    const parsed = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, 'https://relampo.local');
    return `${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch {
    return raw.replace(/^[A-Z]+\s+/i, '') || '/';
  }
}

function findUniqueTarget(nodes: YAMLNode[], predicate: (node: YAMLNode) => boolean): YAMLNode | null {
  const matches = nodes.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function matchRedirectFinalEventToNode(event: DebugEventLike, requestTargets: YAMLNode[], eventPath: string): YAMLNode | null {
  const isRedirectFinal =
    event.chain_role === 'final' || event.redirect_index !== undefined || String(event.step_path ?? '').includes('.redirects[');
  if (!isRedirectFinal || !eventPath) return null;
  const eventChainId = String(event.chain_id ?? '');
  return findUniqueTarget(
    requestTargets,
    node =>
      node.data?.chain_role === 'final' &&
      getRequestPath(node) === eventPath &&
      (!eventChainId || String(node.data?.chain_id ?? '') === eventChainId),
  );
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

export function collectDebugEventTargets(tree: YAMLNode | null): YAMLNode[] {
  if (!tree) return [];
  const nodes: YAMLNode[] = [];
  const walk = (node: YAMLNode) => {
    if (node.data?.enabled === false) {
      if (REQUEST_TYPES.has(node.type)) nodes.push(node);
      return;
    }
    const isDebugEventTarget = DEBUG_EVENT_TYPES.has(node.type);
    if (isDebugEventTarget) {
      nodes.push(node);
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return nodes;
}

export function matchDebugEventTarget(event: DebugEventLike, requestNodes: YAMLNode[]): YAMLNode | null {
  const rawWithSuffix = event.name.replace(/^\[[^\]]+\]\s*/, '');
  const raw = rawWithSuffix.replace(/\s+#\d+$/, '');
  const base = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
  const requestTargets = requestNodes.filter(node => REQUEST_TYPES.has(node.type));
  const eventPath = normalizePath(event.path || base);
  const redirectFinalTarget = matchRedirectFinalEventToNode(event, requestTargets, eventPath);
  if (redirectFinalTarget) return redirectFinalTarget;
  const eventStepPath = String(event.step_path ?? '');
  if (eventStepPath) {
    const stepPathTargets = event.method === 'THINK_TIME' ? requestNodes : requestTargets;
    const byStepPath = findUniqueTarget(stepPathTargets, node => debugNodeStepPath(node) === eventStepPath);
    if (byStepPath) return byStepPath;
  }
  if (event.method === 'THINK_TIME') return matchThinkTimeEventToNode(event, requestNodes, rawWithSuffix);
  return (
    findUniqueTarget(requestTargets, node => {
      const url = String(node.data?.url ?? '');
      return url !== '' && (getRequestPath(node) === eventPath || event.path === url || base.endsWith(url));
    }) ??
    findUniqueTarget(requestTargets, node => node.name === raw) ??
    findUniqueTarget(requestTargets, node => node.name === base)
  );
}

function matchThinkTimeEventToNode(event: DebugEventLike, requestNodes: YAMLNode[], rawWithSuffix: string): YAMLNode | null {
  const timers = requestNodes.filter(node => node.type === 'think_time');
  const eventStepPath = String(event.step_path ?? '');
  if (eventStepPath) {
    const byPath = timers.find(node => debugNodeStepPath(node) === eventStepPath);
    if (byPath) return byPath;
  }
  return timers[Number.parseInt(rawWithSuffix.match(/\s+#(\d+)$/)?.[1] ?? '1', 10) - 1] ?? null;
}

function debugNodeStepPath(node: YAMLNode): string {
  const path = [...(node.path ?? [])];
  if (path[path.length - 1] === node.type) path.pop();
  return path.reduce<string>((out, part) => (typeof part === 'number' ? `${out}[${part}]` : out ? `${out}.${part}` : part), '');
}

function extractorVariableName(node: YAMLNode): string | null {
  const candidates = [node.data?.var, node.data?.variable, node.data?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function requestExtractorVariableNames(node: YAMLNode | null): string[] {
  if (!node?.children) return [];
  const names: string[] = [];
  node.children.forEach(child => {
    if (child.type !== 'extractor' && child.type !== 'extract') return;
    const name = extractorVariableName(child);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

export function variableRowsForRequestNode(
  node: YAMLNode | null,
  variables: Record<string, string>,
): Array<[string, string]> {
  if (!node) return Object.entries(variables);
  return requestExtractorVariableNames(node).flatMap(name =>
    Object.prototype.hasOwnProperty.call(variables, name) ? [[name, variables[name]] as [string, string]] : [],
  );
}
