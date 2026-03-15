import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Upload, Download, Save, Code2, GitBranch, ChevronDown } from 'lucide-react';
import yaml from 'js-yaml';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import type { YAMLNode, RedirectSourceInfo, RedirectedRequestInfo } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type ViewMode = 'code' | 'tree';

const LARGE_FILE_CHAR_THRESHOLD = 2_000_000;
const LARGE_FILE_LINE_THRESHOLD = 50_000;

type ParseWorkerRequest = {
  id: number;
  yaml: string;
};

type ParseWorkerResponse =
  | { id: number; ok: true; tree: YAMLNode | null }
  | { id: number; ok: false; error: string };

type DocumentMetrics = {
  chars: number;
  lines: number;
  large: boolean;
};

function getDocumentMetrics(text: string): DocumentMetrics {
  const chars = text.length;
  if (chars === 0) return { chars: 0, lines: 0, large: false };

  let lines = 1;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) lines += 1;
  }

  const large = chars >= LARGE_FILE_CHAR_THRESHOLD || lines >= LARGE_FILE_LINE_THRESHOLD;
  return { chars, lines, large };
}

export function YAMLEditor() {
  const { language, setLanguage, t } = useLanguage();
  const { yamlContent, setYamlContent } = useYAML();
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // Tree/Code (Default 30%)
  const [isResizing, setIsResizing] = useState(false);

  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
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
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hasDocumentActivity, setHasDocumentActivity] = useState(false);
  const actionMessageTimeoutRef = useRef<number | null>(null);
  const bypassUnloadWarningRef = useRef(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isTreeOutdated, setIsTreeOutdated] = useState(false);
  const selectedNodeRef = useRef<YAMLNode | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    if (actionMessageTimeoutRef.current) {
      window.clearTimeout(actionMessageTimeoutRef.current);
    }
    actionMessageTimeoutRef.current = window.setTimeout(() => {
      setActionMessage('');
    }, 1800);
  };

  const normalizeYamlFileName = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'relampo-script.yaml';
    return /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yaml`;
  };

  const documentMetrics = useMemo(() => getDocumentMetrics(yamlCode), [yamlCode]);
  const isLargeFileMode = documentMetrics.large;

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  // Initialize tree on mount
  useEffect(() => {
    if (!isInitialized) {
      const defaultYaml = yamlContent || getDefaultYAML();
      const metrics = getDocumentMetrics(defaultYaml);
      setYamlCode(defaultYaml);
      setYamlContent(defaultYaml);
      syncCodeToTree(defaultYaml);
      if (metrics.large) {
        setViewMode('code');
        setIsTreeOutdated(Boolean(defaultYaml.trim()));
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const containerWidth = window.innerWidth;
      const mouseXPercentage = (e.clientX / containerWidth) * 100;

      // Limit Left panel between 20% and 60%
      const newWidth = Math.min(Math.max(mouseXPercentage, 20), 60);
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Helper to find a node by ID in the tree
  const findNodeById = (node: YAMLNode, id: string): YAMLNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const lockTypedNodeSelectionInNode = (node: YAMLNode): [YAMLNode, boolean] => {
    let changed = false;
    let nextData = node.data;
    let nextChildren = node.children;

    const defaultType =
      node.type === 'extractor' ? 'regex' :
      node.type === 'assertion' ? 'status' :
      null;

    if (defaultType) {
      const currentData = node.data || {};
      const currentType = typeof node.data?.type === 'string' && node.data.type.trim() !== ''
        ? node.data.type.trim()
        : defaultType;
      const typedData = { ...currentData, __lockedType: currentType } as Record<string, any>;
      delete typedData.__allowTypeSelection;
      if (currentData.__lockedType !== currentType || currentData.__allowTypeSelection !== undefined) {
        nextData = typedData;
        changed = true;
      }
    }

    if (node.children && node.children.length > 0) {
      let childChanged = false;
      const updatedChildren = node.children.map((child) => {
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

    return [
      {
        ...node,
        data: nextData,
        children: nextChildren,
      },
      true,
    ];
  };

  const lockTypedNodeSelectionForCurrentTree = (): YAMLNode | null => {
    if (!yamlTree) return null;
    const [lockedTree, changed] = lockTypedNodeSelectionInNode(yamlTree);
    if (!changed) return yamlTree;
    setYamlTree(lockedTree);
    if (selectedNode) {
      const refreshedNode = findNodeById(lockedTree, selectedNode.id);
      if (refreshedNode) {
        setSelectedNode(refreshedNode);
      }
    }
    return lockedTree;
  };

  const getPersistableYaml = (): string => {
    const activeTree = lockTypedNodeSelectionForCurrentTree();
    if (!activeTree) return yamlCode;
    const serialized = treeToYAML(activeTree);
    setYamlCode(serialized);
    setYamlContent(serialized);
    return serialized;
  };

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

  const syncSelectionWithTree = (tree: YAMLNode | null) => {
    if (!tree) {
      setSelectedNode(null);
      setSelectedNodeIds([]);
      selectedNodeRef.current = null;
      selectedNodeIdsRef.current = [];
      return;
    }

    const survivingIds = selectedNodeIdsRef.current.filter((id) => findNodeById(tree, id));
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

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../workers/yamlParser.worker.ts', import.meta.url), { type: 'module' });
    parseWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const message = event.data;
      if (!message || message.id !== activeParseRequestIdRef.current) return;

      setIsParsing(false);

      if (!message.ok) {
        setError(message.error || (language === 'es' ? 'Error al parsear YAML' : 'Error parsing YAML'));
        setYamlTree(null);
        syncSelectionWithTree(null);
        setIsTreeOutdated(true);
        return;
      }

      const parsedTree = message.tree;
      const [normalizedTree] = parsedTree
        ? lockTypedNodeSelectionInNode(parsedTree)
        : [parsedTree, false];
      setYamlTree(normalizedTree);
      syncSelectionWithTree(normalizedTree);
      setError(null);
      setIsTreeOutdated(false);
    };

    worker.onerror = () => {
      setIsParsing(false);
    };

    return () => {
      worker.terminate();
      if (parseWorkerRef.current === worker) {
        parseWorkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Synchronize code to tree
  const syncCodeToTree = (code: string, options?: { force?: boolean }) => {
    if (!code || code.trim() === '') {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setYamlTree(null);
      syncSelectionWithTree(null);
      setError(null);
      setIsParsing(false);
      setIsTreeOutdated(false);
      return;
    }

    const shouldSkipAutoParse = getDocumentMetrics(code).large && !options?.force;
    if (shouldSkipAutoParse) {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setError(null);
      setIsParsing(false);
      setIsTreeOutdated(Boolean(code.trim()));
      return;
    }

    const requestId = ++parseRequestIdRef.current;
    activeParseRequestIdRef.current = requestId;
    setIsParsing(true);

    const worker = parseWorkerRef.current;
    if (worker) {
      worker.postMessage({ id: requestId, yaml: code } as ParseWorkerRequest);
      return;
    }

    try {
      const parsedTree = parseYAMLToTree(code);
      if (activeParseRequestIdRef.current !== requestId) return;

      const [normalizedTree] = parsedTree
        ? lockTypedNodeSelectionInNode(parsedTree)
        : [parsedTree, false];
      setYamlTree(normalizedTree);
      syncSelectionWithTree(normalizedTree);
      setError(null);
      setIsTreeOutdated(false);
    } catch (err) {
      if (activeParseRequestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Error parsing YAML');
      setYamlTree(null);
      syncSelectionWithTree(null);
      setIsTreeOutdated(true);
    } finally {
      if (activeParseRequestIdRef.current === requestId) {
        setIsParsing(false);
      }
    }
  };

  // Synchronize tree to code
  const syncTreeToCode = (tree: YAMLNode) => {
    try {
      const code = treeToYAML(tree);
      setYamlCode(code);
      setYamlContent(code); // Actualizar contexto
      setError(null);
      setIsTreeOutdated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setYamlCode(newCode);
    setYamlContent(newCode); // Update context
    if (isInitialized) {
      setHasDocumentActivity(true);
      setIsDirty(true);
    }
    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
    }

    if (getDocumentMetrics(newCode).large) {
      activeParseRequestIdRef.current = ++parseRequestIdRef.current;
      setIsTreeOutdated(Boolean(newCode.trim()));
      setError(null);
      setIsParsing(false);
      return;
    }

    parseDebounceRef.current = window.setTimeout(() => {
      syncCodeToTree(newCode);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (parseDebounceRef.current) {
        window.clearTimeout(parseDebounceRef.current);
      }
      if (serializeDebounceRef.current) {
        window.clearTimeout(serializeDebounceRef.current);
      }
      if (actionMessageTimeoutRef.current) {
        window.clearTimeout(actionMessageTimeoutRef.current);
      }
    };
  }, []);

  const handleTreeChange = (newTree: YAMLNode) => {
    setYamlTree(newTree);
    syncSelectionWithTree(newTree);
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

  const handleNodeUpdate = (nodeId: string, updatedData: any) => {
    if (!yamlTree) return;

    let updatedSelectedNode: YAMLNode | null = null;

    const updateNodeInTree = (node: YAMLNode): YAMLNode => {
      if (node.id === nodeId) {
        // Extract __name if present and apply it to node.name
        const { __name, ...cleanData } = updatedData || {};
        const updated = {
          ...node,
          name: __name !== undefined ? __name : node.name,
          data: cleanData
        };
        if (selectedNode?.id === nodeId) {
          updatedSelectedNode = updated;
        }
        return updated;
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeInTree),
        };
      }
      return node;
    };

    const updatedTree = updateNodeInTree(yamlTree);
    setYamlTree(updatedTree);
    setHasDocumentActivity(true);
    setIsDirty(true);

    // Update selectedNode if it's the node that was modified
    if (updatedSelectedNode) {
      setSelectedNode(updatedSelectedNode);
    }

    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
    }
    serializeDebounceRef.current = window.setTimeout(() => {
      syncTreeToCode(updatedTree);
    }, 220);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const loadYamlFile = (file: File, clearInput?: () => void) => {
    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
    }
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
    }

    // Reset current editor state to avoid stale node references from previous script
    setError(null);
    setSelectedNode(null);
    setSelectedNodeIds([]);
    setYamlTree(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const metrics = getDocumentMetrics(content);
      setYamlCode(content);
      setYamlContent(content);
      syncCodeToTree(content);
      if (metrics.large) {
        setViewMode('code');
        setIsTreeOutdated(Boolean(content.trim()));
      } else {
        setIsTreeOutdated(false);
      }
      setCurrentFileName(normalizeYamlFileName(file.name));
      setHasDocumentActivity(true);
      setIsDirty(false);
      showActionMessage(language === 'es' ? 'Archivo cargado' : 'File loaded');
      clearInput?.();
    };
    reader.onerror = () => {
      setError(language === 'es' ? 'Error al leer el archivo cargado' : 'Error reading uploaded file');
    };
    reader.readAsText(file);
  };

  const isYamlFile = (file: File) => /\.(ya?ml)$/i.test(file.name);

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

  const handleSave = () => {
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    let persistableYaml = yamlCode;
    try {
      persistableYaml = getPersistableYaml();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
      return;
    }

    const now = new Date();
    localStorage.setItem('relampo-yaml-draft', persistableYaml);
    localStorage.setItem('relampo-yaml-draft-timestamp', now.toISOString());
    localStorage.setItem('relampo-yaml-draft-filename', currentFileName);
    setHasDocumentActivity(true);
    setIsDirty(false);
    setLastSavedAt(now.toLocaleTimeString());
    showActionMessage(language === 'es' ? 'Cambios guardados' : 'Changes saved');
  };

  const stripResponsesFromObject = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(stripResponsesFromObject);
    }

    if (value && typeof value === 'object') {
      const next: Record<string, any> = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        if (key === 'response') continue;
        next[key] = stripResponsesFromObject(nestedValue);
      }
      return next;
    }

    return value;
  };

  const buildDownloadContent = (includeResponses: boolean, sourceYaml: string) => {
    if (includeResponses) {
      return sourceYaml;
    }

    try {
      const parsed = yaml.load(sourceYaml);
      const sanitized = stripResponsesFromObject(parsed);
      return yaml.dump(sanitized, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
    } catch (err) {
      setError(
        language === 'es'
          ? 'No se pudo generar el YAML sin respuestas. Verifica que el contenido sea válido.'
          : 'Could not generate YAML without responses. Make sure the content is valid.'
      );
      return null;
    }
  };

  const handleDownload = (includeResponses: boolean) => {
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    let sourceYaml = yamlCode;
    try {
      sourceYaml = getPersistableYaml();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
      return;
    }

    const content = buildDownloadContent(includeResponses, sourceYaml);
    if (content === null) return;

    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = normalizeYamlFileName(currentFileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasDocumentActivity(true);
    setIsDirty(false);
    setLastSavedAt(new Date().toLocaleTimeString());
    showActionMessage(
      includeResponses
        ? (language === 'es' ? 'YAML descargado con respuestas' : 'YAML downloaded with responses')
        : (language === 'es' ? 'YAML descargado sin respuestas' : 'YAML downloaded without responses')
    );
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || bypassUnloadWarningRef.current) return;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.onbeforeunload = handleBeforeUnload;
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      if (window.onbeforeunload === handleBeforeUnload) {
        window.onbeforeunload = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefreshShortcut =
        e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');

      if (isRefreshShortcut && isDirty) {
        e.preventDefault();
        const confirmMessage = language === 'es'
          ? 'Tienes cambios sin guardar. Si recargas, se perderán. ¿Quieres continuar?'
          : 'You have unsaved changes. If you reload, they will be lost. Continue?';
        const shouldReload = window.confirm(confirmMessage);
        if (shouldReload) {
          bypassUnloadWarningRef.current = true;
          window.location.reload();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleDownload(true);
          return;
        }
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [yamlCode, currentFileName, language, isDirty]);

  const formattedLineCount = useMemo(
    () => documentMetrics.lines.toLocaleString(language === 'es' ? 'es-ES' : 'en-US'),
    [documentMetrics.lines, language]
  );

  const formattedCharCount = useMemo(
    () => documentMetrics.chars.toLocaleString(language === 'es' ? 'es-ES' : 'en-US'),
    [documentMetrics.chars, language]
  );

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
              {language === 'es' ? 'El árbol y el editor se actualizarán automáticamente' : 'The tree and code editor will update automatically'}
            </p>
          </div>
        </div>
      )}
      {/* Header - Exact Converter Style */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fde047] via-[#facc15] to-[#eab308] flex items-center justify-center" style={{ boxShadow: '0 14px 35px rgba(250, 204, 21, 0.40)' }}>
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))' }}>
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" />
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white tracking-tight m-0">
                RELAMPO
              </h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide m-0">
                {language === 'es' ? 'Editor de YAML' : 'YAML Editor'}
              </p>
            </div>
          </div>

          {/* Right: Buttons + Language Toggle (Exact Converter Style) */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              {hasDocumentActivity && (
                <span
                  className={`text-[11px] px-2 py-1 rounded border ${
                    isDirty
                      ? 'text-amber-300 border-amber-400/30 bg-amber-400/10'
                      : 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                  }`}
                >
                  {isDirty
                    ? (language === 'es' ? 'Sin guardar' : 'Unsaved')
                    : (language === 'es' ? 'Guardado' : 'Saved')}
                </span>
              )}
              {hasDocumentActivity && lastSavedAt && !isDirty && (
                <span className="text-[11px] text-zinc-500">
                  {language === 'es' ? 'Último guardado:' : 'Last save:'} {lastSavedAt}
                </span>
              )}
              {actionMessage && (
                <span className="text-[11px] text-zinc-300">{actionMessage}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleUpload}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('yamlEditor.uploadYaml')}
              </Button>

              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                <Save className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Guardar' : 'Save'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 text-sm font-medium text-yellow-400 shadow-sm transition-all duration-200 hover:bg-yellow-400/10 hover:border-yellow-400/35 hover:shadow-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                >
                  <Download className="w-4 h-4" />
                  {t('yamlEditor.downloadYaml')}
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#111111] border border-white/10 text-zinc-200 min-w-[260px] p-1.5"
                >
                  <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wide">
                    {language === 'es' ? 'Opciones de descarga' : 'Download options'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => handleDownload(true)}
                    className="rounded-md px-3 py-2 focus:bg-yellow-400/10 focus:text-white cursor-pointer data-[highlighted]:bg-yellow-400/10 data-[highlighted]:text-white"
                  >
                    <div className="flex flex-col">
                      <span>{language === 'es' ? 'Descargar con respuestas' : 'Download with responses'}</span>
                      <span className="text-xs text-zinc-500">
                        {language === 'es' ? 'Útil para editar y correlacionar el script' : 'Best for editing and correlating the script'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDownload(false)}
                    className="rounded-md px-3 py-2 focus:bg-yellow-400/10 focus:text-white cursor-pointer data-[highlighted]:bg-yellow-400/10 data-[highlighted]:text-white"
                  >
                    <div className="flex flex-col">
                      <span>{language === 'es' ? 'Descargar sin respuestas' : 'Download without responses'}</span>
                      <span className="text-xs text-zinc-500">
                        {language === 'es' ? 'Ideal para lanzar pruebas con el script' : 'Best for running tests with the script'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Language Toggle - EXACT COPY from Converter */}
            <div className="lang-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="lang-label" style={{ fontSize: '12px', fontWeight: '600', color: language === 'en' ? '#facc15' : '#a3a3a3', transition: 'color 0.3s ease' }}>EN</span>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="langToggle"
                  checked={language === 'es'}
                  onChange={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className="toggle-slider" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  transition: 'all 0.3s ease'
                }}></span>
              </label>
              <span className="lang-label" style={{ fontSize: '12px', fontWeight: '600', color: language === 'es' ? '#facc15' : '#a3a3a3', transition: 'color 0.3s ease' }}>ES</span>
              <style>{`
                .toggle-slider:before {
                  position: absolute;
                  content: "";
                  height: 18px;
                  width: 18px;
                  left: 3px;
                  bottom: 2px;
                  background: linear-gradient(135deg, #fde047 0%, #facc15 45%, #eab308 100%);
                  border-radius: 50%;
                  transition: all 0.3s ease;
                  box-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);
                }
                input:checked + .toggle-slider:before {
                  transform: translateX(20px);
                }
                .toggle-switch:hover .toggle-slider {
                  border-color: #facc15;
                }
              `}</style>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {isLargeFileMode && (
        <div className="px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-yellow-300 font-semibold">
                {language === 'es'
                  ? 'Modo de archivo grande activo: el árbol no se parsea automáticamente.'
                  : 'Large file mode is active: tree parsing is manual.'}
              </p>
              <p className="text-xs text-yellow-200/80">
                {language === 'es'
                  ? `Líneas: ${formattedLineCount} · Caracteres: ${formattedCharCount}`
                  : `Lines: ${formattedLineCount} · Characters: ${formattedCharCount}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleParseNow}
                variant="outline"
                size="sm"
                disabled={isParsing}
                className="border-yellow-300/30 bg-yellow-300/10 hover:bg-yellow-300/20 text-yellow-200 disabled:opacity-50"
              >
                {isParsing
                  ? (language === 'es' ? 'Parseando...' : 'Parsing...')
                  : (language === 'es' ? 'Parsear árbol ahora' : 'Parse tree now')}
              </Button>
              {isTreeOutdated && (
                <span className="text-[11px] px-2 py-1 rounded border border-yellow-300/30 bg-yellow-300/10 text-yellow-200">
                  {language === 'es' ? 'Árbol desactualizado' : 'Tree outdated'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Resizable Layout: Toggled Code/Tree (Left) | Details (Right) */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0 bg-[#0a0a0a]">
        {/* Left Panel: Toggled Code/Tree */}
        <div
          className="min-w-0 flex flex-col bg-[#0a0a0a]"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Tabs */}
          <div className="flex items-center bg-[#111111] border-b border-white/5 flex-shrink-0">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${viewMode === 'tree'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <GitBranch className="w-4 h-4" />
              {language === 'es' ? 'Árbol' : 'Tree'}
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${viewMode === 'code'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <Code2 className="w-4 h-4" />
              {language === 'es' ? 'Código' : 'Code'}
            </button>
          </div>

          {/* Content */}
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

        {/* Center Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="w-1 bg-white/5 hover:bg-yellow-400/40 flex-shrink-0 transition-colors relative active:bg-yellow-400/60 z-50 group"
          style={{ cursor: 'col-resize' }}
        >
          {/* Invisible larger hit area - 32px wide for very easy targeting */}
          <div className="absolute inset-y-0 -left-4 -right-4 z-50" style={{ cursor: 'col-resize' }} />
          {/* Visual line - clearly visible */}
          <div className="absolute inset-y-0 left-1/2 -ml-[1px] w-[2px] bg-white/20 group-hover:bg-yellow-400/80 transition-colors" />
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
          <div className="flex items-center border-b border-white/5 bg-[#111111] flex-shrink-0 px-6 py-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-sm font-bold tracking-tight uppercase">{language === 'es' ? 'Detalles del elemento' : 'Element details'}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <YAMLNodeDetails
              node={selectedNode}
              redirectedInfo={selectedNode ? redirectedRequestMap[selectedNode.id] ?? null : null}
              redirectSourceInfo={selectedNode ? redirectSourceMap[selectedNode.id] ?? null : null}
              onNodeUpdate={handleNodeUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultYAML(): string {
  return "";
}

function detectRedirectFollowUps(tree: YAMLNode): Record<string, RedirectedRequestInfo> {
  const requestNodes: YAMLNode[] = [];
  const requestTypes = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);

  const walk = (node: YAMLNode) => {
    if (requestTypes.has(node.type)) {
      requestNodes.push(node);
    }
    node.children?.forEach(walk);
  };

  const getLocationHeader = (node: YAMLNode): string => {
    const headers = node.data?.response?.headers;
    if (!headers || typeof headers !== 'object') return '';
    return String(headers.Location || headers.location || '').trim();
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
      const parsed = /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed)
        : new URL(trimmed, 'http://relampo.local');
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
    const isRedirect = [301, 302, 303, 307, 308].includes(status);
    if (!isRedirect) continue;

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
