import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';
import { useResizePanel } from '../hooks/useResizePanel';
import { useYAMLPersistence } from '../hooks/useYAMLPersistence';
import { logStatsigEvent } from '../utils/analytics';
import { applyNodeUpdateToTree, renameRequestHost } from '../utils/nodeUpdate';
import { getDocumentMetrics } from '../utils/yamlDocumentLimits';
import { YAMLEditorHeader } from './YAMLEditorHeader';
import { YAMLEditorNewDocumentDialog } from './YAMLEditorNewDocumentDialog';
import { YAMLEditorBusyOverlay } from './YAMLEditorBusyOverlay';
import { YAMLEditorDragOverlay } from './YAMLEditorDragOverlay';
import { YAMLEditorStatusBanners } from './YAMLEditorStatusBanners';
import { YAMLEditorMainLayout } from './YAMLEditorMainLayout';
import { syncRedirectSourceFollowRedirects, updateNodeEnabled } from './yaml-tree-view/treeOperations';
import { autoRebalanceBalancedControllers } from '../utils/balancedController';
import { useHttpDefaultsInfo, useRedirectMaps, useTreeSelection } from './useYamlEditorDerived';
import { useYamlDocumentLifecycle } from './yaml-editor/useYamlDocumentLifecycle';
import { useYamlDocumentSync } from './yaml-editor/useYamlDocumentSync';
import { useYamlFileUpload } from './yaml-editor/useYamlFileUpload';
import { useYamlViewMode } from './yaml-editor/useYamlViewMode';

export function YAMLEditor() {
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
    hasDocumentActivity,
    setHasDocumentActivity,
    isParsing,
    isFileLoading,
    setIsFileLoading,
    parseDebounceRef,
    serializeDebounceRef,
    editRevisionRef,
    syncCodeToTree,
    handleCodeChange,
    commitTreeChange,
    handleTreeChange,
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
    runViewEnabled,
    dataSourceFileBrowseEnabled,
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
    setSelectedNode,
    setSelectedNodeIds,
    selectedNodeRef,
    selectedNodeIdsRef,
  });

  const {
    fileInputRef,
    isDragOver,
    handleUpload,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useYamlFileUpload({
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
  });

  const documentMetrics = useMemo(() => getDocumentMetrics(yamlCode), [yamlCode]);
  const isLargeFileMode = documentMetrics.large;
  const isEditorBusy = isFileLoading || isParsing;

  const { lastSavedAt, actionMessage, handleDownload, resetForNewDocument } = useYAMLPersistence({
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

  const { redirectedRequestMap, redirectSourceMap } = useRedirectMaps(yamlTree);
  const { httpDefaultsBaseUrl, scenarioHosts, httpDefaultsBaseHost } = useHttpDefaultsInfo(yamlTree);

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
        language={language}
        setLanguage={setLanguage}
        t={t}
        hasDocumentActivity={hasDocumentActivity}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        actionMessage={actionMessage}
        isDocumentEmpty={!yamlTree && !yamlCode.trim()}
        onNew={handleNewOpen}
        onUpload={handleUpload}
        onDownload={handleDownload}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />

      <YAMLEditorNewDocumentDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        t={t}
        onCancel={() => setIsNewDialogOpen(false)}
        onConfirm={handleNewConfirm}
      />

      {isEditorBusy && <YAMLEditorBusyOverlay isFileLoading={isFileLoading} language={language} />}

      <YAMLEditorStatusBanners
        error={error}
        validationErrors={validationErrors}
        language={language}
      />

      <YAMLEditorMainLayout
        leftPanelWidth={leftPanelWidth}
        onResizeStart={() => setIsResizing(true)}
        activeViewMode={activeViewMode}
        onSelectViewMode={setViewMode}
        language={language}
        debugViewEnabled={debugViewEnabled}
        runViewEnabled={runViewEnabled}
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
        treeSearchQuery={treeSearchQuery}
        documentReady={isInitialized}
        dataSourceFileBrowseEnabled={dataSourceFileBrowseEnabled}
        largeFileMode={isLargeFileMode}
        onSelectionChange={handleTreeSelectionChange}
        onTreeChange={handleTreeChange}
        onContextMenuOpened={handleTreeContextMenuOpened}
        onSearchChange={setTreeSearchQuery}
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
        onToggleEnabled={handleToggleNodeEnabled}
      />
    </div>
  );
}
