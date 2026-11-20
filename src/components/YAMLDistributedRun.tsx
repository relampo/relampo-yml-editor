import { DistributedNodes } from './distributed-run/DistributedNodes';
import { DistributedConnection, type ProviderConnection } from './distributed-run/DistributedConnection';
import { DistributedResults } from './distributed-run/DistributedResults';
import { DistributedNotice as Notice } from './distributed-run/DistributedFeedback';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FolderOpen, Loader2, Play } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { fingerprint } from '../utils/studioRunStore';
import {
  distributedRequest,
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
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [repository, setRepository] = useState('');
  const [host, setHost] = useState('gitlab.com');
  const [tags, setTags] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<number[]>([1, 2]);
  const nodes = selectedNodes.length;
  const [formats, setFormats] = useState<string[]>(['html']);
  const [connection, setConnection] = useState<{ key: string; status: ProviderConnection | null } | null>(null);
  const connectionKey = `${provider}:${host}`;
  const connected = connection?.key === connectionKey && connection.status?.authenticated === true;
  const [plan, setPlan] = useState<DistributedPlan | null>(null);
  const planRequest = useRef<DistributedConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [runId, setRunId] = useState('');
  const [state, setState] = useState<DistributedState | null>(null);
  const [scope, setScope] = useState('global');
  const [files, setFiles] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const projectKey = `${provider}:${host}:${repository}`;
  const [publishedFiles, setPublishedFiles] = useState<
    { action: string; path: string; target: string; repositoryKey: string }[]
  >([]);
  const projectFiles = publishedFiles.filter(file => file.repositoryKey === projectKey);
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
  const [fileAction, setFileAction] = useState('upload');
  const [reviewed, setReviewed] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const active = !!runId && (!state || state.status === 'running' || state.status === 'stopping');
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
  useEffect(() => {
    if (!documentReady || reattached.current || !yamlCode.trim()) return;
    reattached.current = true;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(savedRunKey) ?? 'null');
      if (
        saved &&
        typeof saved === 'object' &&
        'id' in saved &&
        typeof saved.id === 'string' &&
        'fp' in saved &&
        saved.fp === fingerprint(yamlCode)
      ) {
        setRunId(saved.id);
        setShowSettings(false);
      }
    } catch {
      /* Session persistence is optional. */
    }
  }, [documentReady, yamlCode]);
  useEffect(() => {
    if (!runId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await distributedRequest<DistributedState>(
          `run/${encodeURIComponent(runId)}`,
          undefined,
          controller.signal,
        );
        if (cancelled) return;
        setState(next);
        setConnectionError('');
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
        if (next.status === 'running' || next.status === 'stopping') timer = setTimeout(() => void poll(), 2500);
      } catch (e) {
        if (!cancelled) {
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
  }, [runId]);

  function config(script: string): DistributedConfig {
    return {
      provider,
      repository: repository.trim(),
      yaml: script,
      file_name: fileName && /\.ya?ml$/i.test(fileName) ? fileName : 'studio.yaml',
      nodes,
      report_formats: formats,
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
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Distributed operation failed');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function validate() {
    await perform(async () => {
      const request = config(flushPendingEdits());
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
      const request = config(flushPendingEdits());
      if (
        !planRequest.current ||
        JSON.stringify(planRequest.current) !== JSON.stringify(request) ||
        reviewedProjectFiles.current !== JSON.stringify(projectFiles)
      )
        throw new Error(
          text(
            'Cambió el documento o la configuración. Vuelve a comprobar la preparación.',
            'The document or settings changed. Check preparation again.',
          ),
        );
      const result = await distributedRequest<{ id: string }>('run', { ...request, prepare_only: prepareOnly });
      setState(null);
      setScope('global');
      histories.current.clear();
      historyStamp.current = '';
      setRunId(result.id);
      setShowSettings(false);
      try {
        sessionStorage.setItem(savedRunKey, JSON.stringify({ id: result.id, fp: fingerprint(request.yaml) }));
      } catch {
        /* Optional. */
      }
    });
  }
  const planCurrent =
    !!plan &&
    !!planRequest.current &&
    JSON.stringify(config(yamlCode)) === JSON.stringify(planRequest.current) &&
    reviewedProjectFiles.current === JSON.stringify(projectFiles);
  const disabled = busy || active || available !== true;
  function clearResults() {
    if (active || !state || !['completed', 'errored', 'stopped'].includes(state.status)) return;
    setRunId('');
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
      sessionStorage.removeItem(savedRunKey);
    } catch {
      /* Optional. */
    }
  }
  const points = scope === 'global' ? (state?.history ?? []) : (histories.current.get(scope) ?? []);

  return (
    <div className="@container h-full min-h-0 overflow-y-auto p-4 text-zinc-200">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {text('Prueba de carga', 'Load test')}
            </p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100">
              {text('Prueba distribuida', 'Distributed test')}
            </h2>
          </div>
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
                        setFormats(current =>
                          e.target.checked ? [...current, format] : current.filter(f => f !== format),
                        )
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
        </div>
        {available === false && (
          <Notice>
            {text(
              'Esta versión del CLI no ofrece ejecución distribuida desde Studio. Actualiza el CLI para habilitarla.',
              'This CLI version does not offer distributed execution in Studio. Update the CLI to enable it.',
            )}
          </Notice>
        )}
        {error && <Notice alert>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {connectionError && (
          <Notice alert>
            {connectionError} ·{' '}
            {text(
              'Reconectando; la prueba remota puede seguir activa.',
              'Reconnecting; the remote test may still be running.',
            )}
          </Notice>
        )}
        {runId && (
          <button
            className={buttonClass}
            onClick={() => setShowSettings(value => !value)}
          >
            {showSettings ? text('Ocultar configuración', 'Hide settings') : text('Ver configuración', 'View settings')}
          </button>
        )}
        <div className={showSettings ? 'space-y-5' : 'hidden'}>
          <div className="grid items-stretch gap-3 @[56rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
            <DistributedConnection
              provider={provider}
              host={host}
              enabled={available}
              disabled={disabled}
              repository={repository}
              onRepository={setRepository}
              onStatus={(key, status) => setConnection({ key, status })}
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
                    disabled={disabled}
                    className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#111] p-3 disabled:opacity-70"
                  >
                    <legend className="px-1 text-sm font-medium">{text('Repositorio', 'Repository')}</legend>
                    {repositoryPanel}
                  </fieldset>
                </>
              )}
            </DistributedConnection>
            <fieldset
              disabled={disabled}
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
                      !connected ||
                      !repository.trim() ||
                      (fileAction === 'remove'
                        ? !files.trim()
                        : !documentReady || !yamlCode.trim() || validationErrors.length > 0)
                    }
                    onClick={() =>
                      void perform(async () => {
                        const request = config(flushPendingEdits());
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
                        await distributedRequest('files', { ...request, files: paths, action: fileAction });
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
                        setPlan(null);
                        setSelectedFiles([]);
                        setFiles('');
                      })
                    }
                  >
                    {text('Aplicar', 'Apply')}
                  </button>
                </div>
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
                  disabled={disabled || !connected || !planCurrent || !reviewed}
                  onClick={() => void start(true)}
                >
                  {text('Preparar sin ejecutar', 'Prepare without running')}
                </button>
                <button
                  className={`${buttonClass} !border-yellow-400 !bg-yellow-400 !text-black`}
                  disabled={disabled || !connected || !planCurrent || !reviewed}
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
