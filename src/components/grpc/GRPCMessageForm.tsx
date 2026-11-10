import { useId, useState, useEffect } from 'react';
import type { GRPCCatalog, GRPCField } from '../../utils/grpcApi';
import type { YAMLValue } from '../../types/yaml';
const inputClass =
  'w-full h-9.5 px-3 py-2 rounded border border-white/10 bg-white/5 text-sm text-zinc-300 font-mono normal-case tracking-normal font-normal';
function isObject(value: YAMLValue | undefined): value is Record<string, YAMLValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function primitiveDefault(field: GRPCField): YAMLValue {
  if (field.enumValues?.length) return field.enumValues[0];
  if (field.type === 'bool') return false;
  if (['string', 'bytes'].includes(field.type)) return '';
  if (field.type.includes('64')) return '0';
  return 0;
}
function Scalar({
  field,
  value,
  onChange,
  label,
}: {
  field: GRPCField;
  value: YAMLValue | undefined;
  onChange: (value: YAMLValue) => void;
  label: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value ?? ''));
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(String(value ?? ''));
    setError('');
  }, [value]);
  const change = (text: string) => {
    setDraft(text);
    setError('');
    if (text.includes('{{') || text.includes('${')) {
      onChange(text);
      return;
    }
    if (field.type === 'bool') {
      if (text === 'true' || text === 'false') onChange(text === 'true');
      else setError('Use true, false or a variable');
      return;
    }
    if (field.enumValues?.length) {
      if (field.enumValues.includes(text)) onChange(text);
      else setError('Select an enum value or use a variable');
      return;
    }
    if (field.type !== 'string' && field.type !== 'bytes') {
      if (!text.trim() || !Number.isFinite(Number(text))) {
        setError('Enter a valid number or variable');
        return;
      }
      if (!['float', 'double'].includes(field.type) && !/^[-+]?\d+$/.test(text)) {
        setError('Enter an integer');
        return;
      }
      if (field.type.includes('64')) {
        try {
          const n = BigInt(text);
          const unsigned = field.type.startsWith('u') || field.type.startsWith('fixed');
          if (n < (unsigned ? 0n : -(1n << 63n)) || n > (unsigned ? (1n << 64n) - 1n : (1n << 63n) - 1n)) {
            setError('Integer is outside the 64-bit range');
            return;
          }
        } catch {
          setError('Enter an integer');
          return;
        }
        onChange(text);
        return;
      }
      if (!['float', 'double'].includes(field.type)) {
        const value = Number(text);
        const unsigned = field.type.startsWith('u') || field.type.startsWith('fixed');
        if (value < (unsigned ? 0 : -2147483648) || value > (unsigned ? 4294967295 : 2147483647)) {
          setError('Integer is outside the 32-bit range');
          return;
        }
      }
      onChange(Number(text));
      return;
    }
    onChange(text);
  };
  const choices = field.type === 'bool' ? ['true', 'false'] : field.enumValues;
  return (
    <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
      <span>
        {label}
        {field.required ? ' *' : ''} <small className="text-zinc-500">{field.type}</small>
      </span>
      <input
        aria-label={label}
        className={inputClass}
        value={draft}
        list={choices ? id : undefined}
        onChange={event => change(event.target.value)}
        placeholder={field.type === 'bytes' ? 'Base64 or {{variable}}' : 'Value or {{variable}}'}
      />
      {choices && (
        <datalist id={id}>
          {choices.map(choice => (
            <option
              key={choice}
              value={choice}
            />
          ))}
        </datalist>
      )}
      {field.description && <span className="block text-zinc-500">{field.description}</span>}
      {error && (
        <span
          role="alert"
          className="block text-red-400"
        >
          {error}
        </span>
      )}
    </label>
  );
}
export function GRPCMessageForm({
  catalog,
  messageType,
  value,
  onChange,
  depth = 0,
  label,
}: {
  catalog: GRPCCatalog;
  messageType: string;
  value: YAMLValue | undefined;
  onChange: (value: YAMLValue) => void;
  depth?: number;
  label?: string;
}) {
  const schema = catalog.messages[messageType];
  if (!schema) return <p className="text-xs text-amber-300">Import the contract to edit {messageType}.</p>;
  if (schema.jsonKind && schema.jsonKind !== 'object') {
    if (['string', 'number', 'boolean'].includes(schema.jsonKind))
      return (
        <Scalar
          field={{
            name: label || messageType,
            type: schema.jsonKind === 'boolean' ? 'bool' : schema.jsonKind === 'number' ? 'double' : 'string',
          }}
          label={label || messageType}
          value={value}
          onChange={onChange}
        />
      );
    return (
      <FreeJSON
        label={label || messageType}
        value={value}
        onChange={onChange}
      />
    );
  }
  if (depth > 6 || messageType === 'google.protobuf.Struct' || messageType === 'google.protobuf.Any')
    return (
      <FreeJSON
        label={label || messageType}
        value={value}
        onChange={onChange}
      />
    );
  const fields = schema.fields ?? [];
  const object = isObject(value) ? value : {};
  const update = (key: string, item: YAMLValue) => onChange({ ...object, [key]: item });
  const groups = [...new Set(fields.map(field => field.oneof).filter((name): name is string => Boolean(name)))];
  return (
    <div className="space-y-3">
      {schema.description && <p className="text-xs text-zinc-400">{schema.description}</p>}
      {fields.length === 0 && <p className="text-xs text-zinc-400">This message has no fields. Nothing to fill in.</p>}
      {groups.map(group => (
        <label
          key={group}
          className="block text-xs text-zinc-400"
        >
          {group}
          <select
            aria-label={group}
            className={inputClass}
            value={fields.find(field => field.oneof === group && object[field.name] !== undefined)?.name || ''}
            onChange={event => {
              const next = { ...object };
              for (const field of fields.filter(field => field.oneof === group)) delete next[field.name];
              const chosen = fields.find(field => field.name === event.target.value);
              if (chosen) next[chosen.name] = chosen.message ? {} : primitiveDefault(chosen);
              onChange(next);
            }}
          >
            <option value="">No selection</option>
            {fields
              .filter(field => field.oneof === group)
              .map(field => (
                <option
                  key={field.name}
                  value={field.name}
                >
                  {field.name}
                </option>
              ))}
          </select>
        </label>
      ))}
      {fields
        .filter(field => !field.oneof || object[field.name] !== undefined)
        .map(field => (
          <Field
            key={field.name}
            field={field}
            catalog={catalog}
            value={object[field.name]}
            onChange={item => update(field.name, item)}
            depth={depth}
            label={label ? label + '.' + field.name : field.name}
          />
        ))}
    </div>
  );
}
function Field({
  field,
  catalog,
  value,
  onChange,
  depth,
  label,
}: {
  field: GRPCField;
  catalog: GRPCCatalog;
  value: YAMLValue | undefined;
  onChange: (value: YAMLValue) => void;
  depth: number;
  label: string;
}) {
  if (field.repeated) {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-2 rounded border border-white/10 p-3">
        <legend className="px-1 text-xs text-cyan-300">{label}</legend>
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-2"
          >
            <div className="min-w-0 flex-1">
              <Field
                field={{ ...field, repeated: false }}
                catalog={catalog}
                value={item}
                onChange={next => onChange(items.map((old, i) => (i === index ? next : old)))}
                depth={depth}
                label={`${label}[${index}]`}
              />
            </div>
            <button
              type="button"
              className="text-xs text-zinc-400"
              aria-label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-cyan-300"
          onClick={() => onChange([...items, field.message ? {} : primitiveDefault(field)])}
        >
          Add {label}
        </button>
      </fieldset>
    );
  }
  if (field.map) {
    const entries = isObject(value) ? value : {};
    return (
      <fieldset className="space-y-2 rounded border border-white/10 p-3">
        <legend className="text-xs text-cyan-300">{label} · map</legend>
        {Object.entries(entries).map(([key, item]) => (
          <div
            key={key}
            className="grid grid-cols-[1fr_2fr_auto] items-start gap-2"
          >
            <input
              aria-label={`${label} key ${key}`}
              className={inputClass}
              defaultValue={key}
              onBlur={event => {
                const next = { ...entries };
                delete next[key];
                next[event.target.value] = item;
                onChange(next);
              }}
            />
            <Field
              field={{ ...field, map: false }}
              catalog={catalog}
              value={item}
              onChange={next => onChange({ ...entries, [key]: next })}
              depth={depth + 1}
              label={`${label}.${key}`}
            />
            <button
              type="button"
              aria-label={`Remove ${label} ${key}`}
              onClick={() => {
                const next = { ...entries };
                delete next[key];
                onChange(next);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-cyan-300"
          onClick={() => {
            let index = 1;
            while (entries['key' + index] !== undefined) index++;
            onChange({ ...entries, ['key' + index]: field.message ? {} : primitiveDefault(field) });
          }}
        >
          Add {label} entry
        </button>
      </fieldset>
    );
  }
  if (field.message)
    return (
      <details
        open={depth < 1}
        className="rounded border border-white/10 p-3"
      >
        <summary className="mb-2 cursor-pointer text-xs text-cyan-300">{label}</summary>
        <GRPCMessageForm
          catalog={catalog}
          messageType={field.message}
          value={value}
          onChange={onChange}
          depth={depth + 1}
          label={label}
        />
      </details>
    );
  return (
    <Scalar
      field={field}
      value={value}
      onChange={onChange}
      label={label}
    />
  );
}
export function FreeJSON({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YAMLValue | undefined;
  onChange: (value: YAMLValue) => void;
}) {
  const serialized = JSON.stringify(value === undefined ? {} : value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(serialized);
    setError('');
  }, [serialized]);
  return (
    <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
      {label}
      <textarea
        aria-label={label}
        className={inputClass + ' min-h-32 font-mono'}
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          setError('');
        }}
        onBlur={() => {
          try {
            onChange(JSON.parse(draft));
            setError('');
          } catch {
            setError('Invalid JSON; changes have not been applied');
          }
        }}
      />
      {error && (
        <span
          role="alert"
          className="text-red-400"
        >
          {error}
        </span>
      )}
    </label>
  );
}
