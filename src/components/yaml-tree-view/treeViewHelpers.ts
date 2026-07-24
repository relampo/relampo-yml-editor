import type { YAMLNode } from '../../types/yaml';
import type { YAMLAddableNodeType } from './addableItems';
import { nodeMatchExpandsDescendants, subtreeHasMatch } from './search';

export function canAddNodeToTarget(target: YAMLNode, nodeType: YAMLAddableNodeType) {
  return !(nodeType === 'scenario' && target.type === 'scenarios' && target.children?.some(child => child.type === 'scenario'));
}

export function canDuplicateNode(node: YAMLNode | null | undefined) {
  return node?.type !== 'scenario' && node?.type !== 'scenarios';
}

export function computeVisibleNodes(tree: YAMLNode | null, searchQuery: string): YAMLNode[] {
  if (!tree) return [];
  const out: YAMLNode[] = [];
  const walk = (node: YAMLNode, ancestorMatches: boolean) => {
    out.push(node);
    const expanded = node.expanded ?? true;
    const passAncestor = ancestorMatches || nodeMatchExpandsDescendants(node, searchQuery);
    const showChildrenWhileSearching =
      Boolean(searchQuery.trim()) && (passAncestor || node.children?.some(child => subtreeHasMatch(child, searchQuery)));
    if (node.children && node.children.length > 0 && (expanded || showChildrenWhileSearching)) {
      const children = searchQuery.trim()
        ? node.children.filter(child => passAncestor || subtreeHasMatch(child, searchQuery))
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

export function getTransactionValidationMessage(reason: string | undefined): string | null {
  switch (reason) {
    case 'minimum_selection':
      return 'Select at least 2 sibling steps';
    case 'same_parent':
      return 'Selection must share the same parent';
    case 'contiguous':
      return 'Selection must be contiguous in the current order';
    case 'supported_parent':
      return 'Selection must be inside a compatible steps container';
    case 'supported_child':
      return 'Only step elements can be wrapped in a transaction';
    default:
      return 'Selection is not valid for transaction grouping';
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
