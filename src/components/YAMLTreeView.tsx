import { buildRequestNumbers } from './yaml-tree-view/requestNumbers';
import { useSearchNavigation } from './yaml-tree-view/SearchNavigationContext';
import { buildScopedSearch } from './yaml-tree-view/search';
import type { SearchOccurrence } from './yaml-tree-view/searchOccurrences';
import type { IssueMarker } from '../utils/documentIssues';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { canContain } from '../utils/yamlDragDropRules';
import { createNodeByType } from './yaml-tree-view/nodeFactory';
import { TreeBulkActionsBar } from './yaml-tree-view/TreeBulkActionsBar';
import { TreeEmptyState } from './yaml-tree-view/TreeEmptyState';
import { TreeSearchBar } from './yaml-tree-view/TreeSearchBar';
import { useTreeContextMenu } from './yaml-tree-view/useTreeContextMenu';
import { useTreeMutations } from './yaml-tree-view/useTreeMutations';
import { useTreeViewSelection } from './yaml-tree-view/useTreeViewSelection';
import { replaceTextInEnabledRequestsAtMatch } from './yaml-tree-view/treeOperations';
import { canDuplicateNode, findNodeById, getTransactionValidationMessage } from './yaml-tree-view/treeViewHelpers';
import type { SearchScope } from './yaml-tree-view/search';
import { YAMLContextMenu } from './YAMLContextMenu';
import { YAMLTreeNode } from './YAMLTreeNode';

interface YAMLTreeViewProps {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  issueMarkers?: Record<string, IssueMarker>;
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  baseHost?: string;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (tree: YAMLNode, nextSelection?: { primaryId: string | null; nodeIds: string[] }) => void;
  onTreeViewChange?: (tree: YAMLNode) => void;
  onContextMenuOpened?: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  onSearchChange?: (query: string, scope?: SearchScope | null) => void;
  searchResetSignal?: number;
}

const EMPTY_ISSUE_MARKERS: Record<string, IssueMarker> = {};

export function YAMLTreeView({
  tree,
  selectedNode,
  selectedNodeIds,
  issueMarkers = EMPTY_ISSUE_MARKERS,
  redirectedRequestMap,
  baseHost = '',
  onSelectionChange,
  onTreeChange,
  onTreeViewChange,
  onContextMenuOpened,
  onSearchChange,
  searchResetSignal,
}: YAMLTreeViewProps) {
  const { t } = useLanguage();
  const requestNumbers = useMemo(() => buildRequestNumbers(tree), [tree]);
  const [currentReplaceMatchIndex, setCurrentReplaceMatchIndex] = useState(0);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState(0);
  const { match: focusedSearchMatch, setMatch: setFocusedSearchMatch } = useSearchNavigation();
  useEffect(() => () => setFocusedSearchMatch(null), [setFocusedSearchMatch]);

  const {
    searchQuery,
    searchIndex,
    searchScope,
    handleScopeChange,
    searchMatchNodeIds,
    searchMatches,
    replaceableMatchNodeIds,
    handleSearchChange,
    handleClearSearch,
    visibleNodes,
    nodeById,
    activeSelectedIds,
    effectiveSelectedIds,
    allSelectedDisabled,
    transactionWrapValidation,
    treeContainerRef,
  } = useTreeViewSelection({
    tree,
    selectedNode,
    selectedNodeIds,
    onSelectionChange,
    onSearchChange,
    searchResetSignal,
  });
  const searchMatchCount = useMemo(() => new Set(searchMatchNodeIds).size, [searchMatchNodeIds]);
  const activeReplaceMatchNodeId =
    replaceableMatchNodeIds[Math.min(currentReplaceMatchIndex, Math.max(replaceableMatchNodeIds.length - 1, 0))] ??
    null;

  const revealSearchMatch = (match: SearchOccurrence | undefined, index: number, matches: SearchOccurrence[]) => {
    setCurrentSearchMatchIndex(index);
    setFocusedSearchMatch(match ?? null);
    if (!match || !tree) return;
    const node = findNodeById(tree, match.nodeId);
    if (node) onSelectionChange(node, [node.id]);
    if (match.replaceable) setCurrentReplaceMatchIndex(matches.slice(0, index).filter(item => item.replaceable).length);
    requestAnimationFrame(() => {
      const row = Array.from(treeContainerRef.current?.querySelectorAll<HTMLElement>('[data-node-id]') ?? []).find(
        item => item.dataset.nodeId === match.nodeId,
      );
      row?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  };

  useEffect(() => {
    setFocusedSearchMatch(null);
  }, [searchResetSignal, setFocusedSearchMatch]);

  const handleSearchNavigation = (index: number) => {
    if (!searchMatches.length) return;
    const next = (index + searchMatches.length) % searchMatches.length;
    revealSearchMatch(searchMatches[next], next, searchMatches);
  };

  const handleTreeSearchChange = (query: string) => {
    setCurrentReplaceMatchIndex(0);
    handleSearchChange(query);
    const matches = buildScopedSearch(tree, query, searchScope).matches;
    revealSearchMatch(matches[0], 0, matches);
  };

  const handleTreeClearSearch = () => {
    setCurrentReplaceMatchIndex(0);
    setCurrentSearchMatchIndex(0);
    setFocusedSearchMatch(null);
    handleClearSearch();
  };

  const handleCurrentReplaceMatchIndexChange = (index: number) => {
    setCurrentReplaceMatchIndex(Math.max(0, Math.min(index, Math.max(replaceableMatchNodeIds.length - 1, 0))));
  };

  const { contextMenu, handleContextMenu, handleCloseContextMenu, getContextActionTargetIds } = useTreeContextMenu({
    activeSelectedIds,
    effectiveSelectedIds,
    onSelectionChange,
    onContextMenuOpened,
  });

  const handleReplace = (replacement: string, matchIndex?: number) => {
    if (!tree || searchScope !== 'requests') return 0;
    const result = replaceTextInEnabledRequestsAtMatch(tree, searchQuery, replacement, matchIndex, true).result;
    if (result.replacements > 0) {
      setFocusedSearchMatch(null);
      onTreeChange(result.tree);
    }
    return result.replacements;
  };

  const {
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
  } = useTreeMutations({
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
  });

  const handleTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!visibleNodes.length) return;

    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isTypingContext = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
    if (isTypingContext) return;

    const isCommand = e.metaKey || e.ctrlKey;

    if ((e.key === 'Delete' || e.key === 'Backspace') && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleBulkDelete();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'c' && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleCopySelection();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'v' && clipboardNodes.length > 0) {
      e.preventDefault();
      handlePasteSelection();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'd' && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleBulkDuplicate();
      return;
    }

    const currentIndex = selectedNode ? visibleNodes.findIndex(n => n.id === selectedNode.id) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, visibleNodes.length - 1);
      onSelectionChange(visibleNodes[nextIndex], [visibleNodes[nextIndex].id]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
      onSelectionChange(visibleNodes[prevIndex], [visibleNodes[prevIndex].id]);
      return;
    }
  };

  const handleNodeSelect = (node: YAMLNode, event: React.MouseEvent) => {
    const isToggle = event.metaKey || event.ctrlKey;
    const isRange = event.shiftKey;

    if (isRange && selectedNode) {
      const anchorIndex = visibleNodes.findIndex(n => n.id === selectedNode.id);
      const targetIndex = visibleNodes.findIndex(n => n.id === node.id);

      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const rangeIds = visibleNodes.slice(start, end + 1).map(n => n.id);
        const nextIds = Array.from(new Set([...activeSelectedIds, ...rangeIds]));
        onSelectionChange(node, nextIds);
        return;
      }
    }

    if (isToggle) {
      const isAlreadySelected = activeSelectedIds.includes(node.id);
      const nextIds = isAlreadySelected
        ? activeSelectedIds.filter(id => id !== node.id)
        : [...activeSelectedIds, node.id];

      if (nextIds.length === 0) {
        onSelectionChange(null, []);
        return;
      }

      if (isAlreadySelected && selectedNode?.id === node.id) {
        const fallbackPrimary = visibleNodes.find(n => n.id === nextIds[nextIds.length - 1]) ?? null;
        onSelectionChange(fallbackPrimary, nextIds);
        return;
      }

      onSelectionChange(node, nextIds);
      return;
    }

    onSelectionChange(node, [node.id]);
  };

  if (!tree) {
    return (
      <TreeEmptyState
        description={t('yamlEditor.emptyState.description')}
        buttonLabel={t('yamlEditor.emptyState.addBtn')}
        onCreateRoot={() => {
          const rootPlan = createNodeByType('root_plan', { balancedName: t('yamlEditor.balanced.name') });
          onTreeChange(rootPlan);
        }}
      />
    );
  }

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col">
      <TreeSearchBar
        // Remount on an outside reset so the typed draft clears with the applied query.
        key={searchResetSignal}
        scope={searchScope}
        onScopeChange={(scope, query) => {
          setCurrentReplaceMatchIndex(0);
          setFocusedSearchMatch(null);
          setCurrentSearchMatchIndex(0);
          handleScopeChange(scope, query);
        }}
        occurrenceCount={searchMatchNodeIds.length}
        searchMatchIndex={currentSearchMatchIndex}
        onSearchNavigate={handleSearchNavigation}
        selectedSearchReplaceable={
          searchMatches[Math.min(currentSearchMatchIndex, Math.max(0, searchMatches.length - 1))]?.replaceable ?? false
        }
        value={searchQuery}
        onChange={handleTreeSearchChange}
        onClear={handleTreeClearSearch}
        onReplace={handleReplace}
        replaceMatchCount={replaceableMatchNodeIds.length}
        currentMatchIndex={currentReplaceMatchIndex}
        onCurrentMatchIndexChange={handleCurrentReplaceMatchIndexChange}
        searchMatchCount={searchMatchCount}
      />

      {activeSelectedIds.length > 1 && (
        <TreeBulkActionsBar
          selectedCount={activeSelectedIds.length}
          hasActionableSelection={effectiveSelectedIds.length > 0}
          allSelectedDisabled={allSelectedDisabled}
          canCreateTransaction={Boolean(transactionWrapValidation?.valid)}
          validationMessage={getTransactionValidationMessage(transactionWrapValidation?.reason, t)}
          onCreateTransaction={handleCreateTransaction}
          onDuplicate={handleBulkDuplicate}
          onToggleEnabled={handleBulkToggleEnabled}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Tree */}
      <div
        ref={treeContainerRef}
        role="tree"
        aria-label={t('yamlEditor.shell.tree.ariaLabel')}
        className="flex-1 overflow-y-auto px-3 pb-3 outline-none"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onMouseDown={() => treeContainerRef.current?.focus()}
      >
        {tree ? (
          <YAMLTreeNode
            node={tree}
            requestNumbers={requestNumbers}
            depth={0}
            parentType={undefined}
            isSelected={activeSelectedIds.includes(tree.id)}
            selectedNodeIds={activeSelectedIds}
            issueMarkers={issueMarkers}
            redirectedRequestMap={redirectedRequestMap}
            baseHost={baseHost}
            onNodeSelect={handleNodeSelect}
            onNodeToggle={handleNodeToggle}
            onContextMenu={handleContextMenu}
            onNodeMove={handleNodeMove}
            searchQuery={searchQuery}
            searchIndex={searchIndex ?? undefined}
            activeReplaceMatchNodeId={focusedSearchMatch?.nodeId ?? activeReplaceMatchNodeId}
          />
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-zinc-500">{t('yamlEditor.shell.tree.noYaml')}</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <YAMLContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={handleCloseContextMenu}
          onAddNode={handleAddNode}
          onRemove={handleRemoveNode}
          onCopy={nodeId => handleCopySelection(getContextActionTargetIds(nodeId))}
          onPaste={nodeId => {
            const target = findNodeById(tree, nodeId);
            if (target) handlePasteSelection(target);
          }}
          canPaste={
            clipboardNodes.some(canDuplicateNode) &&
            clipboardNodes.filter(canDuplicateNode).every(node => canContain(contextMenu.node.type, node.type))
          }
          onDuplicate={handleDuplicateNode}
          onToggleEnabled={handleToggleEnabled}
        />
      )}
    </div>
  );
}
