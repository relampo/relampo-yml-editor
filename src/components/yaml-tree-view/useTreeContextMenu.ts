import { useState } from 'react';
import type { YAMLNode } from '../../types/yaml';

interface ContextMenuState {
  x: number;
  y: number;
  node: YAMLNode;
}

interface UseTreeContextMenuParams {
  activeSelectedIds: string[];
  effectiveSelectedIds: string[];
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onContextMenuOpened?: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
}

export function useTreeContextMenu({
  activeSelectedIds,
  effectiveSelectedIds,
  onSelectionChange,
  onContextMenuOpened,
}: UseTreeContextMenuParams) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = (e: React.MouseEvent, node: YAMLNode) => {
    e.preventDefault();

    if (!activeSelectedIds.includes(node.id)) {
      onSelectionChange(node, [node.id]);
    }

    const isTouchOnlyDevice =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches === true &&
      window.matchMedia?.('(any-pointer: fine)').matches !== true;
    if (isTouchOnlyDevice) {
      setContextMenu(null);
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });

    const contextSelectionIds =
      activeSelectedIds.includes(node.id) && effectiveSelectedIds.includes(node.id) && effectiveSelectedIds.length > 1
        ? effectiveSelectedIds
        : [node.id];
    onContextMenuOpened?.({
      nodeType: node.type,
      selectionCount: contextSelectionIds.length,
      hasMultiSelection: contextSelectionIds.length > 1,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const getContextActionTargetIds = (fallbackNodeId?: string): string[] => {
    const fallback = fallbackNodeId ? [fallbackNodeId] : [];
    if (!contextMenu) return fallback;

    const contextNodeId = contextMenu.node.id;
    const contextInSelection = effectiveSelectedIds.includes(contextNodeId);

    if (contextInSelection && effectiveSelectedIds.length > 1) {
      return effectiveSelectedIds;
    }

    return [contextNodeId];
  };

  return { contextMenu, handleContextMenu, handleCloseContextMenu, getContextActionTargetIds };
}
