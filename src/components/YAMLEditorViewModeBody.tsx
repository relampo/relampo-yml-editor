import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { EditorViewModeTabs, type EditorViewMode } from './EditorViewModeTabs';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import type { TreeSelection } from './yamlEditorHelpers';

interface YAMLEditorViewModeBodyProps {
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
  baseHost: string;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (newTree: YAMLNode, nextSelection?: TreeSelection) => void;
  onContextMenuOpened: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  onSearchChange: (query: string) => void;
  yamlCode: string;
  onCodeChange: (newCode: string) => void;
  largeFileMode: boolean;
}

// The left panel of the main layout: the tree/code/debug/run tab strip plus
// the content that matches the active tab.
export function YAMLEditorViewModeBody({
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
  baseHost,
  onSelectionChange,
  onTreeChange,
  onContextMenuOpened,
  onSearchChange,
  yamlCode,
  onCodeChange,
  largeFileMode,
}: YAMLEditorViewModeBodyProps) {
  return (
    <div
      className="min-w-0 flex flex-col bg-[#0a0a0a]"
      style={{ width: `${leftPanelWidth}%` }}
    >
      <EditorViewModeTabs
        activeViewMode={activeViewMode}
        onSelect={onSelectViewMode}
        language={language}
        debugViewEnabled={debugViewEnabled}
        runViewEnabled={runViewEnabled}
      />

      <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
        {activeViewMode === 'tree' ? (
          <YAMLTreeView
            tree={tree}
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            redirectedRequestMap={redirectedRequestMap}
            baseHost={baseHost}
            onSelectionChange={onSelectionChange}
            onTreeChange={onTreeChange}
            onContextMenuOpened={onContextMenuOpened}
            onSearchChange={onSearchChange}
          />
        ) : activeViewMode === 'code' ? (
          <YAMLCodeEditor
            value={yamlCode}
            onChange={onCodeChange}
            readOnly={true}
            active={activeViewMode === 'code'}
            largeFileMode={largeFileMode}
          />
        ) : (
          <YAMLTreeView
            tree={tree}
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            redirectedRequestMap={redirectedRequestMap}
            onSelectionChange={onSelectionChange}
            onTreeChange={onTreeChange}
            onContextMenuOpened={onContextMenuOpened}
          />
        )}
      </div>
    </div>
  );
}
