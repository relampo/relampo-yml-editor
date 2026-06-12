import { AlertTriangle, Bug, Code2, GitBranch, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';
import { useResizePanel } from '../hooks/useResizePanel';
import { useYAMLPersistence } from '../hooks/useYAMLPersistence';
import type { YAMLNode } from '../types/yaml';
import { logStatsigEvent } from '../utils/analytics';
import { applyNodeUpdateToTree, renameRequestHost } from '../utils/nodeUpdate';
import { getActiveDraft } from '../utils/yamlDraftStorage';
import { getDocumentMetrics } from '../utils/yamlDocumentLimits';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { validateYAMLSemantics } from '../utils/yamlSemanticValidation';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { probeStudio } from '../utils/debugApi';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLDebugSession } from './YAMLDebugView';
import { YAMLEditorHeader } from './YAMLEditorHeader';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { createNodeByType } from './yaml-tree-view/nodeFactory';
import { addNodeToTree, syncRedirectSourceFollowRedirects, updateNodeEnabled } from './yaml-tree-view/treeOperations';
import type { YAMLAddableNodeType } from './yaml-tree-view/addableItems';
import { YAMLTreeView } from './YAMLTreeView';
import { useHttpDefaultsInfo, useParseWorker, useRedirectMaps, useTreeSelection } from './useYamlEditorDerived';
import {
  findNodeById,
  getDraftRestoreError,
  lockTypedNodeSelectionInNode,
  normalizeYamlFileName,
  type ParseWorkerRequest,
  type TreeSelection,
} from './yamlEditorHelpers';

const EMPTY_PARALLEL_ERROR = 'Parallel controller must contain at least one child step';
const TREE_SERIALIZE_DEBOUNCE_MS = 220;
// Dev-time override; in production the Debug view unlocks itself at runtime
// when the app detects it is being served by `relampo studio`.
const DEBUG_VIEW_FORCED = import.meta.env.VITE_DEBUG_VIEW_ENABLED === 'true';

type EditorViewMode = 'tree' | 'code' | 'debug';

type CommitTreeChangeOptions = {
  serialization?: 'immediate' | 'debounced';
};

export function YAMLEditor() {
  const { language, setLanguage, t } = useLanguage();
  const { yamlContent, setYamlContent } = useYAML();
  const { leftPanelWidth, isResizing: _isResizing, setIsResizing } = useResizePanel(30);

  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
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
  const [viewMode, setViewMode] = useState<EditorViewMode>('tree');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseDebounceRef = useRef<number | null>(null);
  const serializeDebounceRef = useRef<number | null>(null);
  const parseWorkerRef = useRef<Worker | null>(null);
  const parseRequestIdRef = useRef(0);
  const activeParseRequestIdRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('relampo-script.yaml');
  const [isDirty, setIsDirty] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasDocumentActivity, setHasDocumentActivity] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isTreeOutdated, setIsTreeOutdated] = useState(false);
  const [restoredDraftUpdatedAt, setRestoredDraftUpdatedAt] = useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const fallbackRootNameRef = useRef<string | null>(null);
  const hasDiscoveredTreeContextMenuRef = useRef(false);

  const [debugViewEnabled, setDebugViewEnabled] = useState(DEBUG_VIEW_FORCED);
  useEffect(() => {
    if (DEBUG_VIEW_FORCED) return;
    let cancelled = false;
    probeStudio().then(isStudio => {
      if (!cancelled && isStudio) setDebugViewEnabled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const documentMetrics = useMemo(() => getDocumentMetrics(yamlCode), [yamlCode]);
  const isLargeFileMode = documentMetrics.large;
  const isEditorBusy = isFileLoading || isParsing;
  const activeViewMode: EditorViewMode =
    !debugViewEnabled && viewMode === 'debug' ? 'tree' : viewMode;
  const isDebugViewActive = debugViewEnabled && activeViewMode === 'debug';

  const applySemanticValidation = (tree: YAMLNode | null) => {
    setValidationErrors(validateYAMLSemantics(tree).map(issue => issue.message));
  };

  const lockTypedNodeSelectionForCurrentTree = (): YAMLNode | null => {
    if (!yamlTree) return null;
    const [lockedTree, changed] = lockTypedNodeSelectionInNode(yamlTree);
    if (!changed) return yamlTree;
    setYamlTree(lockedTree);
    if (selectedNode) {
      const refreshedNode = findNodeById(lockedTree, selectedNode.id);
      if (refreshedNode) setSelectedNode(refreshedNode);
    }
    return lockedTree;
  };

  const retrieveYamlForSaving = (): string => {
    if (isTreeOutdated || isParsing) return yamlCode;

    const activeTree = lockTypedNodeSelectionForCurrentTree();
    if (!activeTree) return yamlCode;
    const serialized = treeToYAML(activeTree);
    setYamlCode(serialized);
    setYamlContent(serialized);
    return serialized;
  };

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
  });

  const { redirectedRequestMap, redirectSourceMap } = useRedirectMaps(yamlTree);
  const { httpDefaultsBaseUrl, scenarioHosts, httpDefaultsBaseHost } = useHttpDefaultsInfo(yamlTree);

  useParseWorker({
    language,
    activeParseRequestIdRef,
    parseWorkerRef,
    setIsParsing,
    setIsFileLoading,
    setError,
    setYamlTree,
    syncSelectionWithTree,
    setValidationErrors,
    setIsTreeOutdated,
    applySemanticValidation,
    normalizeParsedTree: tree => (tree ? lockTypedNodeSelectionInNode(tree)[0] : tree),
  });

  const syncCodeToTree = (code: string, options?: { force?: boolean; defaultRootName?: string }) => {
    if (!code || code.trim() === '') {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setYamlTree(null);
      syncSelectionWithTree(null);
      setError(null);
      setValidationErrors([]);
      setIsParsing(false);
      setIsFileLoading(false);
      setIsTreeOutdated(false);
      return;
    }

    const shouldSkipAutoParse = getDocumentMetrics(code).large && !options?.force;
    if (shouldSkipAutoParse) {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setError(null);
      setValidationErrors([]);
      setIsParsing(false);
      setIsFileLoading(false);
      setIsTreeOutdated(Boolean(code.trim()));
      return;
    }

    const requestId = ++parseRequestIdRef.current;
    activeParseRequestIdRef.current = requestId;
    setIsParsing(true);
    setIsTreeOutdated(false);

    const worker = parseWorkerRef.current;
    if (worker) {
      worker.postMessage({ id: requestId, yaml: code, rootName: options?.defaultRootName } as ParseWorkerRequest);
      return;
    }

    try {
      const parsedTree = parseYAMLToTree(code, options?.defaultRootName);
      if (activeParseRequestIdRef.current !== requestId) return;
      const [normalizedTree] = parsedTree ? lockTypedNodeSelectionInNode(parsedTree) : [parsedTree, false];
      setYamlTree(normalizedTree);
      syncSelectionWithTree(normalizedTree);
      setError(null);
      applySemanticValidation(normalizedTree);
      setIsTreeOutdated(false);
    } catch (err) {
      if (activeParseRequestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Error parsing YAML');
      setYamlTree(null);
      syncSelectionWithTree(null);
      setValidationErrors([]);
      setIsTreeOutdated(true);
    } finally {
      if (activeParseRequestIdRef.current === requestId) setIsParsing(false);
      setIsFileLoading(false);
    }
  };

  const syncTreeToCode = (tree: YAMLNode) => {
    try {
      const code = treeToYAML(tree);
      setYamlCode(code);
      setYamlContent(code);
      setError(null);
      setIsTreeOutdated(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generating YAML';
      if (message.includes(EMPTY_PARALLEL_ERROR)) {
        setError(null);
        setIsTreeOutdated(true);
        return;
      }
      setError(message);
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (isInitialized) return;

    let isCancelled = false;

    const initializeDocument = async () => {
      let initialYaml = yamlContent || '';
      let initialFileName = 'relampo-script.yaml';
      let initialUpdatedAt: string | null = null;
      let restoreError: string | null = null;

      try {
        const draft = await getActiveDraft();
        if (draft) {
          initialYaml = draft.yaml;
          initialFileName = normalizeYamlFileName(draft.fileName);
          initialUpdatedAt = draft.updatedAt;
        }
      } catch {
        restoreError = getDraftRestoreError(language);
      }

      if (isCancelled) return;

      if (initialYaml.trim()) setIsFileLoading(true);
      setYamlCode(initialYaml);
      setYamlContent(initialYaml);
      setCurrentFileName(initialFileName);
      setRestoredDraftUpdatedAt(initialUpdatedAt);
      setHasDocumentActivity(Boolean(initialUpdatedAt));
      setIsDirty(false);
      const restoredDisplayName = initialFileName.replace(/\.(ya?ml)$/i, '');
      fallbackRootNameRef.current = restoredDisplayName;
      syncCodeToTree(initialYaml, { force: true, defaultRootName: restoredDisplayName });
      if (restoreError) setError(restoreError);
      setIsInitialized(true);
    };

    void initializeDocument();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (parseDebounceRef.current) window.clearTimeout(parseDebounceRef.current);
      if (serializeDebounceRef.current) window.clearTimeout(serializeDebounceRef.current);
    };
  }, []);

  const handleCodeChange = (newCode: string) => {
    setYamlCode(newCode);
    setYamlContent(newCode);
    if (isInitialized) {
      setHasDocumentActivity(true);
      setIsDirty(true);
    }
    if (parseDebounceRef.current) window.clearTimeout(parseDebounceRef.current);

    const isLarge = getDocumentMetrics(newCode).large;
    if (isLarge) {
      setIsTreeOutdated(Boolean(newCode.trim()));
    }

    parseDebounceRef.current = window.setTimeout(() => {
      const opts = {
        ...(fallbackRootNameRef.current ? { defaultRootName: fallbackRootNameRef.current } : {}),
        ...(isLarge ? { force: true } : {}),
      };
      syncCodeToTree(newCode, Object.keys(opts).length ? opts : undefined);
    }, 350);
  };

  const scheduleTreeSerialization = (tree: YAMLNode, mode: CommitTreeChangeOptions['serialization'] = 'immediate') => {
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    if (mode === 'debounced') {
      serializeDebounceRef.current = window.setTimeout(() => {
        serializeDebounceRef.current = null;
        syncTreeToCode(tree);
      }, TREE_SERIALIZE_DEBOUNCE_MS);
      return;
    }

    syncTreeToCode(tree);
  };

  const commitTreeChange = (
    newTree: YAMLNode,
    nextSelection?: TreeSelection,
    options: CommitTreeChangeOptions = {},
  ) => {
    setYamlTree(newTree);
    if (nextSelection) {
      const nextSelectedIds = nextSelection.nodeIds.filter(Boolean);
      const nextPrimary = nextSelection.primaryId ? findNodeById(newTree, nextSelection.primaryId) : null;
      setSelectedNode(nextPrimary);
      setSelectedNodeIds(nextSelectedIds);
      selectedNodeRef.current = nextPrimary;
      selectedNodeIdsRef.current = nextSelectedIds;
    } else {
      syncSelectionWithTree(newTree);
    }
    applySemanticValidation(newTree);
    scheduleTreeSerialization(newTree, options.serialization);
    setHasDocumentActivity(true);
    setIsDirty(true);
    setIsTreeOutdated(false);
  };

  const handleTreeChange = (newTree: YAMLNode, nextSelection?: TreeSelection) => {
    commitTreeChange(newTree, nextSelection);
  };

  const handleSelectionChange = (primaryNode: YAMLNode | null, nodeIds: string[]) => {
    setSelectedNode(primaryNode);
    setSelectedNodeIds(nodeIds);
    selectedNodeRef.current = primaryNode;
    selectedNodeIdsRef.current = nodeIds;
  };

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
    commitTreeChange(updatedTree, undefined, { serialization: 'debounced' });
  };

  const handleAddChildNode = (parentId: string, nodeType: YAMLAddableNodeType) => {
    if (!yamlTree) return;

    const newNode = createNodeByType(nodeType, { balancedName: t('yamlEditor.balanced.name') });
    const updatedTree = addNodeToTree(yamlTree, parentId, newNode);
    if (!findNodeById(updatedTree, newNode.id)) return;

    commitTreeChange(updatedTree, {
      primaryId: newNode.id,
      nodeIds: [newNode.id],
    });
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

  const handleDetailPanelAddClicked = ({
    parentNodeType,
    childNodeType,
  }: {
    parentNodeType: string;
    childNodeType: YAMLAddableNodeType;
  }) => {
    const contextMenuDiscovered = hasDiscoveredTreeContextMenuRef.current;
    logStatsigEvent('detail_panel_add_clicked', {
      parent_node_type: parentNodeType,
      child_node_type: childNodeType,
      context_menu_discovered: contextMenuDiscovered,
      is_discovery_friction: !contextMenuDiscovered,
    });
  };

  const handleNewOpen = () => {
    setIsNewDialogOpen(true);
  };

  const handleNewConfirm = () => {
    setIsNewDialogOpen(false);

    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
      parseDebounceRef.current = null;
    }
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    setYamlCode('');
    setYamlContent('');
    setYamlTree(null);
    setSelectedNode(null);
    setSelectedNodeIds([]);
    selectedNodeRef.current = null;
    selectedNodeIdsRef.current = [];
    setError(null);
    setValidationErrors([]);
    setCurrentFileName('relampo-script.yaml');
    setIsDirty(false);
    setHasDocumentActivity(false);
    setIsTreeOutdated(false);
    setRestoredDraftUpdatedAt(null);
    setViewMode('tree');

    activeParseRequestIdRef.current = ++parseRequestIdRef.current;
    setIsParsing(false);
    setIsFileLoading(false);

    // Bumps the save generation, cancels any pending autosave, and clears the
    // stored draft so an in-flight save can't resurrect the discarded content.
    void resetForNewDocument();
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const isYamlFile = (file: File) => /\.(ya?ml)$/i.test(file.name);

  const loadYamlFile = (file: File, clearInput?: () => void) => {
    if (parseDebounceRef.current) window.clearTimeout(parseDebounceRef.current);
    if (serializeDebounceRef.current) window.clearTimeout(serializeDebounceRef.current);
    setIsFileLoading(true);
    setError(null);
    setSelectedNode(null);
    setSelectedNodeIds([]);
    setYamlTree(null);

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setYamlCode(content);
      setYamlContent(content);
      setViewMode('tree');
      const displayName = file.name.replace(/\.(ya?ml)$/i, '');
      fallbackRootNameRef.current = displayName;
      syncCodeToTree(content, { force: true, defaultRootName: displayName });
      setCurrentFileName(normalizeYamlFileName(file.name));
      setHasDocumentActivity(true);
      setIsDirty(false);
      clearInput?.();
    };
    reader.onerror = () => {
      setIsFileLoading(false);
      setError(language === 'es' ? 'Error al leer el archivo cargado' : 'Error reading uploaded file');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isYamlFile(file)) {
      setError(language === 'es' ? 'Solo se permiten archivos .yaml o .yml' : 'Only .yaml or .yml files are supported');
      e.target.value = '';
      return;
    }
    loadYamlFile(file, () => {
      e.target.value = '';
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isYamlFile(file)) {
      setError(language === 'es' ? 'Solo se permiten archivos .yaml o .yml' : 'Only .yaml or .yml files are supported');
      return;
    }
    loadYamlFile(file);
  };

  return (
    <div
      className={`relative flex flex-col h-full bg-[#0a0a0a] w-full overflow-hidden ${isDragOver ? 'ring-2 ring-yellow-400/70 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0a]/88 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="px-8 py-6 rounded-2xl border border-yellow-400/40 bg-[#111111] shadow-2xl shadow-yellow-400/10 text-center">
            <p className="text-base font-bold text-yellow-400">
              {language === 'es' ? 'Suelta tu archivo YAML aquí' : 'Drop your YAML file here'}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {language === 'es'
                ? 'El árbol y el editor se actualizarán automáticamente'
                : 'The tree and code editor will update automatically'}
            </p>
          </div>
        </div>
      )}

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

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('yamlEditor.newDocumentTitle')}</DialogTitle>
            <DialogDescription>{t('yamlEditor.confirmNewDocument')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewDialogOpen(false)}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              {t('yamlEditor.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleNewConfirm}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
            >
              {t('yamlEditor.newDocumentConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditorBusy && (
        <div
          className="absolute inset-0 z-60 bg-[#050505]/82 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-[min(420px,calc(100%-32px))] rounded-lg border border-yellow-400/25 bg-[#111111] shadow-2xl shadow-black/50 px-6 py-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-zinc-100">
              {isFileLoading
                ? language === 'es'
                  ? 'Cargando YAML completo'
                  : 'Loading full YAML'
                : language === 'es'
                  ? 'Procesando árbol en memoria'
                  : 'Processing tree in memory'}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {language === 'es'
                ? 'La interfaz se pausa momentáneamente para evitar acciones duplicadas y mantener el archivo íntegro.'
                : 'The interface is paused briefly to prevent duplicate actions and keep the file intact.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {!error && validationErrors.length > 0 && (
        <div className="alert-warning px-6 py-3 border-b-0 shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="alert-warning-icon w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {language === 'es'
                ? 'Problemas de validación semántica detectados.'
                : 'Semantic validation issues detected.'}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {validationErrors[0]}
              {validationErrors.length > 1 ? ` (+${validationErrors.length - 1})` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Main Resizable Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0 bg-[#0a0a0a]">
        {/* Left Panel */}
        <div
          className="min-w-0 flex flex-col bg-[#0a0a0a]"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="flex items-center bg-[#111111] border-b border-white/5 shrink-0">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${
                activeViewMode === 'tree'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              {language === 'es' ? 'Árbol' : 'Tree'}
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${
                activeViewMode === 'code'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {language === 'es' ? 'Código' : 'Code'}
            </button>
            {debugViewEnabled ? (
              <button
                onClick={() => setViewMode('debug')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${
                  activeViewMode === 'debug'
                    ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <Bug className="w-4 h-4" />
                Debug
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
            {activeViewMode === 'tree' ? (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                selectedNodeIds={selectedNodeIds}
                redirectedRequestMap={redirectedRequestMap}
                baseHost={httpDefaultsBaseHost}
                onSelectionChange={handleSelectionChange}
                onTreeChange={handleTreeChange}
                onContextMenuOpened={handleTreeContextMenuOpened}
                onSearchChange={setTreeSearchQuery}
              />
            ) : activeViewMode === 'code' ? (
              <YAMLCodeEditor
                value={yamlCode}
                onChange={handleCodeChange}
                readOnly={true}
                active={activeViewMode === 'code'}
                largeFileMode={isLargeFileMode}
              />
            ) : (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                selectedNodeIds={selectedNodeIds}
                redirectedRequestMap={redirectedRequestMap}
                onSelectionChange={(node, nodeIds) => {
                  handleSelectionChange(node, nodeIds);
                  setViewMode('tree');
                }}
                onTreeChange={handleTreeChange}
                onContextMenuOpened={handleTreeContextMenuOpened}
              />
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          tabIndex={0}
          onMouseDown={() => setIsResizing(true)}
          className="w-1 bg-white/5 hover:bg-yellow-400/40 shrink-0 transition-colors relative active:bg-yellow-400/60 z-20 group"
          style={{ cursor: 'col-resize' }}
        >
          <div
            className="absolute inset-y-0 -left-1 -right-1 z-20"
            style={{ cursor: 'col-resize' }}
          />
          <div className="absolute inset-y-0 left-1/2 -ml-px w-0.5 bg-white/20 group-hover:bg-yellow-400/80 transition-colors" />
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
          <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 px-6 py-3">
            <span className="text-sm font-bold tracking-tight uppercase text-zinc-400">
              {isDebugViewActive ? 'Debug Session' : language === 'es' ? 'Detalles del elemento' : 'Element details'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            {isDebugViewActive ? (
              <YAMLDebugSession
                tree={yamlTree}
                yamlCode={yamlCode}
                selectedNode={selectedNode}
                validationErrors={validationErrors}
                onSelectNode={node => handleSelectionChange(node, [node.id])}
                onEditNode={node => {
                  handleSelectionChange(node, [node.id]);
                  setViewMode('tree');
                }}
              />
            ) : (
              <YAMLNodeDetails
                node={selectedNode}
                baseUrl={httpDefaultsBaseUrl}
                hosts={scenarioHosts}
                redirectedInfo={selectedNode ? (redirectedRequestMap[selectedNode.id] ?? null) : null}
                redirectSourceInfo={selectedNode ? (redirectSourceMap[selectedNode.id] ?? null) : null}
                onNodeUpdate={handleNodeUpdate}
                onRenameHost={handleRenameHost}
                onToggleEnabled={handleToggleNodeEnabled}
                onAddChildNode={handleAddChildNode}
                onAddChildAction={handleDetailPanelAddClicked}
                searchQuery={activeViewMode === 'tree' ? treeSearchQuery : ''}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
