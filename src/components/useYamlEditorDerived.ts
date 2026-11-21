import { useEffect, useMemo, useRef, useState } from 'react';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { collectScenarioHosts, getRequestNodeHost } from '../utils/requestNodeDisplay';
import {
  detectRedirectFollowUps,
  findNodeById,
  nodesStillFormRedirect,
  type ParseWorkerResponse,
} from './yamlEditorHelpers';

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

        const sourceNode = findNodeById(yamlTree, info.sourceNodeId);
        if (!sourceNode || nodesStillFormRedirect(sourceNode, targetNode)) {
          merged[id] = info;
        }
      }
    }

    return merged;
  }, [yamlTree]);

  useEffect(() => {
    if (!yamlTree) return;
    prevRedirectedMapRef.current = redirectedRequestMap;
  }, [redirectedRequestMap, yamlTree]);

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
  const httpDefaultsBaseUrl = useMemo<string>(() => {
    const defaultsNode = yamlTree?.children?.find(child => child.type === 'http_defaults');
    const rawBaseUrl = defaultsNode?.data?.base_url;
    return typeof rawBaseUrl === 'string' ? rawBaseUrl : '';
  }, [yamlTree]);

  const scenarioHosts = useMemo<string[]>(
    () => collectScenarioHosts(yamlTree, httpDefaultsBaseUrl),
    [yamlTree, httpDefaultsBaseUrl],
  );

  const httpDefaultsBaseHost = useMemo<string>(
    () => getRequestNodeHost(httpDefaultsBaseUrl) || httpDefaultsBaseUrl.trim(),
    [httpDefaultsBaseUrl],
  );

  return { httpDefaultsBaseUrl, scenarioHosts, httpDefaultsBaseHost };
}

type ParseWorkerDeps = {
  language: string;
  activeParseRequestIdRef: React.RefObject<number>;
  parseWorkerRef: React.RefObject<Worker | null>;
  setIsParsing: (value: boolean) => void;
  setIsFileLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setYamlTree: (tree: YAMLNode | null) => void;
  syncSelectionWithTree: (tree: YAMLNode | null) => void;
  setValidationErrors: (errors: string[]) => void;
  setValidationNodeIds?: (nodeIds: string[]) => void;
  setIsTreeOutdated: (value: boolean) => void;
  applySemanticValidation: (tree: YAMLNode | null) => void;
  normalizeParsedTree: (tree: YAMLNode | null) => YAMLNode | null;
};

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
  setValidationNodeIds,
  setIsTreeOutdated,
  applySemanticValidation,
  normalizeParsedTree,
}: ParseWorkerDeps) {
  const latestRef = useRef({
    setIsParsing,
    setIsFileLoading,
    setError,
    setYamlTree,
    syncSelectionWithTree,
    setValidationErrors,
    setValidationNodeIds,
    setIsTreeOutdated,
    applySemanticValidation,
    normalizeParsedTree,
  });
  useEffect(() => {
    latestRef.current = {
      setIsParsing,
      setIsFileLoading,
      setError,
      setYamlTree,
      syncSelectionWithTree,
      setValidationErrors,
      setValidationNodeIds,
      setIsTreeOutdated,
      applySemanticValidation,
      normalizeParsedTree,
    };
  });

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../workers/yamlParser.worker.ts', import.meta.url), {
      type: 'module',
    });
    parseWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const message = event.data;
      if (!message || message.id !== activeParseRequestIdRef.current) return;
      const current = latestRef.current;
      current.setIsParsing(false);
      current.setIsFileLoading(false);
      if (!message.ok) {
        current.setError(message.error || (language === 'es' ? 'Error al parsear YAML' : 'Error parsing YAML'));
        current.setValidationErrors([]);
        current.setValidationNodeIds?.([]);
        current.setIsTreeOutdated(true);
        return;
      }
      const normalizedTree = current.normalizeParsedTree(message.tree);
      current.setYamlTree(normalizedTree);
      current.syncSelectionWithTree(normalizedTree);
      current.setError(null);
      current.applySemanticValidation(normalizedTree);
      current.setIsTreeOutdated(false);
    };

    worker.onerror = () => {
      const current = latestRef.current;
      current.setIsParsing(false);
      current.setIsFileLoading(false);
      current.setError(language === 'es' ? 'Error al parsear YAML' : 'Error parsing YAML');
      current.setValidationErrors([]);
      current.setValidationNodeIds?.([]);
      current.setIsTreeOutdated(true);
    };

    return () => {
      worker.terminate();
      if (parseWorkerRef.current === worker) parseWorkerRef.current = null;
    };
  }, [language, activeParseRequestIdRef, parseWorkerRef]);
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
