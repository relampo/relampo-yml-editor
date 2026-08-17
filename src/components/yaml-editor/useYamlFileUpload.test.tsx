import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useYamlFileUpload } from './useYamlFileUpload';

describe('useYamlFileUpload', () => {
  it('invalidates pending draft writes before importing a YAML file', () => {
    const invalidatePendingDraft = vi.fn();
    const file = new File(['test:\n  name: imported\n'], 'imported.yaml', { type: 'text/yaml' });

    vi.stubGlobal(
      'FileReader',
      class {
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        readAsText() {
          this.onload?.({ target: { result: 'test:\n  name: imported\n' } } as ProgressEvent<FileReader>);
        }
      },
    );

    const { result } = renderHook(() =>
      useYamlFileUpload({
        language: 'en',
        setError: vi.fn(),
        setSelectedNode: vi.fn(),
        setSelectedNodeIds: vi.fn(),
        setYamlTree: vi.fn(),
        setYamlCode: vi.fn(),
        setYamlContent: vi.fn(),
        setViewMode: vi.fn(),
        fallbackRootNameRef: { current: null },
        syncCodeToTree: vi.fn(),
        setCurrentFileName: vi.fn(),
        setHasDocumentActivity: vi.fn(),
        setIsDirty: vi.fn(),
        setIsFileLoading: vi.fn(),
        parseDebounceRef: { current: null },
        serializeDebounceRef: { current: null },
        invalidatePendingDraft,
      }),
    );

    act(() => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [file] },
      } as unknown as React.DragEvent<HTMLDivElement>);
    });

    expect(invalidatePendingDraft).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
