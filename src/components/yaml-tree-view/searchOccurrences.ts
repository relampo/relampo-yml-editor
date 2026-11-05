import type { YAMLNode } from '../../types/yaml';
import type { SearchScope } from './search';
import { replacementNodeData } from './replacementNodePresentation';
import { childOwnedDataKeys, textMatcher } from './treeOperations';

export interface SearchOccurrence {
  id: string;
  nodeId: string;
  scope: SearchScope;
  query: string;
  path: Array<string | number>;
  value: string;
  start: number;
  end: number;
  fieldIndex: number;
  bodyIndex: number;
  replaceable: boolean;
}

export function nodeSearchOccurrences(node: YAMLNode, query: string, scope: SearchScope): SearchOccurrence[] {
  const found: SearchOccurrence[] = [];
  if (
    scope === 'responses' &&
    !['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'sql'].includes(node.type)
  )
    return found;
  const excluded = childOwnedDataKeys(node);
  const request = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(node.type);
  if (request) ['enabled', 'method', 'response', 'response_preview'].forEach(key => excluded.add(key));
  let bodyIndex = 0;
  const visit = (value: unknown, path: Array<string | number>, encoded = false, replaceable = scope === 'requests') => {
    if (
      typeof value === 'string' ||
      (scope === 'responses' && (typeof value === 'number' || typeof value === 'boolean'))
    ) {
      const text = String(value);
      const matcher = textMatcher(query, encoded);
      if (!matcher) return;
      let fieldIndex = 0;
      for (const match of text.matchAll(matcher)) {
        const isBody = path[0] === 'body' || path[0] === 'body_raw' || (path[0] === 'response' && path[1] === 'body');
        found.push({
          id: `${node.id}:${JSON.stringify(path)}:${match.index}`,
          nodeId: node.id,
          scope,
          query,
          path,
          value: text,
          start: match.index,
          end: match.index + match[0].length,
          fieldIndex: fieldIndex++,
          bodyIndex: isBody ? bodyIndex++ : 0,
          replaceable,
        });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index], encoded, replaceable));
      return;
    }
    if (value && typeof value === 'object')
      for (const [key, item] of Object.entries(value)) {
        if (scope === 'responses') visit(key, [...path, key, '$key'], false, false);
        visit(item, [...path, key], encoded, replaceable);
      }
  };
  if (scope === 'responses') {
    if ('response' in (node.data ?? {})) visit(node.data?.response, ['response']);
    if ('response_preview' in (node.data ?? {}))
      visit((node.data as Record<string, unknown>).response_preview, ['response_preview']);
  } else {
    for (const [key, value] of Object.entries(replacementNodeData(node, true) ?? {})) {
      if (!excluded.has(key)) visit(value, [key], key === 'url');
    }
    // Built-in component labels (Load, Cookies, Headers, Steps, etc.) also
    // belong to Requests. Keep generated labels read-only and avoid counting
    // the same source value twice through its derived display label.
    if (
      !found.some(match => match.path[0] === 'name' || node.name.includes(match.value)) &&
      node.name.toLowerCase().includes(query.toLowerCase())
    ) visit(node.name, ['name'], false, false);
    // Searchable field names are read-only results, distinct from editable values.
    if (!found.length)
      for (const [key, value] of Object.entries(node.data ?? {})) {
        if (excluded.has(key) || key.startsWith('__')) continue;
        if (key.toLowerCase().includes(query.toLowerCase())) visit(key, [key, '$key'], false, false);
        if (value && typeof value === 'object') {
          const visitKeys = (record: unknown, path: Array<string | number>) => {
            if (!record || typeof record !== 'object') return;
            for (const [key, nested] of Object.entries(record)) {
              visit(key, [...path, key, '$key'], false, false);
              visitKeys(nested, [...path, key]);
            }
          };
          visitKeys(value, [key]);
        }
      }
  }
  return found;
}
