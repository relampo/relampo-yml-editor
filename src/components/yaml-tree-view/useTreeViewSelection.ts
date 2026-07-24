import { useEffect, useMemo, useRef, useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { getTransactionWrapValidation } from './treeOperations';
import { buildParentMap, computeVisibleNodes } from './treeViewHelpers';

interface UseTreeViewSelectionParams {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onSearchChange?: (query: string) => void;
}

/**
 * Search filtering + derived selection state for YAMLTreeView: which nodes are
 * currently visible, which of the (parent-owned) selected ids are actionable
 * given the active filter, and the transaction-wrap validation for that set.
 */
export function useTreeViewSelection({
  tree,
  selectedNode,
  selectedNodeIds,
  onSelectionChange,
  onSearchChange,
}: UseTreeViewSelectionParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const isFiltering = searchQuery.trim().length > 0;

  // Notify the parent from the handler that actually changes searchQuery
  // (not from an effect watching it).
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearchChange?.('');
  };

  const visibleNodes = useMemo(() => computeVisibleNodes(tree, searchQuery), [tree, searchQuery]);

  const parentMap = useMemo(() => buildParentMap(tree), [tree]);

  const nodeById = useMemo(() => {
    const map = new Map<string, YAMLNode>();
    visibleNodes.forEach(node => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const visibleSelectedIds = useMemo(
    () => selectedNodeIds.filter(id => nodeById.has(id)),
    [selectedNodeIds, nodeById],
  );

  const activeSelectedIds = isFiltering ? visibleSelectedIds : selectedNodeIds;

  const selectedNodes = useMemo(
    () =>
      activeSelectedIds.flatMap(id => {
        const node = nodeById.get(id);
        return node ? [node] : [];
      }),
    [activeSelectedIds, nodeById],
  );

  const effectiveSelectedIds = useMemo(() => {
    if (!tree) return [] as string[];
    const selectedSet = new Set(activeSelectedIds);

    const hasSelectedAncestor = (nodeId: string) => {
      let parentId = parentMap.get(nodeId) ?? null;
      while (parentId) {
        if (selectedSet.has(parentId)) return true;
        parentId = parentMap.get(parentId) ?? null;
      }
      return false;
    };

    return activeSelectedIds.filter(id => id !== tree.id && !hasSelectedAncestor(id));
  }, [activeSelectedIds, parentMap, tree]);

  // react-doctor: no-prop-callback-in-effect / no-pass-live-state-to-parent (LEFT, see report).
  // This corrects the PARENT's controlled selection (selectedNode/selectedNodeIds are props,
  // not local state) whenever it drifts out of sync with what search filtering currently
  // shows. That drift has several distinct, non-local origins: this component's own
  // handleAddNode/handlePasteSelection can select a node whose name doesn't match the active
  // search query; the parent's syncSelectionWithTree (useYamlEditorDerived.ts) only prunes
  // ids for nodes removed from the tree entirely, not ids hidden by the search filter; and a
  // second <YAMLTreeView> instance can share the same selection props. Moving this into a
  // single event handler (e.g. the search input's onChange) would miss the other trigger
  // paths and risk leaving stale, invisible ids selected. Left as an effect reacting to
  // genuinely external/prop-driven drift rather than "my own state, pushed up."
  useEffect(() => {
    if (!isFiltering || visibleSelectedIds.length === selectedNodeIds.length) {
      return;
    }

    const nextPrimary =
      selectedNode && nodeById.has(selectedNode.id)
        ? selectedNode
        : visibleSelectedIds
            .flatMap(id => {
              const node = nodeById.get(id);
              return node ? [node] : [];
            })
            .at(-1) ?? null;

    onSelectionChange(nextPrimary, visibleSelectedIds);
  }, [isFiltering, nodeById, onSelectionChange, selectedNode, selectedNodeIds.length, visibleSelectedIds]);

  const allSelectedDisabled = selectedNodes.length > 0 && selectedNodes.every(node => node.data?.enabled === false);
  const transactionWrapValidation = useMemo(
    () => (tree ? getTransactionWrapValidation(tree, effectiveSelectedIds) : null),
    [effectiveSelectedIds, tree],
  );

  useEffect(() => {
    if (!selectedNode?.id || !treeContainerRef.current) return;
    const el = treeContainerRef.current.querySelector(`[data-node-id="${selectedNode.id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
  }, [selectedNode?.id]);

  return {
    searchQuery,
    handleSearchChange,
    handleClearSearch,
    isFiltering,
    visibleNodes,
    nodeById,
    activeSelectedIds,
    selectedNodes,
    effectiveSelectedIds,
    allSelectedDisabled,
    transactionWrapValidation,
    treeContainerRef,
  };
}
