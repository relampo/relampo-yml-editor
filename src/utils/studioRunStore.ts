// Shared sessionStorage helper for studio runs (debug and load). The last run
// is parked in sessionStorage so a page reload can re-attach and let the studio
// replay it. Only the id and a document fingerprint are stored; the run data
// stays on the server. The fingerprint guards against replaying a run against a
// different script after a reload.

export interface StoredRun {
  id: string;
  fp: string;
}

// Cheap, stable (djb2) fingerprint of the document.
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

// Creates a sessionStorage-backed store for a single run id under storageKey.
// All operations are best-effort (private-mode / disabled storage just no-ops).
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
      } catch {
        // best-effort
      }
    },
    clear(): void {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    },
  };
}
