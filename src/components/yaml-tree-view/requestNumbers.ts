import type { YAMLNode } from '../../types/yaml';
import { isHttpRequestNodeType } from '../../utils/requestNodeDisplay';

/** Display order, independent of recorded request IDs, visibility and enabled state. */
export function buildRequestNumbers(root: YAMLNode | null): Map<string, number> {
  const numbers = new Map<string, number>();
  const walk = (node: YAMLNode, counter: { value: number }) => {
    const scope = node.type === 'scenario' ? { value: 0 } : counter;
    if (isHttpRequestNodeType(node.type) || node.type === 'grpc' || node.type === 'websocket' || node.type === 'sql') numbers.set(node.id, ++scope.value);
    node.children?.forEach(child => walk(child, scope));
  };
  if (root) walk(root, { value: 0 });
  return numbers;
}

export function getNumberedRequestName(name: string, number: number | undefined): string {
  if (number === undefined) return name;
  return `[${number}] ${name.replace(/^\[\d+\]\s*/, '')}`;
}
