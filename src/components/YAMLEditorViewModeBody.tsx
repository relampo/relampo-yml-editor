import { useState } from 'react';
import type { SearchScope } from './yaml-tree-view/search';
import type { IssueMarker } from '../utils/documentIssues';
import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { EditorViewModeTabs, type EditorViewMode } from './EditorViewModeTabs';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import type { TreeSelection } from './yamlEditorHelpers';

interface YAMLEditorViewModeBodyProps {
  showTabs?: boolean;
  embedded?: boolean;
  leftPanelWidth: number;
  activeViewMode: EditorViewMode;
  onSelectViewMode: (mode: EditorViewMode) => void;
  language: string;
  debugViewEnabled: boolean;
  runViewEnabled: boolean;
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  issueMarkers: Record<string, IssueMarker>;
  searchResetSignal: number;
  baseHost: string;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (newTree: YAMLNode, nextSelection?: TreeSelection) => void;
  onTreeViewChange: (newTree: YAMLNode) => void;
  onContextMenuOpened: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  onSearchChange: (query: string, scope?: SearchScope | null) => void;
  yamlCode: string;
  onCodeChange: (newCode: string) => void;
  largeFileMode: boolean;
}

// The left panel of the main layout: the tree/code/debug/run tab strip plus
// the content that matches the active tab.
export function YAMLEditorViewModeBody({
  showTabs = true,
  embedded = false,
  leftPanelWidth,
  activeViewMode,
  onSelectViewMode,
  language,
  debugViewEnabled,
  runViewEnabled,
  tree,
  selectedNode,
  selectedNodeIds,
  redirectedRequestMap,
  issueMarkers,
  searchResetSignal,
  baseHost,
  onSelectionChange,
  onTreeChange,
  onTreeViewChange,
  onContextMenuOpened,
  onSearchChange,
  yamlCode,
  onCodeChange,
  largeFileMode,
}: YAMLEditorViewModeBodyProps) {
  const [sidebarMode, setSidebarMode] = useState<'tree' | 'code'>('tree');
  const panel = embedded ? sidebarMode : activeViewMode;
  return (
    <div
      className="min-h-0 min-w-0 flex flex-col bg-[#0a0a0a]"
      style={{ width: `${leftPanelWidth}%` }}
    >
      {showTabs && (
        <EditorViewModeTabs
          activeViewMode={panel}
          onSelect={mode => {
            if (embedded && (mode === 'tree' || mode === 'code')) setSidebarMode(mode);
            else onSelectViewMode(mode);
          }}
          language={language}
          debugViewEnabled={debugViewEnabled}
          runViewEnabled={runViewEnabled}
        />
      )}

      <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
        {panel === 'tree' ? (
          <YAMLTreeView
            tree={tree}
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            redirectedRequestMap={redirectedRequestMap}
            issueMarkers={issueMarkers}
            searchResetSignal={searchResetSignal}
            baseHost={baseHost}
            onSelectionChange={onSelectionChange}
            onTreeChange={onTreeChange}
            onTreeViewChange={onTreeViewChange}
            onContextMenuOpened={onContextMenuOpened}
            onSearchChange={onSearchChange}
          />
        ) : panel === 'code' ? (
          <YAMLCodeEditor
            value={yamlCode}
            onChange={onCodeChange}
            readOnly={true}
            active={panel === 'code'}
            largeFileMode={largeFileMode}
          />
        ) : (
          <YAMLTreeView
            tree={tree}
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            redirectedRequestMap={redirectedRequestMap}
            issueMarkers={issueMarkers}
            searchResetSignal={searchResetSignal}
            onSelectionChange={onSelectionChange}
            onTreeChange={onTreeChange}
            onTreeViewChange={onTreeViewChange}
            onContextMenuOpened={onContextMenuOpened}
          />
        )}
      </div>
    </div>
  );
}
