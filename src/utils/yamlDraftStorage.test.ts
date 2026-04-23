import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_YAML_DRAFT_KEY,
  getActiveDraft,
  saveActiveDraft,
  YAML_DRAFT_STORE_NAME,
  type YAMLDraft,
} from './yamlDraftStorage';

type FakeIndexedDBOptions = {
  failOpen?: boolean;
  failPut?: boolean;
};

function createRequest<T>() {
  return {
    result: undefined as T,
    error: null as Error | null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    onupgradeneeded: null as ((event: Event) => void) | null,
    onblocked: null as ((event: Event) => void) | null,
  };
}

function installFakeIndexedDB(options: FakeIndexedDBOptions = {}) {
  const records = new Map<string, unknown>();
  let hasDraftStore = false;

  const trigger = (callback: (() => void) | null | undefined) => {
    window.setTimeout(() => callback?.(), 0);
  };

  const createStore = (transaction?: {
    error: Error | null;
    oncomplete: ((event: Event) => void) | null;
    onerror: ((event: Event) => void) | null;
  }) => ({
    put(record: { id: string }) {
      const request = createRequest<string>();
      trigger(() => {
        if (options.failPut) {
          const error = new Error('put failed');
          request.error = error;
          transaction!.error = error;
          request.onerror?.(new Event('error'));
          transaction!.onerror?.(new Event('error'));
          return;
        }
        records.set(record.id, { ...record });
        request.result = record.id;
        request.onsuccess?.(new Event('success'));
        transaction?.oncomplete?.(new Event('complete'));
      });
      return request;
    },
    get(key: string) {
      const request = createRequest<unknown>();
      trigger(() => {
        request.result = records.get(key);
        request.onsuccess?.(new Event('success'));
        transaction?.oncomplete?.(new Event('complete'));
      });
      return request;
    },
  });

  const createDb = () => ({
    objectStoreNames: {
      contains: (name: string) => name === YAML_DRAFT_STORE_NAME && hasDraftStore,
    },
    createObjectStore: vi.fn((name: string) => {
      if (name === YAML_DRAFT_STORE_NAME) hasDraftStore = true;
      return createStore();
    }),
    transaction: vi.fn(() => {
      const transaction = {
        error: null as Error | null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        objectStore: vi.fn(() => createStore(transaction)),
      };
      return transaction;
    }),
    close: vi.fn(),
  });

  const indexedDB = {
    open: vi.fn(() => {
      const request = createRequest<ReturnType<typeof createDb>>();
      trigger(() => {
        if (options.failOpen) {
          request.error = new Error('open failed');
          request.onerror?.(new Event('error'));
          return;
        }

        const db = createDb();
        request.result = db;
        if (!hasDraftStore) request.onupgradeneeded?.(new Event('upgradeneeded'));
        request.onsuccess?.(new Event('success'));
      });
      return request;
    }),
  };

  vi.stubGlobal('indexedDB', indexedDB);
  return records;
}

describe('yamlDraftStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and reads the active draft', async () => {
    installFakeIndexedDB();
    const draft: YAMLDraft = {
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    };

    await saveActiveDraft(draft);

    await expect(getActiveDraft()).resolves.toEqual(draft);
  });

  it('returns null when there is no active draft', async () => {
    installFakeIndexedDB();

    await expect(getActiveDraft()).resolves.toBeNull();
  });

  it('overwrites the previous active draft', async () => {
    installFakeIndexedDB();
    await saveActiveDraft({
      yaml: 'first: true\n',
      fileName: 'first.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });
    const latestDraft: YAMLDraft = {
      yaml: 'second: true\n',
      fileName: 'second.yaml',
      updatedAt: '2026-04-23T10:01:00.000Z',
    };

    await saveActiveDraft(latestDraft);

    await expect(getActiveDraft()).resolves.toEqual(latestDraft);
  });

  it('stores the browser record under the fixed active key', async () => {
    const records = installFakeIndexedDB();
    const draft: YAMLDraft = {
      yaml: 'active: true\n',
      fileName: 'active.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    };

    await saveActiveDraft(draft);

    expect(records.get(ACTIVE_YAML_DRAFT_KEY)).toEqual({
      id: ACTIVE_YAML_DRAFT_KEY,
      ...draft,
    });
  });

  it('rejects when IndexedDB cannot be opened', async () => {
    installFakeIndexedDB({ failOpen: true });

    await expect(getActiveDraft()).rejects.toThrow('open failed');
  });

  it('rejects when IndexedDB cannot write the draft', async () => {
    installFakeIndexedDB({ failPut: true });

    await expect(
      saveActiveDraft({
        yaml: 'blocked: true\n',
        fileName: 'blocked.yaml',
        updatedAt: '2026-04-23T10:00:00.000Z',
      }),
    ).rejects.toThrow('put failed');
  });
});
