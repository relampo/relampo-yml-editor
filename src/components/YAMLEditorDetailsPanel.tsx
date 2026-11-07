import { splitWebSocketConversation } from '../utils/websocketConversation';
import type { SearchScope } from './yaml-tree-view/search';
import type { ComponentCapabilities } from '../utils/componentConfiguration';
import type { DocumentIssue } from '../utils/documentIssues';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { YAMLDebugSession } from './YAMLDebugView';
import { YAMLLoadRunSession } from './YAMLRunView';
import { YAMLNodeDetails } from './YAMLNodeDetails';

type YAMLEditorDetailsPanelProps = {
 onTreeChange?:(tree:YAMLNode)=>void;
  isDebugViewActive: boolean;
  isRunViewActive: boolean;
  language: string;
  debugViewEnabled: boolean;
  multiScenarioDebugEnabled: boolean;
  runViewEnabled: boolean;
  multiScenarioRunEnabled?: boolean;
  componentCapabilities?: ComponentCapabilities;
  yamlTree: YAMLNode | null;
  yamlCode: string;
  flushPendingEdits: () => string;
  documentReady: boolean;
  selectedNode: YAMLNode | null;
  validationErrors: string[];
  selectedNodeIssues: DocumentIssue[];
  onGoToFirstError?: () => void;
  onDebugSelectNode: (node: YAMLNode | null) => void;
  onDebugEditNode: (node: YAMLNode) => void;
  baseUrl: string;
  hosts: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  redirectSourceMap: Record<string, RedirectSourceInfo>;
  onNodeUpdate: (nodeId: string, updatedData: Record<string, unknown>) => void;
  onRenameHost: (oldHost: string, newHost: string) => void;
  onRemoveHost: (host: string) => void;
  onToggleEnabled: (nodeId: string, enabled: boolean) => void;
  searchQuery: string;
  searchScope?: SearchScope | null;
  dataSourceFileBrowseEnabled: boolean;
  fileName: string;
};

export function YAMLEditorDetailsPanel({
  isDebugViewActive,
  isRunViewActive,
  language,
  debugViewEnabled,
  multiScenarioDebugEnabled,
  runViewEnabled,
  multiScenarioRunEnabled,
  componentCapabilities,
  yamlTree,
  yamlCode,
  flushPendingEdits,
  documentReady,
  selectedNode,
  validationErrors,
  selectedNodeIssues,
  onGoToFirstError,
  onDebugSelectNode,
  onDebugEditNode,
  baseUrl,
  hosts,
  redirectedRequestMap,
  redirectSourceMap,
  onNodeUpdate,
  onTreeChange,
  onRenameHost,
  onRemoveHost,
  onToggleEnabled,
  searchQuery,
  searchScope,
  dataSourceFileBrowseEnabled,
  fileName,
}: YAMLEditorDetailsPanelProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
      <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 px-6 py-3">
        <span className="text-sm font-bold tracking-tight uppercase text-zinc-400">
          {isDebugViewActive
            ? language === 'es'
              ? 'Sesión de depuración'
              : 'Debug Session'
            : isRunViewActive
              ? language === 'es'
                ? 'Prueba de carga'
                : 'Load test'
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
              multiScenarioDebugEnabled={multiScenarioDebugEnabled}
              componentCapabilities={componentCapabilities}
              tree={yamlTree}
              yamlCode={yamlCode}
              flushPendingEdits={flushPendingEdits}
              documentReady={documentReady}
              validationErrors={validationErrors}
              onGoToFirstError={onGoToFirstError}
              redirectedRequestMap={redirectedRequestMap}
              onSelectNode={onDebugSelectNode}
              onEditNode={onDebugEditNode}
            />
          </div>
        )}
        {/* Keep the load-run session mounted while enabled so a long run survives tab switches. */}
        {runViewEnabled && (
          <div className={isRunViewActive ? 'h-full' : 'hidden'}>
            <YAMLLoadRunSession
              multiScenarioRunEnabled={multiScenarioRunEnabled}
              componentCapabilities={componentCapabilities}
              tree={yamlTree}
              yamlCode={yamlCode}
              flushPendingEdits={flushPendingEdits}
              documentReady={documentReady}
              validationErrors={validationErrors}
              onGoToFirstError={onGoToFirstError}
            />
          </div>
        )}
        <div className={isDebugViewActive || isRunViewActive ? 'hidden' : 'h-full'}>
          <YAMLNodeDetails
            node={selectedNode}
            issues={selectedNodeIssues}
            tree={yamlTree}
            componentCapabilities={componentCapabilities}
            baseUrl={baseUrl}
            hosts={hosts}
            redirectedInfo={selectedNode ? (redirectedRequestMap[selectedNode.id] ?? null) : null}
            redirectSourceInfo={selectedNode ? (redirectSourceMap[selectedNode.id] ?? null) : null}
            onNodeUpdate={onNodeUpdate}
            onSplitWebSocket={yamlTree&&onTreeChange?(nodeId)=>onTreeChange(splitWebSocketConversation(yamlTree,nodeId)):undefined}
            onRenameHost={onRenameHost}
            onRemoveHost={onRemoveHost}
            onToggleEnabled={onToggleEnabled}
            searchQuery={searchQuery}
            searchScope={searchScope}
            dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
            fileName={fileName}
          />
        </div>
      </div>
    </div>
  );
}
