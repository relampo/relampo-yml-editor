import { useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import type { EditorViewMode } from '../EditorViewModeTabs';

interface UseYamlViewModeParams {
  debugViewEnabled: boolean;
  runViewEnabled: boolean;
  setSelectedNode: (node: YAMLNode | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  selectedNodeRef: React.RefObject<YAMLNode | null>;
  selectedNodeIdsRef: React.RefObject<string[]>;
}

/**
 * View-mode + tree search state: which panel (tree/code/debug/run) is active,
 * clamped to the panels Studio has actually unlocked, plus the selection
 * handlers that also steer view mode (selecting a node always surfaces Tree
 * details). Behavior is identical to the inline state it replaces.
 */
export function useYamlViewMode({
  debugViewEnabled,
  runViewEnabled,
  setSelectedNode,
  setSelectedNodeIds,
  selectedNodeRef,
  selectedNodeIdsRef,
}: UseYamlViewModeParams) {
  const [viewMode, setViewMode] = useState<EditorViewMode>('tree');
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  const activeViewMode: EditorViewMode =
    (!debugViewEnabled && viewMode === 'debug') || (!runViewEnabled && viewMode === 'run') ? 'tree' : viewMode;
  const isDebugViewActive = debugViewEnabled && activeViewMode === 'debug';
  const isRunViewActive = runViewEnabled && activeViewMode === 'run';

  const handleSelectionChange = (primaryNode: YAMLNode | null, nodeIds: string[]) => {
    setSelectedNode(primaryNode);
    setSelectedNodeIds(nodeIds);
    selectedNodeRef.current = primaryNode;
    selectedNodeIdsRef.current = nodeIds;
  };

  const handleTreeSelectionChange = (primaryNode: YAMLNode | null, nodeIds: string[]) => {
    handleSelectionChange(primaryNode, nodeIds);
    setViewMode('tree');
  };

  return {
    viewMode,
    setViewMode,
    treeSearchQuery,
    setTreeSearchQuery,
    activeViewMode,
    isDebugViewActive,
    isRunViewActive,
    handleSelectionChange,
    handleTreeSelectionChange,
  };
}
