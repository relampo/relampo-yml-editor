
export interface StoredRun {
  id: string;
  fp: string;
  scenarioName?: string;
}

export function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

export interface StoredRunStore {
  read(): StoredRun | null;
  store(run: StoredRun): void;
  clear(): void;
}

export function createStoredRunStore(storageKey: string): StoredRunStore {
  return {
    read(): StoredRun | null {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === 'string' && typeof parsed.fp === 'string') return parsed;
        return null;
      } catch {
        return null;
      }
    },
    store(run: StoredRun): void {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(run));
      } catch {}
    },
    clear(): void {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
    },
  };
}
