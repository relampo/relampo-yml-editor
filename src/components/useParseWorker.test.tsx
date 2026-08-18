import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import type { YAMLNode } from '../types/yaml';
import { useParseWorker } from './useYamlEditorDerived';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    FakeWorker.instances.push(this);
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError() {
    this.onerror?.();
  }
}

afterEach(() => {
  FakeWorker.instances = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderWorker(language = 'en') {
  const deps = {
    setIsParsing: vi.fn(),
    setIsFileLoading: vi.fn(),
    setError: vi.fn(),
    setYamlTree: vi.fn(),
    syncSelectionWithTree: vi.fn(),
    setValidationErrors: vi.fn(),
    setIsTreeOutdated: vi.fn(),
    applySemanticValidation: vi.fn(),
    normalizeParsedTree: vi.fn((tree: YAMLNode | null) => tree),
  };
  vi.stubGlobal('Worker', FakeWorker);
  const hook = renderHook(
    ({ currentLanguage }) => {
      const activeParseRequestIdRef = useRef(2);
      const parseWorkerRef = useRef<Worker | null>(null);
      useParseWorker({
        language: currentLanguage,
        activeParseRequestIdRef,
        parseWorkerRef,
        ...deps,
      });
      return { activeParseRequestIdRef, parseWorkerRef };
    },
    { initialProps: { currentLanguage: language } },
  );
  return { ...hook, deps };
}

describe('useParseWorker', () => {
  it('accepts only the newest request response', () => {
    const { deps } = renderWorker();
    const worker = FakeWorker.instances[0];
    const staleTree = { id: 'stale', type: 'test', name: 'stale' } as YAMLNode;
    const currentTree = { id: 'current', type: 'test', name: 'current' } as YAMLNode;

    act(() => worker.emitMessage({ id: 1, ok: true, tree: staleTree }));
    expect(deps.setYamlTree).not.toHaveBeenCalled();
    act(() => worker.emitMessage({ id: 2, ok: true, tree: currentTree }));
    expect(deps.setYamlTree).toHaveBeenCalledWith(currentTree);
  });

  it('reports parse and low-level errors without clearing the last safe tree', () => {
    const { deps } = renderWorker();
    const worker = FakeWorker.instances[0];

    act(() => worker.emitMessage({ id: 2, ok: false, error: 'bad yaml' }));
    act(() => worker.emitError());

    expect(deps.setError).toHaveBeenCalledWith('bad yaml');
    expect(deps.setError).toHaveBeenCalledWith('Error parsing YAML');
    expect(deps.setYamlTree).not.toHaveBeenCalled();
    expect(deps.syncSelectionWithTree).not.toHaveBeenCalled();
    expect(deps.setIsTreeOutdated).toHaveBeenLastCalledWith(true);
  });

  it('terminates replaced Workers and the final Worker on unmount', () => {
    const { rerender, unmount } = renderWorker();
    const first = FakeWorker.instances[0];
    rerender({ currentLanguage: 'es' });
    const second = FakeWorker.instances[1];

    expect(first.terminate).toHaveBeenCalledTimes(1);
    unmount();
    expect(second.terminate).toHaveBeenCalledTimes(1);
  });
});
