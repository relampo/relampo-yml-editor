import { receivePaths } from '../../utils/protocolChildren';
import { useSyncExternalStore } from 'react';
import { treeClipboard } from '../../utils/treeClipboard';
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
import { buildParentMap, canAddNodeToTarget, canDuplicateNode, findNodeById } from './treeViewHelpers';

interface ContextMenuState {
  x: number;
  y: number;
  node: YAMLNode;
}

interface UseTreeMutationsParams {
  tree: YAMLNode | null;
  onTreeChange: (tree: YAMLNode, nextSelection?: { primaryId: string | null; nodeIds: string[] }) => void;
  onTreeViewChange?: (tree: YAMLNode) => void;
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
  onTreeViewChange,
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
  const clipboardNodes = useSyncExternalStore(
    treeClipboard.subscribe,
    treeClipboard.getSnapshot,
    treeClipboard.getSnapshot,
  );

  // Commit the new tree and its selection together. Selecting before the parent
  // accepts the tree can leave the details panel pointing at a stale node.
  const commitInsertedTree = (updatedTree: YAMLNode) => {
    const previousIds = buildParentMap(tree);
    const insertedNodes: YAMLNode[] = [];
    const collect = (node: YAMLNode) => {
      if (!previousIds.has(node.id)) insertedNodes.push(node);
      else node.children?.forEach(collect);
    };
    collect(updatedTree);
    if (!insertedNodes.length) return;
    onTreeChange(updatedTree, {
      primaryId: insertedNodes[insertedNodes.length - 1].id,
      nodeIds: insertedNodes.map(node => node.id),
    });
  };

  const handleNodeToggle = (nodeId: string) => {
    if (!tree) return;

    const updatedTree = toggleNodeInTree(tree, nodeId);
    if (onTreeViewChange) {
      onTreeViewChange(updatedTree);
    } else {
      onTreeChange(updatedTree);
    }
  };

  const handleAddNode = (nodeType: YAMLAddableNodeType) => {
    if (!contextMenu || !tree) return;

    if (nodeType === 'sql_defaults') {
      const existing = tree.children?.find(child => child.type === 'sql_defaults');
      if (existing) {
        onSelectionChange(existing, [existing.id]);
        handleCloseContextMenu();
        return;
      }
    }

    const targetIds = getContextActionTargetIds();
    const updatedTree = targetIds.reduce((currentTree, targetId) => {
      const target = findNodeById(currentTree, targetId);
      if (!target) return currentTree;
      if (!canAddNodeToTarget(target, nodeType)) return currentTree;

      const newNode = createNodeByType(nodeType, { balancedName: t('yamlEditor.balanced.name') });
      if (target.type === 'sql' && nodeType === 'extractor') {
        newNode.data = { type: 'sql', var: 'extracted_value', column: '', row: 1 };
        newNode.name = t('yamlEditor.shell.addable.extractor');
      }
      if (target.type === 'websocket' && ['assertion', 'extractor'].includes(nodeType)) {
        const path = receivePaths((target.data || {}) as Record<string, unknown>).at(-1)!;
        newNode.protocolTarget = [...path, nodeType === 'assertion' ? 'assertions' : 'extractors', -1];
      }
      if (['grpc', 'websocket'].includes(target.type) && nodeType === 'assertion')
        newNode.data = { type: 'contains', value: '' };
      if (target.type === 'sql' && nodeType === 'assertion')
        newNode.data = { type: target.data?.kind === 'exec' ? 'rows_affected' : 'rows_returned', value: { min: 1 } };
      if (target.type === 'websocket' && nodeType === 'file') newNode.data = { path: '' };
      if (target.type === 'grpc' && nodeType === 'headers') newNode.data = {};
      if (nodeType === 'grpc_defaults' || nodeType === 'sql_defaults') {
        if (currentTree.children?.some(child => child.type === nodeType)) return currentTree;
        return addNodeToTree(currentTree, currentTree.id, newNode, true);
      }
      return addNodeToTree(currentTree, targetId, newNode, true);
    }, tree);
    commitInsertedTree(updatedTree);
    handleCloseContextMenu();
  };

  const handleDuplicateNode = (nodeId: string) => {
    if (!tree) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const targetIds = getContextActionTargetIds(nodeId);
    const updatedTree = targetIds.reduce((currentTree, targetId) => {
      const target = findNodeById(currentTree, targetId);
      if (!canDuplicateNode(target)) return currentTree;
      return duplicateNodeInTree(currentTree, targetId, copySuffix);
    }, tree);
    commitInsertedTree(updatedTree);
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

    treeClipboard.copy(copied);
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
      const insertionOrder = targetNode.type === 'scenarios' ? pastedNodes : [...pastedNodes].reverse();
      updatedTree = insertionOrder.reduce((currentTree, node) => addNodeToTree(currentTree, targetNode.id, node), tree);
    } else if (targetNode.id === tree.id) {
      updatedTree = [...pastedNodes]
        .reverse()
        .reduce((currentTree, node) => addNodeToTree(currentTree, tree.id, node), tree);
    } else {
      updatedTree = insertNodesAfterTarget(tree, targetNode.id, pastedNodes);
    }

    commitInsertedTree(updatedTree);
  };

  const handleBulkDuplicate = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const updatedTree = effectiveSelectedIds.reduce((currentTree, nodeId) => {
      const target = findNodeById(currentTree, nodeId);
      if (!canDuplicateNode(target)) return currentTree;
      return duplicateNodeInTree(currentTree, nodeId, copySuffix);
    }, tree);
    commitInsertedTree(updatedTree);
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
