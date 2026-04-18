import type { YAMLNode } from '../../types/yaml';
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

  const updateData = (nextData: Record<string, any>) => {
    onNodeUpdate?.(node.id, nextData);
  };

  const updateField = (field: string, value: any) => {
    updateData({ ...data, [field]: value });
  };

  const removeField = (field: string) => {
    const nextData = { ...data };
    delete nextData[field];
    updateData(nextData);
  };

  return {
    data,
    updateData,
    updateField,
    removeField,
  };
}
