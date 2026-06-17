import type { YAMLNode } from '../types/yaml';
import type { EngineEvent } from '../utils/debugApi';

function normalizeDebugMethod(value: unknown): string {
  return String(value || 'GET').trim().toUpperCase();
}

function nodeDebugMethod(node: YAMLNode): string {
  return normalizeDebugMethod(node.data?.method || node.type);
}

function normalizeDebugURL(value: unknown): { full: string; path: string } {
  const raw = String(value || '').trim();
  if (!raw) return { full: '', path: '' };
  try {
    const parsed = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(raw, 'https://relampo.local');
    return {
      full: /^https?:\/\//i.test(raw) ? parsed.href : raw,
      path: `${parsed.pathname || '/'}${parsed.search || ''}`,
    };
  } catch {
    const stripped = raw.replace(/^[A-Z]+\s+/i, '').trim();
    return { full: stripped, path: stripped };
  }
}

function nodeDebugURL(node: YAMLNode): { full: string; path: string } {
  return normalizeDebugURL(node.data?.url || node.data?.path || node.name);
}

function nodeMatchesEventRequest(node: YAMLNode, event: EngineEvent): boolean {
  const eventMethod = normalizeDebugMethod(event.method);
  if (eventMethod && nodeDebugMethod(node) !== eventMethod) return false;

  const nodeURL = nodeDebugURL(node);
  const eventURL = normalizeDebugURL(event.path);
  if (!nodeURL.full || !eventURL.full) return false;

  return nodeURL.full === eventURL.full || nodeURL.path === eventURL.path;
}

function onlyUnique(nodes: YAMLNode[]): YAMLNode | null {
  return nodes.length === 1 ? nodes[0] : null;
}

function bestEventRequestMatch(event: EngineEvent, nodes: YAMLNode[], allowUniqueFallback: boolean): YAMLNode | null {
  const requestMatches = nodes.filter(node => nodeMatchesEventRequest(node, event));
  return onlyUnique(requestMatches) ?? (allowUniqueFallback ? onlyUnique(nodes) : null);
}

// Engine report names look like "[vu-1] Group/Sub:Request name #2". Prefer
// explicit redirect-chain metadata, then request_id, then exact unique
// name/URL matches. Disabled redirect children still represent timeline
// targets, so they remain selectable.
export function matchEventToNode(event: EngineEvent, requestNodes: YAMLNode[]): YAMLNode | null {
  const chainID = String(event.chain_id || '').trim();
  const chainRole = String(event.chain_role || '').trim().toLowerCase();
  if (chainID && chainRole) {
    const chainMatches = requestNodes.filter(
      node =>
        String(node.data?.chain_id || '').trim() === chainID &&
        String(node.data?.chain_role || '').trim().toLowerCase() === chainRole,
    );
    return bestEventRequestMatch(event, chainMatches, false);
  }

  if (event.request_id) {
    const requestIDMatches = requestNodes.filter(node => Number(node.data?.request_id) === event.request_id);
    const match = bestEventRequestMatch(event, requestIDMatches, true);
    if (match) return match;
  }

  const raw = event.name.replace(/^\[[^\]]+\]\s*/, '').replace(/\s+#\d+$/, '');
  const base = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1).trim() : raw.trim();
  const nameMatches = requestNodes.filter(node => node.name === raw || node.name === base);
  const nameMatch = onlyUnique(nameMatches);
  if (nameMatch) return nameMatch;

  return onlyUnique(requestNodes.filter(node => nodeMatchesEventRequest(node, event)));
}
