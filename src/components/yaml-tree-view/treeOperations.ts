import { canContain, canDrop } from '../../utils/yamlDragDropRules';
import type { RedirectedRequestInfo, YAMLNode } from '../../types/yaml';
import { findNodeById } from '../yamlEditorHelpers';

type TransactionWrapValidationReason =
  | 'minimum_selection'
  | 'missing_nodes'
  | 'same_parent'
  | 'supported_parent'
  | 'supported_child'
  | 'contiguous';

interface TransactionWrapValidationResult {
  valid: boolean;
  reason?: TransactionWrapValidationReason;
  orderedNodeIds: string[];
  parentId?: string;
}

const STEP_CONTAINER_TYPES = new Set<YAMLNode['type']>([
  'group',
  'simple',
  'transaction',
  'parallel',
  'balanced',
  'if',
  'loop',
  'retry',
  'one_time',
  'on_error',
]);

const REQUEST_TYPES = new Set<YAMLNode['type']>([
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
]);

function ordinalAmong(siblings: YAMLNode[], index: number, predicate: (node: YAMLNode) => boolean): number {
  return siblings.slice(0, index + 1).filter(predicate).length - 1;
}

function childPathFor(
  parent: YAMLNode,
  child: YAMLNode,
  index: number,
  siblings: YAMLNode[],
  parentPath: Array<string | number>,
): Array<string | number> {
  if (parent.type === 'root' || parent.type === 'test') {
    if (child.type === 'scenarios') return ['scenarios'];
    if (child.type === 'variables') return ['variables'];
    if (child.type === 'data_source') return ['data_source'];
    if (child.type === 'http_defaults') return ['http_defaults'];
    if (child.type === 'metrics') return ['metrics'];
    if (child.type === 'error_policy') return ['error_policy'];
    return [child.type];
  }

  if (parent.type === 'scenarios') return [...parentPath, index];

  if (parent.type === 'scenario') {
    if (child.type === 'steps') return [...parentPath, 'steps'];
    if (child.type === 'load') return [...parentPath, 'load'];
    if (child.type === 'cookies') return [...parentPath, 'cookies'];
    if (child.type === 'cache_manager') return [...parentPath, 'cache_manager'];
    if (child.type === 'error_policy') return [...parentPath, 'error_policy'];
    return [...parentPath, child.type];
  }

  if (parent.type === 'steps') return [...parentPath, index];

  if (STEP_CONTAINER_TYPES.has(parent.type)) return [...parentPath, 'steps', index];

  if (REQUEST_TYPES.has(parent.type)) {
    if (child.type === 'headers') return [...parentPath, 'request', 'headers'];
    if (child.type === 'spark_before' || child.type === 'spark_after') {
      return [
        ...parentPath,
        'spark',
        ordinalAmong(siblings, index, node => node.type === 'spark_before' || node.type === 'spark_after'),
      ];
    }
    if (child.type === 'extractor') {
      return [...parentPath, 'extractors', ordinalAmong(siblings, index, node => node.type === 'extractor')];
    }
    if (child.type === 'extract') {
      return [...parentPath, 'request', 'extract', ordinalAmong(siblings, index, node => node.type === 'extract')];
    }
    if (child.type === 'assertion') {
      return [...parentPath, 'assertions', ordinalAmong(siblings, index, node => node.type === 'assertion')];
    }
    if (child.type === 'assert') {
      return [...parentPath, 'request', 'assert', ordinalAmong(siblings, index, node => node.type === 'assert')];
    }
    if (child.type === 'think_time') return [...parentPath, 'think_time'];
    if (child.type === 'error_policy') return [...parentPath, 'error_policy'];
    if (child.type === 'file')
      return [...parentPath, 'files', ordinalAmong(siblings, index, node => node.type === 'file')];
    if (child.type === 'data_source') return [...parentPath, 'data_source'];
    return [...parentPath, child.type];
  }

  return [...parentPath, child.type];
}

export function refreshTreePaths(tree: YAMLNode): YAMLNode {
  const visit = (node: YAMLNode, path: Array<string | number>): YAMLNode => {
    const children = node.children?.map((child, index, siblings) =>
      visit(child, childPathFor(node, child, index, siblings, path)),
    );

    return {
      ...node,
      path,
      ...(children ? { children } : {}),
    };
  };

  return visit(tree, []);
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function percentEncodedBytePattern(byte: number): string {
  const hex = byte.toString(16).padStart(2, '0');
  return `%[${hex[0].toLowerCase()}${hex[0].toUpperCase()}][${hex[1].toLowerCase()}${hex[1].toUpperCase()}]`;
}

function percentEncodedSearchPattern(value: string): string {
  let pattern = '';

  for (const character of value) {
    const alternatives = new Set([escapeRegExp(character)]);
    const encodedCharacter = encodeURIComponent(character);

    // encodeURIComponent returns unreserved characters (`A-Za-z0-9-_.!~*'()`)
    // as-is, so its output is only a usable pattern once it is a `%XX` run —
    // splicing the raw character in would leak regex metacharacters (`.`
    // matching anything, `*`/`(`/`)` throwing or regrouping). The literal form
    // is already covered above, and the `< 0x80` branch below adds the encoded
    // form for those characters.
    if (encodedCharacter !== character) {
      alternatives.add(
        encodedCharacter.replace(/%([0-9a-f]{2})/gi, (_, byte: string) =>
          percentEncodedBytePattern(Number.parseInt(byte, 16)),
        ),
      );
    }

    if (character === ' ') {
      alternatives.add('\\+');
    }

    // encodeURIComponent leaves a few ASCII punctuation characters literal,
    // but recorded URLs can still percent-encode them. Accept both forms.
    if (character.length === 1 && character.charCodeAt(0) < 0x80) {
      alternatives.add(percentEncodedBytePattern(character.charCodeAt(0)));
    }

    pattern += `(?:${[...alternatives].join('|')})`;
  }

  return pattern;
}

function replaceTextInString(
  value: string,
  search: string,
  replacement: string,
  urlEncoded: boolean,
): [string, number, boolean] {
  let matcher: RegExp;

  try {
    const pattern = urlEncoded
      ? `${escapeRegExp(search)}|${percentEncodedSearchPattern(search)}`
      : escapeRegExp(search);
    matcher = new RegExp(pattern, 'g');
  } catch {
    return [value, 0, false];
  }

  let count = 0;
  const nextValue = value.replace(matcher, () => {
    count += 1;
    return replacement;
  });

  return [nextValue, count, count > 0];
}

function replaceTextInValue(
  value: unknown,
  search: string,
  replacement: string,
  urlEncoded = false,
): [unknown, number, boolean] {
  if (typeof value === 'string') {
    return replaceTextInString(value, search, replacement, urlEncoded);
  }

  if (Array.isArray(value)) {
    let count = 0;
    let changed = false;
    const nextValue = value.map(item => {
      const [nextItem, itemCount, itemChanged] = replaceTextInValue(item, search, replacement, urlEncoded);
      count += itemCount;
      changed ||= itemChanged;
      return nextItem;
    });
    return [changed ? nextValue : value, count, changed];
  }

  if (value && typeof value === 'object') {
    let count = 0;
    let changed = false;
    const nextValue = Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const [nextItem, itemCount, itemChanged] = replaceTextInValue(item, search, replacement, urlEncoded);
        count += itemCount;
        changed ||= itemChanged;
        return [key, nextItem];
      }),
    );
    return [changed ? nextValue : value, count, changed];
  }

  return [value, 0, false];
}

function replaceRequestData(
  data: unknown,
  search: string,
  replacement: string,
  // True when this request also has a `headers` child node. The parser hands
  // the very same headers object to both places (yamlParser: `data: {...req}`
  // and the child's `data: req.headers`), so both get visited and every header
  // match would otherwise be tallied twice in the count shown to the user.
  // The copy still has to be replaced — YAMLRequestDetails reads
  // `node.data.headers` to infer Content-Type — only the tally moves to the
  // child node, which is also what the serializer writes back out.
  headersCountedByChild = false,
): [unknown, number, boolean] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [data, 0, false];

  let count = 0;
  let changed = false;
  const nextData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (key === 'enabled' || key === 'method' || key === 'response' || key === 'response_preview') {
        return [key, value];
      }
      const [nextValue, valueCount, valueChanged] = replaceTextInValue(value, search, replacement, key === 'url');
      if (!(key === 'headers' && headersCountedByChild)) count += valueCount;
      changed ||= valueChanged;
      return [key, nextValue];
    }),
  );
  return [changed ? nextData : data, count, changed];
}

/** Replace literal text in enabled requests and their headers, excluding recorded responses. */
export function replaceTextInEnabledRequests(
  tree: YAMLNode,
  search: string,
  replacement: string,
): { tree: YAMLNode; replacements: number } {
  if (!search) return { tree, replacements: 0 };

  const visit = (node: YAMLNode, inheritedEnabled: boolean): [YAMLNode, number, boolean] => {
    const enabled = inheritedEnabled && node.data?.enabled !== false;
    let nextData = node.data;
    let replacements = 0;
    let changed = false;

    if (enabled && (REQUEST_TYPES.has(node.type) || node.type === 'headers')) {
      // Only a request node duplicates its headers into a child; a `headers`
      // node has none, so it always owns its own tally.
      const headersCountedByChild =
        REQUEST_TYPES.has(node.type) && (node.children?.some(child => child.type === 'headers') ?? false);
      const [replacedData, count, dataChanged] = replaceRequestData(
        node.data,
        search,
        replacement,
        headersCountedByChild,
      );
      nextData = replacedData;
      replacements += count;
      changed ||= dataChanged;
    }

    let nextChildren = node.children;
    if (node.children) {
      let childrenChanged = false;
      nextChildren = node.children.map(child => {
        const [nextChild, count, childChanged] = visit(child, enabled);
        replacements += count;
        childrenChanged ||= childChanged;
        return nextChild;
      });
      changed ||= childrenChanged;
    }

    return [changed ? { ...node, data: nextData, ...(nextChildren ? { children: nextChildren } : {}) } : node, replacements, changed];
  };

  const [updatedTree, replacements] = visit(tree, true);
  return { tree: updatedTree, replacements };
}

export function addNodeToTree(tree: YAMLNode, parentId: string, newNode: YAMLNode): YAMLNode {
  if (tree.id === parentId) {
    const children = tree.children || [];
    if (newNode.type === 'scenario' && tree.type === 'scenarios' && children.some(child => child.type === 'scenario')) {
      return tree;
    }

    return {
      ...tree,
      children: [newNode, ...children],
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
      children: tree.children.flatMap(child =>
        child.id === nodeId ? [] : [removeNodeFromTree(child, nodeId)],
      ),
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

function setNodeFollowRedirects(tree: YAMLNode, nodeId: string, value: boolean): YAMLNode {
  if (tree.id === nodeId) {
    return { ...tree, data: { ...tree.data, follow_redirects: value } };
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => setNodeFollowRedirects(child, nodeId, value)),
    };
  }

  return tree;
}

function collectSubtreeIds(tree: YAMLNode, rootId: string): Set<string> {
  const ids = new Set<string>();

  const collect = (node: YAMLNode) => {
    ids.add(node.id);
    node.children?.forEach(collect);
  };

  const findRoot = (node: YAMLNode): YAMLNode | null => {
    if (node.id === rootId) return node;
    for (const child of node.children ?? []) {
      const found = findRoot(child);
      if (found) return found;
    }
    return null;
  };

  const rootNode = findRoot(tree);
  if (rootNode) collect(rootNode);
  return ids;
}

/**
 * Keeps redirect source requests consistent when their recorded follow-up
 * (redirect target) requests are enabled/disabled.
 *
 * When a follow-up is disabled, its source must follow redirects automatically
 * — otherwise the redirect is neither auto-followed nor handled by the now
 * disabled explicit step. Re-enabling the follow-up restores the recorded
 * behavior (the source does not auto-follow; the explicit step does).
 *
 * `updateNodeEnabled` cascades through the whole subtree, so toggling a
 * container (group/transaction/scenario/…) flips every descendant. We therefore
 * sync the source of *any* recorded redirect follow-up found within the toggled
 * subtree, not just the node whose toggle was clicked. No-op when the subtree
 * contains no recorded redirect follow-ups.
 */
export function syncRedirectSourceFollowRedirects(
  tree: YAMLNode,
  toggledNodeId: string,
  enabled: boolean,
  redirectedRequestMap: Record<string, RedirectedRequestInfo>,
): YAMLNode {
  const toggledIds = collectSubtreeIds(tree, toggledNodeId);
  let result = tree;
  for (const [targetId, info] of Object.entries(redirectedRequestMap)) {
    if (toggledIds.has(targetId)) {
      result = setNodeFollowRedirects(result, info.sourceNodeId, !enabled);
    }
  }
  return result;
}

/** Which node a drop lands under: the target itself for `inside`, else its parent. */
function destinationParentId(
  tree: YAMLNode,
  targetId: string,
  position: 'before' | 'after' | 'inside',
): string | null {
  if (position === 'inside') return targetId;
  const findParent = (node: YAMLNode): string | null => {
    if (node.children?.some(child => child.id === targetId)) return node.id;
    for (const child of node.children || []) {
      const found = findParent(child);
      if (found) return found;
    }
    return null;
  };
  return findParent(tree);
}

export function moveNodeInTree(
  tree: YAMLNode,
  nodeId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside',
): YAMLNode {
  if (nodeId === targetId) return tree;

  // The document root has no parent, so `removeNodeFromTree` cannot take it
  // out of the tree — moving it would leave the original in place *and* insert
  // a whole second copy under it, duplicating every node id. The type-level
  // `canDrop` cannot catch this because the root is just another `test` node.
  if (nodeId === tree.id) return tree;

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

  const targetNode = findNodeById(tree, targetId);
  if (!targetNode) return tree;

  const destinationId = destinationParentId(tree, targetId, position);
  const destinationParent = destinationId ? findNodeById(tree, destinationId) : null;
  if (!canDrop(nodeToMove.type, targetNode.type, position, destinationParent?.type)) return tree;

  // `treeToObject` writes one `data_source:` key per scope, so a second
  // root-level data source would silently drop the first one on save.
  const movedType = (nodeToMove as YAMLNode).type;
  if (movedType === 'data_source' && destinationParentId(tree, targetId, position) === tree.id) {
    if (tree.children?.some(child => child.type === 'data_source' && child.id !== nodeId)) return tree;
  }

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
  const uniqueNodeIdSet = new Set(nodeIds);
  const uniqueNodeIds = Array.from(uniqueNodeIdSet);
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

  const orderedSelection = (parentNode.children || []).filter(child => uniqueNodeIdSet.has(child.id));
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
