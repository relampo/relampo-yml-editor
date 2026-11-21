import type { YAMLNode, YAMLNodeData } from '../../types/yaml';
import { buildRequestNodeLabel, isHttpRequestNodeType } from '../../utils/requestNodeDisplay';

const NAMED_COMPONENT_TYPES = new Set<YAMLNode['type']>([
  'root',
  'test',
  'scenario',
  'group',
  'simple',
  'transaction',
  'parallel',
  'balanced',
  'one_time',
  'data_source',
  'sql',
]);

export function replacementNodeData(node: YAMLNode, wholeDocument: boolean): YAMLNodeData | undefined {
  if (!wholeDocument) return node.data;
  const namedRequest =
    isHttpRequestNodeType(node.type) &&
    (typeof node.data?.name === 'string' ||
      node.name !== buildRequestNodeLabel(node.type, node.data as Record<string, unknown> | undefined));
  if (!NAMED_COMPONENT_TYPES.has(node.type) && !namedRequest) return node.data;
  const data = { ...node.data, name: node.name };
  delete data.__name;
  return data;
}

function validationLabels(node: YAMLNode, data: YAMLNodeData | undefined): string[] {
  if (node.type === 'extract' || node.type === 'extractor') {
    return [`Extract: ${data?.var || data?.variable || 'unknown'}`];
  }
  if (node.type !== 'assert' && node.type !== 'assertion') return [];
  const value = data as Record<string, unknown> | undefined;
  const label = value?.type || value?.name || 'check';
  const details = [
    value?.value || value?.pattern || value?.name || '',
    value?.value || value?.pattern || '',
    value?.value || '',
  ];
  return [
    ...details.map(detail => `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`),
    `Assert: ${value?.assertion} = ${value?.value}`,
  ];
}

export function updatedValidationLabel(node: YAMLNode, data: YAMLNodeData | undefined): string | undefined {
  const index = validationLabels(node, node.data).indexOf(node.name);
  return index >= 0 ? validationLabels(node, data)[index] : undefined;
}
