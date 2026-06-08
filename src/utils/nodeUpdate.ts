import { buildRequestUrl } from '../components/fields/requestUrl';
import type { YAMLNode } from '../types/yaml';
import { getRequestNodeHost, getUpdatedRequestNodePresentation, isHttpRequestNodeType } from './requestNodeDisplay';

type NodeUpdateData = Record<string, unknown> & {
  __name?: string;
  __batchChildUpdates?: BatchNodeUpdate[];
};

type BatchNodeUpdate = {
  nodeId: string;
  data: NodeUpdateData;
};

function buildUpdatedNode(node: YAMLNode, updatedData: NodeUpdateData): YAMLNode {
  const { __name, __batchChildUpdates, ...cleanData } = updatedData;
  const requestPresentation = isHttpRequestNodeType(node.type)
    ? getUpdatedRequestNodePresentation({
        nodeType: node.type,
        currentName: node.name,
        currentData: node.data,
        updatedData: cleanData,
        explicitName: __name,
      })
    : null;

  return {
    ...node,
    type: requestPresentation?.type ?? node.type,
    name: requestPresentation?.name ?? __name ?? node.name,
    data: cleanData,
  };
}

export function applyNodeUpdateToTree(tree: YAMLNode, nodeId: string, updatedData: NodeUpdateData): YAMLNode {
  const batchUpdates = Array.isArray(updatedData.__batchChildUpdates) ? updatedData.__batchChildUpdates : [];
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

/**
 * Rename a host across the whole recording.
 *
 * A multi-host recording keeps the primary host in `http_defaults.base_url` and
 * every other host inside the absolute URL of each request that targets it.
 * Renaming a host therefore means rewriting the authority of every absolute URL
 * (and the base_url) that currently points at `oldHost`, while preserving the
 * protocol, path and query of each URL. This lets the editor treat every
 * recorded host as an editable value, not just the base one (RLP-365).
 *
 * @param tree - Root tree node.
 * @param oldHost - Current host to replace (e.g. `api.example.com`).
 * @param newHost - Replacement host.
 * @returns A new tree with the host swapped, or the same tree when nothing matches.
 */
export function renameRequestHost(tree: YAMLNode, oldHost: string, newHost: string): YAMLNode {
  // Accept either a bare authority (`host[:port]`) or a full URL — users
  // naturally paste a scheme since the primary base_url has one. Reduce both to
  // the authority so we never feed `https://https://host` into buildRequestUrl.
  const toAuthority = (value: string): string => {
    const trimmed = value.trim();
    return getRequestNodeHost(trimmed) || trimmed;
  };
  const from = toAuthority(oldHost);
  const to = toAuthority(newHost);
  if (!from || !to || from === to) {
    return tree;
  }

  const visit = (node: YAMLNode): YAMLNode => {
    let nextNode = node;

    if (isHttpRequestNodeType(node.type)) {
      const url = node.data?.url;
      if (typeof url === 'string' && getRequestNodeHost(url) === from) {
        nextNode = { ...node, data: { ...node.data, url: buildRequestUrl(url, { baseUrl: to }) } };
      }
    } else if (node.type === 'http_defaults') {
      const baseUrl = node.data?.base_url;
      if (typeof baseUrl === 'string' && getRequestNodeHost(baseUrl) === from) {
        nextNode = { ...node, data: { ...node.data, base_url: buildRequestUrl(baseUrl, { baseUrl: to }) } };
      }
    }

    if (!nextNode.children?.length) {
      return nextNode;
    }

    let childrenChanged = false;
    const nextChildren = nextNode.children.map(child => {
      const updatedChild = visit(child);
      if (updatedChild !== child) {
        childrenChanged = true;
      }
      return updatedChild;
    });

    if (!childrenChanged) {
      return nextNode;
    }

    return { ...nextNode, children: nextChildren };
  };

  return visit(tree);
}
