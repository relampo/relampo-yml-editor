import type { YAMLNode, YAMLNodeData } from '../types/yaml';

export function rememberAuthoredData(node: YAMLNode, authored: YAMLNodeData): YAMLNode {
  return {
    ...node,
    authoredData: structuredClone(authored),
    initialData: structuredClone(node.data),
    authoredChildTypes: node.children?.map(child => child.type),
  };
}

/** Preserve original presence; write only fields actually changed by an editor control. */
export function authoredNodeData(node: YAMLNode): YAMLNodeData & Record<string, unknown> {
  if (!node.authoredData || !node.initialData) return { ...node.data };
  const data: YAMLNodeData & Record<string, unknown> = { ...node.authoredData };
  const initial = node.initialData as Record<string, unknown>;
  const current = (node.data || {}) as Record<string, unknown>;
  const result = data as Record<string, unknown>;
  for (const key of new Set([...Object.keys(initial), ...Object.keys(current)])) {
    if (key.startsWith('__')) continue;
    if (JSON.stringify(initial[key]) === JSON.stringify(current[key])) continue;
    if (current[key] === undefined) delete result[key];
    else result[key] = current[key];
  }
  // The URL control includes query_params. An explicit URL edit replaces that authored map.
  if ('query_params' in node.authoredData && initial.url !== current.url) delete result.query_params;
  return data;
}
