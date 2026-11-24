import { useDistributedSelectedFiles } from '../hooks/useDistributedSelectedFiles';
import { projectInputsKey, projectFileChanges, projectFileContents } from '../utils/distributedProjectState';
import { preparationKey, preparationChange } from '../utils/distributedPreparation';
import { distributedGlobalHistory } from '../utils/distributedApi';
import { useDistributedReportStorage } from '../hooks/useDistributedReportStorage';
import { analysisReportFormats } from '../utils/localRunReports';
import { useAgentState } from '../hooks/useAgentState';
import { ExecutionProjectError, onRunRepositoryReconnected, reconnectRunRepository, requestExecutionProject, type ExecutionProject } from '../utils/executionProject';
import { embeddedScriptDraftKey } from '../utils/embeddedPlanDraft';
import { DistributedNodes } from './distributed-run/DistributedNodes';
import { DistributedConnection, type ProviderConnection } from './distributed-run/DistributedConnection';
import { DistributedResults } from './distributed-run/DistributedResults';
import { DistributedNotice as Notice } from './distributed-run/DistributedFeedback';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FolderOpen, Loader2, Play } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { fingerprint } from '../utils/studioRunStore';
import { timerRead } from '../utils/agentTransport';
import { useInFront } from '../hooks/useInFront';
import {
  distributedRequest,
  DistributedRequestError,
  safeProviderURL,
  uploadDistributedFile,
  prepareDistributed,
  type DistributedConfig,
  type DistributedPlan,
  type DistributedPoint,
  type DistributedState,
} from '../utils/distributedApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const savedRunKey = 'relampo.studio.distributedRun';
const fieldClass =
  'h-9 w-full rounded-lg border border-white/10 bg-[#171717] px-3 text-sm text-zinc-100 disabled:opacity-50';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40';

export function YAMLDistributedRun({
  yamlCode,
  enabled = false,
  flushPendingEdits,
  documentReady,
  validationErrors,
  fileName,
}: {
  enabled?: boolean;
  fileName?: string;
  yamlCode: string;
  flushPendingEdits: () => string;
  documentReady: boolean;
  validationErrors: string[];
}) {
  const { language } = useLanguage();
  const es = language === 'es';
  const text = (spanish: string, english: string) => (es ? spanish : english);
  const available = enabled;
  const agentContext = useAgentState()?.contextId;
  const [reconnect, setReconnect] = useState(false);
  const [projectReload, setProjectReload] = useState(0);
  useEffect(() => {
    if (!reconnect) return;
    return onRunRepositoryReconnected(() => {
      setReconnect(false);
      setError('');
      setProjectReload(value => value + 1);
    });
  }, [reconnect]);
  const [project, setProject] = useState<ExecutionProject>();
  const [projectReady, setProjectReady] = useState(!embeddedScriptDraftKey());
  useEffect(() => {
    if (!embeddedScriptDraftKey()) return;
    setProjectReady(false);
    setProject(undefined);
    let live = true;
    void requestExecutionProject(fileName).then(
      value => {
        if (!live) return;
        setProject(value);
        if (value?.provider) setProvider(value.provider);
        setProjectReady(true);
      },
      cause => {
        if (live) {
          setReconnect(cause instanceof ExecutionProjectError && cause.reconnect);
          setError(cause instanceof Error ? cause.message : String(cause));
          setProjectReady(true);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [fileName, agentContext, projectReload]);
  const storageKey = () => {
    const script = embeddedScriptDraftKey();
    return script
      ? `${savedRunKey}:${script}:${project?.identity || 'unready'}:${provider}:${host}:${repository}`
      : savedRunKey;
  };
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [repository, setRepository] = useState('');
  const [host, setHost] = useState('gitlab.com');
  const [tags, setTags] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<number[]>([1, 2]);
  const nodes = selectedNodes.length;
  const [formats, setFormats] = useState<string[]>(['html']);
  const [connection, setConnection] = useState<{ key: string; status: ProviderConnection | null } | null>(null);
  const connectionKey = `${provider}:${host}:${agentContext ?? ''}`;
  const connected =
    connection?.key === connectionKey &&
    connection.status?.git_installed === true &&
    connection.status.cli_installed === true &&
    connection.status.authenticated === true;
  const [plan, setPlan] = useState<DistributedPlan | null>(null);
  const planRequest = useRef<DistributedConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runId, setRunId] = useState('');
  const [trackingLost, setTrackingLost] = useState(false);
  const [remoteURL, setRemoteURL] = useState<string | undefined>();
  const [state, setState] = useState<DistributedState | null>(null);
  const reportStorage = useDistributedReportStorage(state, runId, language);
  const [scope, setScope] = useState('global');
  const [files, setFiles] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileAction, setFileAction] = useState('upload');
  const selected = useDistributedSelectedFiles(selectedFiles);
  const [appliedUploads, setAppliedUploads] = useState<{ target: string; contents: Map<string, string> }>();
  const projectKey = `${agentContext ?? 'local'}:${provider}:${host}:${repository}`;
  const [appliedProject, setAppliedProject] = useState<string | null>(null);
  const [appliedConfig, setAppliedConfig] = useState<{ target: string; config: DistributedConfig } | null>(null);
  const projectApplyKey = (script: string, snapshot = project) =>
    JSON.stringify([agentContext ?? 'local', projectInputsKey(config(script, snapshot))]);
  const [publishedFiles, setPublishedFiles] = useState<
    { action: string; path: string; target: string; repositoryKey: string }[]
  >([]);
  const projectFiles = publishedFiles.filter(file => file.repositoryKey === projectKey);
  const currentFileConfig = useMemo<DistributedConfig>(
    () => ({
      provider,
      host,
      repository,
      yaml: yamlCode,
      file_name: fileName,
      nodes: 0,
      language,
      ...(project ? { workspace: { scriptPath: project.scriptPath, files: project.files } } : {}),
    }),
    [provider, host, repository, yamlCode, fileName, language, project],
  );
  const currentFilesKey = useMemo(
    () => JSON.stringify([agentContext ?? 'local', projectInputsKey(currentFileConfig)]),
    [agentContext, currentFileConfig],
  );
  const sourceChanges = useMemo(
    () =>
      projectFileChanges(appliedConfig?.target === projectKey ? appliedConfig.config : undefined, currentFileConfig),
    [appliedConfig, projectKey, currentFileConfig],
  );

  const pendingUploads = [...selected.contents].filter(([name, data]) => {
    if (name === (fileName || 'studio.yaml')) return false;
    const existing = appliedUploads?.target === projectKey ? appliedUploads.contents.get(name) : undefined;
    const saved =
      appliedConfig?.target === projectKey ? projectFileContents(appliedConfig.config).get(`Data/${name}`) : undefined;
    return data !== (saved ?? existing);
  });
  const filesApplied =
    appliedProject === currentFilesKey &&
    selected.ready &&
    !selected.error &&
    pendingUploads.length === 0 &&
    !(fileAction === 'remove' && files.trim());

  const hasAppliedProject = appliedConfig?.target === projectKey;
  const fileChanges = [...sourceChanges];
  for (const [name] of pendingUploads) {
    const path = project?.files.some(file => file.path === `Data/${name}`) ? `Data/${name}` : `scenarios/${name}`;
    if (!fileChanges.some(change => change.path === path))
      fileChanges.push({
        path,
        kind:
          (appliedUploads?.target === projectKey && appliedUploads.contents.has(name)) ||
          (hasAppliedProject && projectFileContents(appliedConfig.config).has(path))
            ? 'modified'
            : 'new',
      });
  }
  if (fileAction === 'remove')
    for (const path of files
      .split(',')
      .map(path => path.trim())
      .filter(Boolean)) {
      fileChanges.push({ path, kind: 'removed' });
    }
  const reviewedProjectFiles = useRef('');
  const filePicker = useRef<HTMLInputElement>(null);
  const reportsMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (reportsMenu.current && !reportsMenu.current.contains(event.target as Node)) reportsMenu.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && reportsMenu.current?.open) {
        reportsMenu.current.open = false;
        reportsMenu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  const [reviewed, setReviewed] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const active = !!runId && !trackingLost && (!state || state.status === 'running' || state.status === 'stopping');
  const mounted = useRef(true);
  const reattached = useRef(false);
  const histories = useRef<Map<string, DistributedPoint[]>>(new Map());
  const historyStamp = useRef('');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const executionContext = storageKey();
  useEffect(() => {
    if (!embeddedScriptDraftKey()) return;
    reattached.current = false;
    setRunId('');
    setTrackingLost(false);
    setRemoteURL(undefined);
    setState(null);
    histories.current.clear();
    historyStamp.current = '';
  }, [executionContext]);
  useEffect(() => {
    if (!documentReady || reattached.current || !yamlCode.trim() || (embeddedScriptDraftKey() && !projectReady)) return;
    reattached.current = true;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey()) ?? 'null');
      if (
        saved &&
        typeof saved === 'object' &&
        'id' in saved &&
        typeof saved.id === 'string' &&
        'fp' in saved &&
        saved.fp === fingerprint(yamlCode)
      ) {
        setRunId(saved.id);
        setTrackingLost('lost' in saved && saved.lost === true);
        setRemoteURL('url' in saved && typeof saved.url === 'string' ? safeProviderURL(saved.url) : undefined);
        setShowSettings(false);
      }
    } catch {
      /* Session persistence is optional. */
    }
  }, [documentReady, yamlCode, projectReady, executionContext]);
  // Hidden views pause reads. Every scope recovers its history from the agent.
  const [inFront] = useInFront();
  useEffect(() => {
    if (!runId || !inFront || trackingLost) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const poll = async () => {
      const readStarted = performance.now();
      try {
        const next = await timerRead(
          signal => distributedRequest<DistributedState>(`run/${encodeURIComponent(runId)}`, undefined, signal),
          controller.signal,
        );
        if (cancelled) return;
        setState(next);
        setConnectionError('');
        const url = safeProviderURL(next.url);
        if (url) {
          setRemoteURL(url);
          try {
            const saved = JSON.parse(sessionStorage.getItem(executionContext) ?? 'null');
            if (saved?.id === runId && saved.url !== url)
              sessionStorage.setItem(executionContext, JSON.stringify({ ...saved, url }));
          } catch {
            /* Session persistence is optional. */
          }
        }
        const stamp = next.history?.at(-1)?.at;
        if (stamp && stamp !== historyStamp.current) {
          historyStamp.current = stamp;
          histories.current.set('global', next.history);
          for (const item of next.scopes ?? []) {
            if (item.key === 'global' || item.name) continue;
            const points = histories.current.get(item.key) ?? [];
            points.push({
              at: stamp,
              requests: item.total.requests,
              failures: item.total.failures,
              rps: item.window.rps,
              active_vus: next.nodes
                .filter(node => item.node_id === node.node_id && !node.progress.final)
                .reduce((sum, node) => sum + node.progress.active_vus, 0),
              avg_ms: item.window.avg_ms,
              p95_ms: item.window.p95_ms,
            });
            histories.current.set(item.key, points.slice(-300));
          }
        }
        if (next.status === 'running' || next.status === 'stopping')
          timer = setTimeout(() => void poll(), Math.max(0, 1000 - (performance.now() - readStarted)));
      } catch (e) {
        if (!cancelled) {
          if (e instanceof DistributedRequestError && e.status === 404) {
            setTrackingLost(true);
            setConnectionError('');
            setState(current =>
              current ? { ...current, status: 'unavailable', error: undefined, warning: undefined } : null,
            );
            try {
              const saved = JSON.parse(sessionStorage.getItem(executionContext) ?? 'null');
              if (saved?.id === runId)
                sessionStorage.setItem(executionContext, JSON.stringify({ ...saved, lost: true }));
            } catch {
              /* Session persistence is optional. */
            }
            return;
          }
          setConnectionError(e instanceof Error ? e.message : 'Connection lost');
          timer = setTimeout(() => void poll(), 5000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, inFront, trackingLost, executionContext]);

  function config(script: string, snapshot = project): DistributedConfig {
    return {
      ...(snapshot ? { workspace: { scriptPath: snapshot.scriptPath, files: snapshot.files } } : {}),
      provider,
      repository: repository.trim(),
      yaml: script,
      file_name: fileName && /\.ya?ml$/i.test(fileName) ? fileName : 'studio.yaml',
      nodes,
      report_formats: analysisReportFormats(formats),
      files: projectFiles.filter(file => file.action !== 'remove').map(file => file.path),
      language,
      ...(provider === 'gitlab'
        ? {
            host: host.trim(),
            runner_tags: tags
              .split(',')
              .map(v => v.trim())
              .filter(Boolean),
          }
        : {}),
    };
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setReconnect(false);
    setNotice('');
    try {
      await action();
    } catch (e) {
      setReconnect(e instanceof ExecutionProjectError && e.reconnect);
      setError(e instanceof Error ? e.message : 'Distributed operation failed');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function validate() {
    await perform(async () => {
      const snapshot = await requestExecutionProject(fileName);
      setProject(snapshot);
      const request = config(flushPendingEdits(), snapshot);
      if (!filesApplied || appliedProject !== projectApplyKey(request.yaml, snapshot))
        throw new Error(
          text('Aplica el proyecto y los archivos antes de ejecutar.', 'Apply the project and files before running.'),
        );
      const result = await prepareDistributed(request);
      planRequest.current = request;
      reviewedProjectFiles.current = JSON.stringify(projectFiles);
      setPlan({
        ...result.plan,
        files: [
          ...new Set([
            ...result.plan.files,
            ...projectFiles.filter(file => file.action !== 'remove').map(file => file.target),
          ]),
        ],
      });
      setReviewed(false);
    });
  }
  async function start(prepareOnly: boolean) {
    await perform(async () => {
      const snapshot = await requestExecutionProject(fileName);
      setProject(snapshot);
      const request = config(flushPendingEdits(), snapshot);
      if (!filesApplied || appliedProject !== projectApplyKey(request.yaml, snapshot))
        throw new Error(
          text('Aplica el proyecto y los archivos antes de ejecutar.', 'Apply the project and files before running.'),
        );
      if (
        !planRequest.current ||
        preparationKey(planRequest.current) !== preparationKey(request) ||
        reviewedProjectFiles.current !== JSON.stringify(projectFiles)
      ) {
        const reason = planRequest.current
          ? preparationChange(planRequest.current, request, es)
          : text('La preparación no está disponible.', 'Preparation is unavailable.');
        const result = await prepareDistributed(request);
        planRequest.current = request;
        reviewedProjectFiles.current = JSON.stringify(projectFiles);
        setPlan({
          ...result.plan,
          files: [
            ...new Set([
              ...result.plan.files,
              ...projectFiles.filter(file => file.action !== 'remove').map(file => file.target),
            ]),
          ],
        });
        setReviewed(false);
        setNotice(
          `${reason} ${text('Preparación actualizada. Revisa la publicación antes de ejecutar.', 'Preparation updated. Review publication before running.')}`,
        );
        return;
      }
      const result = await distributedRequest<{ id: string }>('run', { ...request, prepare_only: prepareOnly });
      setTrackingLost(false);
      setRemoteURL(undefined);
      setState(null);
      setScope('global');
      histories.current.clear();
      historyStamp.current = '';
      setRunId(result.id);
      setShowSettings(false);
      try {
        sessionStorage.setItem(storageKey(), JSON.stringify({ id: result.id, fp: fingerprint(request.yaml) }));
      } catch {
        /* Optional. */
      }
    });
  }
  const planCurrent =
    !!plan &&
    !!planRequest.current &&
    preparationKey(config(yamlCode)) === preparationKey(planRequest.current) &&
    reviewedProjectFiles.current === JSON.stringify(projectFiles);
  const disabled = busy || active || available !== true;
  const snapshotRead = useRef(false);
  useEffect(() => {
    if (!embeddedScriptDraftKey() || !inFront || !showSettings || !projectReady || !connected || disabled) return;
    let live = true;
    const refresh = async () => {
      if (snapshotRead.current) return;
      snapshotRead.current = true;
      try {
        const snapshot = await requestExecutionProject(fileName);
        if (live) setProject(previous => (JSON.stringify(previous) === JSON.stringify(snapshot) ? previous : snapshot));
      } catch (cause) {
        if (live) {
          setAppliedProject(null);
          setReconnect(cause instanceof ExecutionProjectError && cause.reconnect);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        snapshotRead.current = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener('focus', refresh);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [fileName, agentContext, inFront, showSettings, projectReady, connected, disabled]);

  function clearResults() {
    if (active || (!trackingLost && (!state || !['completed', 'errored', 'stopped'].includes(state.status)))) return;
    setRunId('');
    setTrackingLost(false);
    setRemoteURL(undefined);
    setState(null);
    setScope('global');
    histories.current.clear();
    historyStamp.current = '';
    setError('');
    setNotice('');
    setConnectionError('');
    setPlan(null);
    planRequest.current = null;
    reviewedProjectFiles.current = '';
    setReviewed(false);
    setShowSettings(true);
    try {
      sessionStorage.removeItem(storageKey());
    } catch {
      /* Optional. */
    }
  }
  const points =
    scope === 'global'
      ? distributedGlobalHistory(state)
      : (state?.scope_history?.[scope] ?? histories.current.get(scope) ?? []);

  const runControls = (
    <div className="flex flex-wrap items-center gap-3">
      <DistributedNodes
        selected={selectedNodes}
        onChange={setSelectedNodes}
        capacity={40}
        maxSelected={10}
        disabled={disabled}
        es={es}
      />
      <details
        ref={reportsMenu}
        className="relative text-xs"
      >
        <summary
          className={`${buttonClass} cursor-pointer !py-2 text-xs`}
          aria-label={text('Reportes', 'Reports')}
        >
          {text('Reportes', 'Reports')} · {formats.map(f => f.toUpperCase()).join(', ') || '—'}
        </summary>
        <div className="absolute right-0 z-20 mt-2 min-w-36 space-y-2 rounded-lg border border-white/15 bg-[#171717] p-3 shadow-xl">
          {['html', 'json', 'csv', 'txt'].map(format => (
            <label
              className="flex items-center gap-2"
              key={format}
            >
              <input
                type="checkbox"
                aria-label={format.toUpperCase()}
                checked={formats.includes(format)}
                disabled={disabled}
                onChange={e =>
                  setFormats(current => (e.target.checked ? [...current, format] : current.filter(f => f !== format)))
                }
              />
              {format.toUpperCase()}
            </label>
          ))}
        </div>
      </details>
      <button
        className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => void (planCurrent && reviewed ? start(false) : validate())}
        disabled={
          disabled ||
          !documentReady ||
          !filesApplied ||
          !yamlCode.trim() ||
          validationErrors.length > 0 ||
          !repository.trim() ||
          !connected ||
          formats.length === 0 ||
          nodes < 1
        }
      >
        {busy ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {text('Ejecutar', 'Run')}
      </button>
    </div>
  );

  return (
    <div className="@container h-full min-h-0 overflow-y-auto p-4 text-zinc-200">
      <div className="mx-auto max-w-6xl space-y-5">
        {!state && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                {text('Prueba de carga', 'Load test')}
              </p>
              <h2 className="mt-1 text-base font-semibold text-zinc-100">
                {text('Prueba distribuida', 'Distributed test')}
              </h2>
            </div>
            {runControls}
          </div>
        )}
        {available === false && (
          <Notice>
            {text(
              'Esta versión del CLI no ofrece ejecución distribuida desde Studio. Actualiza el CLI para habilitarla.',
              'This CLI version does not offer distributed execution in Studio. Update the CLI to enable it.',
            )}
          </Notice>
        )}
        {error && <Notice alert>{error}{reconnect && (
          <button type="button" className="ml-2 underline" onClick={reconnectRunRepository}>
            {text("Reconectar repositorio", "Reconnect repository")}
          </button>
        )}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {reportStorage.saving && (
          <Notice>{text('Guardando reportes en el Test Plan…', 'Saving reports to the Test Plan…')}</Notice>
        )}
        {reportStorage.error && (
          <Notice alert>
            {text('No se pudieron guardar los reportes en el Test Plan: ', 'Could not save reports to the Test Plan: ')}
            {reportStorage.error}
            <button
              className={`${buttonClass} ml-2`}
              onClick={reportStorage.retry}
            >
              {text('Reintentar', 'Retry')}
            </button>
          </Notice>
        )}
        {trackingLost && (
          <Notice alert>
            <div className="space-y-2">
              <p>
                {text(
                  'El agente ya no conserva el seguimiento de esta ejecución. Su estado remoto es desconocido; no se iniciará otra prueba automáticamente.',
                  'The agent no longer has tracking information for this run. Its remote status is unknown; another test will not start automatically.',
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {remoteURL && (
                  <a
                    className={buttonClass}
                    href={remoteURL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {text('Ver ejecución remota', 'View remote execution')}
                  </a>
                )}
                <button
                  className={buttonClass}
                  onClick={clearResults}
                >
                  {text('Volver a configurar', 'Back to settings')}
                </button>
              </div>
            </div>
          </Notice>
        )}
        {connectionError && (
          <Notice alert>
            {connectionError} ·{' '}
            {text(
              'Reconectando; la prueba remota puede seguir activa.',
              'Reconnecting; the remote test may still be running.',
            )}
          </Notice>
        )}
        <div className={showSettings ? 'space-y-5' : 'hidden'}>
          <div className="grid items-stretch gap-3 @[56rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
            <DistributedConnection
              key={agentContext}
              provider={provider}
              host={host}
              enabled={available}
              disabled={disabled}
              repository={repository}
              onRepository={setRepository}
              onStatus={(key, status) => setConnection({ key: `${key}:${agentContext ?? ''}`, status })}
              es={es}
            >
              {({ connection: connectionPanel, repository: repositoryPanel }) => (
                <>
                  <fieldset
                    disabled={disabled}
                    className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#111] p-3 disabled:opacity-70"
                  >
                    <legend className="px-1 text-sm font-medium">{text('Conexión', 'Connection')}</legend>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label={text('Proveedor', 'Provider')}>
                        <Select
                          value={provider}
                          onValueChange={value => setProvider(value as 'github' | 'gitlab')}
                          disabled={disabled}
                        >
                          <SelectTrigger aria-label={text('Proveedor', 'Provider')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="github">GitHub Actions</SelectItem>
                            <SelectItem value="gitlab">GitLab CI/CD</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {provider === 'gitlab' && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={text('Servidor GitLab', 'GitLab host')}>
                          <input
                            aria-label="GitLab host"
                            className={fieldClass}
                            value={host}
                            onChange={e => setHost(e.target.value)}
                          />
                        </Field>
                        <Field label={text('Etiquetas de runners', 'Runner tags')}>
                          <input
                            aria-label="Runner tags"
                            className={fieldClass}
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            placeholder="linux, load-test"
                          />
                        </Field>
                      </div>
                    )}
                    {connectionPanel}
                  </fieldset>
                  <fieldset
                    disabled={disabled || !connected}
                    className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#111] p-3 disabled:opacity-70"
                  >
                    <legend className="px-1 text-sm font-medium">{text('Repositorio', 'Repository')}</legend>
                    {repositoryPanel}
                  </fieldset>
                </>
              )}
            </DistributedConnection>
            <fieldset
              disabled={disabled || !connected || !repository.trim()}
              className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#111] p-3 disabled:opacity-70"
            >
              <legend className="px-1 text-sm font-medium">{text('Proyecto y archivos', 'Project and files')}</legend>
              <div className="space-y-3">
                <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-400">Script YAML</span>
                  <span
                    className="truncate font-mono text-zinc-200"
                    title={fileName || 'studio.yaml'}
                  >
                    {fileName || 'studio.yaml'}
                  </span>
                </div>
                <input
                  ref={filePicker}
                  type="file"
                  multiple
                  className="hidden"
                  aria-label={text('Archivos del equipo', 'Computer files')}
                  disabled={disabled}
                  onChange={event => {
                    setSelectedFiles(Array.from(event.target.files ?? []));
                    setPlan(null);
                    event.target.value = '';
                  }}
                />
                <div className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-2">
                  {fileAction === 'remove' ? (
                    <input
                      aria-label={text('Archivos del repositorio', 'Repository files')}
                      className={fieldClass}
                      value={files}
                      onChange={e => setFiles(e.target.value)}
                      placeholder="scenarios/users.csv"
                      disabled={disabled}
                    />
                  ) : (
                    <button
                      className={`${buttonClass} h-9 min-w-0 justify-start !px-2`}
                      disabled={disabled}
                      onClick={() => filePicker.current?.click()}
                      title={selectedFiles.map(file => file.name).join(', ')}
                    >
                      <FolderOpen
                        size={16}
                        className="shrink-0"
                      />
                      <span className="truncate">
                        {selectedFiles.length === 0
                          ? text('Seleccionar archivos', 'Select files')
                          : selectedFiles.length === 1
                            ? selectedFiles[0].name
                            : `${selectedFiles.length} ${text('archivos', 'files')}`}
                      </span>
                    </button>
                  )}
                  <Select
                    value={fileAction}
                    onValueChange={setFileAction}
                    disabled={disabled}
                  >
                    <SelectTrigger aria-label={text('Acción de archivos', 'File action')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">{text('Subir', 'Upload')}</SelectItem>
                      <SelectItem value="update">{text('Actualizar', 'Update')}</SelectItem>
                      <SelectItem value="remove">{text('Eliminar', 'Remove')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    className={`${buttonClass} h-9 !px-2`}
                    aria-label={text('Aplicar acción a los archivos', 'Apply file action')}
                    disabled={
                      disabled ||
                      !selected.ready ||
                      !!selected.error ||
                      filesApplied ||
                      !connected ||
                      !repository.trim() ||
                      (fileAction === 'remove'
                        ? !files.trim()
                        : !documentReady || !yamlCode.trim() || validationErrors.length > 0)
                    }
                    onClick={() =>
                      void perform(async () => {
                        const snapshot = await requestExecutionProject(fileName);
                        setProject(snapshot);
                        const request = config(flushPendingEdits(), snapshot);
                        const documentName = request.file_name ?? 'studio.yaml';
                        const uploads =
                          fileAction === 'remove'
                            ? []
                            : [
                                ...selectedFiles.filter(file => file.name !== documentName),
                                new File([request.yaml], documentName, { type: 'application/yaml' }),
                              ];
                        if (uploads.length > 64)
                          throw new Error(
                            text(
                              'Selecciona como máximo 63 archivos adicionales.',
                              'Select at most 63 additional files.',
                            ),
                          );
                        if (uploads.some(file => file.size > 64 * 1024 * 1024))
                          throw new Error(
                            text('Cada archivo debe pesar menos de 64 MiB.', 'Each file must be smaller than 64 MiB.'),
                          );
                        const paths: string[] = [];
                        if (fileAction === 'remove')
                          paths.push(
                            ...files
                              .split(',')
                              .map(value => value.trim())
                              .filter(Boolean),
                          );
                        else for (const file of uploads) paths.push(await uploadDistributedFile(file));
                        await distributedRequest('files', {
                          ...request,
                          files: paths,
                          action: fileAction === 'upload' && hasAppliedProject ? 'update' : fileAction,
                        });
                        const appliedSnapshot = selectedFiles.length
                          ? await requestExecutionProject(fileName)
                          : snapshot;
                        setProject(appliedSnapshot);
                        const appliedRequest = config(request.yaml, appliedSnapshot);
                        if (fileAction === 'remove')
                          setAppliedUploads(current => {
                            if (current?.target !== projectKey) return current;
                            const contents = new Map(current.contents);
                            for (const path of paths) contents.delete(path.split('/').at(-1)!);
                            return { target: projectKey, contents };
                          });
                        if (fileAction !== 'remove')
                          setAppliedUploads(current => ({
                            target: projectKey,
                            contents: new Map([
                              ...(current?.target === projectKey ? current.contents : []),
                              ...selected.contents,
                            ]),
                          }));
                        const changes = paths.map((path, index) => ({
                          action: fileAction,
                          path,
                          // Match the CLI repository path: a bare name lives under scenarios/.
                          target:
                            fileAction === 'remove'
                              ? path.replace(/^(\.\/)+/, '').replace(/^[^/]+$/, name => `scenarios/${name}`)
                              : `scenarios/${uploads[index].name}`,
                          repositoryKey: projectKey,
                        }));
                        const targets = new Set(changes.map(file => file.target));
                        setPublishedFiles(current => [
                          ...current.filter(file => file.repositoryKey !== projectKey || !targets.has(file.target)),
                          ...changes,
                        ]);
                        if (fileAction !== 'remove' || appliedProject !== null) {
                          setAppliedProject(projectApplyKey(request.yaml, appliedSnapshot));
                          setAppliedConfig({ target: projectKey, config: appliedRequest });
                        }
                        setPlan(null);
                        setSelectedFiles([]);
                        setFiles('');
                      })
                    }
                  >
                    {hasAppliedProject ? text('Actualizar', 'Update') : text('Aplicar', 'Apply')}
                  </button>
                </div>
                <p
                  className="text-xs text-zinc-300"
                  role="status"
                >
                  {filesApplied
                    ? text('Sin cambios pendientes.', 'No pending changes.')
                    : hasAppliedProject
                      ? text('Hay cambios pendientes de actualizar.', 'Changes need to be updated.')
                      : text('Proyecto pendiente de aplicar.', 'Project has not been applied yet.')}
                </p>
                {selected.error && (
                  <p
                    role="alert"
                    className="text-xs text-red-400"
                  >
                    {text('No se pudo leer el archivo seleccionado. Vuelve a seleccionarlo.', selected.error)}
                  </p>
                )}
                {fileChanges.length > 0 && (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th>{text('Archivo', 'File')}</th>
                        <th>{text('Cambio', 'Change')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileChanges.map(change => (
                        <tr key={change.path}>
                          <td className="break-all py-1">{change.path}</td>
                          <td>
                            {change.kind === 'new'
                              ? text('Nuevo', 'New')
                              : change.kind === 'modified'
                                ? text('Modificado', 'Modified')
                                : text('Eliminación pendiente', 'Removal pending')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!filesApplied && (
                  <p className="text-xs text-zinc-400">
                    {text(
                      'Aplica el proyecto y los archivos antes de ejecutar.',
                      'Apply the project and files before running.',
                    )}
                  </p>
                )}
                {projectFiles.length > 0 && (
                  <p
                    className="text-xs text-yellow-400/80"
                    title={projectFiles.map(file => `${file.action}: ${file.target}`).join('\n')}
                  >
                    {projectFiles.length}{' '}
                    {projectFiles.some(file => file.action === 'remove')
                      ? projectFiles.length === 1
                        ? text('cambio aplicado', 'change applied')
                        : text('cambios aplicados', 'changes applied')
                      : projectFiles.length === 1
                        ? text('archivo subido', 'file uploaded')
                        : text('archivos subidos', 'files uploaded')}
                  </p>
                )}
              </div>
            </fieldset>
          </div>
          {validationErrors.length > 0 && (
            <Notice alert>
              {text('Corrige los errores del YAML antes de ejecutar.', 'Fix YAML errors before running.')}
            </Notice>
          )}
          {plan && (
            <section className="space-y-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
              <h3 className="font-semibold">{text('Revisar publicación', 'Review publication')}</h3>
              <p className="text-sm">
                {planRequest.current?.repository} · {plan.nodes} {text('nodos', 'nodes')} · {plan.users} VUs ·{' '}
                {plan.duration}
              </p>
              <p className="text-xs text-zinc-400">
                {text('Límites de la licencia', 'License limits')}: {plan.max_nodes} {text('nodos', 'nodes')} ·{' '}
                {plan.max_users} VUs · {plan.max_duration}
              </p>
              <ul className="list-inside list-disc text-sm text-zinc-300">
                {plan.files.map(file => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
              {!plan.repository_exists && (
                <Notice>
                  {text(
                    'El repositorio no existe. Créalo desde Conexión y configuración.',
                    'The repository does not exist. Create it in Connection and settings.',
                  )}
                </Notice>
              )}
              {!planCurrent && (
                <Notice>
                  {text(
                    'La preparación quedó desactualizada. Comprueba de nuevo tras tus cambios.',
                    'Preparation is outdated. Check again after your changes.',
                  )}
                </Notice>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={!planCurrent || disabled}
                  onChange={e => setReviewed(e.target.checked)}
                />
                {text(
                  'He revisado el repositorio y los archivos que se publicarán.',
                  'I reviewed the repository and files to publish.',
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonClass}
                  disabled={disabled || !connected || !filesApplied || !planCurrent || !reviewed}
                  onClick={() => void start(true)}
                >
                  {text('Preparar sin ejecutar', 'Prepare without running')}
                </button>
                <button
                  className={`${buttonClass} !border-yellow-400 !bg-yellow-400 !text-black`}
                  disabled={disabled || !connected || !filesApplied || !planCurrent || !reviewed}
                  onClick={() => void start(false)}
                >
                  <Play size={16} />
                  {text('Publicar y ejecutar', 'Publish and run')}
                </button>
              </div>
            </section>
          )}
        </div>
        {state && (
          <DistributedResults
            runControls={runControls}
            settingsAction={
              runId ? (
                <button
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-white/15 px-2.5 text-xs text-zinc-200 hover:bg-white/5"
                  onClick={() => setShowSettings(value => !value)}
                >
                  {showSettings
                    ? text('Ocultar configuración', 'Hide settings')
                    : text('Ver configuración', 'View settings')}
                </button>
              ) : undefined
            }
            state={state}
            runId={runId}
            plan={plan}
            scope={scope}
            onScopeChange={setScope}
            points={points}
            active={active}
            busy={busy}
            onClear={clearResults}
            yamlCode={planRequest.current?.yaml ?? yamlCode}
            onStop={() =>
              void perform(async () => {
                await distributedRequest(`run/${encodeURIComponent(runId)}/stop`, {});
                setState(await distributedRequest<DistributedState>(`run/${encodeURIComponent(runId)}`));
              })
            }
          />
        )}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-400">{label}</div>
      {children}
    </div>
  );
}
