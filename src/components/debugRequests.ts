import type { YAMLNode } from '../types/yaml';

export type DebugStatus = 'passed' | 'failed' | 'warning' | 'pending' | 'running';

export type DebugEventLike = {
  method: string;
  name: string;
  path: string;
  request_id?: number;
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

// A redirect follow-up is any event the runtime emits while walking a redirect
// chain after the parent's first hop: the intermediate hops and the final
// landing response. The parent's own first request (redirect_index 0,
// chain_role "parent") is NOT a follow-up — it matches its own node normally.
export function isRedirectFollowUpEvent(event: DebugEventLike): boolean {
  const role = String(event.chain_role ?? '').trim().toLowerCase();
  return role === 'hop' || role === 'final' || (event.redirect_index ?? 0) > 0;
}

function chainRoleOf(node: YAMLNode): string {
  return String(node.data?.chain_role ?? '').trim().toLowerCase();
}

// Maps a redirect follow-up event to the specific recorded REDIRECTED-DISABLED
// child node it corresponds to. The runtime walks the recorded redirect
// children in document order, emitting redirect_index 1 for the first child, 2
// for the second, and so on (the final landing gets the last index). We match
// by that position within the chain rather than by URL: correlation rewrites
// the redirect targets' query strings at runtime, so the live URL no longer
// equals the recorded one. Position is stable, so every hop — not just the
// final one — resolves to its own node. Returns null when the chain can't be
// resolved (e.g. the recording and the live run disagree on hop count) so the
// Tree shows no selection instead of a wrong one. RLP-570.
function matchRedirectChainChildToNode(event: DebugEventLike, chainId: string, requestTargets: YAMLNode[]): YAMLNode | null {
  const children = requestTargets.filter(node => {
    const role = chainRoleOf(node);
    return String(node.data?.chain_id ?? '') === chainId && (role === 'hop' || role === 'final');
  });
  const redirectIndex = event.redirect_index ?? 0;
  if (redirectIndex >= 1) return children[redirectIndex - 1] ?? null;
  // A 'final' event can arrive without a positional redirect_index (the field is
  // optional and omitempty drops a 0). Map it to the chain's recorded 'final'
  // child so the landing still selects its node and keeps its redirect context,
  // rather than going unmatched. RLP-585.
  if (String(event.chain_role ?? '').trim().toLowerCase() === 'final') {
    return children.find(node => chainRoleOf(node) === 'final') ?? null;
  }
  return null;
}

// The number shown on a Debug timeline row. Redirect follow-up rows display the
// number of the enabled parent request that triggered the chain — every hop and
// the final landing share it — never the recorded child's own request_id. This
// keeps the chain visually grouped under one number (e.g. #17) instead of
// leaking the disabled children's ids (18, 19, 20...). RLP-570.
export function debugEventRequestNumber(event: DebugEventLike, matchedNode: YAMLNode | null, requestNodes: YAMLNode[]): string {
  const chainId = String(event.chain_id ?? '').trim();
  if (chainId && isRedirectFollowUpEvent(event)) {
    const parent = requestNodes.find(node => String(node.data?.chain_id ?? '') === chainId && chainRoleOf(node) === 'parent');
    const parentId = parent?.data?.request_id;
    if (parentId !== undefined && parentId !== null && String(parentId).trim() !== '') {
      return String(parentId).trim();
    }
    // The backend stamps the parent's request_id on every chain event, so fall
    // back to it when the parent node can't be found in the tree.
    return String(event.request_id ?? '').trim();
  }
  return String(matchedNode?.data?.request_id ?? event.request_id ?? '').trim();
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
  // Chained redirect follow-ups resolve deterministically by position within
  // the chain. Intercept them here so they never fall through to URL/name
  // matching, which is what made hops latch onto the wrong child node (or only
  // the final one). When the chain can't be resolved we return null — leaving
  // the Tree unmarked — rather than guessing. RLP-570.
  const eventChainId = String(event.chain_id ?? '').trim();
  if (eventChainId && isRedirectFollowUpEvent(event)) {
    return matchRedirectChainChildToNode(event, eventChainId, requestTargets);
  }
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
  // A request's Variables tab lists only the variables that request itself
  // extracts. When the event can't be mapped to a tree node we show nothing
  // rather than dumping every variable in scope — otherwise unrelated values
  // (e.g. data-source columns like `user`/`pass`, which no request here even
  // captures) leak onto requests that neither capture nor use them. RLP-585.
  if (!node) return [];
  return requestExtractorVariableNames(node).flatMap(name =>
    Object.prototype.hasOwnProperty.call(variables, name) ? [[name, variables[name]] as [string, string]] : [],
  );
}
