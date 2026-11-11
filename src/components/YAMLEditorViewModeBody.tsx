import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { RunLoadEditor } from './RunLoadEditor';
import type { NodeUpdateHandler } from '../types/shared';
import type { SearchScope } from './yaml-tree-view/search';
import type { IssueMarker } from '../utils/documentIssues';
import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { EditorViewModeTabs, type EditorViewMode } from './EditorViewModeTabs';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import type { TreeSelection } from './yamlEditorHelpers';

interface YAMLEditorViewModeBodyProps {
  showTabs?: boolean;
  executionView?: 'debug' | 'run';
  onNodeUpdate?: NodeUpdateHandler;
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
  executionView,
  onNodeUpdate,
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
  const [executionPanel, setExecutionPanel] = useState<'tree' | 'code' | 'load'>('tree');
  useEffect(() => {
    if (executionView === 'run' && selectedNode?.type === 'load') setExecutionPanel('load');
  }, [executionView, selectedNode?.id, selectedNode?.type]);
  const panel = executionView
    ? executionPanel === 'load' && executionView !== 'run'
      ? 'tree'
      : executionPanel
    : activeViewMode;
  return (
    <div
      className="min-h-0 min-w-0 flex flex-col bg-[#0a0a0a]"
      style={{ width: `${leftPanelWidth}%` }}
    >
      {showTabs && (
        <EditorViewModeTabs
          activeViewMode={panel === 'load' ? 'run' : panel}
          onSelect={mode => {
            if (executionView && (mode === 'tree' || mode === 'code')) setExecutionPanel(mode);
            else onSelectViewMode(mode);
          }}
          extraTab={
            executionView === 'run' ? (
              <button
                type="button"
                aria-label={language === 'es' ? 'Configuración de carga' : 'Load configuration'}
                aria-pressed={panel === 'load'}
                onClick={() => setExecutionPanel('load')}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${panel === 'load' ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                <Gauge className="h-4 w-4" />
                {language === 'es' ? 'Carga' : 'Load'}
              </button>
            ) : undefined
          }
          language={language}
          debugViewEnabled={debugViewEnabled}
          runViewEnabled={runViewEnabled}
        />
      )}

      <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
        {panel === 'load' && onNodeUpdate ? (
          <RunLoadEditor
            tree={tree}
            language={language}
            width={100}
            onNodeUpdate={onNodeUpdate}
            preferredNodeId={selectedNode?.type === 'load' ? selectedNode.id : undefined}
          />
        ) : panel === 'tree' ? (
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
