import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { validateYAMLSemantics } from '../../utils/yamlSemanticValidation';
import { useYamlDocumentSync } from './useYamlDocumentSync';

vi.mock('../useYamlEditorDerived', () => ({
  useParseWorker: vi.fn(),
}));

const lifecycleYaml = `
test:
  name: Smoke
scenarios:
  - name: Smoke scenario
    steps:
      - get: https://example.com/health
`;

function renderDocumentSync() {
  const setYamlContent = vi.fn();
  const setError = vi.fn();
  const setValidationErrors = vi.fn();
  const setValidationNodeIds = vi.fn();
  const setSelectedNode = vi.fn();
  const setSelectedNodeIds = vi.fn();
  const syncSelectionWithTree = vi.fn();
  const hook = renderHook(() => {
    const fallbackRootNameRef = useRef<string | null>(null);
    const selectedNodeRef = useRef<YAMLNode | null>(null);
    const selectedNodeIdsRef = useRef<string[]>([]);
    return useYamlDocumentSync({
      language: 'en',
      isInitialized: true,
      fallbackRootNameRef,
      setYamlContent,
      setError,
      setValidationErrors,
      setValidationNodeIds,
      selectedNode: null,
      setSelectedNode,
      setSelectedNodeIds,
      selectedNodeRef,
      selectedNodeIdsRef,
      syncSelectionWithTree,
    });
  });
  return { ...hook, setYamlContent, setError, setValidationErrors, setValidationNodeIds, syncSelectionWithTree };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useYamlDocumentSync', () => {
  it('keeps a valid code-to-tree-to-canonical-YAML round trip semantically valid', () => {
    const setYamlContent = vi.fn();
    const setError = vi.fn();
    const setValidationErrors = vi.fn();
    const setSelectedNode = vi.fn();
    const setSelectedNodeIds = vi.fn();
    const syncSelectionWithTree = vi.fn();

    const { result } = renderHook(() => {
      const fallbackRootNameRef = useRef<string | null>(null);
      const selectedNodeRef = useRef<YAMLNode | null>(null);
      const selectedNodeIdsRef = useRef<string[]>([]);

      return useYamlDocumentSync({
        language: 'en',
        isInitialized: true,
        fallbackRootNameRef,
        setYamlContent,
        setError,
        setValidationErrors,
        selectedNode: null,
        setSelectedNode,
        setSelectedNodeIds,
        selectedNodeRef,
        selectedNodeIdsRef,
        syncSelectionWithTree,
      });
    });

    act(() => {
      result.current.syncCodeToTree(lifecycleYaml, { force: true });
    });

    expect(result.current.yamlTree).not.toBeNull();
    expect(result.current.isTreeOutdated).toBe(false);

    const canonicalYaml = treeToYAML(result.current.yamlTree!);
    const reparsedTree = parseYAMLToTree(canonicalYaml);

    expect(reparsedTree).not.toBeNull();
    expect(validateYAMLSemantics(reparsedTree)).toEqual([]);
    expect(reparsedTree?.name).toBe('Smoke');
    expect(reparsedTree?.children?.some(node => node.type === 'scenarios')).toBe(true);
  });

  it('accepts only the latest debounced code revision', () => {
    vi.useFakeTimers();
    const { result } = renderDocumentSync();
    act(() => {
      result.current.handleCodeChange(lifecycleYaml.replace('Smoke', 'Old'));
      result.current.handleCodeChange(lifecycleYaml.replace('Smoke', 'Newest'));
      vi.advanceTimersByTime(350);
    });

    expect(result.current.yamlTree?.name).toBe('Newest');
    expect(result.current.isTreeOutdated).toBe(false);
  });

  it('keeps the last safe tree when a newer code revision cannot parse', () => {
    const { result, setError } = renderDocumentSync();
    act(() => result.current.syncCodeToTree(lifecycleYaml, { force: true }));
    expect(result.current.yamlTree?.name).toBe('Smoke');

    act(() => result.current.syncCodeToTree('test: [', { force: true }));

    expect(result.current.yamlTree?.name).toBe('Smoke');
    expect(result.current.isTreeOutdated).toBe(true);
    expect(setError).toHaveBeenLastCalledWith(expect.stringContaining('Error parsing YAML'));
  });

  it('publishes semantic issue node ids for tree highlighting', () => {
    const { result, setValidationNodeIds } = renderDocumentSync();
    const invalidYaml = `
test:
  name: Invalid
scenarios:
  - name: Scenario
    load:
      type: constant
      users: 1
      duration: 1m
      stages:
        - duration: 10s
          target: 2
    steps: []
`;

    act(() => result.current.syncCodeToTree(invalidYaml, { force: true }));

    expect(setValidationNodeIds).toHaveBeenLastCalledWith(['scenario_0_load']);
  });

  it('flushes a pending tree edit as the newest immutable execution and download snapshot', () => {
    vi.useFakeTimers();
    const { result, setYamlContent } = renderDocumentSync();
    act(() => result.current.syncCodeToTree(lifecycleYaml, { force: true }));
    const editedTree = structuredClone(result.current.yamlTree!);
    editedTree.name = 'Newest tree edit';

    act(() => result.current.commitTreeChange(editedTree, undefined, { serialization: 'debounced' }));
    let snapshot = '';
    act(() => {
      snapshot = result.current.flushPendingTreeSerialization();
    });

    expect(snapshot).toContain('name: Newest tree edit');
    expect(setYamlContent).toHaveBeenLastCalledWith(snapshot);
  });

  it('clears all document state and invalidates pending debounced parsing on reset', () => {
    vi.useFakeTimers();
    const { result } = renderDocumentSync();
    act(() => result.current.handleCodeChange(lifecycleYaml));
    act(() => result.current.resetDocument());
    act(() => vi.runAllTimers());

    expect(result.current.yamlCode).toContain('name: New Test');
    expect(result.current.yamlTree?.name).toBe('New Test');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isTreeOutdated).toBe(false);
  });
});
