import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { YAMLDebugSession } from './YAMLDebugView';
import { YAMLLoadRunSession } from './YAMLRunView';
import { YAMLNodeDetails } from './YAMLNodeDetails';

type YAMLEditorDetailsPanelProps = {
  isDebugViewActive: boolean;
  isRunViewActive: boolean;
  language: string;
  debugViewEnabled: boolean;
  runViewEnabled: boolean;
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
  searchQuery: string;
  dataSourceFileBrowseEnabled: boolean;
};

export function YAMLEditorDetailsPanel({
  isDebugViewActive,
  isRunViewActive,
  language,
  debugViewEnabled,
  runViewEnabled,
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
  searchQuery,
  dataSourceFileBrowseEnabled,
}: YAMLEditorDetailsPanelProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
      <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 px-6 py-3">
        <span className="text-sm font-bold tracking-tight uppercase text-zinc-400">
          {isDebugViewActive
            ? 'Debug Session'
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
        {/* Keep the load-run session mounted while enabled so a long run survives tab switches. */}
        {runViewEnabled && (
          <div className={isRunViewActive ? 'h-full' : 'hidden'}>
            <YAMLLoadRunSession
              tree={yamlTree}
              yamlCode={yamlCode}
              flushPendingEdits={flushPendingEdits}
              documentReady={documentReady}
              validationErrors={validationErrors}
            />
          </div>
        )}
        <div className={isDebugViewActive || isRunViewActive ? 'hidden' : 'h-full'}>
          <YAMLNodeDetails
            node={selectedNode}
            baseUrl={baseUrl}
            hosts={hosts}
            redirectedInfo={selectedNode ? (redirectedRequestMap[selectedNode.id] ?? null) : null}
            redirectSourceInfo={selectedNode ? (redirectSourceMap[selectedNode.id] ?? null) : null}
            onNodeUpdate={onNodeUpdate}
            onRenameHost={onRenameHost}
            onToggleEnabled={onToggleEnabled}
            searchQuery={searchQuery}
            dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
          />
        </div>
      </div>
    </div>
  );
}
