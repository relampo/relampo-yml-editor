import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';

export function getDraftRestoreError(language: string): string {
  return language === 'es'
    ? 'No se pudo restaurar el autoguardado del navegador. Puedes seguir editando o cargar un YAML.'
    : 'Could not restore the browser autosave. You can keep editing or upload a YAML file.';
}

export type ParseWorkerRequest = {
  id: number;
  yaml: string;
  rootName?: string;
};

export type ParseWorkerResponse =
  | { id: number; ok: true; tree: YAMLNode | null }
  | { id: number; ok: false; error: string };

export type TreeSelection = {
  primaryId: string | null;
  nodeIds: string[];
};

export function normalizeYamlFileName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'relampo-script.yaml';
  return /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yaml`;
}

export function findNodeById(node: YAMLNode, id: string): YAMLNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];

function getRedirectLocationHeader(node: YAMLNode): string {
  const headers = node.data?.response?.headers;
  if (!headers || typeof headers !== 'object') return '';
  return String(
    (headers as Record<string, unknown>).Location || (headers as Record<string, unknown>).location || '',
  ).trim();
}

function getResponseStatusCode(node: YAMLNode): number {
  const status = Number(node.data?.response?.status);
  return Number.isFinite(status) ? status : 0;
}

function getChainId(node: YAMLNode): string {
  return String(node.data?.chain_id ?? '').trim();
}

function getChainRole(node: YAMLNode): string {
  return String(node.data?.chain_role ?? '').trim().toLowerCase();
}

function normalizeUrlForCompare(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'http://relampo.local');
    const normalized = `${parsed.pathname || '/'}${parsed.search || ''}`;
    return normalized.replace(/\/+$/, '') || '/';
  } catch {
    const normalized = trimmed.replace(/^[a-z]+:\/\/[^/]+/i, '');
    return (normalized || '/').replace(/\/+$/, '') || '/';
  }
}

function normalizeRedirectLocationForCompare(location: string, sourceUrl: string): string {
  const trimmedLocation = String(location || '').trim();
  if (!trimmedLocation) return '';
  const trimmedSource = String(sourceUrl || '').trim();
  if (/^https?:\/\//i.test(trimmedSource)) {
    try {
      const resolved = new URL(trimmedLocation, trimmedSource);
      const normalized = `${resolved.pathname || '/'}${resolved.search || ''}`;
      return normalized.replace(/\/+$/, '') || '/';
    } catch {}
  }
  return normalizeUrlForCompare(trimmedLocation);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const URL_PLACEHOLDER = /(?:\{\{|%7B%7B)[\s\S]*?(?:\}\}|%7D%7D)/i;

function urlMatchesAllowingPlaceholders(normalizedTarget: string, normalizedLocation: string): boolean {
  const literals = normalizedTarget.split(URL_PLACEHOLDER);
  if (literals.length < 2) return false;
  return new RegExp(`^${literals.map(escapeRegExp).join('[^/?&#]*')}$`).test(normalizedLocation);
}

export function nodesStillFormRedirect(source: YAMLNode, target: YAMLNode): boolean {
  if (!REDIRECT_STATUS_CODES.includes(getResponseStatusCode(source))) return false;
  const location = getRedirectLocationHeader(source);
  if (!location) return false;
  const normalizedLocation = normalizeRedirectLocationForCompare(location, String(source.data?.url || ''));
  const normalizedTarget = normalizeUrlForCompare(String(target.data?.url || ''));
  if (!normalizedLocation || !normalizedTarget) return false;
  return normalizedLocation === normalizedTarget || urlMatchesAllowingPlaceholders(normalizedTarget, normalizedLocation);
}

export function detectRedirectFollowUps(tree: YAMLNode): Record<string, RedirectedRequestInfo> {
  const requestNodes: YAMLNode[] = [];
  const requestTypes = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);

  const walk = (node: YAMLNode) => {
    if (requestTypes.has(node.type)) requestNodes.push(node);
    node.children?.forEach(walk);
  };

  walk(tree);

  const result: Record<string, RedirectedRequestInfo> = {};

  for (let i = 0; i < requestNodes.length - 1; i += 1) {
    const source = requestNodes[i];
    const target = requestNodes[i + 1];
    if (!nodesStillFormRedirect(source, target)) continue;

    result[target.id] = {
      sourceNodeId: source.id,
      sourceRequestLabel: source.name,
      matchedLocation: normalizeRedirectLocationForCompare(
        getRedirectLocationHeader(source),
        String(source.data?.url || ''),
      ),
    };
  }

  const chains = new Map<string, YAMLNode[]>();
  for (const node of requestNodes) {
    const chainId = getChainId(node);
    if (!chainId) continue;
    const members = chains.get(chainId);
    if (members) members.push(node);
    else chains.set(chainId, [node]);
  }
  for (const members of chains.values()) {
    for (let k = 0; k < members.length; k += 1) {
      const node = members[k];
      const role = getChainRole(node);
      if (role !== 'hop' && role !== 'final') continue;
      if (result[node.id]) continue;
      const source =
        (k > 0 ? members[k - 1] : null) ??
        members.find(member => member !== node && getChainRole(member) === 'parent') ??
        null;
      if (!source) continue;
      result[node.id] = {
        sourceNodeId: source.id,
        sourceRequestLabel: source.name,
        matchedLocation: normalizeUrlForCompare(String(node.data?.url || '')),
      };
    }
  }

  return result;
}

export function lockTypedNodeSelectionInNode(node: YAMLNode): [YAMLNode, boolean] {
  let changed = false;
  let nextData = node.data;
  let nextChildren = node.children;

  if (node.type === 'assertion' || node.type === 'extractor') {
    const currentData = node.data || {};
    const cleaned = { ...currentData } as Record<string, unknown>;
    delete cleaned.__lockedType;
    delete cleaned.__allowTypeSelection;
    if (currentData.__lockedType !== undefined || currentData.__allowTypeSelection !== undefined) {
      nextData = cleaned;
      changed = true;
    }
  }

  if (node.children && node.children.length > 0) {
    let childChanged = false;
    const updatedChildren = node.children.map(child => {
      const [nextChild, wasChanged] = lockTypedNodeSelectionInNode(child);
      if (wasChanged) childChanged = true;
      return nextChild;
    });
    if (childChanged) {
      nextChildren = updatedChildren;
      changed = true;
    }
  }

  if (!changed) return [node, false];
  return [{ ...node, data: nextData, children: nextChildren }, true];
}
