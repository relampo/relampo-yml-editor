import type { YAMLNode, YAMLNodeType, YAMLValue } from '../../types/yaml';

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
  if (!query) return true;

  if (nodeNameOrPathMatches(node, query)) return true;

  const dataPayload = serializeSearchValue(getNodeRequestSearchPayload(node));
  if (dataPayload.includes(query)) return true;

  const responsePayload = serializeSearchValue(node.data?.response);
  if (responsePayload.includes(query)) return true;

  return false;
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

function stripRequestTagMetadata(value: YAMLValue, nodeType: YAMLNodeType): YAMLValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const next = { ...value };
  SHARED_REQUEST_TAG_STRIP_KEYS.forEach(k => delete next[k]);
  if (nodeType !== 'sql') {
    REQUEST_ONLY_TAG_STRIP_KEYS.forEach(k => delete next[k]);
  }
  return next;
}

function getNodeRequestSearchPayload(node: YAMLNode): YAMLValue {
  return REQUEST_LIKE_NODE_TYPES.includes(node.type)
    ? stripRequestTagMetadata(node.data, node.type)
    : stripResponseField(node.data);
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

function stripResponseField(value: YAMLValue): YAMLValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const next = { ...value };
  delete next.response;
  return next;
}

function serializeSearchValue(value: YAMLValue): string {
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
