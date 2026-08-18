import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { probeStudio } from '../../utils/debugApi';
import { getActiveDraft } from '../../utils/yamlDraftStorage';
import { useYamlDocumentLifecycle } from './useYamlDocumentLifecycle';

vi.mock('../../utils/debugApi', () => ({ probeStudio: vi.fn() }));
vi.mock('../../utils/yamlDraftStorage', () => ({ getActiveDraft: vi.fn() }));

afterEach(() => {
  vi.resetAllMocks();
});

describe('useYamlDocumentLifecycle', () => {
  it('restores both draft content and document identity', async () => {
    vi.mocked(getActiveDraft).mockResolvedValue({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-08-18T10:00:00.000Z',
    });
    vi.mocked(probeStudio).mockResolvedValue(null);
    const setYamlCode = vi.fn();
    const setYamlContent = vi.fn();
    const syncCodeToTree = vi.fn();
    const setHasDocumentActivity = vi.fn();

    const { result } = renderHook(() => {
      const fallbackRootNameRef = useRef<string | null>(null);
      return useYamlDocumentLifecycle({
        language: 'en',
        initialYamlContent: '',
        setYamlContent,
        setError: vi.fn(),
        isInitialized: false,
        setIsInitialized: vi.fn(),
        fallbackRootNameRef,
        setYamlCode,
        syncCodeToTree,
        setHasDocumentActivity,
        setIsDirty: vi.fn(),
        setIsFileLoading: vi.fn(),
      });
    });

    await waitFor(() => expect(result.current.currentFileName).toBe('restored.yaml'));
    expect(result.current.restoredDraftUpdatedAt).toBe('2026-08-18T10:00:00.000Z');
    expect(setYamlCode).toHaveBeenCalledWith('test:\n  name: restored\n');
    expect(setYamlContent).toHaveBeenCalledWith('test:\n  name: restored\n');
    expect(syncCodeToTree).toHaveBeenCalledWith('test:\n  name: restored\n', {
      force: true,
      defaultRootName: 'restored',
    });
    expect(setHasDocumentActivity).toHaveBeenCalledWith(true);
  });
});
