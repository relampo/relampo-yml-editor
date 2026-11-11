import type { YAMLNode } from '../../types/yaml';
import type { YAMLAddableNodeType } from './addableItems';
import { canContain } from '../../utils/yamlDragDropRules';
import { buildSearchIndex, nodeMatchExpandsDescendants, type SearchNodeState } from './search';

export function canAddNodeToTarget(target: YAMLNode, nodeType: YAMLAddableNodeType) {
  // From an HTTP context menu, gRPC is a sibling step and defaults belong to the test.
  if (['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(target.type) && ['grpc', 'grpc_defaults'].includes(nodeType)) return true;
  if (target.type === 'websocket' && nodeType === 'headers') {
    if (target.data?.action && target.data.action !== 'connect') return false;
    if (target.children?.some(child => child.type === 'headers')) return false;
  }
  return canContain(target.type, nodeType);
}

export function canDuplicateNode(node: YAMLNode | null | undefined) {
  return Boolean(node && !['root', 'test', 'scenarios', 'steps'].includes(node.type));
}

export function computeVisibleNodes(
  tree: YAMLNode | null,
  searchQuery: string,
  providedSearchIndex?: Map<string, SearchNodeState>,
): YAMLNode[] {
  if (!tree) return [];
  const out: YAMLNode[] = [];
  const searchIndex = searchQuery.trim() ? (providedSearchIndex ?? buildSearchIndex(tree, searchQuery)) : null;
  const walk = (node: YAMLNode, ancestorMatches: boolean) => {
    out.push(node);
    const expanded = node.expanded ?? true;
    const indexedState = searchIndex?.get(node.id);
    const passAncestor = searchIndex
      ? ancestorMatches || Boolean(indexedState?.expandsDescendants)
      : ancestorMatches || nodeMatchExpandsDescendants(node, searchQuery);
    const showChildrenWhileSearching =
      Boolean(searchQuery.trim()) &&
      (passAncestor || node.children?.some(child => searchIndex?.get(child.id)?.subtreeMatch));
    if (node.children && node.children.length > 0 && (expanded || showChildrenWhileSearching)) {
      const children =
        searchQuery.trim() && !indexedState?.scope
          ? node.children.filter(child => passAncestor || searchIndex?.get(child.id)?.subtreeMatch)
          : node.children;
      children.forEach(child => walk(child, passAncestor));
    }
  };
  walk(tree, false);
  return out;
}

export function buildParentMap(tree: YAMLNode | null): Map<string, string | null> {
  const map = new Map<string, string | null>();
  if (!tree) return map;

  const walk = (node: YAMLNode, parentId: string | null) => {
    map.set(node.id, parentId);
    node.children?.forEach(child => walk(child, node.id));
  };

  walk(tree, null);
  return map;
}

export function getTransactionValidationMessage(reason: string | undefined, t: (key: string) => string): string | null {
  switch (reason) {
    case 'minimum_selection':
      return t('yamlEditor.shell.tree.txMinimumSelection');
    case 'same_parent':
      return t('yamlEditor.shell.tree.txSameParent');
    case 'contiguous':
      return t('yamlEditor.shell.tree.txContiguous');
    case 'supported_parent':
      return t('yamlEditor.shell.tree.txSupportedParent');
    case 'supported_child':
      return t('yamlEditor.shell.tree.txSupportedChild');
    default:
      return t('yamlEditor.shell.tree.txInvalid');
  }
}

export function findNodeById(tree: YAMLNode, targetId: string): YAMLNode | null {
  if (tree.id === targetId) return tree;

  if (!tree.children) return null;

  for (const child of tree.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
}
