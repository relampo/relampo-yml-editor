import type { YAMLNode, YAMLNodeData } from '../../types/yaml';
import type { NodeUpdateHandler } from '../../types/shared';

export function createNodeDataUpdater(node: YAMLNode, onNodeUpdate?: NodeUpdateHandler) {
  const data = node.data || {};

  const updateData = (nextData: YAMLNodeData) => {
    onNodeUpdate?.(node.id, nextData as Record<string, unknown>);
  };

  const updateField = (field: string, value: unknown) => {
    updateData({ ...data, [field]: value } as YAMLNodeData);
  };

  const removeField = (field: string) => {
    const nextData = { ...data } as Record<string, unknown>;
    delete nextData[field];
    updateData(nextData as YAMLNodeData);
  };

  return {
    data,
    updateData,
    updateField,
    removeField,
  };
}
