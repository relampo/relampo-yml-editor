import { isNativeSampler } from '../utils/protocolChildren';
import { nativeDebugConfiguration, nativeDebugExtractorNames, dataSourceVariableNames } from './debugNativeRequests';
import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { buildRelampoRegex } from './debugSearch';

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

const REQUEST_TYPES = new Set([
  'sql',
  'websocket',
  'grpc',
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
]);
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

function isRedirectFollowUpEvent(event: DebugEventLike): boolean {
  const role = String(event.chain_role ?? '')
    .trim()
    .toLowerCase();
  return role === 'hop' || role === 'final' || (event.redirect_index ?? 0) > 0;
}

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
  if (
    String(event.chain_role ?? '')
      .trim()
      .toLowerCase() === 'final'
  ) {
    return children.find(node => chainRoleOf(node) === 'final') ?? null;
  }
  return null;
}

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

function requestNumberFromNode(node: YAMLNode | null): string {
  const treeLabel = node?.name.match(/^\[(\d+(?:\.\d+)*)\]/)?.[1]?.trim();
  if (treeLabel) return treeLabel;
  return String(node?.data?.request_id ?? '').trim();
}

export function debugEventRequestNumber(
  event: DebugEventLike,
  matchedNode: YAMLNode | null,
  requestNodes: YAMLNode[],
): string {
  const chainId = String(event.chain_id ?? '').trim();
  if (chainId && isRedirectFollowUpEvent(event) && !redirectChainParentDisablesFollow(chainId, requestNodes)) {
    const treeNumber = requestNumberFromNode(matchedNode);
    if (treeNumber) return treeNumber;

    const parent = redirectChainParent(chainId, requestNodes);
    const parentId = parent?.data?.request_id;
    const base =
      parentId !== undefined && parentId !== null && String(parentId).trim() !== ''
        ? String(parentId).trim()
        : String(event.request_id ?? '').trim();
    const position = redirectChainPosition(event, matchedNode, chainId, requestNodes);
    return position > 0 ? `${base}.${position}` : base;
  }
  if (chainId && redirectChainParentDisablesFollow(chainId, requestNodes)) {
    return requestNumberFromNode(matchedNode) || String(event.request_id ?? '').trim();
  }
  return String(event.request_id ?? matchedNode?.data?.request_id ?? '').trim();
}

export type SkippedRedirectHop = {
  node: YAMLNode;
  position: number;
  afterEventIndex: number;
};

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
  const eventChainId = String(event.chain_id ?? '').trim();
  let unresolvedRedirectFollowUp = false;
  if (
    eventChainId &&
    isRedirectFollowUpEvent(event) &&
    !redirectChainParentDisablesFollow(eventChainId, requestTargets)
  ) {
    const directMatch = matchRedirectChainChildToNode(event, eventChainId, requestTargets);
    if (directMatch) return directMatch;
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

export function requestExtractorVariableNames(node: YAMLNode | null): string[] {
  if (node) {
    const native = nativeDebugExtractorNames(node);
    if (native) return native;
  }
  if (!node?.children) return [];
  const names = new Set<string>();
  node.children.forEach(child => {
    if (child.type !== 'extractor' && child.type !== 'extract') return;
    const name = extractorVariableName(child);
    if (name) names.add(name);
  });
  return [...names];
}

function collectPlaceholderNames(value: unknown, into: Set<string>, variables: Record<string, string>): void {
  if (typeof value === 'string') {
    let cursor = 0;
    while (cursor < value.length) {
      const start = value.indexOf('{{', cursor);
      if (start < 0) break;
      let depth = 1;
      let end = start + 2;
      while (end < value.length && depth > 0) {
        if (value.startsWith('{{', end)) {
          depth += 1;
          end += 2;
        } else if (value.startsWith('}}', end)) {
          depth -= 1;
          end += 2;
        } else {
          end += 1;
        }
      }
      if (depth !== 0) break;
      const expression = value.slice(start + 2, end - 2).trim();
      if (isBuiltinExpression(expression) && !Object.prototype.hasOwnProperty.call(variables, expression)) {
        collectPlaceholderNames(expression, into, variables);
      } else if (expression) {
        into.add(expression);
      }
      cursor = end;
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectPlaceholderNames(item, into, variables));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectPlaceholderNames(item, into, variables));
  }
}

function isBuiltinExpression(expression: string): boolean {
  return /^[_$](?![_$])[A-Za-z][A-Za-z0-9_.]*(?:\s*\(|$)/.test(expression);
}

function requestReferencedVariableNames(node: YAMLNode | null, variables: Record<string, string> = {}): string[] {
  if (!node) return [];
  const names = new Set<string>();
  const native = nativeDebugConfiguration(node);
  if (native) {
    collectPlaceholderNames(native, names, variables);
    dataSourceVariableNames((native.data_source || {}) as Record<string, unknown>).forEach(name => names.add(name));
    return [...names];
  }
  collectPlaceholderNames(node.data, names, variables);
  node.children?.forEach(child => {
    if (REQUEST_TYPES.has(child.type)) return;
    collectPlaceholderNames(child.data, names, variables);
    if (child.type === 'data_source') {
      dataSourceVariableNames((child.data || {}) as Record<string, unknown>).forEach(name => names.add(name));
    }
  });
  return [...names];
}

export function requestVariableNames(node: YAMLNode | null, variables: Record<string, string> = {}): string[] {
  const names = new Set<string>();
  for (const name of [...requestExtractorVariableNames(node), ...requestReferencedVariableNames(node, variables)]) {
    names.add(name);
  }
  return [...names];
}

export type VariableRole = 'REQ' | 'RES' | 'VAR';

export type VariableValueContext = {
  requestBody?: string;
  requestHeaders?: Record<string, string>;
  requestUrl?: string;
  builtinValues?: unknown[];
  declaredBuiltinValues?: Record<string, string>;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  statusLine?: string;
  missingValueLabel?: string;
};

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
    } catch {}
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
  const builtinValues = new Set((context.builtinValues ?? []).map(value => String(value)));
  const namesByValue = new Map<string, string[]>();
  Object.entries(variables).forEach(([name, value]) => {
    if (!value) return;
    const names = namesByValue.get(value);
    if (names) names.push(name);
    else namesByValue.set(value, [name]);
  });
  return [...namesByValue].flatMap(([value, names]) =>
    requestValues.has(value) && !builtinValues.has(value) && names.length === 1 ? names : [],
  );
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
  } catch {}
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
  requestReferencedVariableNames(node, variables).forEach(name => tag(name, 'REQ'));
  runtimeRequestVariableNames(variables, context).forEach(name => tag(name, 'REQ'));
  Object.keys(context.declaredBuiltinValues ?? {}).forEach(name => {
    if (!roles.has(name)) tag(name, 'VAR');
  });
  return roles;
}

export function variableRowLabel(name: string, roles: Set<VariableRole> | undefined): string {
  const tags = (['REQ', 'RES', 'VAR'] as VariableRole[]).filter(role => roles?.has(role));
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
  return buildRelampoRegex(pattern, 'gs');
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
  const matches = [...source.matchAll(regex)];
  const match = matches[captureMatchIndex(data)];
  if (!match) return null;
  const group = captureGroupIndex(data);
  return match[group] ?? match[0] ?? null;
}

function responseExtractorValues(node: YAMLNode | null, context: VariableValueContext): Map<string, string> {
  const values = new Map<string, string>();
  if (node && isNativeSampler(node.type)) return values;
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

function displayVariableValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function structuredBody(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    if (!value.includes('=')) return value;
    const fields = new URLSearchParams(value);
    return Object.fromEntries(
      [...new Set(fields.keys())].map(name => {
        const values = fields.getAll(name);
        return [name, values.length === 1 ? values[0] : values];
      }),
    );
  }
}

function capturedRequestVariables(node: YAMLNode, context: VariableValueContext): Map<string, string> {
  const values = resolvedRequestUrlVariables(node, context);
  const visit = (template: unknown, captured: unknown) => {
    if (typeof template === 'string') {
      const match = template.match(/^\{\{([^{}]+)\}\}$|^\$\{([^{}]+)\}$/);
      if (match && !isBuiltinExpression((match[1] ?? match[2]).trim()) && captured !== undefined)
        values.set((match[1] ?? match[2]).trim(), typeof captured === 'string' ? captured : JSON.stringify(captured));
    } else if (template && typeof template === 'object' && captured && typeof captured === 'object') {
      for (const [key, field] of Object.entries(template))
        if (Object.hasOwn(captured, key)) visit(field, (captured as Record<string, unknown>)[key]);
    }
  };
  let template = node.data?.body ?? node.data?.body_raw;
  const contentType = Object.entries(context.requestHeaders ?? node.data?.headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'content-type',
  )?.[1];
  if (Array.isArray(template) && String(contentType).toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    const fields = new URLSearchParams();
    for (const item of template)
      if (item && typeof item === 'object')
        for (const [key, value] of Object.entries(item)) fields.append(key, String(value ?? ''));
    template = fields.toString();
  }
  visit(structuredBody(template), structuredBody(context.requestBody));
  for (const [name, templateValue] of Object.entries(node.data?.headers ?? {})) {
    const captured = Object.entries(context.requestHeaders ?? {}).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1];
    visit(templateValue, captured);
  }
  return values;
}

function requestBodyFieldRows(
  node: YAMLNode,
  variables: Record<string, string>,
  context: VariableValueContext,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const visit = (template: unknown, captured: unknown, path: string[]) => {
    if (typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
      const text = String(template);
      const hasBuiltin = [...text.matchAll(/\{\{([^{}]*)/g)].some(
        ([, expression]) => isBuiltinExpression(expression.trim()) && !Object.hasOwn(variables, expression.trim()),
      );
      const isLiteral = !text.includes('{{') && !text.includes('${');
      const name = [...path].reverse().find(part => !/^\d+$/.test(part));
      if (name && (hasBuiltin || (isLiteral && captured !== undefined))) {
        const value = typeof captured === 'string' ? captured : JSON.stringify(captured);
        rows.push([
          `${name} (REQ)`,
          value ?? context.missingValueLabel ?? MISSING_VARIABLE_VALUE,
        ]);
      }
      return;
    }
    if (template && typeof template === 'object') {
      Object.entries(template).forEach(([key, field]) => {
        const value =
          captured && typeof captured === 'object' && Object.hasOwn(captured, key)
            ? (captured as Record<string, unknown>)[key]
            : undefined;
        visit(field, value, [...path, key]);
      });
    }
  };
  let template = node.data?.body ?? node.data?.body_raw;
  const contentType = [
    ...Object.entries(context.requestHeaders ?? {}),
    ...Object.entries(node.data?.headers ?? {}),
  ].find(([name]) => name.toLowerCase() === 'content-type')?.[1];
  if (
    Array.isArray(template) &&
    typeof contentType === 'string' &&
    contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')
  ) {
    const fields = new URLSearchParams();
    for (const item of template)
      if (item && typeof item === 'object')
        for (const [name, value] of Object.entries(item)) fields.append(name, String(value ?? ''));
    template = fields.toString();
  }
  visit(structuredBody(template), structuredBody(context.requestBody), []);
  return rows;
}

export function variableRowsForRequestNode(
  node: YAMLNode | null,
  variables: Record<string, string>,
  context: VariableValueContext = {},
): Array<[string, string]> {
  if (!node) return [];
  const roles = requestVariableRoles(node, variables, context);
  const extracted = responseExtractorValues(node, context);
  const sent = capturedRequestVariables(node, context);
  for (const name of sent.keys()) if (!roles.has(name)) roles.set(name, new Set(['REQ']));
  const missingValue = context.missingValueLabel ?? MISSING_VARIABLE_VALUE;
  const rows = [...roles].map<[string, string]>(([name, variableRoles]) => {
    const declaredValue = context.declaredBuiltinValues?.[name];
    const capturedValue = variables[name];
    const resolvedValue =
      declaredValue !== undefined
        ? capturedValue !== undefined && !capturedValue.includes('{{') && !capturedValue.includes('${')
          ? capturedValue
          : declaredValue
        : variableRoles?.has('RES') && extracted.has(name)
          ? extracted.get(name)
          : variableRoles?.has('REQ') && sent.has(name)
            ? sent.get(name)
            : Object.prototype.hasOwnProperty.call(variables, name)
              ? variables[name]
              : missingValue;
    return [
      variableRowLabel(name, variableRoles),
      resolvedValue === undefined
        ? missingValue
        : isNativeSampler(node.type)
          ? resolvedValue
          : displayVariableValue(resolvedValue),
    ];
  });
  return [...rows, ...requestBodyFieldRows(node, variables, context)];
}
