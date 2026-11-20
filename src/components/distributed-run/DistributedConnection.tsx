import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { distributedRequest, safeProviderURL } from '../../utils/distributedApi';

export interface ProviderConnection {
  git_installed: boolean;
  cli_installed: boolean;
  authenticated: boolean;
  user?: string;
  max_nodes: number;
  code?: string;
  verification_url?: string;
}
interface Repository {
  name: string;
  url: string;
  writable: boolean;
}
interface Namespace {
  id: string;
  name: string;
}
interface Catalog {
  repositories: Repository[];
  namespaces: Namespace[];
  has_more: boolean;
}
interface Response {
  events: { type: string; connection?: ProviderConnection; data?: Catalog | Repository }[];
}
const field =
  'h-9 w-full min-w-0 rounded-lg border border-white/10 bg-[#171717] px-2 text-sm text-zinc-100 disabled:opacity-50';
const button = 'rounded-lg border border-white/15 px-2 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40';

export function DistributedConnection({
  provider,
  host,
  enabled,
  disabled,
  repository,
  onRepository,
  onStatus,
  es,
  children,
}: {
  provider: 'github' | 'gitlab';
  host: string;
  enabled: boolean;
  disabled: boolean;
  repository: string;
  onRepository: (value: string) => void;
  onStatus: (key: string, status: ProviderConnection | null) => void;
  es: boolean;
  children?: (panels: { connection: ReactNode; repository: ReactNode }) => ReactNode;
}) {
  const t = (a: string, b: string) => (es ? a : b);
  const key = `${provider}:${host}`;
  const [status, setStatus] = useState<ProviderConnection | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [login, setLogin] = useState('');
  const generation = useRef(0);
  const loginRef = useRef('');
  const callbacks = useRef({ onRepository, onStatus });
  callbacks.current = { onRepository, onStatus };
  const account = { provider, ...(provider === 'gitlab' ? { host } : {}) };

  function storageKey(user: string) {
    return `relampo.studio.distributed.repository:${provider}:${provider === 'github' ? 'github.com' : host.trim().toLowerCase()}:${user}`;
  }
  function selectRepository(name: string, user = status?.user) {
    callbacks.current.onRepository(name);
    if (!user) return;
    try {
      window.localStorage.setItem(storageKey(user), name);
    } catch {
      /* Storage is optional. */
    }
  }
  function restoreRepository(next: Catalog, user: string) {
    let saved = '';
    try {
      saved = window.localStorage.getItem(storageKey(user)) ?? '';
    } catch {
      /* Storage is optional. */
    }
    const previous = next.repositories.find(repo => repo.name === saved && repo.writable);
    selectRepository(previous?.name ?? next.repositories.find(repo => repo.writable)?.name ?? '', user);
  }

  function publish(next: ProviderConnection | null) {
    setStatus(next);
    callbacks.current.onStatus(key, next);
  }
  async function loadCatalog(signal?: AbortSignal) {
    const current = generation.current;
    let page = 1;
    let result: Catalog | null = null;
    while (true) {
      const response = await distributedRequest<Response>('repositories', { ...account, page }, signal);
      if (signal?.aborted || current !== generation.current) throw new DOMException('Cancelled', 'AbortError');
      const next = response.events.find(e => e.type === 'repositories')?.data as Catalog | undefined;
      if (!next) throw new Error(t('No se pudieron cargar los repositorios.', 'Could not load repositories.'));
      if (!result) result = { ...next, repositories: [] };
      const unique = new Map([...result.repositories, ...next.repositories].map(repo => [repo.name, repo]));
      result.repositories = [...unique.values()];
      result.has_more = next.has_more;
      if (!next.has_more) return result;
      page++;
    }
  }

  async function check(signal?: AbortSignal) {
    const current = generation.current;
    setBusy(true);
    setError('');
    publish(null);
    setCatalog(null);
    callbacks.current.onRepository('');
    try {
      const response = await distributedRequest<Response>('requirements', account, signal);
      const next = response.events.find(e => e.type === 'connection')?.connection;
      if (!next) throw new Error(t('Comprobación incompleta.', 'Incomplete connection check.'));
      if (current !== generation.current || signal?.aborted) return;
      publish(next);
      if (next.authenticated) {
        const repos = await loadCatalog(signal);
        if (current !== generation.current || signal?.aborted) return;
        setCatalog(repos);
        setNamespace(repos.namespaces[0]?.id ?? '');
        restoreRepository(repos, next.user ?? '');
      }
    } catch (e) {
      if (current === generation.current && !signal?.aborted)
        setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      if (current === generation.current && !signal?.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    generation.current++;
    setStatus(null);
    setCatalog(null);
    setError('');
    setCreating(false);
    setLogin('');
    callbacks.current.onRepository('');
    callbacks.current.onStatus(key, null);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (enabled) void check(controller.signal);
    }, 350);
    return () => {
      generation.current++;
      controller.abort();
      clearTimeout(timer);
      const id = loginRef.current;
      loginRef.current = '';
      if (id) void distributedRequest(`run/${encodeURIComponent(id)}/stop`, {}).catch(() => {});
    };
    // Account changes invalidate all provider data; callback identity does not.
  }, [key, enabled]);

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await distributedRequest<{ status: string; error?: string; connection?: ProviderConnection }>(
          `run/${encodeURIComponent(login)}`,
          undefined,
          controller.signal,
        );
        if (cancelled) return;
        if (next.connection) publish(next.connection);
        if (next.status === 'running' || next.status === 'stopping') {
          timer = setTimeout(() => void poll(), 1000);
          return;
        }
        loginRef.current = '';
        setLogin('');
        setBusy(false);
        if (next.status === 'completed') await check();
        else setError(next.error || t('Conexión cancelada o caducada.', 'Connection cancelled or expired.'));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Connection failed');
          timer = setTimeout(() => void poll(), 2000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [login]);

  async function action(fn: () => Promise<void>) {
    const current = generation.current;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      if (current === generation.current) setError(e instanceof Error ? e.message : 'Provider operation failed');
    } finally {
      if (current === generation.current && !loginRef.current) setBusy(false);
    }
  }
  const locked = disabled || busy || !enabled;
  const providerName = provider === 'github' ? 'GitHub' : 'GitLab';
  const cli = provider === 'github' ? 'gh' : 'glab';
  const verification = safeProviderURL(status?.verification_url);
  const connectionPanel = (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span className="shrink-0 text-zinc-400">
          {status
            ? `Git ${status.git_installed ? '✓' : '✕'} · ${cli} ${status.cli_installed ? '✓' : '✕'}`
            : t('Herramientas y sesión', 'Tools and session')}
        </span>
        {status?.authenticated && (
          <span
            className="min-w-0 truncate text-emerald-400"
            title={status.user}
          >
            {t('Conectado', 'Connected')} · {status.user}
          </span>
        )}
        <button
          className={`${button} ml-auto shrink-0`}
          disabled={locked}
          onClick={() => void check()}
        >
          {busy ? t('Comprobando…', 'Checking…') : t('Comprobar', 'Check')}
        </button>
      </div>
      {status && (!status.git_installed || !status.cli_installed) && (
        <p className="text-xs text-zinc-400">
          {t('Instala', 'Install')}{' '}
          {!status.git_installed && (
            <a
              className="underline"
              href="https://git-scm.com/downloads"
              target="_blank"
              rel="noreferrer"
            >
              Git
            </a>
          )}
          {!status.git_installed && !status.cli_installed && ' + '}
          {!status.cli_installed && (
            <a
              className="underline"
              href={provider === 'github' ? 'https://cli.github.com/' : 'https://docs.gitlab.com/cli/'}
              target="_blank"
              rel="noreferrer"
            >
              {cli}
            </a>
          )}
          . {t('Después vuelve a comprobar.', 'Then check again.')}
        </p>
      )}
      {!status?.authenticated && status?.git_installed && status.cli_installed && !login && (
        <button
          className={button}
          disabled={locked}
          onClick={() =>
            void action(async () => {
              const current = generation.current;
              const result = await distributedRequest<{ id: string }>('connect', account);
              if (current !== generation.current) {
                void distributedRequest(`run/${encodeURIComponent(result.id)}/stop`, {}).catch(() => {});
                return;
              }
              loginRef.current = result.id;
              setLogin(result.id);
            })
          }
        >
          {t('Conectar con', 'Connect to')} {providerName}
        </button>
      )}
      {login && (
        <div className="space-y-2 rounded border border-white/10 p-2 text-xs">
          <p>{t('Autoriza esta cuenta en el navegador.', 'Authorize this account in your browser.')}</p>
          {status?.code && (
            <p>
              {t('Código', 'Code')}: <strong className="select-all font-mono text-yellow-400">{status.code}</strong>
            </p>
          )}
          {verification && (
            <a
              href={verification}
              target="_blank"
              rel="noreferrer"
              className="text-yellow-400 underline"
            >
              {t('Abrir autorización', 'Open authorization')}
            </a>
          )}
          <button
            className={`${button} ml-2`}
            onClick={() =>
              void distributedRequest(`run/${encodeURIComponent(login)}/stop`, {}).catch(e => setError(String(e)))
            }
          >
            {t('Cancelar', 'Cancel')}
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
  const repositoryURL = safeProviderURL(catalog?.repositories.find(repo => repo.name === repository)?.url);
  const repositoryPanel = (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <select
          aria-label={t('Repositorio', 'Repository')}
          className={field}
          disabled={locked || !status?.authenticated || !catalog}
          value={repository}
          onChange={e => selectRepository(e.target.value)}
        >
          <option value="">{t('Seleccionar repositorio', 'Select repository')}</option>
          {catalog?.repositories.map(repo => (
            <option
              key={repo.name}
              value={repo.name}
              disabled={!repo.writable}
            >
              {repo.name}
              {!repo.writable ? t(' (solo lectura)', ' (read only)') : ''}
            </option>
          ))}
        </select>
        <button
          className={`${button} h-9 whitespace-nowrap`}
          disabled={locked || !catalog?.namespaces.length}
          onClick={() => setCreating(value => !value)}
        >
          {t('Crear repositorio', 'Create repository')}
        </button>
      </div>
      {repositoryURL && (
        <a
          href={repositoryURL}
          target="_blank"
          rel="noreferrer"
          title={repositoryURL}
          className="inline-flex max-w-full items-center gap-1.5 text-xs text-yellow-400 hover:underline"
        >
          <ExternalLink
            size={12}
            className="shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{repositoryURL}</span>
        </a>
      )}
      {catalog?.repositories.length === 0 && (
        <p className="text-xs text-zinc-500">{t('No hay repositorios disponibles.', 'No repositories available.')}</p>
      )}
      {creating && (
        <div className="space-y-2 rounded border border-white/10 p-2">
          <select
            aria-label={t('Propietario', 'Owner')}
            className={field}
            value={namespace}
            onChange={e => setNamespace(e.target.value)}
            disabled={locked}
          >
            {catalog?.namespaces.map(ns => (
              <option
                key={ns.id}
                value={ns.id}
              >
                {ns.name}
              </option>
            ))}
          </select>
          <div className="flex min-w-0 items-center">
            <span className="inline-flex h-9 shrink-0 items-center rounded-l-lg border border-r-0 border-white/10 bg-[#171717] pl-2 font-mono text-xs text-zinc-400">
              relampo_
            </span>
            <input
              aria-label={t('Nombre del repositorio', 'Repository name')}
              placeholder={t('nombre', 'name')}
              className={`${field} rounded-l-none !border-l-0 !pl-0`}
              value={name}
              maxLength={93}
              onChange={e => setName(e.target.value.replace(/^relampo[_-]/i, ''))}
              disabled={locked}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span>{t('Privado · incluye README', 'Private · includes README')}</span>
            <button
              className={button}
              disabled={locked || !namespace || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name)}
              onClick={() =>
                void action(async () => {
                  const current = generation.current;
                  const result = await distributedRequest<Response>('create_repository', {
                    ...account,
                    name,
                    namespace,
                  });
                  if (current !== generation.current) return;
                  const repo = result.events.find(e => e.type === 'repository_created')?.data as Repository | undefined;
                  if (!repo?.name)
                    throw new Error(t('No se recibió el repositorio creado.', 'Created repository was not returned.'));
                  setCatalog(prev =>
                    prev
                      ? { ...prev, repositories: [repo, ...prev.repositories.filter(r => r.name !== repo.name)] }
                      : prev,
                  );
                  selectRepository(repo.name);
                  setCreating(false);
                  setName('');
                })
              }
            >
              {t('Crear y seleccionar', 'Create and select')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  return children ? (
    children({ connection: connectionPanel, repository: repositoryPanel })
  ) : (
    <div className="space-y-3">
      {connectionPanel}
      {repositoryPanel}
    </div>
  );
}
