import type { YAMLNode } from '../types/yaml';
import { getUpdatedRequestNodePresentation, isHttpRequestNodeType } from './requestNodeDisplay';

type NodeUpdateData = Record<string, unknown>;

type BatchNodeUpdate = {
  nodeId: string;
  data: NodeUpdateData;
};

type NodeUpdatePayload = NodeUpdateData & {
  __name?: unknown;
  __batchChildUpdates?: BatchNodeUpdate[];
};

function buildUpdatedNode(node: YAMLNode, updatedData: NodeUpdatePayload | NodeUpdateData): YAMLNode {
  const { __name, __batchChildUpdates, ...cleanData } = updatedData as NodeUpdatePayload;
  const requestPresentation = isHttpRequestNodeType(node.type)
    ? getUpdatedRequestNodePresentation({
        nodeType: node.type,
        currentName: node.name,
        currentData: node.data,
        updatedData: cleanData,
        explicitName: __name !== undefined ? String(__name) : undefined,
      })
    : null;

  return {
    ...node,
    type: requestPresentation?.type || node.type,
    name: requestPresentation?.name || (__name !== undefined ? String(__name) : node.name),
    data: cleanData,
  };
}

export function applyNodeUpdateToTree(tree: YAMLNode, nodeId: string, updatedData: NodeUpdatePayload | NodeUpdateData): YAMLNode {
  const batchUpdates = Array.isArray((updatedData as NodeUpdatePayload).__batchChildUpdates)
    ? (updatedData as NodeUpdatePayload).__batchChildUpdates
    : [];
  const batchUpdatesById = new Map(batchUpdates.map(update => [update.nodeId, update.data]));

  const visit = (node: YAMLNode, withinTargetSubtree = false): YAMLNode => {
    const isTargetNode = node.id === nodeId;
    const isBatchTarget = withinTargetSubtree && batchUpdatesById.has(node.id);

    let nextNode = node;
    if (isTargetNode) {
      nextNode = buildUpdatedNode(node, updatedData);
    } else if (isBatchTarget) {
      nextNode = buildUpdatedNode(node, batchUpdatesById.get(node.id)!);
    }

    if (!nextNode.children?.length) {
      return nextNode;
    }

    const nextWithinTargetSubtree = withinTargetSubtree || isTargetNode;
    let childrenChanged = false;
    const nextChildren = nextNode.children.map(child => {
      const updatedChild = visit(child, nextWithinTargetSubtree);
      if (updatedChild !== child) {
        childrenChanged = true;
      }
      return updatedChild;
    });

    if (!childrenChanged) {
      return nextNode;
    }

    return {
      ...nextNode,
      children: nextChildren,
    };
  };

  return visit(tree);
}
