import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';

export type DebugStatus = 'passed' | 'failed' | 'warning' | 'pending' | 'running' | 'skipped';

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
  vu?: number;
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
function isRedirectFollowUpEvent(event: DebugEventLike): boolean {
  const role = String(event.chain_role ?? '')
    .trim()
    .toLowerCase();
  return role === 'hop' || role === 'final' || (event.redirect_index ?? 0) > 0;
}

// Whether an event is a redirect follow-up step for counting purposes — the
// same set the tree badges REDIRECTED. It widens isRedirectFollowUpEvent with
// the step_path fallback that matchRedirectFinalEventToNode also accepts, so
// older/partial engine payloads that land a redirect final identified only by
// its recorded `...redirects[N]` step path stay in sync with the tree (RLP-588).
export function isRedirectStepEvent(event: DebugEventLike): boolean {
  return isRedirectFollowUpEvent(event) || String(event.step_path ?? '').includes('.redirects[');
}

function chainRoleOf(node: YAMLNode): string {
  return String(node.data?.chain_role ?? '')
    .trim()
    .toLowerCase();
}

function redirectChainParent(chainId: string, requestNodes: YAMLNode[]): YAMLNode | null {
  return (
    requestNodes.find(node => String(node.data?.chain_id ?? '') === chainId && chainRoleOf(node) === 'parent') ?? null
  );
}

function redirectChainParentDisablesFollow(chainId: string, requestNodes: YAMLNode[]): boolean {
  return redirectChainParent(chainId, requestNodes)?.data?.follow_redirects === false;
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
function matchRedirectChainChildToNode(
  event: DebugEventLike,
  chainId: string,
  requestTargets: YAMLNode[],
): YAMLNode | null {
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
  if (
    String(event.chain_role ?? '')
      .trim()
      .toLowerCase() === 'final'
  ) {
    return children.find(node => chainRoleOf(node) === 'final') ?? null;
  }
  return null;
}

// The 1-based position of a redirect follow-up within its chain: hop 1, hop 2,
// ..., final last. Derived from the matched child's order among the recorded
// chain children so it agrees with what the Tree selects; falls back to the
// event's redirect_index when the chain can't be resolved to a node.
function redirectChainPosition(
  event: DebugEventLike,
  matchedNode: YAMLNode | null,
  chainId: string,
  requestNodes: YAMLNode[],
): number {
  const children = requestNodes.filter(node => {
    const role = chainRoleOf(node);
    return String(node.data?.chain_id ?? '') === chainId && (role === 'hop' || role === 'final');
  });
  const position = matchedNode ? children.findIndex(child => child.id === matchedNode.id) : -1;
  if (position >= 0) return position + 1;
  return event.redirect_index ?? 0;
}

// The number shown on a Debug timeline row. A redirect follow-up row shows the
// enabled parent's number with a sub-index for its position in the chain
// (#32.1, #32.2, ... the final landing last) so the parent and each of its
// children stay grouped under one number yet remain individually identifiable —
// critical when multiple VUs interleave their chains. The parent's own row
// keeps the bare number (#32). RLP-586 (was: every follow-up shared #32, RLP-570).
export function debugEventRequestNumber(
  event: DebugEventLike,
  matchedNode: YAMLNode | null,
  requestNodes: YAMLNode[],
): string {
  const chainId = String(event.chain_id ?? '').trim();
  if (chainId && isRedirectFollowUpEvent(event) && !redirectChainParentDisablesFollow(chainId, requestNodes)) {
    const parent = redirectChainParent(chainId, requestNodes);
    const parentId = parent?.data?.request_id;
    // The backend stamps the parent's request_id on every chain event, so fall
    // back to it when the parent node can't be found in the tree.
    const base =
      parentId !== undefined && parentId !== null && String(parentId).trim() !== ''
        ? String(parentId).trim()
        : String(event.request_id ?? '').trim();
    const position = redirectChainPosition(event, matchedNode, chainId, requestNodes);
    return position > 0 ? `${base}.${position}` : base;
  }
  if (chainId && redirectChainParentDisablesFollow(chainId, requestNodes)) {
    return String(matchedNode?.data?.request_id ?? event.request_id ?? '').trim();
  }
  return String(event.request_id ?? matchedNode?.data?.request_id ?? '').trim();
}

// A recorded redirect chain child (hop or final landing) that a live run did
// NOT execute even though its chain ran. The runtime emits one event per hop it
// actually follows; when the live chain is shorter than the recording, the
// unfollowed children produce no event and silently vanish from the timeline
// (#123.1 shows, #123.2 disappears). This happens when the engine stops
// following at a hop it won't cross — e.g. an OAuth callback recorded on a
// different site than the IdP, which the redirect trust boundary blocks
// (backend RLP-492). Surfacing them as skipped placeholders keeps the recorded
// chain visible and honest about what ran vs. what was recorded. RLP-607.
export type SkippedRedirectHop = {
  node: YAMLNode;
  // 1-based position within the chain, so the placeholder can carry the same
  // `#parent.position` sub-index the executed hops use.
  position: number;
  // Index, into the same event list passed in, of the chain's last real event —
  // the row the placeholder slots in after.
  afterEventIndex: number;
};

// Given the timeline's engine events (in order) and the tree's request nodes,
// return the recorded chain children that ran-chains left unexecuted. A chain is
// "run" when it produced at least one event; within each run (keyed per VU so
// interleaved chains don't cross-contaminate) any hop/final child never matched
// by an event is reported skipped. RLP-607.
export function skippedRedirectHops(events: DebugEventLike[], requestNodes: YAMLNode[]): SkippedRedirectHop[] {
  const walks = new Map<string, { chainId: string; matched: Set<string>; lastIndex: number }>();
  events.forEach((event, index) => {
    const chainId = String(event.chain_id ?? '').trim();
    if (!chainId) return;
    if (redirectChainParentDisablesFollow(chainId, requestNodes)) return;
    const isFollowUp = isRedirectFollowUpEvent(event);
    const eventRole = String(event.chain_role ?? '')
      .trim()
      .toLowerCase();
    const matched = matchDebugEventTarget(event, requestNodes);
    const startsRedirectWalk =
      isFollowUp ||
      eventRole === 'parent' ||
      (matched !== null && chainRoleOf(matched) === 'parent' && matched.data?.follow_redirects !== false);
    if (!startsRedirectWalk) return;
    const key = `${event.vu ?? 0}\u0000${chainId}`;
    let walk = walks.get(key);
    if (!walk) {
      walk = { chainId, matched: new Set<string>(), lastIndex: index };
      walks.set(key, walk);
    }
    walk.lastIndex = index;
    if (isFollowUp && matched) {
      walk.matched.add(matched.id);
    }
  });

  const skipped: SkippedRedirectHop[] = [];
  walks.forEach(walk => {
    const children = requestNodes.filter(node => {
      const role = chainRoleOf(node);
      return String(node.data?.chain_id ?? '') === walk.chainId && (role === 'hop' || role === 'final');
    });
    children.forEach((child, index) => {
      if (!walk.matched.has(child.id)) {
        skipped.push({ node: child, position: index + 1, afterEventIndex: walk.lastIndex });
      }
    });
  });

  // Stable order: group each chain's skipped children after its last real row,
  // ascending by sub-index (#N.2 before #N.3).
  return skipped.sort((a, b) => a.afterEventIndex - b.afterEventIndex || a.position - b.position);
}

function matchRedirectFinalEventToNode(
  event: DebugEventLike,
  requestTargets: YAMLNode[],
  eventPath: string,
): YAMLNode | null {
  const isRedirectFinal =
    event.chain_role === 'final' ||
    event.redirect_index !== undefined ||
    String(event.step_path ?? '').includes('.redirects[');
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

export function matchDebugEventTarget(
  event: DebugEventLike,
  requestNodes: YAMLNode[],
  redirectedRequestMap: Record<string, RedirectedRequestInfo> = {},
): YAMLNode | null {
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
  let unresolvedRedirectFollowUp = false;
  if (
    eventChainId &&
    isRedirectFollowUpEvent(event) &&
    !redirectChainParentDisablesFollow(eventChainId, requestTargets)
  ) {
    const directMatch = matchRedirectChainChildToNode(event, eventChainId, requestTargets);
    if (directMatch) return directMatch;
    // Runtime-discovered redirects can use a synthetic `legacy:...` chain ID
    // that differs from the recording's chain ID. The engine still preserves
    // the enabled parent's request_id and redirect position, which uniquely
    // recover the recorded child without guessing by its resolved URL.
    const recordedParent = findUniqueTarget(
      requestTargets,
      node => chainRoleOf(node) === 'parent' && String(node.data?.request_id ?? '') === String(event.request_id ?? ''),
    );
    const recordedChainId = String(recordedParent?.data?.chain_id ?? '').trim();
    if (recordedChainId) {
      const recordedMatch = matchRedirectChainChildToNode(event, recordedChainId, requestTargets);
      if (recordedMatch) return recordedMatch;
    }
    const redirectParent = findUniqueTarget(
      requestTargets,
      node => String(node.data?.request_id ?? '') === String(event.request_id ?? ''),
    );
    if (redirectParent && (event.redirect_index ?? 0) > 0) {
      const linkedChildren: YAMLNode[] = [];
      let sourceId = redirectParent.id;
      for (let index = 0; index < requestTargets.length; index += 1) {
        const linked = requestTargets.filter(node => redirectedRequestMap[node.id]?.sourceNodeId === sourceId);
        if (linked.length !== 1) break;
        linkedChildren.push(linked[0]);
        sourceId = linked[0].id;
      }
      const linkedMatch = linkedChildren[(event.redirect_index ?? 0) - 1];
      if (linkedMatch) return linkedMatch;
    }
    // A precise step_path match below remains safe even when neither chain ID
    // agrees. Do not fall through to request_id/name matching afterward: those
    // identify the parent and can select the wrong redirect hop.
    unresolvedRedirectFollowUp = true;
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
  if (unresolvedRedirectFollowUp) return null;
  const byRequestId =
    event.request_id === undefined || (eventChainId && redirectChainParentDisablesFollow(eventChainId, requestTargets))
      ? null
      : findUniqueTarget(requestTargets, node => String(node.data?.request_id ?? '') === String(event.request_id));
  if (byRequestId) return byRequestId;
  return (
    findUniqueTarget(requestTargets, node => {
      const url = String(node.data?.url ?? '');
      return url !== '' && (getRequestPath(node) === eventPath || event.path === url || base.endsWith(url));
    }) ??
    findUniqueTarget(requestTargets, node => node.name === raw) ??
    findUniqueTarget(requestTargets, node => node.name === base)
  );
}

function matchThinkTimeEventToNode(
  event: DebugEventLike,
  requestNodes: YAMLNode[],
  rawWithSuffix: string,
): YAMLNode | null {
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
  return path.reduce<string>(
    (out, part) => (typeof part === 'number' ? `${out}[${part}]` : out ? `${out}.${part}` : part),
    '',
  );
}

function extractorVariableName(node: YAMLNode): string | null {
  const candidates = [node.data?.var, node.data?.variable, node.data?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function requestExtractorVariableNames(node: YAMLNode | null): string[] {
  if (!node?.children) return [];
  const names: string[] = [];
  node.children.forEach(child => {
    if (child.type !== 'extractor' && child.type !== 'extract') return;
    const name = extractorVariableName(child);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

// Match `{{name}}` where the inner name is anything but a brace (trimmed by the
// caller). Correlation variables are routinely named with dots or hyphens —
// `javax.faces.ViewState`, `x-correlation-id` — so restricting to an identifier
// charset silently dropped them: the run still carried the value and the request
// still referenced it, but the Variables tab never listed it. That looked
// "intermittent" because plain names worked and dotted ones didn't. Over-
// capturing here is harmless: variableRowsForRequestNode only surfaces names that
// actually exist in the run's variable map, so junk never reaches the UI.
// RLP-597 / RLP-584.
const PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/g;

// Pull every `{{var}}` reference out of an arbitrary request-config value (the
// url, headers, query params, body, auth — whatever shape `node.data` holds).
function collectPlaceholderNames(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
      const name = match[1].trim();
      if (name) into.add(name);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectPlaceholderNames(item, into));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectPlaceholderNames(item, into));
  }
}

// The variable names a request *uses* (vs. extracts): `{{placeholders}}` woven
// through its url/headers/body/params, plus the names bound by any data source
// attached to the request. RLP-584. This stays request-scoped on purpose — we
// never widen back to "every variable in scope", which is what RLP-585 removed
// to stop unrelated data-source columns leaking onto requests that don't touch
// them.
function requestReferencedVariableNames(node: YAMLNode | null): string[] {
  if (!node) return [];
  const names = new Set<string>();
  collectPlaceholderNames(node.data, names);
  node.children?.forEach(child => {
    // Header/body config edited through the detail UI lives on child config
    // nodes (e.g. the `headers` child) and is serialized from there, not from
    // node.data — so a header like `Authorization: Bearer {{token}}` only
    // surfaces if we scan child data too. Skip nested request children so a
    // controller's sub-requests never leak their placeholders up here. RLP-584.
    if (REQUEST_TYPES.has(child.type)) return;
    collectPlaceholderNames(child.data, names);
    if (child.type === 'data_source') {
      const bind = child.data?.bind;
      if (bind && typeof bind === 'object') {
        Object.keys(bind as Record<string, unknown>).forEach(name => name && names.add(name));
      }
    }
  });
  return [...names];
}

// Every variable name relevant to a request's Variables tab: what it extracts
// followed by what it references. Order is stable (extractors first) and
// duplicates collapse. RLP-584.
export function requestVariableNames(node: YAMLNode | null): string[] {
  const names: string[] = [];
  for (const name of [...requestExtractorVariableNames(node), ...requestReferencedVariableNames(node)]) {
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

// How a request touches a variable. RES = the request extracts it from its own
// response (an extractor/regex lives on this request). REQ = the request
// sends/uses it — a {{placeholder}} in its url/headers/body/params, or a
// data-source bind. RLP-597.
export type VariableRole = 'REQ' | 'RES';

export type VariableValueContext = {
  requestBody?: string;
  requestHeaders?: Record<string, string>;
  requestUrl?: string;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  statusLine?: string;
};

// Classifies every variable a request touches by role. A correlation variable
// is RES on the request that captures it and REQ on each request that consumes
// it, so the same name surfaces in at least two Variables tabs tagged by where
// it lives vs. where it's used. A variable that a request both extracts and
// re-uses collapses to a single entry carrying both roles. RLP-597.
function collectScalarValues(value: unknown, into: Set<string>): void {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const scalar = String(value);
    if (scalar) into.add(scalar);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectScalarValues(item, into));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectScalarValues(item, into));
  }
}

function runtimeRequestValues(context: VariableValueContext): Set<string> {
  const values = new Set<string>();
  if (context.requestUrl) {
    try {
      const url = new URL(context.requestUrl, 'http://relampo.local');
      url.pathname.split('/').forEach(segment => segment && values.add(decodeURIComponent(segment)));
      url.searchParams.forEach(value => values.add(value));
    } catch {
      // A malformed runtime URL cannot safely prove that a variable was used.
    }
  }
  Object.values(context.requestHeaders ?? {}).forEach(value => {
    values.add(value);
    const schemeValue = value.match(/^\S+\s+(.+)$/)?.[1];
    if (schemeValue) values.add(schemeValue);
  });
  if (context.requestBody) {
    values.add(context.requestBody);
    try {
      collectScalarValues(JSON.parse(context.requestBody), values);
    } catch {
      if (context.requestBody.includes('=')) {
        new URLSearchParams(context.requestBody).forEach(value => values.add(value));
      }
    }
  }
  return values;
}

function runtimeRequestVariableNames(variables: Record<string, string>, context: VariableValueContext): string[] {
  const requestValues = runtimeRequestValues(context);
  const namesByValue = new Map<string, string[]>();
  Object.entries(variables).forEach(([name, value]) => {
    if (!value) return;
    const names = namesByValue.get(value);
    if (names) names.push(name);
    else namesByValue.set(value, [name]);
  });
  // Reverse correlation is only trustworthy when a runtime value identifies a
  // single variable. Two captures can legitimately share a value (e.g. code1
  // and code2), so ambiguous matches remain driven by explicit placeholders.
  return [...namesByValue].flatMap(([value, names]) => (requestValues.has(value) && names.length === 1 ? names : []));
}

function resolvedRequestUrlVariables(node: YAMLNode | null, context: VariableValueContext): Map<string, string> {
  const values = new Map<string, string>();
  const template = String(node?.data?.url ?? node?.data?.path ?? '');
  if (!template || !context.requestUrl) return values;

  try {
    const templateUrl = new URL(template, 'http://relampo.local');
    const runtimeUrl = new URL(context.requestUrl, 'http://relampo.local');
    templateUrl.searchParams.forEach((templateValue, key) => {
      const match = templateValue.match(/^\{\{([^{}]+)\}\}$/);
      const runtimeValue = runtimeUrl.searchParams.get(key);
      const name = match?.[1].trim();
      if (name && runtimeValue !== null) values.set(name, runtimeValue);
    });

    const templateSegments = templateUrl.pathname.split('/');
    const runtimeSegments = runtimeUrl.pathname.split('/');
    if (templateSegments.length === runtimeSegments.length) {
      templateSegments.forEach((segment, index) => {
        const match = segment.match(/^\{\{([^{}]+)\}\}$/);
        const name = match?.[1].trim();
        if (name) values.set(name, decodeURIComponent(runtimeSegments[index]));
      });
    }
  } catch {
    // Malformed URLs cannot safely prove which runtime value filled a placeholder.
  }
  return values;
}

function requestVariableRoles(
  node: YAMLNode | null,
  variables: Record<string, string>,
  context: VariableValueContext,
): Map<string, Set<VariableRole>> {
  const roles = new Map<string, Set<VariableRole>>();
  const tag = (name: string, role: VariableRole) => {
    const set = roles.get(name);
    if (set) set.add(role);
    else roles.set(name, new Set([role]));
  };
  requestExtractorVariableNames(node).forEach(name => tag(name, 'RES'));
  requestReferencedVariableNames(node).forEach(name => tag(name, 'REQ'));
  runtimeRequestVariableNames(variables, context).forEach(name => tag(name, 'REQ'));
  return roles;
}

// The 1st-column label for a Variables-tab row: the variable name followed by
// its role tag(s), e.g. `javax.faces.ViewState (RES)` on the request that
// extracts it and `javax.faces.ViewState (REQ)` on one that uses it. A name that
// is both keeps one row tagged `(REQ, RES)`. RLP-597.
export function variableRowLabel(name: string, roles: Set<VariableRole> | undefined): string {
  const tags = (['REQ', 'RES'] as VariableRole[]).filter(role => roles?.has(role));
  return tags.length ? `${name} (${tags.join(', ')})` : name;
}

const MISSING_VARIABLE_VALUE = 'Not captured';

function extractorSourceText(data: Record<string, unknown>, context: VariableValueContext): string {
  const source = String(data.from || 'body').toLowerCase();
  if (source === 'headers' || source === 'response_headers') return headersToText(context.responseHeaders);
  if (source === 'status_line') return context.statusLine ?? '';
  if (source === 'request_url') return context.requestUrl ?? '';
  if (source === 'request_headers') return headersToText(context.requestHeaders);
  return context.responseBody ?? '';
}

function headersToText(headers: Record<string, string> | undefined): string {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');
}

function compileExtractorRegex(pattern: string): RegExp | null {
  let source = pattern;
  let flags = 's';
  const inlineFlags = source.match(/^\(\?([ims]+)\)/);
  if (inlineFlags) {
    for (const flag of inlineFlags[1]) {
      if (!flags.includes(flag)) flags += flag;
    }
    source = source.slice(inlineFlags[0].length);
  }
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

function captureGroupIndex(data: Record<string, unknown>): number {
  const group = Number(data.group ?? 1);
  return Number.isFinite(group) && group >= 0 ? Math.floor(group) : 1;
}

function captureMatchIndex(data: Record<string, unknown>): number {
  if (String(data.capture_mode || '').toLowerCase() !== 'index') return 0;
  const index = Number(data.capture_index ?? data.match_no);
  return Number.isFinite(index) && index > 0 ? Math.floor(index) - 1 : 0;
}

function regexExtractorValue(data: Record<string, unknown>, context: VariableValueContext): string | null {
  const pattern =
    typeof data.pattern === 'string' ? data.pattern : typeof data.expression === 'string' ? data.expression : '';
  if (!pattern) return null;
  const source = extractorSourceText(data, context);
  if (!source) return null;
  const regex = compileExtractorRegex(pattern);
  if (!regex) return null;
  const matches = [
    ...source.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`)),
  ];
  const match = matches[captureMatchIndex(data)];
  if (!match) return null;
  const group = captureGroupIndex(data);
  return match[group] ?? match[0] ?? null;
}

function responseExtractorValues(node: YAMLNode | null, context: VariableValueContext): Map<string, string> {
  const values = new Map<string, string>();
  node?.children?.forEach(child => {
    if (child.type !== 'extractor' && child.type !== 'extract') return;
    const name = extractorVariableName(child);
    if (!name || values.has(name)) return;
    const data = child.data && typeof child.data === 'object' ? (child.data as Record<string, unknown>) : {};
    if (String(data.type || 'regex').toLowerCase() !== 'regex') return;
    const value = regexExtractorValue(data, context);
    if (value !== null) values.set(name, value);
  });
  return values;
}

export function variableRowsForRequestNode(
  node: YAMLNode | null,
  variables: Record<string, string>,
  context: VariableValueContext = {},
): Array<[string, string]> {
  // A request's Variables tab lists the variables that request extracts *and*
  // the ones it uses (header/body/url placeholders, data-source binds), each
  // tagged RES (extracted here) or REQ (used here). When the event can't be
  // mapped to a tree node we show nothing rather than dumping every variable in
  // scope — otherwise unrelated values (e.g. data-source columns like
  // `user`/`pass`, which this request neither captures nor references) leak onto
  // it. RLP-584 / RLP-585 / RLP-597.
  if (!node) return [];
  const roles = requestVariableRoles(node, variables, context);
  const extracted = responseExtractorValues(node, context);
  const sent = resolvedRequestUrlVariables(node, context);
  return [...roles].map<[string, string]>(([name, variableRoles]) => {
    const resolvedValue =
      variableRoles?.has('RES') && extracted.has(name)
        ? extracted.get(name)
        : variableRoles?.has('REQ') && sent.has(name)
          ? sent.get(name)
          : Object.prototype.hasOwnProperty.call(variables, name)
            ? variables[name]
            : MISSING_VARIABLE_VALUE;
    return [variableRowLabel(name, variableRoles), resolvedValue ?? MISSING_VARIABLE_VALUE];
  });
}
