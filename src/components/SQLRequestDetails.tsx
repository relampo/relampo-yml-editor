import { useState } from 'react';
import { dump, load } from 'js-yaml';
import { useLanguage } from '../contexts/LanguageContext';
import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { effectiveSQLConnection, sqlConnectionNames, sqlDefaults } from '../utils/sqlConnections';
import { YAMLSQLDetails, SQLQueryEditor } from './YAMLSQLDetails';
const control = 'h-9 w-full rounded border border-white/10 bg-[#171717] px-3 text-sm text-zinc-200';
export function SQLRequestDetails({
  node,
  tree,
  onNodeUpdate,
}: {
  node: YAMLNode;
  tree?: YAMLNode | null;
  onNodeUpdate?: (id: string, data: YAMLNodeData) => void;
}) {
  const { t } = useLanguage();
  const text = (key: string) => t(`yamlEditor.sqlDefaults.${key}`);
  const data = node.data ?? {},
    names = sqlConnectionNames(tree),
    reference = effectiveSQLConnection(tree, data.connection_ref);
  const legacy = !data.connection_ref && !!data.connection && Object.keys(data.connection).length > 0;
  const [params, setParams] = useState(dump(data.params ?? [], { noRefs: true }).trim());
  const [error, setError] = useState('');
  const update = (patch: Partial<YAMLNodeData>) => onNodeUpdate?.(node.id, { ...data, ...patch });
  const choose = (value: string) => {
    if (value === '__inline') return;
    const next = { ...data, connection_ref: value };
    delete next.connection;
    delete next.dialect;
    delete next.driver;
    delete next.validate_connectivity;
    onNodeUpdate?.(node.id, next);
  };
  const selected = legacy ? '__inline' : reference;
  return (
    <section
      className="space-y-5"
      aria-label={text('request')}
    >
      <label className="block space-y-1 text-xs text-zinc-400">
        <span>{text('connections')}</span>
        <select
          className={control}
          aria-label={text('connections')}
          value={selected}
          onChange={e => choose(e.target.value)}
        >
          {legacy && <option value="__inline">{text('inline')}</option>}
          {!legacy && !reference && <option value="">{text('select')}</option>}
          {reference && !names.includes(reference) && (
            <option value={reference}>
              {reference} · {text('missing')}
            </option>
          )}
          {names.map(name => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      {legacy ? (
        <YAMLSQLDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      ) : (
        <>
          {!names.length && (
            <p className="rounded border border-amber-400/20 p-3 text-xs text-amber-200">{text('createFirst')}</p>
          )}
          {reference && names.includes(reference) && (
            <p className="text-xs text-zinc-500">
              {String(sqlDefaults(tree).connections?.[reference]?.dialect ?? '')} ·{' '}
              {String(sqlDefaults(tree).connections?.[reference]?.connection?.database ?? '')}
            </p>
          )}
          <SQLQueryEditor
            query={data.query ?? ''}
            onChange={query => update({ query })}
            helper={text('queryHelp')}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs text-zinc-400">
              <span>{text('mode')}</span>
              <select
                className={control}
                aria-label={text('mode')}
                value={data.kind ?? 'query'}
                onChange={e => update({ kind: e.target.value })}
              >
                <option value="query">Query</option>
                <option value="exec">Exec</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              <span>{text('timeoutOverride')}</span>
              <input
                className={control}
                aria-label={text('timeoutOverride')}
                placeholder={text('inherit')}
                value={data.timeout ?? ''}
                onChange={e => update({ timeout: e.target.value || undefined })}
              />
            </label>
          </div>
          <label className="block space-y-2 text-xs text-zinc-400">
            <span>{text('params')}</span>
            <textarea
              className="min-h-24 w-full rounded border border-white/10 bg-white/5 p-3 font-mono text-sm text-zinc-200"
              aria-label={text('params')}
              value={params}
              onChange={e => {
                setParams(e.target.value);
                setError('');
              }}
              onBlur={() => {
                try {
                  const parsed = params.trim() ? load(params) : [];
                  if (!Array.isArray(parsed)) throw Error();
                  update({ params: parsed });
                  setError('');
                } catch {
                  setError(text('invalidParams'));
                }
              }}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="text-xs text-red-300"
            >
              {error}
            </p>
          )}
          <label className="block space-y-1 text-xs text-zinc-400">
            <span>{text('onError')}</span>
            <select
              className={control}
              aria-label={text('onError')}
              value={data.on_error ?? data.error_policy?.on_error ?? 'continue'}
              onChange={e => update({ on_error: e.target.value })}
            >
              <option value="continue">{text('continue')}</option>
              <option value="stop">{text('stop')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={data.allow_writes === true}
              onChange={e => update({ allow_writes: e.target.checked })}
            />
            {text('allowWrites')}
          </label>
        </>
      )}
    </section>
  );
}
