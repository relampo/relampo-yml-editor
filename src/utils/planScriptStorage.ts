import { embeddedPlanDraftKey } from './embeddedPlanDraft';
import { openDraftDatabase, YAML_DRAFT_STORE_NAME, type YAMLDraft } from './yamlDraftStorage';

export interface PlanScript {
  id: string;
  fileName: string;
}
export interface PlanScripts {
  id: string;
  activeScriptId: string;
  scripts: PlanScript[];
}

/** Catalog changes and newly added documents commit together in IndexedDB. */
async function updateCatalog<T>(change: (catalog: PlanScripts, store: IDBObjectStore) => T): Promise<T> {
  const plan = embeddedPlanDraftKey();
  if (!plan) throw new Error('A test plan is required.');
  const db = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(YAML_DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(YAML_DRAFT_STORE_NAME);
    let result: T;
    let cause: unknown;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(cause || tx.error || new Error('Could not save plan scripts.'));
    };
    const request = store.get(`${plan}:scripts`);
    request.onsuccess = () => {
      const apply = (catalog: PlanScripts) => {
        try {
          result = change(catalog, store);
          store.put(catalog);
        } catch (error) {
          cause = error;
          tx.abort();
        }
      };
      if (request.result) apply(request.result as PlanScripts);
      else {
        const legacy = store.get(plan);
        legacy.onsuccess = () =>
          apply({
            id: `${plan}:scripts`,
            activeScriptId: 'default',
            scripts: [{ id: 'default', fileName: legacy.result?.fileName || 'relampo-script.yaml' }],
          });
      }
    };
  });
}

export function loadPlanScripts(): Promise<PlanScripts> {
  return updateCatalog(catalog => catalog);
}

export function selectPlanScript(scriptId: string): Promise<PlanScripts> {
  return updateCatalog(catalog => {
    if (!catalog.scripts.some(script => script.id === scriptId))
      throw new Error('Script does not belong to this plan.');
    catalog.activeScriptId = scriptId;
    return catalog;
  });
}

export function renamePlanScript(scriptId: string, fileName: string): Promise<void> {
  return updateCatalog(catalog => {
    const script = catalog.scripts.find(script => script.id === scriptId);
    if (!script) throw new Error('Script does not belong to this plan.');
    script.fileName = fileName;
  });
}

export function addPlanScript(draft: YAMLDraft): Promise<PlanScripts> {
  return updateCatalog((catalog, store) => {
    const id = crypto.randomUUID();
    const plan = embeddedPlanDraftKey()!;
    store.put({ ...draft, id: `${plan}:script:${id}` });
    catalog.scripts.push({ id, fileName: draft.fileName });
    catalog.activeScriptId = id;
    return catalog;
  });
}
