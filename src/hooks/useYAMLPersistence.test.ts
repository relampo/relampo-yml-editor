import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useYAMLPersistence } from './useYAMLPersistence';

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
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes yaml draft to localStorage', () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(localStorage.getItem('relampo-yaml-draft')).toBe('test:\n  name: t\n');
  });

  it('stores the filename in localStorage', () => {
    const params = makeParams({ currentFileName: 'smoke.yaml' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(localStorage.getItem('relampo-yaml-draft-filename')).toBe('smoke.yaml');
  });

  it('sets lastSavedAt after save', () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('calls setIsDirty(false) after save', () => {
    const setIsDirty = vi.fn();
    const params = makeParams({ setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(setIsDirty).toHaveBeenCalledWith(false);
  });

  it('shows "Changes saved" action message in English', () => {
    const params = makeParams({ language: 'en' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(result.current.actionMessage).toBe('Changes saved');
  });

  it('shows "Cambios guardados" in Spanish', () => {
    const params = makeParams({ language: 'es' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(result.current.actionMessage).toBe('Cambios guardados');
  });

  it('clears actionMessage after 1800 ms', () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });
    expect(result.current.actionMessage).not.toBe('');

    act(() => { vi.advanceTimersByTime(1800); });
    expect(result.current.actionMessage).toBe('');
  });

  it('calls setError when getPersistableYaml throws', () => {
    const setError = vi.fn();
    const params = makeParams({
      setError,
      getPersistableYaml: vi.fn(() => { throw new Error('boom'); }),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleSave(); });

    expect(setError).toHaveBeenCalledWith('boom');
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

    act(() => { result.current.handleDownload(true); });

    expect(result.current.actionMessage).toBe('YAML downloaded with responses');
  });

  it('shows "YAML downloaded without responses" when includeResponses=false', () => {
    const params = makeParams({ language: 'en' });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleDownload(false); });

    expect(result.current.actionMessage).toBe('YAML downloaded without responses');
  });

  it('calls setIsDirty(false) after download', () => {
    const setIsDirty = vi.fn();
    const params = makeParams({ setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleDownload(true); });

    expect(setIsDirty).toHaveBeenCalledWith(false);
  });

  it('calls setError when getPersistableYaml throws during download', () => {
    const setError = vi.fn();
    const params = makeParams({
      setError,
      getPersistableYaml: vi.fn(() => { throw new Error('parse error'); }),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => { result.current.handleDownload(false); });

    expect(setError).toHaveBeenCalledWith('parse error');
  });
});

// ─── autosave ─────────────────────────────────────────────────────────────

describe('autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('auto-saves after 2000 ms when isDirty becomes true', () => {
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
      { initialProps: { isDirty: false } }
    );

    rerender({ isDirty: true });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(getPersistableYaml).toHaveBeenCalled();
    expect(localStorage.getItem('relampo-yaml-draft')).toBe('auto: saved\n');
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
      { initialProps: { isDirty: false } }
    );

    rerender({ isDirty: true });
    act(() => { vi.advanceTimersByTime(2000); });

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
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('Ctrl+S triggers save', () => {
    const getPersistableYaml = vi.fn(() => 'ctrl: s\n');
    renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...makeParams({ getPersistableYaml }), serializeDebounceRef });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    });

    expect(getPersistableYaml).toHaveBeenCalled();
    expect(localStorage.getItem('relampo-yaml-draft')).toBe('ctrl: s\n');
  });

  it('Meta+S triggers save', () => {
    const getPersistableYaml = vi.fn(() => 'meta: s\n');
    renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...makeParams({ getPersistableYaml }), serializeDebounceRef });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }));
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
