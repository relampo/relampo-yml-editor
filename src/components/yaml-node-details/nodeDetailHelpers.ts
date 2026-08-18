import type { YAMLNode, YAMLNodeData } from '../../types/yaml';
import type { NodeUpdateHandler } from '../../types/shared';

/**
 * Create a small set of helpers for updating a YAML node's `data` payload.
 *
 * The returned helpers are immutable snapshots of the current data at creation time:
 * each update call merges or clones that snapshot and sends it to `onNodeUpdate`.
 *
 * @param node - The YAML node whose `id` and existing `data` are used.
 * @param onNodeUpdate - Optional callback invoked as `(nodeId, nextData)`.
 * @returns An object exposing the raw `data` and helper functions:
 *          `updateData`, `updateField`, and `removeField`.
 */
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
