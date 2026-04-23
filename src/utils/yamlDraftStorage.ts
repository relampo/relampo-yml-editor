export const YAML_DRAFT_DB_NAME = 'relampo-yaml-editor';
export const YAML_DRAFT_STORE_NAME = 'drafts';
export const ACTIVE_YAML_DRAFT_KEY = 'active';

const YAML_DRAFT_DB_VERSION = 1;

export type YAMLDraft = {
  yaml: string;
  fileName: string;
  updatedAt: string;
};

type YAMLDraftRecord = YAMLDraft & {
  id: typeof ACTIVE_YAML_DRAFT_KEY;
};

function getIndexedDB(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }
  return indexedDB;
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = getIndexedDB().open(YAML_DRAFT_DB_NAME, YAML_DRAFT_DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(YAML_DRAFT_STORE_NAME)) {
        db.createObjectStore(YAML_DRAFT_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open YAML draft database.'));
    request.onblocked = () => reject(new Error('Opening the YAML draft database was blocked.'));
  });
}

function runDraftTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDraftDatabase().then(
    db =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(YAML_DRAFT_STORE_NAME, mode);
        const store = transaction.objectStore(YAML_DRAFT_STORE_NAME);
        const request = operation(store);
        let result: T;

        const closeAndReject = (error?: unknown) => {
          db.close();
          reject(error ?? transaction.error ?? request.error ?? new Error('Could not access YAML draft storage.'));
        };

        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => closeAndReject(request.error);
        transaction.onerror = () => closeAndReject(transaction.error);
        transaction.onabort = () => closeAndReject(transaction.error);
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
      }),
  );
}

export async function saveActiveDraft(draft: YAMLDraft): Promise<YAMLDraft> {
  const record: YAMLDraftRecord = {
    id: ACTIVE_YAML_DRAFT_KEY,
    yaml: draft.yaml,
    fileName: draft.fileName,
    updatedAt: draft.updatedAt,
  };

  await runDraftTransaction('readwrite', store => store.put(record));
  return draft;
}

export async function getActiveDraft(): Promise<YAMLDraft | null> {
  const record = await runDraftTransaction<YAMLDraftRecord | undefined>('readonly', store =>
    store.get(ACTIVE_YAML_DRAFT_KEY),
  );

  if (!record) return null;
  return {
    yaml: record.yaml,
    fileName: record.fileName,
    updatedAt: record.updatedAt,
  };
}
