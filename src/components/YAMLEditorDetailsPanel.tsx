import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { YAMLDebugSession } from './YAMLDebugView';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import type { YAMLAddableNodeType } from './yaml-tree-view/addableItems';

type DetailPanelAddAction = {
  parentNodeType: string;
  childNodeType: YAMLAddableNodeType;
};

type YAMLEditorDetailsPanelProps = {
  isDebugViewActive: boolean;
  language: string;
  debugViewEnabled: boolean;
  yamlTree: YAMLNode | null;
  yamlCode: string;
  flushPendingEdits: () => string;
  documentReady: boolean;
  selectedNode: YAMLNode | null;
  validationErrors: string[];
  onDebugSelectNode: (node: YAMLNode | null) => void;
  onDebugEditNode: (node: YAMLNode) => void;
  baseUrl: string;
  hosts: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  redirectSourceMap: Record<string, RedirectSourceInfo>;
  onNodeUpdate: (nodeId: string, updatedData: Record<string, unknown>) => void;
  onRenameHost: (oldHost: string, newHost: string) => void;
  onToggleEnabled: (nodeId: string, enabled: boolean) => void;
  onAddChildNode: (parentId: string, nodeType: YAMLAddableNodeType) => void;
  onAddChildAction: (metadata: DetailPanelAddAction) => void;
  searchQuery: string;
  dataSourceFileBrowseEnabled: boolean;
};

export function YAMLEditorDetailsPanel({
  isDebugViewActive,
  language,
  debugViewEnabled,
  yamlTree,
  yamlCode,
  flushPendingEdits,
  documentReady,
  selectedNode,
  validationErrors,
  onDebugSelectNode,
  onDebugEditNode,
  baseUrl,
  hosts,
  redirectedRequestMap,
  redirectSourceMap,
  onNodeUpdate,
  onRenameHost,
  onToggleEnabled,
  onAddChildNode,
  onAddChildAction,
  searchQuery,
  dataSourceFileBrowseEnabled,
}: YAMLEditorDetailsPanelProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
      <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 px-6 py-3">
        <span className="text-sm font-bold tracking-tight uppercase text-zinc-400">
          {isDebugViewActive
            ? 'Debug Session'
            : language === 'es'
              ? 'Detalles del elemento'
              : 'Element details'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        {/* Keep the debug session mounted while enabled so runs survive tab switches. */}
        {debugViewEnabled && (
          <div className={isDebugViewActive ? 'h-full' : 'hidden'}>
            <YAMLDebugSession
              tree={yamlTree}
              yamlCode={yamlCode}
              flushPendingEdits={flushPendingEdits}
              documentReady={documentReady}
              validationErrors={validationErrors}
              redirectedRequestMap={redirectedRequestMap}
              onSelectNode={onDebugSelectNode}
              onEditNode={onDebugEditNode}
            />
          </div>
        )}
        <div className={isDebugViewActive ? 'hidden' : 'h-full'}>
          <YAMLNodeDetails
            node={selectedNode}
            baseUrl={baseUrl}
            hosts={hosts}
            redirectedInfo={selectedNode ? (redirectedRequestMap[selectedNode.id] ?? null) : null}
            redirectSourceInfo={selectedNode ? (redirectSourceMap[selectedNode.id] ?? null) : null}
            onNodeUpdate={onNodeUpdate}
            onRenameHost={onRenameHost}
            onToggleEnabled={onToggleEnabled}
            onAddChildNode={onAddChildNode}
            onAddChildAction={onAddChildAction}
            searchQuery={searchQuery}
            dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
          />
        </div>
      </div>
    </div>
  );
}
