import { useEffect, useRef, useState } from 'react';
import { probeStudio } from '../../utils/debugApi';
import { getActiveDraft } from '../../utils/yamlDraftStorage';
import { getDraftRestoreError, normalizeYamlFileName } from '../yamlEditorHelpers';

// Dev-time override; in production the Debug view unlocks itself at runtime
// when the app detects it is being served by `relampo studio`.
const DEBUG_VIEW_FORCED = import.meta.env.VITE_DEBUG_VIEW_ENABLED === 'true';
const RUN_VIEW_FORCED = import.meta.env.VITE_RUN_VIEW_ENABLED === 'true';

const DEFAULT_FILE_NAME = 'relampo-script.yaml';

interface UseYamlDocumentLifecycleParams {
  language: string;
  initialYamlContent: string;
  setYamlContent: (content: string) => void;
  setError: (value: string | null) => void;
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
  fallbackRootNameRef: React.RefObject<string | null>;
  setYamlCode: (code: string) => void;
  syncCodeToTree: (code: string, options?: { force?: boolean; defaultRootName?: string }) => void;
  setHasDocumentActivity: (value: boolean) => void;
  setIsDirty: (value: boolean) => void;
  setIsFileLoading: (value: boolean) => void;
}

/**
 * Owns document identity (filename, draft restore metadata) and the one-time
 * mount initialization (IndexedDB draft restore + `relampo studio` probe),
 * plus the New Document dialog. Behavior is identical to the inline effect
 * and handlers it replaces.
 */
export function useYamlDocumentLifecycle({
  language,
  initialYamlContent,
  setYamlContent,
  setError,
  isInitialized,
  setIsInitialized,
  fallbackRootNameRef,
  setYamlCode,
  syncCodeToTree,
  setHasDocumentActivity,
  setIsDirty,
  setIsFileLoading,
}: UseYamlDocumentLifecycleParams) {
  const [currentFileName, setCurrentFileName] = useState(DEFAULT_FILE_NAME);
  const [restoredDraftUpdatedAt, setRestoredDraftUpdatedAt] = useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  // Studio detection + the optional CLI-mounted script are resolved together in
  // the init effect below (one /api/studio/info probe).
  const [debugViewEnabled, setDebugViewEnabled] = useState(DEBUG_VIEW_FORCED);
  const [runViewEnabled, setRunViewEnabled] = useState(RUN_VIEW_FORCED);
  const [dataSourceFileBrowseEnabled, setDataSourceFileBrowseEnabled] = useState(false);

  // Snapshot of the props/state this effect should only ever read at mount
  // time. `useRef(initialValue)` keeps whatever was passed on the very first
  // render forever — later `language`/`yamlContent` changes must not restart
  // document initialization, so they're captured here instead of being added
  // as reactive effect dependencies.
  const mountSnapshotRef = useRef({ language, yamlContent: initialYamlContent });

  // `syncCodeToTree` is recreated every render (it closes over `syncSelectionWithTree`,
  // which is itself unstable). The mount-init effect below needs to call the
  // *latest* version without depending on it directly — depending on it would
  // make that effect re-run on every render. Mirrors the `latestRef` pattern
  // already used by `useParseWorker` for the same class of problem.
  const syncCodeToTreeRef = useRef(syncCodeToTree);
  useEffect(() => {
    syncCodeToTreeRef.current = syncCodeToTree;
  });

  // Initialize on mount
  useEffect(() => {
    if (isInitialized) return;

    let isCancelled = false;

    const initializeDocument = async () => {
      let initialYaml = mountSnapshotRef.current.yamlContent || '';
      let initialFileName = DEFAULT_FILE_NAME;
      let initialUpdatedAt: string | null = null;
      let restoreError: string | null = null;

      try {
        const draft = await getActiveDraft();
        if (draft) {
          initialYaml = draft.yaml;
          initialFileName = normalizeYamlFileName(draft.fileName);
          initialUpdatedAt = draft.updatedAt;
        }
      } catch {
        restoreError = getDraftRestoreError(mountSnapshotRef.current.language);
      }

      // `relampo studio` probe: unlock Debug, and mount a CLI-passed script
      // (`relampo studio file.yaml`) — it wins over the restored draft. A
      // standalone editor returns null here, leaving the draft untouched.
      const studioInfo = await probeStudio();
      if (isCancelled) return;

      if (studioInfo?.studio) {
        setDataSourceFileBrowseEnabled(true);
        if (!DEBUG_VIEW_FORCED) setDebugViewEnabled(true);
        if (!RUN_VIEW_FORCED && studioInfo.capabilities?.loadRun) setRunViewEnabled(true);
      }
      if (studioInfo?.initialScript) {
        initialYaml = studioInfo.initialScript.yaml;
        initialFileName = normalizeYamlFileName(studioInfo.initialScript.name);
        initialUpdatedAt = null;
        restoreError = null;
      }

      if (initialYaml.trim()) setIsFileLoading(true);
      setYamlCode(initialYaml);
      setYamlContent(initialYaml);
      setCurrentFileName(initialFileName);
      setRestoredDraftUpdatedAt(initialUpdatedAt);
      setHasDocumentActivity(Boolean(initialUpdatedAt));
      setIsDirty(false);
      const restoredDisplayName = initialFileName.replace(/\.(ya?ml)$/i, '');
      fallbackRootNameRef.current = restoredDisplayName;
      syncCodeToTreeRef.current(initialYaml, { force: true, defaultRootName: restoredDisplayName });
      if (restoreError) setError(restoreError);
      // react-doctor: no-pass-live-state-to-parent (LEFT, see report). `isInitialized`
      // is genuinely owned by the parent (YAMLEditor) because sibling hooks — the
      // document-sync hook's `handleCodeChange`, this same mount effect's own guard —
      // all need to read it, so it can't be "returned from the hook" as the rule
      // suggests without recreating this exact prop-drilling. The state change here
      // is the async mount initialization completing, not a render-time echo of a
      // prop, so there is no extra-render cost to avoid. Same rationale already
      // documented in yaml-tree-view/useTreeViewSelection.ts.
      setIsInitialized(true);
    };

    void initializeDocument();

    return () => {
      isCancelled = true;
    };
    // `isInitialized` gates all real work behind the guard above, so once it
    // flips to true any later change to a listed dependency just re-fires
    // this effect into an immediate no-op return — never duplicate init work.
  }, [
    isInitialized,
    setYamlContent,
    fallbackRootNameRef,
    setYamlCode,
    setHasDocumentActivity,
    setIsDirty,
    setIsFileLoading,
    setIsInitialized,
    setError,
  ]);

  const handleNewOpen = () => {
    setIsNewDialogOpen(true);
  };

  // Resets document identity (filename, draft metadata) for a brand-new
  // document. Callers compose this alongside the document-content reset
  // (see YAMLEditor's handleNewConfirm).
  const resetIdentityForNewDocument = () => {
    setIsNewDialogOpen(false);
    setCurrentFileName(DEFAULT_FILE_NAME);
    setRestoredDraftUpdatedAt(null);
  };

  return {
    currentFileName,
    setCurrentFileName,
    restoredDraftUpdatedAt,
    isNewDialogOpen,
    setIsNewDialogOpen,
    handleNewOpen,
    resetIdentityForNewDocument,
    debugViewEnabled,
    runViewEnabled,
    dataSourceFileBrowseEnabled,
  };
}
