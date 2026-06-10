import { useEffect, useMemo, useRef, useState } from 'react';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { collectScenarioHosts, getRequestNodeHost } from '../utils/requestNodeDisplay';
import { detectRedirectFollowUps, findNodeById, nodesStillFormRedirect } from './yamlEditorHelpers';

export function useRedirectMaps(yamlTree: YAMLNode | null) {
  const prevRedirectedMapRef = useRef<Record<string, RedirectedRequestInfo>>({});

  const redirectedRequestMap = useMemo<Record<string, RedirectedRequestInfo>>(() => {
    if (!yamlTree) return {};
    const freshMap = detectRedirectFollowUps(yamlTree);
    const merged = { ...freshMap };

    for (const [id, info] of Object.entries(prevRedirectedMapRef.current)) {
      if (!merged[id]) {
        const targetNode = findNodeById(yamlTree, id);
        if (!targetNode) continue;

        // Fresh detection missed this entry. Only preserve it when the
        // redirect relationship is genuinely still intact — either the source
        // moved/was deleted (so adjacency-based detection can't see it), or it
        // still exists and continues to redirect to this target. If the source
        // is present but no longer redirects here (status changed off 3xx,
        // Location edited, or the target URL changed), let the badge drop.
        const sourceNode = findNodeById(yamlTree, info.sourceNodeId);
        if (!sourceNode || nodesStillFormRedirect(sourceNode, targetNode)) {
          merged[id] = info;
        }
      }
    }

    prevRedirectedMapRef.current = merged;
    return merged;
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
        targetDisabled: targetNode?.data?.enabled === false,
      };
    }
    return result;
  }, [yamlTree, redirectedRequestMap]);

  return { redirectedRequestMap, redirectSourceMap };
}

export function useHttpDefaultsInfo(yamlTree: YAMLNode | null) {
  // Base URL inherited from http_defaults, used as the placeholder hint for
  // requests that target the base host (relative URLs).
  const httpDefaultsBaseUrl = useMemo<string>(() => {
    const defaultsNode = yamlTree?.children?.find(child => child.type === 'http_defaults');
    const rawBaseUrl = defaultsNode?.data?.base_url;
    return typeof rawBaseUrl === 'string' ? rawBaseUrl : '';
  }, [yamlTree]);

  // Every distinct host the recording drives (primary first), surfaced in the
  // HTTP Defaults panel so multi-host recordings show all hosts, not just the
  // base one. See RLP-365.
  const scenarioHosts = useMemo<string[]>(
    () => collectScenarioHosts(yamlTree, httpDefaultsBaseUrl),
    [yamlTree, httpDefaultsBaseUrl],
  );

  // Host inherited from http_defaults.base_url, used so the tree shows a host badge
  // on base-host (relative) requests too — uniformly with secondary hosts. RLP-414.
  const httpDefaultsBaseHost = useMemo<string>(
    () => getRequestNodeHost(httpDefaultsBaseUrl) || httpDefaultsBaseUrl.trim(),
    [httpDefaultsBaseUrl],
  );

  return { httpDefaultsBaseUrl, scenarioHosts, httpDefaultsBaseHost };
}

type ParseWorkerResponse = { id: number; ok: true; tree: YAMLNode | null } | { id: number; ok: false; error: string };

type ParseWorkerDeps = {
  language: string;
  activeParseRequestIdRef: React.MutableRefObject<number>;
  parseWorkerRef: React.MutableRefObject<Worker | null>;
  setIsParsing: (value: boolean) => void;
  setIsFileLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setYamlTree: (tree: YAMLNode | null) => void;
  syncSelectionWithTree: (tree: YAMLNode | null) => void;
  setValidationErrors: (errors: string[]) => void;
  setIsTreeOutdated: (value: boolean) => void;
  applySemanticValidation: (tree: YAMLNode | null) => void;
  normalizeParsedTree: (tree: YAMLNode | null) => YAMLNode | null;
};

// Owns the YAML parse worker lifecycle: creation, message/error handling and
// teardown. Behavior is identical to the inline effect it replaces.
export function useParseWorker({
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
  normalizeParsedTree,
}: ParseWorkerDeps) {
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
      const normalizedTree = normalizeParsedTree(message.tree);
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
}

export function useTreeSelection() {
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeRef = useRef<YAMLNode | null>(null);
  const selectedNodeIdsRef = useRef<string[]>([]);

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

  return {
    selectedNode,
    setSelectedNode,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeRef,
    selectedNodeIdsRef,
    syncSelectionWithTree,
  };
}
