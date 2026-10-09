import { useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  authoredComponentData,
  configurationRecord,
  effectiveComponentValues,
  HTTP_COMPONENT_FIELDS,
  nodeDefaults,
  SQL_COMPONENT_FIELDS,
  STABLE_CONTAINERS,
  type ComponentCapabilities,
  type ComponentFeature,
  type EffectiveComponentValue,
} from '../../utils/componentConfiguration';

interface Props {
  tree: YAMLNode;
  node: YAMLNode;
  capabilities?: ComponentCapabilities;
  onNodeUpdate?: (id: string, data: Record<string, unknown>) => void;
}
const HTTP_TYPES = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const inputClass =
  'w-full rounded border border-white/15 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 disabled:opacity-50';
function featureFor(field: string, protocol: string): ComponentFeature {
  if (field === 'data_source') return 'scoped_data_source';
  if (field === 'think_time') return 'think_time';
  if (field === 'error_policy') return 'error_policy';
  if (field === 'assertions') return protocol === 'sql' ? 'sql_assertions' : 'http_assertions';
  if (field === 'cookies' || field === 'cache') return 'http_state_usage';
  return 'http_defaults';
}
function disabledValue(field: string): unknown {
  if (field === 'auth') return { type: 'none' };
  if (field === 'assertions') return [];
  if (['think_time', 'data_source'].includes(field)) return { enabled: false };
  if (['cookies', 'cache', 'follow_redirects', 'redirect_automatically', 'retrieve_embedded_resources'].includes(field))
    return false;
  return undefined;
}
function initialValue(field: string, protocol: string): unknown {
  if (field === 'headers') return {};
  if (field === 'auth') return { type: 'bearer', token: '' };
  if (field === 'error_policy') return { on_error: 'continue' };
  if (field === 'assertions')
    return protocol === 'sql' ? [{ type: 'duration', max_ms: 1000 }] : [{ type: 'status', value: 200 }];
  if (field === 'data_source') return { type: 'csv', file: 'data.csv', mode: 'per_vu', bind: { column: 'value' } };
  if (field === 'think_time') return { duration: '1s' };
  if (field === 'timeout') return '30s';
  return true;
}
function valueMode(field: string, value: unknown): string {
  if (value === undefined) return 'inherit';
  if (
    (field === 'auth' && configurationRecord(value) && value.type === 'none') ||
    (['think_time', 'data_source'].includes(field) && configurationRecord(value) && value.enabled === false)
  )
    return 'disable';
  const disabled = disabledValue(field);
  if (disabled !== undefined && JSON.stringify(value) === JSON.stringify(disabled)) return 'disable';
  return 'local';
}
function ConfigurationField({
  field,
  protocol,
  value,
  effective,
  available,
  onChange,
  spanish,
}: {
  field: string;
  protocol: string;
  value: unknown;
  effective?: EffectiveComponentValue;
  available: boolean;
  onChange: (value: unknown) => void;
  spanish: boolean;
}) {
  const [buffer, setBuffer] = useState(JSON.stringify(value, null, 2) || '');
  const [tracked, setTracked] = useState(value);
  const [error, setError] = useState('');
  if (JSON.stringify(tracked) !== JSON.stringify(value)) {
    setTracked(value);
    setBuffer(JSON.stringify(value, null, 2) || '');
    setError('');
  }
  const mode = valueMode(field, value);
  const label = protocol ? `${protocol}.${field}` : field;
  return (
    <div className="space-y-2 rounded border border-white/10 p-3">
      <label
        className="block text-xs font-semibold text-zinc-300"
        htmlFor={`component-${label}`}
      >
        {label}
      </label>
      <select
        id={`component-${label}`}
        aria-label={`${label} mode`}
        className={inputClass}
        value={mode}
        disabled={!available}
        onChange={event =>
          onChange(
            event.target.value === 'inherit'
              ? undefined
              : event.target.value === 'disable'
                ? disabledValue(field)
                : initialValue(field, protocol),
          )
        }
      >
        <option value="inherit">{spanish ? 'Heredar' : 'Inherit'}</option>
        <option value="local">Local</option>
        {disabledValue(field) !== undefined && <option value="disable">{spanish ? 'Desactivar' : 'Disable'}</option>}
      </select>
      <p className="text-xs text-zinc-400">
        {spanish ? 'Escrito' : 'Authored'}:{' '}
        <code>{value === undefined ? (spanish ? 'ausente' : 'absent') : JSON.stringify(value)}</code>
      </p>
      {mode === 'local' &&
        (typeof value === 'boolean' ? (
          <select
            aria-label={`${label} value`}
            className={inputClass}
            value={String(value)}
            disabled={!available}
            onChange={event => onChange(event.target.value === 'true')}
          >
            <option>true</option>
            <option>false</option>
          </select>
        ) : typeof value === 'string' ? (
          <input
            aria-label={`${label} value`}
            className={inputClass}
            value={value}
            disabled={!available}
            onChange={event => onChange(event.target.value)}
          />
        ) : (
          <textarea
            aria-label={`${label} value`}
            className={`${inputClass} font-mono`}
            rows={4}
            value={buffer}
            disabled={!available}
            onChange={event => setBuffer(event.target.value)}
            onBlur={() => {
              try {
                onChange(JSON.parse(buffer));
                setError('');
              } catch {
                setError(spanish ? 'JSON inválido. Corrige el valor.' : 'Invalid JSON. Correct the value.');
              }
            }}
          />
        ))}
      {error && (
        <p
          role="alert"
          className="text-xs text-red-300"
        >
          {error}
        </p>
      )}
      <p className="text-xs text-zinc-400">
        {spanish ? 'Efectivo' : 'Effective'}:{' '}
        <code>{effective ? JSON.stringify(effective.value) : spanish ? 'sin configurar' : 'not configured'}</code>
      </p>
      {effective && (
        <p className="text-xs text-zinc-500">
          {spanish ? 'Origen' : 'Origin'}:{' '}
          {effective.origins
            ? Object.entries(effective.origins)
                .map(([key, origin]) => `${key}: ${origin}`)
                .join('; ')
            : effective.origin}
        </p>
      )}
      {!available && (
        <p className="text-xs text-amber-300">
          {spanish ? 'Esta función requiere soporte del backend.' : 'This feature requires backend support.'}
        </p>
      )}
    </div>
  );
}

export function ComponentConfigurationDetails({ tree, node, capabilities, onNodeUpdate }: Props) {
  const { language } = useLanguage();
  const spanish = language === 'es';
  const root = node.id === tree.id;
  const owner =
    node.data?.__assertionsWrapper !== true &&
    (root || node.type === 'scenario' || STABLE_CONTAINERS.has(node.type) || node.type === 'simple');
  const sampler = HTTP_TYPES.has(node.type) || node.type === 'sql';
  if (!owner && !sampler) return null;
  const adopted = tree.unknownData?.component_configuration_version === 1;
  const defaults = nodeDefaults(tree, node);
  const updateDefaults = (protocol: string, field: string, value: unknown) => {
    const next = structuredClone(defaults);
    const block = protocol ? (configurationRecord(next[protocol]) ? { ...next[protocol] } : {}) : next;
    if (value === undefined) delete block[field];
    else block[field] = value;
    if (protocol) {
      if (Object.keys(block).length) next[protocol] = block;
      else delete next[protocol];
    }
    if (root) onNodeUpdate?.(node.id, { __componentRoot: { defaults: Object.keys(next).length ? next : undefined } });
    else {
      const data = { ...node.data };
      if (Object.keys(next).length) data.defaults = next as YAMLNode['data'];
      else delete data.defaults;
      onNodeUpdate?.(node.id, data);
    }
  };
  const rows = (protocol: 'http' | 'sql' | '', fields: readonly string[]) => {
    const effective = effectiveComponentValues(tree, node, protocol || 'http');
    const authored = sampler ? authoredComponentData(node) : protocol ? defaults[protocol] : defaults;
    const block = configurationRecord(authored) ? { ...authored } : {};
    if (sampler && protocol === 'http')
      for (const [field, key] of [
        ['cookies', 'cookie_override'],
        ['cache', 'cache_override'],
      ])
        if (block[key] === 'enabled' || block[key] === 'disabled') block[field] = block[key] === 'enabled';
    return (
      <div className="grid gap-3">
        {fields.map(field => {
          const available =
            adopted &&
            capabilities?.version === 1 &&
            capabilities.features.includes('http_defaults') &&
            capabilities.features.includes(featureFor(field, protocol)) &&
            Boolean(onNodeUpdate);
          return (
            <ConfigurationField
              key={`${node.id}-${protocol}-${field}`}
              field={field}
              protocol={protocol}
              value={block[field]}
              effective={effective[field]}
              available={available}
              spanish={spanish}
              onChange={value =>
                sampler
                  ? onNodeUpdate?.(node.id, {
                      __componentFields: {
                        [field === 'cookies' ? 'cookie_override' : field === 'cache' ? 'cache_override' : field]:
                          field === 'cookies' || field === 'cache'
                            ? value === undefined
                              ? undefined
                              : value
                                ? 'enabled'
                                : 'disabled'
                            : value,
                      },
                    })
                  : updateDefaults(protocol, field, value)
              }
            />
          );
        })}
      </div>
    );
  };
  return (
    <section
      aria-label="Component configuration"
      className="mt-6 space-y-4 border-t border-white/10 pt-4"
    >
      <h3 className="text-sm font-semibold text-yellow-300">
        {spanish ? 'Configuración de componentes' : 'Component configuration'}
      </h3>
      {root && (
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            aria-label="Adopt component configuration version 1"
            checked={adopted}
            disabled={capabilities?.version !== 1 || !capabilities.features.includes('http_defaults') || !onNodeUpdate}
            onChange={event =>
              onNodeUpdate?.(node.id, {
                __componentRoot: { component_configuration_version: event.target.checked ? 1 : undefined },
              })
            }
          />
          {spanish ? 'Adoptar versión 1' : 'Adopt version 1'}
        </label>
      )}
      {root && !adopted && (
        <p className="text-xs text-amber-300">
          {spanish
            ? 'La versión 1 activa request.auth y valida sus ámbitos de configuración.'
            : 'Version 1 activates request.auth and validates component scopes.'}
        </p>
      )}
      {!adopted ? (
        <p className="text-xs text-zinc-400">
          {spanish
            ? 'El documento conserva el comportamiento anterior. Adopta la versión 1 desde el test.'
            : 'This document keeps legacy behavior. Adopt version 1 from the test.'}
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {spanish
              ? 'Mostrar valores heredados no cambia el YAML.'
              : 'Displaying inherited values does not change YAML.'}
          </p>
          {owner && rows('', ['data_source', 'think_time'])}
          {(owner || HTTP_TYPES.has(node.type)) && rows('http', HTTP_COMPONENT_FIELDS)}
          {(owner || node.type === 'sql') && rows('sql', SQL_COMPONENT_FIELDS)}
          {sampler && rows('', ['think_time'])}
        </>
      )}
    </section>
  );
}
