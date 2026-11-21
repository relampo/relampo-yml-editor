import { useEffect, useRef, useState } from 'react';
import { Database, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';
import { testSQLConnection, effectiveSQLConnection } from '../utils/sqlConnections';

const inputClass = 'h-9 w-full rounded border border-white/10 bg-[#171717] px-3 text-sm text-zinc-200';
const buttonClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded border border-white/15 px-3 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-40';
export function SQLDefaultsDetails({
  node,
  tree,
  onNodeUpdate,
  canTest,
}: {
  node: YAMLNode;
  tree?: YAMLNode | null;
  onNodeUpdate?: (id: string, data: YAMLNodeData) => void;
  canTest: boolean;
}) {
  const { t } = useLanguage();
  const text = (key: string) => t(`yamlEditor.sqlDefaults.${key}`);
  const data = node.data ?? {},
    connections = data.connections ?? {},
    names = Object.keys(connections);
  const [selection, setSelection] = useState(names[0] ?? '');
  const selected = names.includes(selection) ? selection : (names[0] ?? '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const stamp = JSON.stringify(data);
  useEffect(() => {
    generation.current++;
    controller.current?.abort();
    setBusy(false);
    setResult('');
  }, [stamp, selected]);
  useEffect(() => () => controller.current?.abort(), []);
  const cfg = connections[selected] ?? {},
    conn = cfg.connection ?? {};
  const update = (next: YAMLNodeData) => onNodeUpdate?.(node.id, next);
  const updateConfig = (patch: Partial<YAMLNodeData>) =>
    update({ ...data, connections: { ...connections, [selected]: { ...cfg, ...patch } } });
  const field = (label: string, key: string, scope: 'connection' | 'config' = 'connection', type = 'text') => (
    <label
      className="space-y-1 text-xs text-zinc-400"
      key={key}
    >
      <span>{label}</span>
      <input
        className={inputClass}
        type={type}
        aria-label={label}
        value={String((scope === 'connection' ? conn : cfg)[key as keyof YAMLNodeData] ?? '')}
        onChange={event => {
          const value =
            type === 'number'
              ? event.target.value === ''
                ? undefined
                : Number(event.target.value)
              : event.target.value;
          if (scope === 'connection') updateConfig({ connection: { ...conn, [key]: value } });
          else updateConfig({ [key]: value });
        }}
      />
    </label>
  );
  let references = 0;
  const count = (current: YAMLNode) => {
    if (
      current.type === 'sql' &&
      !Object.keys(current.data?.connection ?? {}).length &&
      effectiveSQLConnection(tree, current.data?.connection_ref) === selected
    )
      references++;
    current.children?.forEach(count);
  };
  if (tree) count(tree);
  async function probe() {
    if (!tree || !selected || busy) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const current = ++generation.current;
    setBusy(true);
    setResult('');
    try {
      const response = await testSQLConnection(tree, selected, request.signal);
      if (current !== generation.current) return;
      setResult(
        response.ok
          ? `${text('connected')} · ${response.duration_ms?.toFixed(1) ?? '—'} ms`
          : text(`error_${response.code ?? 'connection'}`),
      );
    } catch {
      if (current === generation.current && !request.signal.aborted) setResult(text('error_connection'));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <section
      className="space-y-5"
      aria-label={text('title')}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
        <Database size={17} />
        {text('title')}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          className={`${inputClass} flex-1 min-w-40`}
          aria-label={text('connections')}
          value={selected}
          onChange={e => setSelection(e.target.value)}
        >
          {!names.length && <option value="">{text('empty')}</option>}
          {names.map(value => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          className={`${inputClass} flex-1 min-w-40`}
          aria-label={text('connectionName')}
          placeholder={text('connectionName')}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button
          className={buttonClass}
          disabled={!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name) || names.includes(name) || !onNodeUpdate}
          onClick={() => {
            update({
              ...data,
              default_connection: data.default_connection ?? (names.length === 0 ? name : undefined),
              connections: {
                ...connections,
                [name]: {
                  dialect: 'postgres',
                  connection: { host: '', port: 5432, database: '', user: '', password: '' },
                  timeout: '5s',
                },
              },
            });
            setSelection(name);
            setName('');
          }}
        >
          <Plus size={14} />
          {text('add')}
        </button>
      </div>
      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={data.default_connection === selected}
                onChange={e => update({ ...data, default_connection: e.target.checked ? selected : undefined })}
              />
              {text('default')}
            </label>
            <button
              className={`${buttonClass} ml-auto`}
              disabled={references > 0}
              title={references ? text('inUse') : undefined}
              onClick={() => {
                const next = { ...connections };
                delete next[selected];
                update({
                  ...data,
                  connections: next,
                  default_connection: data.default_connection === selected ? undefined : data.default_connection,
                });
              }}
            >
              <Trash2 size={14} />
              {text('remove')}
            </button>
          </div>
          <label className="block space-y-1 text-xs text-zinc-400">
            <span>{text('engine')}</span>
            <select
              className={inputClass}
              aria-label={text('engine')}
              value={cfg.dialect ?? 'postgres'}
              onChange={e =>
                updateConfig({
                  dialect: e.target.value,
                  connection: { ...conn, port: e.target.value === 'mysql' ? 3306 : 5432 },
                })
              }
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field(text('host'), 'host')}
            {field(text('port'), 'port', 'connection', 'number')}
            {field(text('database'), 'database')}
            {field(text('user'), 'user')}
            {field(text('password'), 'password', 'connection', 'password')}
            {field(text('ssl'), 'ssl_mode')}
          </div>
          <details className="rounded border border-white/10 p-3">
            <summary className="cursor-pointer text-xs text-zinc-400">{text('advanced')}</summary>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {field(text('timeout'), 'timeout', 'config')}
              {field(text('maxOpen'), 'max_open_conns', 'connection', 'number')}
              {field(text('maxIdle'), 'max_idle_conns', 'connection', 'number')}
              {field(text('lifetime'), 'conn_max_lifetime')}
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={buttonClass}
              disabled={!canTest || !tree || busy}
              onClick={() => void probe()}
            >
              {busy && (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                />
              )}
              {text('test')}
            </button>
            {result && (
              <p
                role="status"
                className="text-xs text-zinc-300"
              >
                {result}
              </p>
            )}
            {!canTest && <p className="text-xs text-zinc-500">{text('requiresBackend')}</p>}
          </div>
        </>
      )}
    </section>
  );
}
