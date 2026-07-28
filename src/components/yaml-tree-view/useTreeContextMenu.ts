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

/** Context-menu open/close state and the "which ids does this action target" resolution. */
export function useTreeContextMenu({
  activeSelectedIds,
  effectiveSelectedIds,
  onSelectionChange,
  onContextMenuOpened,
}: UseTreeContextMenuParams) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = (e: React.MouseEvent, node: YAMLNode) => {
    e.preventDefault();

    // If right-clicking an unselected node, target only that node for context actions.
    if (!activeSelectedIds.includes(node.id)) {
      onSelectionChange(node, [node.id]);
    }

    // Only suppress the mouse-oriented context menu on genuine touch-only
    // devices: a coarse primary pointer AND no fine pointer available at all.
    // Hybrid Windows laptops report `pointer: coarse` while a mouse is attached,
    // and display scaling (125%/150%) shrinks innerHeight below any fixed
    // threshold — the previous `(pointer: coarse)` and `innerHeight < 700` gates
    // both misfired on ordinary desktops and hid the menu inconsistently across
    // browsers (RLP-587). The menu itself clamps to the viewport and scrolls
    // (max-h-[80vh]), so a short viewport no longer needs special handling.
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
