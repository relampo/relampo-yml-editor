import { openGRPCRecorderTab, openHTTPRecorderTab, openNewStudioTab } from '../utils/recorderTabs';
import { GRPCWorkbench } from './grpc/GRPCWorkbench';
import { ProtocolSetupDialog } from './protocols/ProtocolSetupDialog';
import { appendProtocolSteps, type StudioProtocol } from '../utils/protocolProject';
import { appendGRPCScenario } from '../utils/grpcProject';
import type { SearchScope } from './yaml-tree-view/search';
import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';
import { useResizePanel } from '../hooks/useResizePanel';
import { useYAMLPersistence } from '../hooks/useYAMLPersistence';
import { logStatsigEvent } from '../utils/analytics';
import { applyNodeUpdateToTree, removeRequestHost, renameRequestHost } from '../utils/nodeUpdate';
import { getDocumentMetrics } from '../utils/yamlDocumentLimits';
import { indexDocumentIssues } from '../utils/documentIssues';
import { YAMLEditorHeader } from './YAMLEditorHeader';
import { YAMLEditorNewDocumentDialog } from './YAMLEditorNewDocumentDialog';
import { YAMLEditorBusyOverlay } from './YAMLEditorBusyOverlay';
import { YAMLEditorDragOverlay } from './YAMLEditorDragOverlay';
import { YAMLEditorStatusBanners } from './YAMLEditorStatusBanners';
import { YAMLEditorMainLayout } from './YAMLEditorMainLayout';
import {
  expandAncestorsInTree,
  syncRedirectSourceFollowRedirects,
  updateNodeEnabled,
} from './yaml-tree-view/treeOperations';
import { findNodeById } from './yamlEditorHelpers';
import { autoRebalanceBalancedControllers } from '../utils/balancedController';
import { useHttpDefaultsInfo, useRedirectMaps, useTreeSelection } from './useYamlEditorDerived';
import { useYamlDocumentLifecycle } from './yaml-editor/useYamlDocumentLifecycle';
import { useYamlDocumentSync } from './yaml-editor/useYamlDocumentSync';
import { useYamlFileUpload } from './yaml-editor/useYamlFileUpload';
import { useYamlViewMode } from './yaml-editor/useYamlViewMode';

export function YAMLEditor() {
  const [activeProtocol, setActiveProtocol] = useState<StudioProtocol | null>(null);
  const [treeSearchScope, setTreeSearchScope] = useState<SearchScope | null>(null);
  const { language, setLanguage, t } = useLanguage();
  const { yamlContent, setYamlContent } = useYAML();
  const { leftPanelWidth, isResizing: _isResizing, setIsResizing } = useResizePanel(30);

  const {
    selectedNode,
    setSelectedNode,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeRef,
    selectedNodeIdsRef,
    syncSelectionWithTree,
  } = useTreeSelection();

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationNodeIds, setValidationNodeIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const fallbackRootNameRef = useRef<string | null>(null);
  const hasDiscoveredTreeContextMenuRef = useRef(false);

  const {
    yamlCode,
    setYamlCode,
    yamlTree,
    setYamlTree,
    isDirty,
    setIsDirty,
    setHasDocumentActivity,
    isParsing,
    isFileLoading,
    isTreeOutdated,
    setIsFileLoading,
    parseDebounceRef,
    serializeDebounceRef,
    editRevisionRef,
    syncCodeToTree,
    handleCodeChange,
    commitTreeChange,
    handleTreeChange,
    handleTreeViewChange,
    flushPendingTreeSerialization,
    retrieveYamlForSaving,
    resetDocument,
  } = useYamlDocumentSync({
    language,
    isInitialized,
    fallbackRootNameRef,
    setYamlContent,
    setError,
    setValidationErrors,
    setValidationNodeIds,
    selectedNode,
    setSelectedNode,
    setSelectedNodeIds,
    selectedNodeRef,
    selectedNodeIdsRef,
    syncSelectionWithTree,
  });

  const {
    currentFileName,
    setCurrentFileName,
    restoredDraftUpdatedAt,
    isNewDialogOpen,
    setIsNewDialogOpen,
    handleNewOpen,
    resetIdentityForNewDocument,
    debugViewEnabled,
    multiScenarioDebugEnabled,
    runViewEnabled,
    multiScenarioRunEnabled,
    componentCapabilities,
    dataSourceFileBrowseEnabled,
    grpcAuthoringEnabled,
    grpcRecorderTabsEnabled,
    httpRecorderEnabled,
    grpcBrowserRecordingEnabled,
    defaultViewMode,
  } = useYamlDocumentLifecycle({
    language,
    initialYamlContent: yamlContent,
    setYamlContent,
    setError,
    isInitialized,
    setIsInitialized,
    fallbackRootNameRef,
    setYamlCode,
    syncCodeToTree,
    setHasDocumentActivity,
    setIsDirty,
    setIsFileLoading,
  });

  const {
    setViewMode,
    treeSearchQuery,
    setTreeSearchQuery,
    activeViewMode,
    isDebugViewActive,
    isRunViewActive,
    handleSelectionChange,
    handleTreeSelectionChange,
  } = useYamlViewMode({
    debugViewEnabled,
    runViewEnabled,
    defaultViewMode,
    setSelectedNode,
    setSelectedNodeIds,
    selectedNodeRef,
    selectedNodeIdsRef,
  });

  const { handleDownload, resetForNewDocument } = useYAMLPersistence({
    isDirty,
    setIsDirty,
    isInitialized,
    yamlCode,
    currentFileName,
    language,
    restoredDraftUpdatedAt,
    getPersistableYaml: retrieveYamlForSaving,
    setHasDocumentActivity,
    setError,
    serializeDebounceRef,
    editRevisionRef,
  });

  const { fileInputRef, isDragOver, handleUpload, handleFileChange, handleDragOver, handleDragLeave, handleDrop } =
    useYamlFileUpload({
      language,
      setError,
      setSelectedNode,
      setSelectedNodeIds,
      setYamlTree,
      setYamlCode,
      setYamlContent,
      setViewMode,
      fallbackRootNameRef,
      syncCodeToTree,
      setCurrentFileName,
      setHasDocumentActivity,
      setIsDirty,
      setIsFileLoading,
      parseDebounceRef,
      serializeDebounceRef,
      invalidatePendingDraft: () => {
        setSearchResetSignal(signal => signal + 1);
        setTreeSearchQuery('');
        setTreeSearchScope(null);
        return resetForNewDocument();
      },
    });

  const documentMetrics = useMemo(() => getDocumentMetrics(yamlCode), [yamlCode]);
  const issueIndex = useMemo(
    () => indexDocumentIssues(yamlTree, validationErrors, validationNodeIds, language),
    [yamlTree, validationErrors, validationNodeIds, language],
  );
  const isLargeFileMode = documentMetrics.large;
  const isEditorBusy = isFileLoading || isParsing;
  const documentReady = isInitialized && !isEditorBusy && !error && !isTreeOutdated;

  const { redirectedRequestMap, redirectSourceMap } = useRedirectMaps(yamlTree);
  const { httpDefaultsBaseUrl, scenarioHosts, httpDefaultsBaseHost } = useHttpDefaultsInfo(yamlTree);

  // Clears the tree search, opens the node's collapsed ancestors, selects it,
  // and shows the tree. A search that hides the node would drop the selection.
  const [searchResetSignal, setSearchResetSignal] = useState(0);
  const goToIssue = (nodeId: string) => {
    if (!yamlTree) return;
    setSearchResetSignal(signal => signal + 1);
    setTreeSearchQuery('');
    const expandedTree = expandAncestorsInTree(yamlTree, nodeId);
    if (expandedTree !== yamlTree) handleTreeViewChange(expandedTree);
    const node = findNodeById(expandedTree, nodeId);
    if (!node) return;
    handleSelectionChange(node, [nodeId]);
    setViewMode('tree');
  };
  const goToFirstError = issueIndex.errorCount ? () => goToIssue(issueIndex.navigationOrder[0]) : undefined;

  const handleNodeUpdate = (nodeId: string, updatedData: Record<string, unknown>) => {
    if (!yamlTree) return;
    const updatedTree = applyNodeUpdateToTree(yamlTree, nodeId, updatedData);
    commitTreeChange(updatedTree, undefined, { serialization: 'debounced' });
  };

  // Rename a recorded host everywhere it appears (base_url + every absolute
  // request URL that targets it), so secondary hosts are editable like the
  // primary one instead of being locked to the recorded value. See RLP-365.
  const handleRenameHost = (oldHost: string, newHost: string) => {
    if (!yamlTree) return;
    const updatedTree = renameRequestHost(yamlTree, oldHost, newHost);
    if (updatedTree === yamlTree) return;
    commitTreeChange(updatedTree, undefined, { serialization: 'debounced' });
  };

  const handleRemoveHost = (host: string) => {
    if (!yamlTree) return;
    const updatedTree = removeRequestHost(yamlTree, host);
    if (updatedTree === yamlTree) return;
    commitTreeChange(updatedTree, undefined, { serialization: 'debounced' });
  };

  const handleToggleNodeEnabled = (nodeId: string, enabled: boolean) => {
    if (!yamlTree) return;
    const toggledTree = updateNodeEnabled(yamlTree, nodeId, enabled);
    const updatedTree = syncRedirectSourceFollowRedirects(toggledTree, nodeId, enabled, redirectedRequestMap);
    const rebalanced = autoRebalanceBalancedControllers(yamlTree, updatedTree);
    commitTreeChange(rebalanced, undefined, { serialization: 'debounced' });
  };

  const handleTreeContextMenuOpened = ({
    nodeType,
    selectionCount,
    hasMultiSelection,
  }: {
    nodeType: string;
    selectionCount: number;
    hasMultiSelection: boolean;
  }) => {
    hasDiscoveredTreeContextMenuRef.current = true;
    logStatsigEvent('tree_context_menu_opened', {
      node_type: nodeType,
      selection_count: selectionCount,
      has_multi_selection: hasMultiSelection,
    });
  };

  const handleNewConfirm = () => {
    resetDocument();
    resetIdentityForNewDocument();
    setViewMode('tree');

    // Bumps the save generation, cancels any pending autosave, and clears the
    // stored draft so an in-flight save can't resurrect the discarded content.
    void resetForNewDocument();
  };

  return (
    <div
      className={`relative flex flex-col h-full bg-[#0a0a0a] w-full overflow-hidden ${isDragOver ? 'ring-2 ring-yellow-400/70 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && <YAMLEditorDragOverlay language={language} />}

      <YAMLEditorHeader
        onNewStudio={() => {
          if (!openNewStudioTab(language))
            setError(
              language === 'es' ? 'Permite abrir Studio en una pestaña nueva.' : 'Allow opening Studio in a new tab.',
            );
        }}
        onSelectProtocol={protocol => {
          if ((protocol === 'grpc' && grpcRecorderTabsEnabled) || (protocol === 'https' && httpRecorderEnabled)) {
            if (!(protocol === 'https' ? openHTTPRecorderTab(language) : openGRPCRecorderTab(language)))
              setError(
                language === 'es'
                  ? 'Permite abrir Recorder en una pestaña nueva.'
                  : 'Allow opening Recorder in a new tab.',
              );
          } else setActiveProtocol(protocol);
        }}
        grpcEnabled={grpcAuthoringEnabled}
        httpEnabled={httpRecorderEnabled}
        language={language}
        setLanguage={setLanguage}
        t={t}
        isDocumentEmpty={!yamlTree && !yamlCode.trim()}
        onNew={handleNewOpen}
        onUpload={handleUpload}
        onDownload={handleDownload}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />

      {grpcAuthoringEnabled && (
        <GRPCWorkbench
          open={activeProtocol === 'grpc'}
          browserRecordingEnabled={grpcBrowserRecordingEnabled}
          onOpenChange={open => {
            if (!open) setActiveProtocol(null);
          }}
          language={language}
          onGoToStudio={() => setViewMode('tree')}
          onAdd={generated => {
            const merged = appendGRPCScenario(retrieveYamlForSaving(), generated);
            handleCodeChange(merged);
            setViewMode('tree');
          }}
        />
      )}
      {(activeProtocol === 'https' || activeProtocol === 'websocket') && (
        <ProtocolSetupDialog
          key={activeProtocol}
          open
          protocol={activeProtocol}
          language={language}
          onOpenChange={open => {
            if (!open) setActiveProtocol(null);
          }}
          onGoToStudio={() => setViewMode('tree')}
          onAdd={step => {
            handleCodeChange(appendProtocolSteps(retrieveYamlForSaving(), [step]));
            setViewMode(activeProtocol === 'websocket' ? 'code' : 'tree');
          }}
        />
      )}
      <YAMLEditorNewDocumentDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        t={t}
        onCancel={() => setIsNewDialogOpen(false)}
        onConfirm={handleNewConfirm}
      />

      {isEditorBusy && (
        <YAMLEditorBusyOverlay
          isFileLoading={isFileLoading}
          language={language}
        />
      )}

      <YAMLEditorStatusBanners
        error={error}
        issueIndex={issueIndex}
        selectedNodeId={selectedNode?.id}
        onGoToIssue={goToIssue}
        language={language}
      />

      <YAMLEditorMainLayout
        leftPanelWidth={leftPanelWidth}
        onResizeStart={() => setIsResizing(true)}
        activeViewMode={activeViewMode}
        onSelectViewMode={setViewMode}
        language={language}
        debugViewEnabled={debugViewEnabled}
        multiScenarioDebugEnabled={multiScenarioDebugEnabled}
        runViewEnabled={runViewEnabled}
        multiScenarioRunEnabled={multiScenarioRunEnabled}
        componentCapabilities={componentCapabilities}
        isDebugViewActive={isDebugViewActive}
        isRunViewActive={isRunViewActive}
        yamlTree={yamlTree}
        yamlCode={yamlCode}
        selectedNode={selectedNode}
        selectedNodeIds={selectedNodeIds}
        redirectedRequestMap={redirectedRequestMap}
        redirectSourceMap={redirectSourceMap}
        baseHost={httpDefaultsBaseHost}
        baseUrl={httpDefaultsBaseUrl}
        hosts={scenarioHosts}
        validationErrors={validationErrors}
        issueIndex={issueIndex}
        searchResetSignal={searchResetSignal}
        onGoToFirstError={goToFirstError}
        treeSearchQuery={treeSearchQuery}
        treeSearchScope={treeSearchScope}
        documentReady={documentReady}
        dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
        fileName={currentFileName}
        largeFileMode={isLargeFileMode}
        onSelectionChange={handleTreeSelectionChange}
        onTreeChange={handleTreeChange}
        onTreeViewChange={handleTreeViewChange}
        onContextMenuOpened={handleTreeContextMenuOpened}
        onSearchChange={(query, scope) => {
          setTreeSearchQuery(query);
          setTreeSearchScope(scope ?? null);
        }}
        onCodeChange={handleCodeChange}
        flushPendingEdits={flushPendingTreeSerialization}
        onDebugSelectNode={node => {
          handleSelectionChange(node, node ? [node.id] : []);
        }}
        onDebugEditNode={node => {
          handleSelectionChange(node, [node.id]);
          setViewMode('tree');
        }}
        onNodeUpdate={handleNodeUpdate}
        onRenameHost={handleRenameHost}
        onRemoveHost={handleRemoveHost}
        onToggleEnabled={handleToggleNodeEnabled}
      />
      <footer className="shrink-0 border-t border-white/5 px-3 py-1 text-xs text-zinc-400">
        Relampo Editor · {import.meta.env.VITE_EDITOR_VERSION || 'development'}
      </footer>
    </div>
  );
}
