import type { YAMLNode, YAMLNodeType } from '../../types/yaml';

const REQUEST_TYPES = new Set<YAMLNodeType>([
  'request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options',
  'websocket', 'grpc', 'sql',
]);

// Use the complete document, so folding and search never change the sequence.
// These ordinals describe document order, including parallel branches, not timing.
export function buildRequestNumbers(tree: YAMLNode): Map<string, number> {
  const numbers = new Map<string, number>();
  const visit = (node: YAMLNode) => {
    if (REQUEST_TYPES.has(node.type)) numbers.set(node.id, numbers.size + 1);
    node.children?.forEach(visit);
  };
  visit(tree);
  return numbers;
}

export function getNumberedRequestName(name: string, number: number | undefined): string {
  if (number === undefined) return name;
  return `[${number}] ${name.replace(/^\[\d+\]\s*/, '')}`;
}
