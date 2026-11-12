import { DistributedResults } from './distributed-run/DistributedResults';
import { DistributedNotice as Notice } from './distributed-run/DistributedFeedback';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Play } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { fingerprint } from '../utils/studioRunStore';
import {
  distributedRequest,
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
  const [nodes, setNodes] = useState(2);
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
      setPlan(result.plan);
      setReviewed(false);
    });
  }
  async function start(prepareOnly: boolean) {
    await perform(async () => {
      const request = config(flushPendingEdits());
      if (!planRequest.current || JSON.stringify(planRequest.current) !== JSON.stringify(request))
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
    !!plan && !!planRequest.current && JSON.stringify(config(yamlCode)) === JSON.stringify(planRequest.current);
  const disabled = busy || active || available !== true;
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
              {text('Ejecución distribuida', 'Distributed execution')}
            </h2>
          </div>
          <button
            className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void (planCurrent && reviewed ? start(false) : validate())}
            disabled={
              disabled ||
              !documentReady ||
              !yamlCode.trim() ||
              validationErrors.length > 0 ||
              !repository.trim() ||
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
            {text('Ejecutar prueba distribuida', 'Run distributed test')}
          </button>
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
          <div className="grid items-start gap-3 @[48rem]:grid-cols-2">
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
                <button
                  className={buttonClass}
                  disabled={disabled || !repository.trim()}
                  onClick={() =>
                    void perform(async () => {
                      await distributedRequest('setup', config(flushPendingEdits()));
                      setPlan(null);
                      setNotice(
                        text(
                          'Proyecto configurado. Comprueba la preparación para continuar.',
                          'Project configured. Check preparation to continue.',
                        ),
                      );
                    })
                  }
                >
                  {text('Preparar repositorio', 'Prepare repository')}
                </button>

                <input
                  aria-label={text('Archivos', 'Files')}
                  className={fieldClass}
                  value={files}
                  onChange={e => setFiles(e.target.value)}
                  placeholder="users.csv, products.csv"
                  disabled={disabled}
                />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
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
                      <SelectItem value="remove">
                        {text('Eliminar del repositorio', 'Remove from repository')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    className={buttonClass}
                    aria-label={text('Aplicar acción a los archivos', 'Apply file action')}
                    disabled={disabled || !repository.trim() || !files.trim()}
                    onClick={() =>
                      void perform(async () => {
                        await distributedRequest('files', {
                          ...config(flushPendingEdits()),
                          files: files
                            .split(',')
                            .map(v => v.trim())
                            .filter(Boolean),
                          action: fileAction,
                        });
                        setPlan(null);
                        setNotice(text('Archivos del repositorio actualizados.', 'Repository files updated.'));
                      })
                    }
                  >
                    {text('Aplicar', 'Apply')}
                  </button>
                </div>
              </div>
            </fieldset>
            <fieldset
              disabled={disabled}
              className="min-w-0 space-y-3 rounded-lg border border-white/10 bg-[#111] p-3 disabled:opacity-70"
            >
              <legend className="px-1 text-sm font-medium">
                {text('Conexión y configuración', 'Connection and settings')}
              </legend>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_4rem] gap-3">
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
                <Field label={text('Repositorio', 'Repository')}>
                  <input
                    aria-label={text('Repositorio', 'Repository')}
                    className={fieldClass}
                    value={repository}
                    onChange={e => setRepository(e.target.value)}
                    placeholder="owner/project"
                  />
                </Field>
                <Field label={text('Nodos', 'Nodes')}>
                  <input
                    aria-label={text('Nodos', 'Nodes')}
                    type="number"
                    min={1}
                    max={plan?.max_nodes ?? 256}
                    className={fieldClass}
                    value={nodes}
                    onChange={e => setNodes(Number(e.target.value))}
                  />
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
              <p className="text-xs text-zinc-500">
                {text(
                  'Usa la cuenta de GitHub/GitLab conectada en este equipo. La carga se toma del YAML.',
                  'Uses the GitHub/GitLab account connected on this computer. Load settings come from the YAML.',
                )}
              </p>
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
                    'El repositorio no existe. Preparar repositorio permite crear uno administrado por Relampo.',
                    'The repository does not exist. Prepare repository can create a Relampo-managed repository.',
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
                  disabled={disabled || !planCurrent || !reviewed}
                  onClick={() => void start(true)}
                >
                  {text('Preparar sin ejecutar', 'Prepare without running')}
                </button>
                <button
                  className={`${buttonClass} !border-yellow-400 !bg-yellow-400 !text-black`}
                  disabled={disabled || !planCurrent || !reviewed}
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
