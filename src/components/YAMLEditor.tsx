import { Code2, GitBranch, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';
import { useResizePanel } from '../hooks/useResizePanel';
import { useYAMLPersistence } from '../hooks/useYAMLPersistence';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { applyNodeUpdateToTree } from '../utils/nodeUpdate';
import { getDocumentMetrics } from '../utils/yamlDocumentLimits';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { validateYAMLSemantics } from '../utils/yamlSemanticValidation';
import { Button } from './ui/button';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLEditorHeader } from './YAMLEditorHeader';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { YAMLTreeView } from './YAMLTreeView';

const EMPTY_PARALLEL_ERROR = 'Parallel controller must contain at least one child step';

type ParseWorkerRequest = {
  id: number;
  yaml: string;
};

type ParseWorkerResponse = { id: number; ok: true; tree: YAMLNode | null } | { id: number; ok: false; error: string };

type TreeSelection = {
  primaryId: string | null;
  nodeIds: string[];
};

function normalizeYamlFileName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'relampo-script.yaml';
  return /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yaml`;
}

function findNodeById(node: YAMLNode, id: string): YAMLNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function lockTypedNodeSelectionInNode(node: YAMLNode): [YAMLNode, boolean] {
  let changed = false;
  let nextData = node.data;
  let nextChildren = node.children;

  const defaultType = node.type === 'extractor' ? 'regex' : node.type === 'assertion' ? 'status' : null;

  if (defaultType) {
    const currentData = node.data || {};
    const currentType =
      typeof node.data?.type === 'string' && node.data.type.trim() !== '' ? node.data.type.trim() : defaultType;
    const typedData = { ...currentData, __lockedType: currentType } as Record<string, unknown>;
    delete typedData.__allowTypeSelection;
    if (currentData.__lockedType !== currentType || currentData.__allowTypeSelection !== undefined) {
      nextData = typedData;
      changed = true;
    }
  }

  if (node.children && node.children.length > 0) {
    let childChanged = false;
    const updatedChildren = node.children.map(child => {
      const [nextChild, wasChanged] = lockTypedNodeSelectionInNode(child);
      if (wasChanged) childChanged = true;
      return nextChild;
    });
    if (childChanged) {
      nextChildren = updatedChildren;
      changed = true;
    }
  }

  if (!changed) return [node, false];
  return [{ ...node, data: nextData, children: nextChildren }, true];
}

export function YAMLEditor() {
  const { language, setLanguage, t } = useLanguage();
  const { yamlContent, setYamlContent } = useYAML();
  const { leftPanelWidth, isResizing: _isResizing, setIsResizing } = useResizePanel(30);

  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('tree');
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
  const selectedNodeRef = useRef<YAMLNode | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);

  const documentMetrics = useMemo(() => getDocumentMetrics(yamlCode), [yamlCode]);
  const isLargeFileMode = documentMetrics.large;
  const isEditorBusy = isFileLoading || isParsing;

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  const syncSelectionWithTree = (tree: YAMLNode | null) => {
    if (!tree) {
      setSelectedNode(null);
      setSelectedNodeIds([]);
      selectedNodeRef.current = null;
      selectedNodeIdsRef.current = [];
      return;
    }

    const survivingIds = selectedNodeIdsRef.current.filter(id => findNodeById(tree, id));
    setSelectedNodeIds(survivingIds);
    selectedNodeIdsRef.current = survivingIds;

    const currentSelectedNode = selectedNodeRef.current;
    if (currentSelectedNode && survivingIds.includes(currentSelectedNode.id)) {
      const freshNode = findNodeById(tree, currentSelectedNode.id);
      setSelectedNode(freshNode ?? null);
      selectedNodeRef.current = freshNode ?? null;
      return;
    }

    if (survivingIds.length > 0) {
      const nextPrimary = findNodeById(tree, survivingIds[survivingIds.length - 1]);
      setSelectedNode(nextPrimary ?? null);
      selectedNodeRef.current = nextPrimary ?? null;
      return;
    }

    setSelectedNode(null);
    selectedNodeRef.current = null;
  };

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

  const { lastSavedAt, actionMessage, handleDownload } = useYAMLPersistence({
    isDirty,
    setIsDirty,
    isInitialized,
    yamlCode,
    currentFileName,
    language,
    getPersistableYaml: retrieveYamlForSaving,
    setHasDocumentActivity,
    setError,
    serializeDebounceRef,
  });

  const redirectedRequestMap = useMemo<Record<string, RedirectedRequestInfo>>(() => {
    if (!yamlTree) return {};
    return detectRedirectFollowUps(yamlTree);
  }, [yamlTree]);

  const redirectSourceMap = useMemo<Record<string, RedirectSourceInfo>>(() => {
    if (!yamlTree) return {};
    const result: Record<string, RedirectSourceInfo> = {};
    for (const [targetNodeId, info] of Object.entries(redirectedRequestMap)) {
      const targetNode = findNodeById(yamlTree, targetNodeId);
      result[info.sourceNodeId] = {
        targetNodeId,
        targetRequestLabel: targetNode?.name || '',
        matchedLocation: info.matchedLocation,
      };
    }
    return result;
  }, [yamlTree, redirectedRequestMap]);

  // Worker setup
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../workers/yamlParser.worker.ts', import.meta.url), {
      type: 'module',
    });
    parseWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const message = event.data;
      if (!message || message.id !== activeParseRequestIdRef.current) return;
      setIsParsing(false);
      setIsFileLoading(false);
      if (!message.ok) {
        setError(message.error || (language === 'es' ? 'Error al parsear YAML' : 'Error parsing YAML'));
        setYamlTree(null);
        syncSelectionWithTree(null);
        setValidationErrors([]);
        setIsTreeOutdated(true);
        return;
      }
      const [normalizedTree] = message.tree ? lockTypedNodeSelectionInNode(message.tree) : [message.tree, false];
      setYamlTree(normalizedTree);
      syncSelectionWithTree(normalizedTree);
      setError(null);
      applySemanticValidation(normalizedTree);
      setIsTreeOutdated(false);
    };

    worker.onerror = () => {
      setIsParsing(false);
      setIsFileLoading(false);
    };

    return () => {
      worker.terminate();
      if (parseWorkerRef.current === worker) parseWorkerRef.current = null;
    };
  }, [language]);

  const syncCodeToTree = (code: string, options?: { force?: boolean }) => {
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
      worker.postMessage({ id: requestId, yaml: code } as ParseWorkerRequest);
      return;
    }

    try {
      const parsedTree = parseYAMLToTree(code);
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
    if (!isInitialized) {
      const defaultYaml = yamlContent || '';
      setYamlCode(defaultYaml);
      setYamlContent(defaultYaml);
      syncCodeToTree(defaultYaml, { force: true });
      setIsInitialized(true);
    }
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

    if (getDocumentMetrics(newCode).large) {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setIsTreeOutdated(Boolean(newCode.trim()));
      setError(null);
      setValidationErrors([]);
      setIsParsing(false);
      setIsFileLoading(false);
      return;
    }

    parseDebounceRef.current = window.setTimeout(() => {
      syncCodeToTree(newCode);
    }, 350);
  };

  const handleTreeChange = (newTree: YAMLNode, nextSelection?: TreeSelection) => {
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
    syncTreeToCode(newTree);
    setHasDocumentActivity(true);
    setIsDirty(true);
    setIsTreeOutdated(false);
  };

  const handleSelectionChange = (primaryNode: YAMLNode | null, nodeIds: string[]) => {
    setSelectedNode(primaryNode);
    setSelectedNodeIds(nodeIds);
    selectedNodeRef.current = primaryNode;
    selectedNodeIdsRef.current = nodeIds;
  };

  const handleParseNow = () => {
    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
      parseDebounceRef.current = null;
    }
    syncCodeToTree(yamlCode, { force: true });
  };

  const handleNodeUpdate = (nodeId: string, updatedData: Record<string, unknown>) => {
    if (!yamlTree) return;
    const updatedTree = applyNodeUpdateToTree(yamlTree, nodeId, updatedData);
    setYamlTree(updatedTree);
    applySemanticValidation(updatedTree);
    setHasDocumentActivity(true);
    setIsDirty(true);
    if (selectedNode) {
      const refreshedSelectedNode = findNodeById(updatedTree, selectedNode.id);
      setSelectedNode(refreshedSelectedNode);
      selectedNodeRef.current = refreshedSelectedNode;
    }

    if (serializeDebounceRef.current) window.clearTimeout(serializeDebounceRef.current);
    serializeDebounceRef.current = window.setTimeout(() => {
      syncTreeToCode(updatedTree);
    }, 220);
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
      syncCodeToTree(content, { force: true });
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

  const formattedLineCount = documentMetrics.lines.toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
  const formattedCharCount = documentMetrics.chars.toLocaleString(language === 'es' ? 'es-ES' : 'en-US');

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
        onUpload={handleUpload}
        onDownload={handleDownload}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />

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
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 shrink-0">
          <p className="text-sm font-medium text-amber-300">
            {language === 'es'
              ? 'Problemas de validación semántica detectados.'
              : 'Semantic validation issues detected.'}
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            {validationErrors[0]}
            {validationErrors.length > 1 ? ` (+${validationErrors.length - 1})` : ''}
          </p>
        </div>
      )}

      {isLargeFileMode && (
        <div className="px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/20 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-yellow-300 font-semibold">
                {isTreeOutdated
                  ? language === 'es'
                    ? 'Modo de archivo grande activo: refresca el árbol manualmente.'
                    : 'Large file mode is active: refresh the tree manually.'
                  : isParsing
                    ? language === 'es'
                      ? 'Modo de archivo grande activo: parseando el árbol.'
                      : 'Large file mode is active: parsing the tree.'
                    : language === 'es'
                      ? 'Modo de archivo grande activo: el árbol está disponible con optimizaciones.'
                      : 'Large file mode is active: the tree is available with optimizations.'}
              </p>
              <p className="text-xs text-yellow-200/80">
                {language === 'es'
                  ? `Líneas: ${formattedLineCount} · Caracteres: ${formattedCharCount}`
                  : `Lines: ${formattedLineCount} · Characters: ${formattedCharCount}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(isTreeOutdated || !yamlTree || isParsing) && (
                <Button
                  onClick={handleParseNow}
                  variant="outline"
                  size="sm"
                  disabled={isParsing}
                  className="border-yellow-300/30 bg-yellow-300/10 hover:bg-yellow-300/20 text-yellow-200 disabled:opacity-50"
                >
                  {isParsing
                    ? language === 'es'
                      ? 'Parseando...'
                      : 'Parsing...'
                    : language === 'es'
                      ? 'Parsear árbol ahora'
                      : 'Parse tree now'}
                </Button>
              )}
              {isTreeOutdated && (
                <span className="text-[11px] px-2 py-1 rounded border border-yellow-300/30 bg-yellow-300/10 text-yellow-200">
                  {language === 'es' ? 'Árbol desactualizado' : 'Tree outdated'}
                </span>
              )}
              {yamlTree && !isTreeOutdated && !isParsing && (
                <span className="text-[11px] px-2 py-1 rounded border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                  {language === 'es' ? 'Árbol actualizado' : 'Tree current'}
                </span>
              )}
            </div>
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
                viewMode === 'tree'
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
                viewMode === 'code'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {language === 'es' ? 'Código' : 'Code'}
            </button>
          </div>

          <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
            {viewMode === 'tree' ? (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                selectedNodeIds={selectedNodeIds}
                redirectedRequestMap={redirectedRequestMap}
                onSelectionChange={handleSelectionChange}
                onTreeChange={handleTreeChange}
              />
            ) : (
              <YAMLCodeEditor
                value={yamlCode}
                onChange={handleCodeChange}
                readOnly={true}
                active={viewMode === 'code'}
                largeFileMode={isLargeFileMode}
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
          className="w-1 bg-white/5 hover:bg-yellow-400/40 shrink-0 transition-colors relative active:bg-yellow-400/60 z-50 group"
          style={{ cursor: 'col-resize' }}
        >
          <div
            className="absolute inset-y-0 -left-4 -right-4 z-50"
            style={{ cursor: 'col-resize' }}
          />
          <div className="absolute inset-y-0 left-1/2 -ml-px w-0.5 bg-white/20 group-hover:bg-yellow-400/80 transition-colors" />
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
          <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 px-6 py-3">
            <span className="text-sm font-bold tracking-tight uppercase text-zinc-400">
              {language === 'es' ? 'Detalles del elemento' : 'Element details'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <YAMLNodeDetails
              node={selectedNode}
              redirectedInfo={selectedNode ? (redirectedRequestMap[selectedNode.id] ?? null) : null}
              redirectSourceInfo={selectedNode ? (redirectSourceMap[selectedNode.id] ?? null) : null}
              onNodeUpdate={handleNodeUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function detectRedirectFollowUps(tree: YAMLNode): Record<string, RedirectedRequestInfo> {
  const requestNodes: YAMLNode[] = [];
  const requestTypes = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);

  const walk = (node: YAMLNode) => {
    if (requestTypes.has(node.type)) requestNodes.push(node);
    node.children?.forEach(walk);
  };

  const getLocationHeader = (node: YAMLNode): string => {
    const headers = node.data?.response?.headers;
    if (!headers || typeof headers !== 'object') return '';
    return String(
      (headers as Record<string, unknown>).Location || (headers as Record<string, unknown>).location || '',
    ).trim();
  };

  const getStatusCode = (node: YAMLNode): number => {
    const rawStatus = node.data?.response?.status;
    const status = Number(rawStatus);
    return Number.isFinite(status) ? status : 0;
  };

  const normalizeUrlForCompare = (value: string): string => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    try {
      const parsed = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'http://relampo.local');
      const normalized = `${parsed.pathname || '/'}${parsed.search || ''}`;
      return normalized.replace(/\/+$/, '') || '/';
    } catch {
      const normalized = trimmed.replace(/^[a-z]+:\/\/[^/]+/i, '');
      return (normalized || '/').replace(/\/+$/, '') || '/';
    }
  };

  walk(tree);

  const result: Record<string, RedirectedRequestInfo> = {};

  for (let i = 0; i < requestNodes.length - 1; i += 1) {
    const source = requestNodes[i];
    const target = requestNodes[i + 1];
    const status = getStatusCode(source);
    if (![301, 302, 303, 307, 308].includes(status)) continue;

    const location = getLocationHeader(source);
    if (!location) continue;

    const normalizedLocation = normalizeUrlForCompare(location);
    const normalizedTarget = normalizeUrlForCompare(String(target.data?.url || ''));
    if (!normalizedLocation || !normalizedTarget || normalizedLocation !== normalizedTarget) continue;

    result[target.id] = {
      sourceNodeId: source.id,
      sourceRequestLabel: source.name,
      matchedLocation: normalizedLocation,
    };
  }

  return result;
}
