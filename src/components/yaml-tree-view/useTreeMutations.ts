import { useState } from 'react';
import type { RedirectedRequestInfo, YAMLNode } from '../../types/yaml';
import { canContain } from '../../utils/yamlDragDropRules';
import type { YAMLAddableNodeType } from './addableItems';
import { createNodeByType } from './nodeFactory';
import {
  addNodeToTree,
  cloneNodeSnapshot,
  cloneNodeWithNewIds,
  duplicateNodeInTree,
  insertNodesAfterTarget,
  moveNodeInTree,
  removeNodeFromTree,
  syncRedirectSourceFollowRedirects,
  toggleNodeInTree,
  updateNodeEnabled,
  wrapNodesInTransaction,
} from './treeOperations';
import { canAddNodeToTarget, canDuplicateNode, findNodeById } from './treeViewHelpers';

interface ContextMenuState {
  x: number;
  y: number;
  node: YAMLNode;
}

interface UseTreeMutationsParams {
  tree: YAMLNode | null;
  onTreeChange: (tree: YAMLNode, nextSelection?: { primaryId: string | null; nodeIds: string[] }) => void;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  effectiveSelectedIds: string[];
  visibleNodes: YAMLNode[];
  nodeById: Map<string, YAMLNode>;
  selectedNode: YAMLNode | null;
  allSelectedDisabled: boolean;
  t: (key: string) => string;
  contextMenu: ContextMenuState | null;
  getContextActionTargetIds: (fallbackNodeId?: string) => string[];
  handleCloseContextMenu: () => void;
}

/** All tree-mutating handlers (add/duplicate/remove/move/toggle, bulk actions, copy/paste). */
export function useTreeMutations({
  tree,
  onTreeChange,
  onSelectionChange,
  redirectedRequestMap,
  effectiveSelectedIds,
  visibleNodes,
  nodeById,
  selectedNode,
  allSelectedDisabled,
  t,
  contextMenu,
  getContextActionTargetIds,
  handleCloseContextMenu,
}: UseTreeMutationsParams) {
  const [clipboardNodes, setClipboardNodes] = useState<YAMLNode[]>([]);

  const handleNodeToggle = (nodeId: string) => {
    if (!tree) return;

    const updatedTree = toggleNodeInTree(tree, nodeId);
    onTreeChange(updatedTree);
  };

  const handleAddNode = (nodeType: YAMLAddableNodeType) => {
    if (!contextMenu || !tree) return;

    const targetIds = getContextActionTargetIds();
    const createdNodes: YAMLNode[] = [];

    const updatedTree = targetIds.reduce((currentTree, targetId) => {
      const target = findNodeById(currentTree, targetId);
      if (!target) return currentTree;
      if (!canAddNodeToTarget(target, nodeType)) return currentTree;

      const newNode = createNodeByType(nodeType, { balancedName: t('yamlEditor.balanced.name') });
      createdNodes.push(newNode);
      return addNodeToTree(currentTree, targetId, newNode);
    }, tree);
    onTreeChange(updatedTree);
    if (createdNodes.length > 0) {
      onSelectionChange(
        createdNodes[createdNodes.length - 1],
        createdNodes.map(node => node.id),
      );
    }
    handleCloseContextMenu();
  };

  const handleDuplicateNode = (nodeId: string) => {
    if (!tree) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const targetIds = getContextActionTargetIds(nodeId);
    const updatedTree = targetIds.reduce(
      (currentTree, targetId) => {
        const target = findNodeById(currentTree, targetId);
        if (!canDuplicateNode(target)) return currentTree;
        return duplicateNodeInTree(currentTree, targetId, copySuffix);
      },
      tree,
    );
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleRemoveNode = () => {
    if (!contextMenu || !tree) return;

    const targetIds = getContextActionTargetIds();
    const updatedTree = targetIds.reduce((currentTree, nodeId) => removeNodeFromTree(currentTree, nodeId), tree);
    onSelectionChange(null, []);
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleNodeMove = (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    if (!tree) return;

    const effectiveSelectedIdSet = new Set(effectiveSelectedIds);
    const draggedSelection = effectiveSelectedIdSet.has(nodeId)
      ? visibleNodes.reduce<string[]>((acc, node) => {
          if (effectiveSelectedIdSet.has(node.id)) acc.push(node.id);
          return acc;
        }, [])
      : [nodeId];

    if (draggedSelection.includes(targetId)) {
      return;
    }

    const moveOrder = position === 'after' ? [...draggedSelection].reverse() : draggedSelection;

    const updatedTree = moveOrder.reduce(
      (currentTree, draggedId) => moveNodeInTree(currentTree, draggedId, targetId, position),
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleToggleEnabled = (nodeId: string, enabled: boolean) => {
    if (!tree) return;

    const targetIds = getContextActionTargetIds(nodeId);
    const updatedTree = targetIds.reduce(
      (currentTree, targetId) =>
        syncRedirectSourceFollowRedirects(
          updateNodeEnabled(currentTree, targetId, enabled),
          targetId,
          enabled,
          redirectedRequestMap,
        ),
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleBulkDelete = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) => removeNodeFromTree(currentTree, nodeId),
      tree,
    );
    onSelectionChange(null, []);
    onTreeChange(updatedTree);
  };

  const handleCreateTransaction = () => {
    if (!tree) return;

    const result = wrapNodesInTransaction(tree, effectiveSelectedIds);
    if (!result) {
      return;
    }

    onTreeChange(result.tree, {
      primaryId: result.transactionNode.id,
      nodeIds: [result.transactionNode.id],
    });
  };

  const handleCopySelection = (nodeIds = effectiveSelectedIds) => {
    if (nodeIds.length === 0) return;

    const copied = nodeIds.flatMap(id => {
      const node = nodeById.get(id);
      return node ? [cloneNodeSnapshot(node)] : [];
    });

    setClipboardNodes(copied);
  };

  const handlePasteSelection = (targetOverride?: YAMLNode) => {
    if (!tree || clipboardNodes.length === 0) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const pastedNodes = clipboardNodes.flatMap(node =>
      canDuplicateNode(node) ? [cloneNodeWithNewIds(node, copySuffix)] : [],
    );
    if (pastedNodes.length === 0) return;

    const targetNode = targetOverride ?? (selectedNode && nodeById.get(selectedNode.id) ? selectedNode : tree);
    const canPasteInside = pastedNodes.every(node => canContain(targetNode.type, node.type));

    let updatedTree: YAMLNode;
    if (canPasteInside) {
      updatedTree = [...pastedNodes].reverse().reduce(
        (currentTree, node) => addNodeToTree(currentTree, targetNode.id, node),
        tree,
      );
    } else if (targetNode.id === tree.id) {
      updatedTree = [...pastedNodes].reverse().reduce(
        (currentTree, node) => addNodeToTree(currentTree, tree.id, node),
        tree,
      );
    } else {
      updatedTree = insertNodesAfterTarget(tree, targetNode.id, pastedNodes);
    }

    onTreeChange(updatedTree);
    onSelectionChange(
      pastedNodes[pastedNodes.length - 1] || null,
      pastedNodes.map(node => node.id),
    );
  };

  const handleBulkDuplicate = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) => {
        const target = findNodeById(currentTree, nodeId);
        if (!canDuplicateNode(target)) return currentTree;
        return duplicateNodeInTree(currentTree, nodeId, copySuffix);
      },
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleBulkToggleEnabled = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const nextEnabled = allSelectedDisabled;
    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) =>
        syncRedirectSourceFollowRedirects(
          updateNodeEnabled(currentTree, nodeId, nextEnabled),
          nodeId,
          nextEnabled,
          redirectedRequestMap,
        ),
      tree,
    );
    onTreeChange(updatedTree);
  };

  return {
    clipboardNodes,
    handleNodeToggle,
    handleAddNode,
    handleDuplicateNode,
    handleRemoveNode,
    handleNodeMove,
    handleToggleEnabled,
    handleBulkDelete,
    handleCreateTransaction,
    handleCopySelection,
    handlePasteSelection,
    handleBulkDuplicate,
    handleBulkToggleEnabled,
  };
}
