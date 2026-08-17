import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
