import type { YAMLNode, YAMLNodeType } from '../../types/yaml';

const REQUEST_LIKE_NODE_TYPES: readonly YAMLNodeType[] = [
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'sql',
];

function nodeDirectlyMatches(node: YAMLNode, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  return nodeDirectlyMatchesQuery(node, query);
}

function nodeDirectlyMatchesQuery(node: YAMLNode, query: string): boolean {
  if (!query) return true;

  if (nodeNameOrPathMatches(node, query)) return true;

  const dataPayload = serializeSearchValue(getNodeRequestSearchPayload(node));
  if (dataPayload.includes(query)) return true;

  const responsePayload = serializeSearchValue(node.data?.response);
  if (responsePayload.includes(query)) return true;

  return false;
}

export type SearchNodeState = {
  directMatch: boolean;
  subtreeMatch: boolean;
  expandsDescendants: boolean;
};

/**
 * Builds the search state for every node in one post-order traversal.
 * Reusing this index avoids rescanning the same subtrees for every sibling.
 */
export function buildSearchIndex(tree: YAMLNode, searchQuery: string): Map<string, SearchNodeState> {
  const query = searchQuery.trim().toLowerCase();
  const index = new Map<string, SearchNodeState>();

  const visit = (node: YAMLNode): boolean => {
    const directMatch = nodeDirectlyMatchesQuery(node, query);
    const nameOrPathMatch = nodeNameOrPathMatches(node, query);
    const childMatches = node.children?.map(visit) ?? [];
    const subtreeMatch = directMatch || childMatches.some(Boolean);
    const expandsDescendants =
      !REQUEST_LIKE_NODE_TYPES.includes(node.type) && (nameOrPathMatch || (!node.children?.length && directMatch));

    index.set(node.id, { directMatch, subtreeMatch, expandsDescendants });
    return subtreeMatch;
  };

  visit(tree);
  return index;
}

export function nodeMatchExpandsDescendants(node: YAMLNode, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return false;

  if (REQUEST_LIKE_NODE_TYPES.includes(node.type)) return false;

  if (nodeNameOrPathMatches(node, query)) return true;

  return !node.children?.length && nodeDirectlyMatches(node, searchQuery);
}

export function subtreeHasMatch(node: YAMLNode, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  if (nodeDirectlyMatches(node, searchQuery)) return true;

  if (node.children) {
    return node.children.some(child => subtreeHasMatch(child, searchQuery));
  }

  return false;
}

export function countMatchingNodes(tree: YAMLNode | null, searchQuery: string): number {
  const query = searchQuery.trim();
  if (!tree || !query) return 0;

  let count = 0;
  const visit = (node: YAMLNode) => {
    if (nodeDirectlyMatches(node, query)) count += 1;
    node.children?.forEach(visit);
  };
  visit(tree);
  return count;
}

function nodeNameOrPathMatches(node: YAMLNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query)) return true;

  return node.path?.some(segment => String(segment).toLowerCase().includes(query)) ?? false;
}

const SHARED_REQUEST_TAG_STRIP_KEYS = new Set([
  'response',
  'response_preview',
  'recorded_at',
  'chain_id',
  'chain_role',
  'headers',
]);

const REQUEST_ONLY_TAG_STRIP_KEYS = new Set(['extract', 'extractors', 'assert', 'assertions']);

function stripRequestTagMetadata(value: unknown, nodeType: YAMLNodeType): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const next: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  SHARED_REQUEST_TAG_STRIP_KEYS.forEach(k => delete next[k]);
  if (nodeType !== 'sql') {
    REQUEST_ONLY_TAG_STRIP_KEYS.forEach(k => delete next[k]);
  }
  return next;
}

function getNodeRequestSearchPayload(node: YAMLNode): unknown {
  if (!REQUEST_LIKE_NODE_TYPES.includes(node.type)) return stripResponseField(node.data);

  const payload = stripRequestTagMetadata(node.data, node.type);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

  const url = (payload as Record<string, unknown>).url;
  if (typeof url !== 'string') return payload;

  return {
    ...(payload as Record<string, unknown>),
    url: `${url} ${decodeUrlForSearch(url)}`,
  };
}

function decodeUrlForSearch(url: string): string {
  try {
    return decodeURIComponent(url.replace(/\+/g, ' '));
  } catch {
    return url;
  }
}

export function getNodeSearchHitFlags(node: YAMLNode, searchQuery: string): { request: boolean; response: boolean } {
  const query = searchQuery.trim().toLowerCase();
  if (!query || !REQUEST_LIKE_NODE_TYPES.includes(node.type)) {
    return { request: false, response: false };
  }

  const requestPayload = serializeSearchValue(getNodeRequestSearchPayload(node));
  const responsePayload = serializeSearchValue(node.data?.response);

  return {
    request: requestPayload.includes(query),
    response: responsePayload.includes(query),
  };
}

function stripResponseField(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const next: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  delete next.response;
  return next;
}

function serializeSearchValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
  if (Array.isArray(value)) {
    return value.map(serializeSearchValue).join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .flatMap(([key, nestedValue]) => [key.toLowerCase(), serializeSearchValue(nestedValue)])
      .filter(Boolean)
      .join(' ');
  }
  return '';
}
