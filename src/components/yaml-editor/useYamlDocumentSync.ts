import { useCallback, useEffect, useRef, useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { autoRebalanceBalancedControllers } from '../../utils/balancedController';
import { getDocumentMetrics } from '../../utils/yamlDocumentLimits';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { validateYAMLSemantics } from '../../utils/yamlSemanticValidation';
import { useParseWorker } from '../useYamlEditorDerived';
import {
  findNodeById,
  lockTypedNodeSelectionInNode,
  type ParseWorkerRequest,
  type TreeSelection,
} from '../yamlEditorHelpers';
import { refreshTreePaths } from '../yaml-tree-view/treeOperations';

const EMPTY_PARALLEL_ERROR = 'Parallel controller must contain at least one child step';
const TREE_SERIALIZE_DEBOUNCE_MS = 220;

export type CommitTreeChangeOptions = {
  serialization?: 'immediate' | 'debounced';
};

interface UseYamlDocumentSyncParams {
  language: string;
  isInitialized: boolean;
  fallbackRootNameRef: React.RefObject<string | null>;
  setYamlContent: (content: string) => void;
  setError: (value: string | null) => void;
  setValidationErrors: (errors: string[]) => void;
  selectedNode: YAMLNode | null;
  setSelectedNode: (node: YAMLNode | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  selectedNodeRef: React.RefObject<YAMLNode | null>;
  selectedNodeIdsRef: React.RefObject<string[]>;
  syncSelectionWithTree: (tree: YAMLNode | null) => void;
}

/**
 * Owns the document's code/tree state and every code<->tree parse/serialize
 * handler (debounced parsing, worker wiring, tree commits, save-time
 * serialization). This is the core orchestration the rest of YAMLEditor's
 * handlers build on. Behavior is identical to the inline logic it replaces.
 */
export function useYamlDocumentSync({
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
}: UseYamlDocumentSyncParams) {
  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDocumentActivity, setHasDocumentActivity] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isTreeOutdated, setIsTreeOutdated] = useState(false);

  const parseDebounceRef = useRef<number | null>(null);
  const serializeDebounceRef = useRef<number | null>(null);
  const editRevisionRef = useRef(0);
  const parseWorkerRef = useRef<Worker | null>(null);
  const parseRequestIdRef = useRef(0);
  const activeParseRequestIdRef = useRef(0);

  const applySemanticValidation = (tree: YAMLNode | null) => {
    setValidationErrors(validateYAMLSemantics(tree).map(issue => issue.message));
  };

  const lockTypedNodeSelectionForCurrentTree = useCallback((): YAMLNode | null => {
    if (!yamlTree) return null;
    const [lockedTree, changed] = lockTypedNodeSelectionInNode(yamlTree);
    if (!changed) return yamlTree;
    setYamlTree(lockedTree);
    if (selectedNode) {
      const refreshedNode = findNodeById(lockedTree, selectedNode.id);
      if (refreshedNode) setSelectedNode(refreshedNode);
    }
    return lockedTree;
  }, [selectedNode, setSelectedNode, yamlTree]);

  const retrieveYamlForSaving = useCallback((): string => {
    if (isTreeOutdated || isParsing) return yamlCode;

    const activeTree = lockTypedNodeSelectionForCurrentTree();
    if (!activeTree) return yamlCode;
    const serialized = treeToYAML(activeTree);
    setYamlCode(serialized);
    setYamlContent(serialized);
    return serialized;
  }, [isParsing, isTreeOutdated, lockTypedNodeSelectionForCurrentTree, setYamlContent, yamlCode]);

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

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (parseDebounceRef.current) window.clearTimeout(parseDebounceRef.current);
      if (serializeDebounceRef.current) window.clearTimeout(serializeDebounceRef.current);
    };
  }, []);

  const handleCodeChange = (newCode: string) => {
    editRevisionRef.current += 1;
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

  // Debug/Run always serialize the current tree as one immutable snapshot. The
  // debounce timer is only an optimization for updating the code view; it must
  // never decide which document version gets executed.
  const flushPendingTreeSerialization = (): string => {
    if (!yamlTree) return yamlCode;
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }
    try {
      const code = treeToYAML(yamlTree);
      setYamlCode(code);
      setYamlContent(code);
      setError(null);
      setIsTreeOutdated(false);
      return code;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generating YAML';
      setError(message);
      setIsTreeOutdated(true);
      throw new Error(message);
    }
  };

  const commitTreeChange = (
    newTree: YAMLNode,
    nextSelection?: TreeSelection,
    options: CommitTreeChangeOptions = {},
  ) => {
    editRevisionRef.current += 1;
    const normalizedTree = refreshTreePaths(newTree);
    setYamlTree(normalizedTree);
    if (nextSelection) {
      const nextSelectedIds = nextSelection.nodeIds.filter(Boolean);
      const nextPrimary = nextSelection.primaryId ? findNodeById(normalizedTree, nextSelection.primaryId) : null;
      setSelectedNode(nextPrimary);
      setSelectedNodeIds(nextSelectedIds);
      selectedNodeRef.current = nextPrimary;
      selectedNodeIdsRef.current = nextSelectedIds;
    } else {
      syncSelectionWithTree(normalizedTree);
    }
    applySemanticValidation(normalizedTree);
    scheduleTreeSerialization(normalizedTree, options.serialization);
    setHasDocumentActivity(true);
    setIsDirty(true);
    setIsTreeOutdated(false);
  };

  const handleTreeChange = (newTree: YAMLNode, nextSelection?: TreeSelection) => {
    const rebalanced = yamlTree ? autoRebalanceBalancedControllers(yamlTree, newTree) : newTree;
    commitTreeChange(rebalanced, nextSelection);
  };

  // Resets all document-editing state for a brand-new (blank) document. Does
  // not touch identity fields (filename, draft metadata) or view state —
  // callers compose those resets alongside this one (see handleNewConfirm).
  const resetDocument = () => {
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
    syncSelectionWithTree(null);
    setError(null);
    setValidationErrors([]);
    setIsDirty(false);
    setHasDocumentActivity(false);
    setIsTreeOutdated(false);

    activeParseRequestIdRef.current = ++parseRequestIdRef.current;
    setIsParsing(false);
    setIsFileLoading(false);
  };

  return {
    yamlCode,
    setYamlCode,
    yamlTree,
    setYamlTree,
    isDirty,
    setIsDirty,
    hasDocumentActivity,
    setHasDocumentActivity,
    isParsing,
    setIsParsing,
    isFileLoading,
    setIsFileLoading,
    isTreeOutdated,
    setIsTreeOutdated,
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
  };
}
