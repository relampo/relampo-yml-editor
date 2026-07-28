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
import { canDuplicateNode, findNodeById, getTransactionValidationMessage } from './yaml-tree-view/treeViewHelpers';
import { YAMLContextMenu } from './YAMLContextMenu';
import { YAMLTreeNode } from './YAMLTreeNode';

interface YAMLTreeViewProps {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  baseHost?: string;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (tree: YAMLNode, nextSelection?: { primaryId: string | null; nodeIds: string[] }) => void;
  onContextMenuOpened?: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  onSearchChange?: (query: string) => void;
}

export function YAMLTreeView({
  tree,
  selectedNode,
  selectedNodeIds,
  redirectedRequestMap,
  baseHost = '',
  onSelectionChange,
  onTreeChange,
  onContextMenuOpened,
  onSearchChange,
}: YAMLTreeViewProps) {
  const { t } = useLanguage();

  const {
    searchQuery,
    handleSearchChange,
    handleClearSearch,
    visibleNodes,
    nodeById,
    activeSelectedIds,
    effectiveSelectedIds,
    allSelectedDisabled,
    transactionWrapValidation,
    treeContainerRef,
  } = useTreeViewSelection({ tree, selectedNode, selectedNodeIds, onSelectionChange, onSearchChange });

  const { contextMenu, handleContextMenu, handleCloseContextMenu, getContextActionTargetIds } = useTreeContextMenu({
    activeSelectedIds,
    effectiveSelectedIds,
    onSelectionChange,
    onContextMenuOpened,
  });

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
      const nextIds = isAlreadySelected ? activeSelectedIds.filter(id => id !== node.id) : [...activeSelectedIds, node.id];

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
      <TreeSearchBar value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} />

      {activeSelectedIds.length > 1 && (
        <TreeBulkActionsBar
          selectedCount={activeSelectedIds.length}
          hasActionableSelection={effectiveSelectedIds.length > 0}
          allSelectedDisabled={allSelectedDisabled}
          canCreateTransaction={Boolean(transactionWrapValidation?.valid)}
          validationMessage={getTransactionValidationMessage(transactionWrapValidation?.reason)}
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
        aria-label="YAML tree"
        className="flex-1 overflow-y-auto px-3 pb-3 outline-none"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onMouseDown={() => treeContainerRef.current?.focus()}
      >
        {tree ? (
          <YAMLTreeNode
            node={tree}
            depth={0}
            parentType={undefined}
            isSelected={activeSelectedIds.includes(tree.id)}
            selectedNodeIds={activeSelectedIds}
            redirectedRequestMap={redirectedRequestMap}
            baseHost={baseHost}
            onNodeSelect={handleNodeSelect}
            onNodeToggle={handleNodeToggle}
            onContextMenu={handleContextMenu}
            onNodeMove={handleNodeMove}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-zinc-500">No YAML loaded</p>
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
