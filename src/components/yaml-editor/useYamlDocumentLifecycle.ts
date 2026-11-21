import { studioEditorId } from '../../utils/studioEditorSession';
import type { ComponentCapabilities } from '../../utils/componentConfiguration';
import { logStatsigEvent } from '../../utils/analytics';
import { useEffect, useRef, useState } from 'react';
import { probeStudio } from '../../utils/debugApi';
import { getActiveDraft } from '../../utils/yamlDraftStorage';
import { getDraftRestoreError, normalizeYamlFileName } from '../yamlEditorHelpers';
import type { EditorViewMode } from '../EditorViewModeTabs';

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

  const [componentCapabilities, setComponentCapabilities] = useState<ComponentCapabilities | undefined>();
  const [multiScenarioDebugEnabled, setMultiScenarioDebugEnabled] = useState(false);
  const [debugViewEnabled, setDebugViewEnabled] = useState(DEBUG_VIEW_FORCED);
  const [runViewEnabled, setRunViewEnabled] = useState(RUN_VIEW_FORCED);
  const [multiScenarioRunEnabled, setMultiScenarioRunEnabled] = useState(false);
  const [distributedRunEnabled, setDistributedRunEnabled] = useState(false);
  const [grpcAuthoringEnabled, setGrpcAuthoringEnabled] = useState(false);
  const [correlateEnabled, setCorrelateEnabled] = useState(false);
  const [httpRecorderEnabled, setHttpRecorderEnabled] = useState(false);
  const [grpcRecorderTabsEnabled, setGrpcRecorderTabsEnabled] = useState(false);
  const [grpcBrowserRecordingEnabled, setGrpcBrowserRecordingEnabled] = useState(false);
  const [dataSourceFileBrowseEnabled, setDataSourceFileBrowseEnabled] = useState(false);
  const [defaultViewMode, setDefaultViewMode] = useState<EditorViewMode | undefined>();

  const mountSnapshotRef = useRef({ language, yamlContent: initialYamlContent });

  const syncCodeToTreeRef = useRef(syncCodeToTree);
  useEffect(() => {
    syncCodeToTreeRef.current = syncCodeToTree;
  });

  useEffect(() => {
    if (isInitialized) return;

    let isCancelled = false;

    const initializeDocument = async () => {
      const independentStudio = studioEditorId() !== null;
      let initialYaml = independentStudio ? '' : mountSnapshotRef.current.yamlContent || '';
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

      const studioInfo = await probeStudio();
      if (isCancelled) return;

      if (studioInfo?.studio) {
        setComponentCapabilities(studioInfo.capabilities?.componentConfiguration);
        setMultiScenarioDebugEnabled(studioInfo.capabilities?.multiScenarioDebug === true);
        setMultiScenarioRunEnabled(studioInfo.capabilities?.multiScenarioRun === true);
        setDistributedRunEnabled(studioInfo.capabilities?.distributedRun === true);
        setDataSourceFileBrowseEnabled(studioInfo.capabilities?.dataSourceFiles === true);
        setGrpcAuthoringEnabled(studioInfo.capabilities?.grpcAuthoring === true);
        setCorrelateEnabled(studioInfo.capabilities?.correlate === true);
        setHttpRecorderEnabled(studioInfo.capabilities?.httpRecorder === true);
        setGrpcRecorderTabsEnabled(studioInfo.capabilities?.grpcRecorderTabs === true);
        setGrpcBrowserRecordingEnabled(studioInfo.capabilities?.grpcBrowserRecording === true);
        if (!DEBUG_VIEW_FORCED && studioInfo.capabilities?.debug === true) setDebugViewEnabled(true);
        if (!RUN_VIEW_FORCED && studioInfo.capabilities?.loadRun) setRunViewEnabled(true);
        setDefaultViewMode(studioInfo.defaultView);
      }
      if (studioInfo?.initialScript && !independentStudio) {
        initialYaml = studioInfo.initialScript.yaml;
        initialFileName = normalizeYamlFileName(studioInfo.initialScript.name);
        initialUpdatedAt = null;
        restoreError = null;
      }

      if (initialYaml.trim()) setIsFileLoading(true);
      if (initialYaml.trim()) logStatsigEvent('studio_document_opened');
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
      setIsInitialized(true);
    };

    void initializeDocument();

    return () => {
      isCancelled = true;
    };
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
    multiScenarioDebugEnabled,
    componentCapabilities,
    runViewEnabled,
    multiScenarioRunEnabled,
    distributedRunEnabled,
    dataSourceFileBrowseEnabled,
    grpcAuthoringEnabled,
    grpcRecorderTabsEnabled,
    httpRecorderEnabled,
    correlateEnabled,
    grpcBrowserRecordingEnabled,
    defaultViewMode,
  };
}
