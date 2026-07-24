import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import type { EditorViewMode } from './EditorViewModeTabs';
import { YAMLEditorDetailsPanel } from './YAMLEditorDetailsPanel';
import { YAMLEditorViewModeBody } from './YAMLEditorViewModeBody';
import type { TreeSelection } from './yamlEditorHelpers';

interface YAMLEditorMainLayoutProps {
  leftPanelWidth: number;
  onResizeStart: () => void;
  activeViewMode: EditorViewMode;
  onSelectViewMode: (mode: EditorViewMode) => void;
  language: string;
  debugViewEnabled: boolean;
  runViewEnabled: boolean;
  isDebugViewActive: boolean;
  isRunViewActive: boolean;
  yamlTree: YAMLNode | null;
  yamlCode: string;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  redirectSourceMap: Record<string, RedirectSourceInfo>;
  baseHost: string;
  baseUrl: string;
  hosts: string[];
  validationErrors: string[];
  treeSearchQuery: string;
  documentReady: boolean;
  dataSourceFileBrowseEnabled: boolean;
  largeFileMode: boolean;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (newTree: YAMLNode, nextSelection?: TreeSelection) => void;
  onContextMenuOpened: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  onSearchChange: (query: string) => void;
  onCodeChange: (newCode: string) => void;
  flushPendingEdits: () => string;
  onDebugSelectNode: (node: YAMLNode | null) => void;
  onDebugEditNode: (node: YAMLNode) => void;
  onNodeUpdate: (nodeId: string, updatedData: Record<string, unknown>) => void;
  onRenameHost: (oldHost: string, newHost: string) => void;
  onToggleEnabled: (nodeId: string, enabled: boolean) => void;
}

// The resizable two-panel body: the tree/code view-mode panel on the left,
// the drag handle, and the details/debug/run panel on the right.
export function YAMLEditorMainLayout({
  leftPanelWidth,
  onResizeStart,
  activeViewMode,
  onSelectViewMode,
  language,
  debugViewEnabled,
  runViewEnabled,
  isDebugViewActive,
  isRunViewActive,
  yamlTree,
  yamlCode,
  selectedNode,
  selectedNodeIds,
  redirectedRequestMap,
  redirectSourceMap,
  baseHost,
  baseUrl,
  hosts,
  validationErrors,
  treeSearchQuery,
  documentReady,
  dataSourceFileBrowseEnabled,
  largeFileMode,
  onSelectionChange,
  onTreeChange,
  onContextMenuOpened,
  onSearchChange,
  onCodeChange,
  flushPendingEdits,
  onDebugSelectNode,
  onDebugEditNode,
  onNodeUpdate,
  onRenameHost,
  onToggleEnabled,
}: YAMLEditorMainLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0 min-w-0 bg-[#0a0a0a]">
      <YAMLEditorViewModeBody
        leftPanelWidth={leftPanelWidth}
        activeViewMode={activeViewMode}
        onSelectViewMode={onSelectViewMode}
        language={language}
        debugViewEnabled={debugViewEnabled}
        runViewEnabled={runViewEnabled}
        tree={yamlTree}
        selectedNode={selectedNode}
        selectedNodeIds={selectedNodeIds}
        redirectedRequestMap={redirectedRequestMap}
        baseHost={baseHost}
        onSelectionChange={onSelectionChange}
        onTreeChange={onTreeChange}
        onContextMenuOpened={onContextMenuOpened}
        onSearchChange={onSearchChange}
        yamlCode={yamlCode}
        onCodeChange={onCodeChange}
        largeFileMode={largeFileMode}
      />

      {/* Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        tabIndex={0}
        onMouseDown={onResizeStart}
        className="w-1 bg-white/5 hover:bg-yellow-400/40 shrink-0 transition-colors relative active:bg-yellow-400/60 z-20 group"
        style={{ cursor: 'col-resize' }}
      >
        <div
          className="absolute inset-y-0 -left-1 -right-1 z-20"
          style={{ cursor: 'col-resize' }}
        />
        <div className="absolute inset-y-0 left-1/2 -ml-px w-0.5 bg-white/20 group-hover:bg-yellow-400/80 transition-colors" />
      </div>

      <YAMLEditorDetailsPanel
        isDebugViewActive={isDebugViewActive}
        isRunViewActive={isRunViewActive}
        language={language}
        debugViewEnabled={debugViewEnabled}
        runViewEnabled={runViewEnabled}
        yamlTree={yamlTree}
        yamlCode={yamlCode}
        flushPendingEdits={flushPendingEdits}
        documentReady={documentReady}
        selectedNode={selectedNode}
        validationErrors={validationErrors}
        onDebugSelectNode={onDebugSelectNode}
        onDebugEditNode={onDebugEditNode}
        baseUrl={baseUrl}
        hosts={hosts}
        redirectedRequestMap={redirectedRequestMap}
        redirectSourceMap={redirectSourceMap}
        onNodeUpdate={onNodeUpdate}
        onRenameHost={onRenameHost}
        onToggleEnabled={onToggleEnabled}
        searchQuery={activeViewMode === 'tree' ? treeSearchQuery : ''}
        dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
      />
    </div>
  );
}
