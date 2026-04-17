import { canContain } from '../../utils/yamlDragDropRules';
import type { YAMLNode } from '../../types/yaml';

export type TransactionWrapValidationReason =
  | 'minimum_selection'
  | 'missing_nodes'
  | 'same_parent'
  | 'supported_parent'
  | 'supported_child'
  | 'contiguous';

export interface TransactionWrapValidationResult {
  valid: boolean;
  reason?: TransactionWrapValidationReason;
  orderedNodeIds: string[];
  parentId?: string;
}

export function toggleNodeInTree(tree: YAMLNode, nodeId: string): YAMLNode {
  if (tree.id === nodeId) {
    return { ...tree, expanded: !tree.expanded };
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => toggleNodeInTree(child, nodeId)),
    };
  }

  return tree;
}

export function addNodeToTree(tree: YAMLNode, parentId: string, newNode: YAMLNode): YAMLNode {
  if (tree.id === parentId) {
    const children = tree.children || [];
    return {
      ...tree,
      children: [...children, newNode],
      expanded: true,
    };
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => addNodeToTree(child, parentId, newNode)),
    };
  }

  return tree;
}

export function removeNodeFromTree(tree: YAMLNode, nodeId: string): YAMLNode {
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.filter(child => child.id !== nodeId).map(child => removeNodeFromTree(child, nodeId)),
    };
  }

  return tree;
}

export function duplicateNodeInTree(tree: YAMLNode, nodeId: string, copySuffix: string): YAMLNode {
  let nodeToDuplicate: YAMLNode | null = null;

  const findNode = (node: YAMLNode) => {
    if (node.id === nodeId) {
      nodeToDuplicate = node;
      return;
    }
    node.children?.forEach(findNode);
  };

  findNode(tree);
  if (!nodeToDuplicate) return tree;

  const newNode = cloneNodeWithNewIds(nodeToDuplicate, copySuffix);

  const insertAfterOriginal = (node: YAMLNode): YAMLNode => {
    if (!node.children) return node;

    const index = node.children.findIndex(child => child.id === nodeId);
    if (index !== -1) {
      const newChildren = [...node.children];
      newChildren.splice(index + 1, 0, newNode);
      return { ...node, children: newChildren };
    }

    return {
      ...node,
      children: node.children.map(insertAfterOriginal),
    };
  };

  return insertAfterOriginal(tree);
}

export function insertNodesAfterTarget(tree: YAMLNode, targetId: string, newNodes: YAMLNode[]): YAMLNode {
  if (!newNodes.length) return tree;
  if (!tree.children) return tree;

  const index = tree.children.findIndex(child => child.id === targetId);
  if (index !== -1) {
    const newChildren = [...tree.children];
    newChildren.splice(index + 1, 0, ...newNodes);
    return { ...tree, children: newChildren };
  }

  return {
    ...tree,
    children: tree.children.map(child => insertNodesAfterTarget(child, targetId, newNodes)),
  };
}

export function cloneNodeSnapshot(node: YAMLNode): YAMLNode {
  return {
    ...node,
    children: node.children?.map(cloneNodeSnapshot),
  };
}

export function cloneNodeWithNewIds(node: YAMLNode, copySuffix?: string): YAMLNode {
  const newId = createNodeId();
  return {
    ...node,
    id: newId,
    name: copySuffix ? `${node.name} (${copySuffix})` : node.name,
    children: node.children?.map(child => cloneNodeWithNewIds(child, copySuffix)),
  };
}

export function updateNodeEnabled(tree: YAMLNode, nodeId: string, enabled: boolean): YAMLNode {
  const setEnabledInSubtree = (node: YAMLNode, nextEnabled: boolean): YAMLNode => ({
    ...node,
    data: { ...node.data, enabled: nextEnabled },
    children: node.children?.map(child => setEnabledInSubtree(child, nextEnabled)),
  });

  if (tree.id === nodeId) {
    return setEnabledInSubtree(tree, enabled);
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => updateNodeEnabled(child, nodeId, enabled)),
    };
  }

  return tree;
}

export function moveNodeInTree(
  tree: YAMLNode,
  nodeId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside',
): YAMLNode {
  if (nodeId === targetId) return tree;

  let nodeToMove: YAMLNode | null = null;

  const findNode = (node: YAMLNode): void => {
    if (node.id === nodeId) {
      nodeToMove = { ...node };
      return;
    }
    node.children?.forEach(findNode);
  };

  findNode(tree);
  if (!nodeToMove) return tree;

  const treeWithoutNode = removeNodeFromTree(tree, nodeId);
  let inserted = false;

  const insertNode = (node: YAMLNode): YAMLNode => {
    if (inserted) return node;

    if (position === 'inside' && node.id === targetId) {
      inserted = true;
      return {
        ...node,
        children: [...(node.children || []), nodeToMove!],
        expanded: true,
      };
    }

    if (!node.children?.length) return node;

    const targetIndex = node.children.findIndex(child => child.id === targetId);
    if (targetIndex !== -1 && (position === 'before' || position === 'after')) {
      inserted = true;
      const newChildren = [...node.children];
      newChildren.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, nodeToMove!);
      return { ...node, children: newChildren };
    }

    return {
      ...node,
      children: node.children.map(insertNode),
    };
  };

  const result = insertNode(treeWithoutNode);
  if (!inserted) {
    console.warn('[moveNodeInTree] No se pudo insertar el nodo');
    return tree;
  }

  return result;
}

export function getTransactionWrapValidation(tree: YAMLNode, nodeIds: string[]): TransactionWrapValidationResult {
  const uniqueNodeIds = Array.from(new Set(nodeIds));
  if (uniqueNodeIds.length < 2) {
    return {
      valid: false,
      reason: 'minimum_selection',
      orderedNodeIds: uniqueNodeIds,
    };
  }

  const parentMap = new Map<string, string | null>();
  const nodeMap = new Map<string, YAMLNode>();

  const walk = (node: YAMLNode, parentId: string | null) => {
    nodeMap.set(node.id, node);
    parentMap.set(node.id, parentId);
    node.children?.forEach(child => walk(child, node.id));
  };

  walk(tree, null);

  const selectedNodes = uniqueNodeIds.map(id => nodeMap.get(id));
  if (selectedNodes.some(node => !node)) {
    return {
      valid: false,
      reason: 'missing_nodes',
      orderedNodeIds: uniqueNodeIds,
    };
  }

  const firstParentId = parentMap.get(uniqueNodeIds[0]) ?? null;
  if (!firstParentId || uniqueNodeIds.some(id => (parentMap.get(id) ?? null) !== firstParentId)) {
    return {
      valid: false,
      reason: 'same_parent',
      orderedNodeIds: uniqueNodeIds,
    };
  }

  const parentNode = nodeMap.get(firstParentId);
  if (!parentNode || !canContain(parentNode.type, 'transaction')) {
    return {
      valid: false,
      reason: 'supported_parent',
      orderedNodeIds: uniqueNodeIds,
      parentId: firstParentId,
    };
  }

  const orderedSelection = (parentNode.children || []).filter(child => uniqueNodeIds.includes(child.id));
  if (orderedSelection.length !== uniqueNodeIds.length) {
    return {
      valid: false,
      reason: 'missing_nodes',
      orderedNodeIds: orderedSelection.map(node => node.id),
      parentId: firstParentId,
    };
  }

  if (orderedSelection.some(node => !canContain('transaction', node.type))) {
    return {
      valid: false,
      reason: 'supported_child',
      orderedNodeIds: orderedSelection.map(node => node.id),
      parentId: firstParentId,
    };
  }

  const indices = orderedSelection.map(node => parentNode.children!.findIndex(child => child.id === node.id));
  const contiguous = indices.every((index, position) => position === 0 || index === indices[position - 1] + 1);

  if (!contiguous) {
    return {
      valid: false,
      reason: 'contiguous',
      orderedNodeIds: orderedSelection.map(node => node.id),
      parentId: firstParentId,
    };
  }

  return {
    valid: true,
    orderedNodeIds: orderedSelection.map(node => node.id),
    parentId: firstParentId,
  };
}

export function wrapNodesInTransaction(
  tree: YAMLNode,
  nodeIds: string[],
): { tree: YAMLNode; transactionNode: YAMLNode } | null {
  const validation = getTransactionWrapValidation(tree, nodeIds);
  if (!validation.valid || !validation.parentId) {
    return null;
  }

  const orderedNodeIds = validation.orderedNodeIds;
  const transactionNodeId = createNodeId();
  let createdTransactionNode: YAMLNode | null = null;

  const wrapInsideParent = (node: YAMLNode): YAMLNode => {
    if (node.id !== validation.parentId || !node.children) {
      return {
        ...node,
        children: node.children?.map(wrapInsideParent),
      };
    }

    const selectedSet = new Set(orderedNodeIds);
    const firstIndex = node.children.findIndex(child => child.id === orderedNodeIds[0]);
    const lastIndex = node.children.findIndex(child => child.id === orderedNodeIds[orderedNodeIds.length - 1]);
    const selectedChildren = node.children.slice(firstIndex, lastIndex + 1);

    createdTransactionNode = {
      id: transactionNodeId,
      type: 'transaction',
      name: 'Transaction',
      children: selectedChildren,
      data: { name: 'Transaction' },
      expanded: true,
    };

    return {
      ...node,
      expanded: true,
      children: [
        ...node.children.slice(0, firstIndex),
        createdTransactionNode,
        ...node.children.slice(lastIndex + 1).filter(child => !selectedSet.has(child.id)),
      ],
    };
  };

  const updatedTree = wrapInsideParent(tree);
  return createdTransactionNode ? { tree: updatedTree, transactionNode: createdTransactionNode } : null;
}

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
