import { useEffect, useMemo, useRef, useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { buildScopedSearch, type SearchScope } from './search';
import { getTransactionWrapValidation } from './treeOperations';
import { buildParentMap, computeVisibleNodes } from './treeViewHelpers';

interface UseTreeViewSelectionParams {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onSearchChange?: (query: string, scope?: SearchScope | null) => void;
  searchResetSignal?: number;
}

export function useTreeViewSelection({
  tree,
  selectedNode,
  selectedNodeIds,
  onSelectionChange,
  onSearchChange,
  searchResetSignal = 0,
}: UseTreeViewSelectionParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope | null>(null);
  const [seenSearchResetSignal, setSeenSearchResetSignal] = useState(searchResetSignal);
  if (searchResetSignal !== seenSearchResetSignal) {
    setSeenSearchResetSignal(searchResetSignal);
    setSearchQuery('');
    setSearchScope(null);
  }
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const isFiltering = searchQuery.trim().length > 0 && searchScope === null;
  const scopedSearch = useMemo(
    () => buildScopedSearch(tree, searchQuery, searchScope),
    [tree, searchQuery, searchScope],
  );
  const searchIndex = searchQuery.trim() ? scopedSearch.index : null;

  const notifyInitialSearchRef = useRef(onSearchChange);
  useEffect(() => {
    notifyInitialSearchRef.current?.('');
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value, searchScope);
  };

  const handleScopeChange = (scope: SearchScope, query: string) => {
    setSearchScope(scope);
    setSearchQuery(query.trim());
    onSearchChange?.(query.trim(), scope);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearchChange?.('', searchScope);
  };

  const visibleNodes = useMemo(
    () => computeVisibleNodes(tree, searchQuery, searchIndex ?? undefined),
    [searchIndex, searchQuery, tree],
  );

  const parentMap = useMemo(() => buildParentMap(tree), [tree]);

  const nodeById = useMemo(() => {
    const map = new Map<string, YAMLNode>();
    visibleNodes.forEach(node => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const visibleSelectedIds = useMemo(() => selectedNodeIds.filter(id => nodeById.has(id)), [selectedNodeIds, nodeById]);

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

  useEffect(() => {
    if (!isFiltering || visibleSelectedIds.length === selectedNodeIds.length) {
      return;
    }

    const nextPrimary =
      selectedNode && nodeById.has(selectedNode.id)
        ? selectedNode
        : (visibleSelectedIds
            .flatMap(id => {
              const node = nodeById.get(id);
              return node ? [node] : [];
            })
            .at(-1) ?? null);

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
    searchIndex,
    searchScope,
    handleScopeChange,
    searchMatchNodeIds: scopedSearch.matchNodeIds,
    searchMatches: scopedSearch.matches,
    replaceableMatchNodeIds: scopedSearch.replaceableMatchNodeIds,
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
