import { useState } from 'react';
import { YAMLDistributedRun } from './YAMLDistributedRun';
import { splitWebSocketConversation } from '../utils/websocketConversation';
import type { SearchScope } from './yaml-tree-view/search';
import type { ComponentCapabilities } from '../utils/componentConfiguration';
import type { DocumentIssue } from '../utils/documentIssues';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { YAMLDebugSession } from './YAMLDebugView';
import { YAMLLoadRunSession } from './YAMLRunView';
import { YAMLNodeDetails } from './YAMLNodeDetails';

type YAMLEditorDetailsPanelProps = {
  onTreeChange?: (tree: YAMLNode) => void;
  isDebugViewActive: boolean;
  isRunViewActive: boolean;
  language: string;
  debugViewEnabled: boolean;
  multiScenarioDebugEnabled: boolean;
  runViewEnabled: boolean;
  multiScenarioRunEnabled?: boolean;
  distributedRunEnabled?: boolean;
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
  distributedRunEnabled,
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
  const [runMode, setRunMode] = useState<'local' | 'distributed'>('local');
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
          <div className={isRunViewActive ? 'flex h-full min-h-0 flex-col' : 'hidden'}>
            <div
              role="tablist"
              aria-label={language === 'es' ? 'Modo de ejecución' : 'Execution mode'}
              className="flex shrink-0 gap-1 border-b border-white/10 px-4 pt-2"
            >
              {(['local', 'distributed'] as const).map(mode => (
                <button
                  key={mode}
                  role="tab"
                  id={`run-mode-${mode}`}
                  aria-controls={`run-panel-${mode}`}
                  aria-selected={runMode === mode}
                  tabIndex={runMode === mode ? 0 : -1}
                  onKeyDown={event => {
                    const target =
                      event.key === 'Home'
                        ? 'local'
                        : event.key === 'End'
                          ? 'distributed'
                          : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
                            ? mode === 'local'
                              ? 'distributed'
                              : 'local'
                            : null;
                    if (target) {
                      event.preventDefault();
                      setRunMode(target);
                      event.currentTarget.parentElement
                        ?.querySelector<HTMLButtonElement>(`#run-mode-${target}`)
                        ?.focus();
                    }
                  }}
                  onClick={() => setRunMode(mode)}
                  className={`border-b-2 px-5 py-2 text-sm ${runMode === mode ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                >
                  {mode === 'local' ? 'Local' : language === 'es' ? 'Distribuido' : 'Distributed'}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="run-panel-local"
              aria-labelledby="run-mode-local"
              className={runMode === 'local' ? 'min-h-0 flex-1' : 'hidden'}
            >
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
            <div
              role="tabpanel"
              id="run-panel-distributed"
              aria-labelledby="run-mode-distributed"
              className={runMode === 'distributed' ? 'min-h-0 flex-1' : 'hidden'}
            >
              <YAMLDistributedRun
                enabled={distributedRunEnabled}
                fileName={fileName}
                yamlCode={yamlCode}
                flushPendingEdits={flushPendingEdits}
                documentReady={documentReady}
                validationErrors={validationErrors}
              />
            </div>
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
            onSplitWebSocket={
              yamlTree && onTreeChange
                ? nodeId => onTreeChange(splitWebSocketConversation(yamlTree, nodeId))
                : undefined
            }
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
