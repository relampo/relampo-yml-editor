import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useYAMLPersistence } from './useYAMLPersistence';
import { clearActiveDraft, saveActiveDraft } from '../utils/yamlDraftStorage';

vi.mock('../utils/yamlDraftStorage', () => ({
  saveActiveDraft: vi.fn(),
  clearActiveDraft: vi.fn(),
}));

const saveActiveDraftMock = vi.mocked(saveActiveDraft);
const clearActiveDraftMock = vi.mocked(clearActiveDraft);

beforeEach(() => {
  saveActiveDraftMock.mockImplementation(async draft => draft);
  clearActiveDraftMock.mockResolvedValue(undefined);
});

afterEach(() => {
  saveActiveDraftMock.mockReset();
  clearActiveDraftMock.mockReset();
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
    editRevisionRef: { current: 0 } as React.MutableRefObject<number>,
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

  it('persists an edit made during a save before marking the document clean', async () => {
    let resolveFirstSave: (() => void) | undefined;
    saveActiveDraftMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirstSave = () => resolve(undefined as never);
        }),
    );

    const editRevisionRef = { current: 0 } as React.MutableRefObject<number>;
    const setIsDirty = vi.fn();
    const { result, rerender } = renderHook(
      (props: { yaml: string }) =>
        useYAMLPersistence({
          ...makeParams({
            editRevisionRef,
            setIsDirty,
            getPersistableYaml: () => props.yaml,
          }),
        }),
      { initialProps: { yaml: 'iterations: 1\n' } },
    );

    let savePromise = Promise.resolve();
    act(() => {
      savePromise = result.current.handleSave();
    });
    expect(saveActiveDraftMock).toHaveBeenCalledWith({
      yaml: 'iterations: 1\n',
      fileName: 'my-script.yaml',
      updatedAt: expect.any(String),
    });

    act(() => {
      editRevisionRef.current += 1;
      rerender({ yaml: 'iterations: 3\n' });
    });
    await act(async () => {
      resolveFirstSave?.();
      await savePromise;
    });

    expect(saveActiveDraftMock).toHaveBeenCalledTimes(2);
    expect(saveActiveDraftMock).toHaveBeenLastCalledWith({
      yaml: 'iterations: 3\n',
      fileName: 'my-script.yaml',
      updatedAt: expect.any(String),
    });
    expect(setIsDirty).toHaveBeenCalledTimes(1);
    expect(setIsDirty).toHaveBeenCalledWith(false);
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

  it('removes recorded request responses without removing form body response fields', async () => {
    let downloadedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation(blob => {
      downloadedBlob = blob as Blob;
      return 'blob:fake';
    });
    const params = makeParams({
      getPersistableYaml: vi.fn(
        () => `scenarios:
  - name: Recorded Scenario
    steps:
      - request:
          request_id: 13
          method: POST
          url: /trustedx-authserver/TuID-idp/authentication
          headers:
            Content-Type: application/x-www-form-urlencoded
          body:
            - response: '{{response1}}'
          response:
            status: 200
            body: '<html>recorded response</html>'
`,
      ),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(false);
    });

    expect(downloadedBlob).not.toBeNull();
    const downloadedYaml = await downloadedBlob!.text();
    expect(downloadedYaml).toContain("response: '{{response1}}'");
    expect(downloadedYaml).not.toContain("status: 200");
    expect(downloadedYaml).not.toContain('recorded response');
  });

  it('removes recorded responses from method-form steps', async () => {
    let downloadedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation(blob => {
      downloadedBlob = blob as Blob;
      return 'blob:fake';
    });
    const params = makeParams({
      getPersistableYaml: vi.fn(
        () => `scenarios:
  - name: Recorded Scenario
    steps:
      - get:
          url: /foo
          response:
            status: 200
            body: '<html>recorded response</html>'
      - post:
          url: /bar
          body:
            - response: '{{response1}}'
          response:
            status: 201
`,
      ),
    });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    act(() => {
      result.current.handleDownload(false);
    });

    expect(downloadedBlob).not.toBeNull();
    const downloadedYaml = await downloadedBlob!.text();
    expect(downloadedYaml).toContain("response: '{{response1}}'");
    expect(downloadedYaml).not.toContain('status: 200');
    expect(downloadedYaml).not.toContain('status: 201');
    expect(downloadedYaml).not.toContain('recorded response');
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

// ─── resetForNewDocument ────────────────────────────────────────────────────

describe('resetForNewDocument', () => {
  it('clears the saved-at status and the stored draft', async () => {
    const params = makeParams();
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.lastSavedAt).not.toBeNull();

    await act(async () => {
      await result.current.resetForNewDocument();
    });

    expect(result.current.lastSavedAt).toBeNull();
    expect(clearActiveDraftMock).toHaveBeenCalled();
  });

  // Regression: a save already in flight when the user starts a new document
  // must not resurrect the discarded draft or stamp a stale "saved" status.
  it('does not commit a save that resolves after a reset', async () => {
    let resolveSave: (() => void) | undefined;
    saveActiveDraftMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveSave = () => resolve(undefined as never);
        }),
    );

    const setHasDocumentActivity = vi.fn();
    const setIsDirty = vi.fn();
    const params = makeParams({ setHasDocumentActivity, setIsDirty });
    const { result } = renderHook(() => {
      const serializeDebounceRef = useRef<number | null>(null);
      return useYAMLPersistence({ ...params, serializeDebounceRef });
    });

    // Kick off a save and leave it pending (saveActiveDraft hasn't resolved).
    let savePromise: Promise<void> = Promise.resolve();
    act(() => {
      savePromise = result.current.handleSave();
    });

    // User starts a new document while that save is still in flight.
    await act(async () => {
      await result.current.resetForNewDocument();
    });

    // Now the stale save finally resolves.
    await act(async () => {
      resolveSave?.();
      await savePromise;
    });

    // It undid its own write and committed no stale UI state.
    expect(clearActiveDraftMock).toHaveBeenCalled();
    expect(setHasDocumentActivity).not.toHaveBeenCalledWith(true);
    expect(result.current.lastSavedAt).toBeNull();
  });
});
