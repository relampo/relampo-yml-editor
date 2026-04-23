import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useYAMLPersistence } from './useYAMLPersistence';
import { saveActiveDraft } from '../utils/yamlDraftStorage';

vi.mock('../utils/yamlDraftStorage', () => ({
  saveActiveDraft: vi.fn(),
}));

const saveActiveDraftMock = vi.mocked(saveActiveDraft);

beforeEach(() => {
  saveActiveDraftMock.mockImplementation(async draft => draft);
});

afterEach(() => {
  saveActiveDraftMock.mockReset();
});

// ─── helpers ──────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<Parameters<typeof useYAMLPersistence>[0]> = {}) {
  return {
    isDirty: false,
    setIsDirty: vi.fn(),
    isInitialized: true,
    yamlCode: 'test:\n  name: t\n',
    currentFileName: 'my-script.yaml',
    language: 'en',
    getPersistableYaml: vi.fn(() => 'test:\n  name: t\n'),
    setHasDocumentActivity: vi.fn(),
    setError: vi.fn(),
    serializeDebounceRef: { current: null } as React.MutableRefObject<number | null>,
    ...overrides,
  };
}

// ─── handleSave ───────────────────────────────────────────────────────────

describe('handleSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes yaml draft to IndexedDB storage', async () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(saveActiveDraftMock).toHaveBeenCalledWith({
      yaml: 'test:\n  name: t\n',
      fileName: 'my-script.yaml',
      updatedAt: expect.any(String),
    });
  });

  it('stores the filename in IndexedDB storage', async () => {
    const params = makeParams({ currentFileName: 'smoke.yaml' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(saveActiveDraftMock).toHaveBeenCalledWith({
      yaml: 'test:\n  name: t\n',
      fileName: 'smoke.yaml',
      updatedAt: expect.any(String),
    });
  });

  it('sets lastSavedAt after save', async () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('calls setIsDirty(false) after save', async () => {
    const setIsDirty = vi.fn();
    const params = makeParams({ setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(setIsDirty).toHaveBeenCalledWith(false);
  });

  it('shows "Changes saved" action message in English', async () => {
    const params = makeParams({ language: 'en' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.actionMessage).toBe('Changes saved');
  });

  it('shows "Cambios guardados" in Spanish', async () => {
    const params = makeParams({ language: 'es' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.actionMessage).toBe('Cambios guardados');
  });

  it('clears actionMessage after 1800 ms', async () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.actionMessage).not.toBe('');

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(result.current.actionMessage).toBe('');
  });

  it('calls setError when getPersistableYaml throws', async () => {
    const setError = vi.fn();
    const params = makeParams({
      setError,
      getPersistableYaml: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(setError).toHaveBeenCalledWith('boom');
  });

  it('reports browser storage failures without marking the draft saved', async () => {
    const setError = vi.fn();
    const setIsDirty = vi.fn();
    saveActiveDraftMock.mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'));
    const params = makeParams({ setError, setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(setError).toHaveBeenCalledWith(
      'Could not autosave this YAML in the browser. Download the YAML to keep your changes.',
    );
    expect(setIsDirty).not.toHaveBeenCalledWith(false);
    expect(result.current.lastSavedAt).toBeNull();
  });
});

// ─── handleDownload ───────────────────────────────────────────────────────

describe('handleDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Stub URL API (not available in jsdom)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    // Stub document.createElement to intercept anchor clicks
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
      }
      return el;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows "YAML downloaded with responses" when includeResponses=true', () => {
    const params = makeParams({ language: 'en' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(true);
    });

    expect(result.current.actionMessage).toBe('YAML downloaded with responses');
  });

  it('shows "YAML downloaded without responses" when includeResponses=false', () => {
    const params = makeParams({ language: 'en' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(false);
    });

    expect(result.current.actionMessage).toBe('YAML downloaded without responses');
  });

  it('calls setIsDirty(false) after download', () => {
    const setIsDirty = vi.fn();
    const params = makeParams({ setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(true);
    });

    expect(setIsDirty).toHaveBeenCalledWith(false);
  });

  it('calls setError when getPersistableYaml throws during download', () => {
    const setError = vi.fn();
    const params = makeParams({
      setError,
      getPersistableYaml: vi.fn(() => {
        throw new Error('parse error');
      }),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(false);
    });

    expect(setError).toHaveBeenCalledWith('parse error');
  });
});

// ─── autosave ─────────────────────────────────────────────────────────────

describe('autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-saves after 2000 ms when isDirty becomes true', async () => {
    const getPersistableYaml = vi.fn(() => 'auto: saved\n');
    const { rerender } = renderHook(
      (props: { isDirty: boolean }) => {
        const serializeDebounceRef = useRef<number | null>(null);
        return useYAMLPersistence({
          ...makeParams({ getPersistableYaml }),
          isDirty: props.isDirty,
          serializeDebounceRef,
        });
      },
      { initialProps: { isDirty: false } },
    );

    rerender({ isDirty: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(getPersistableYaml).toHaveBeenCalled();
    expect(saveActiveDraftMock).toHaveBeenCalledWith({
      yaml: 'auto: saved\n',
      fileName: 'my-script.yaml',
      updatedAt: expect.any(String),
    });
  });

  it('does not auto-save when isInitialized is false', () => {
    const getPersistableYaml = vi.fn(() => 'x: y\n');
    const { rerender } = renderHook(
      (props: { isDirty: boolean }) => {
        const serializeDebounceRef = useRef<number | null>(null);
        return useYAMLPersistence({
          ...makeParams({ getPersistableYaml, isInitialized: false }),
          isDirty: props.isDirty,
          serializeDebounceRef,
        });
      },
      { initialProps: { isDirty: false } },
    );

    rerender({ isDirty: true });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(getPersistableYaml).not.toHaveBeenCalled();
  });
});

// ─── keyboard shortcuts ───────────────────────────────────────────────────

describe('keyboard shortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('Ctrl+S triggers save', async () => {
    const getPersistableYaml = vi.fn(() => 'ctrl: s\n');
    renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({
        ...makeParams({ getPersistableYaml }),
        serializeDebounceRef,
      });
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
      await Promise.resolve();
    });

    expect(getPersistableYaml).toHaveBeenCalled();
    expect(saveActiveDraftMock).toHaveBeenCalledWith({
      yaml: 'ctrl: s\n',
      fileName: 'my-script.yaml',
      updatedAt: expect.any(String),
    });
  });

  it('Meta+S triggers save', async () => {
    const getPersistableYaml = vi.fn(() => 'meta: s\n');
    renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({
        ...makeParams({ getPersistableYaml }),
        serializeDebounceRef,
      });
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }));
      await Promise.resolve();
    });

    expect(getPersistableYaml).toHaveBeenCalled();
  });

  it('removes keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...makeParams(), serializeDebounceRef });
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });
});
