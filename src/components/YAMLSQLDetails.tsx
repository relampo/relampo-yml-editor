import { useEffect, useMemo, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as jsyaml from 'js-yaml';
import type { YAMLNode } from '../types/yaml';
import { EditableList } from './EditableList';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface YAMLSQLDetailsProps {
  node: YAMLNode;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

const DIALECT_OPTIONS = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
];

const KIND_OPTIONS = [
  { value: 'query', label: 'Read Query' },
  { value: 'exec', label: 'Exec Statement' },
];

const ON_ERROR_OPTIONS = [
  { value: 'stop', label: 'Stop' },
  { value: 'continue', label: 'Continue' },
  { value: 'fail_iteration', label: 'Fail Iteration' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
];

function stringifyParams(params: any): string {
  if (params === undefined || params === null) {
    return '';
  }
  if (typeof params === 'string') {
    return params;
  }
  try {
    return jsyaml.dump(params, { indent: 2, lineWidth: -1, noRefs: true }).trim();
  } catch {
    return String(params);
  }
}

interface SQLSelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  helper?: string;
  triggerClassName?: string;
}

function SQLSelectField({ label, value, options, onValueChange, helper, triggerClassName }: SQLSelectFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Select
        value={value}
        onValueChange={onValueChange}
      >
        <SelectTrigger className={`w-full border-white/10 bg-white/5 font-mono text-zinc-200 ${triggerClassName || ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#161616] text-zinc-200">
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="font-mono"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
    </div>
  );
}

export function YAMLSQLDetails({ node, onNodeUpdate }: YAMLSQLDetailsProps) {
  const data = useMemo(() => node.data || {}, [node.data]);
  const connection = data.connection || {};
  const options = connection.options || {};
  const extract = data.extract || {};
  const kind = data.kind || 'query';
  const allowWrites = data.allow_writes === true || data.allow_write === true;
  const validateConnectivity = connection.validate_connectivity === true;
  const [paramsText, setParamsText] = useState('');
  const [paramsError, setParamsError] = useState('');

  useEffect(() => {
    setParamsText(stringifyParams(data.params));
    setParamsError('');
  }, [data.params, node.id]);

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  const handleConnectionChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, {
      ...data,
      connection: {
        ...connection,
        [field]: value,
      },
    });
  };

  const handleOptionsUpdate = (updatedOptions: Record<string, string>) => {
    onNodeUpdate?.(node.id, {
      ...data,
      connection: {
        ...connection,
        options: updatedOptions,
      },
    });
  };

  const handleExtractUpdate = (updatedExtract: Record<string, string>) => {
    onNodeUpdate?.(node.id, {
      ...data,
      extract: updatedExtract,
    });
  };

  const handleBooleanChange = (field: string, value: string) => {
    handleChange(field, value === 'true');
  };

  const handleConnectionNumberChange = (field: string, value: string) => {
    if (value.trim() === '') {
      const nextConnection = { ...connection };
      delete nextConnection[field];
      onNodeUpdate?.(node.id, { ...data, connection: nextConnection });
      return;
    }

    const parsed = Number(value);
    handleConnectionChange(field, Number.isFinite(parsed) ? parsed : value);
  };

  const handleParamsBlur = () => {
    const trimmed = paramsText.trim();
    if (trimmed === '') {
      const nextData = { ...data };
      delete nextData.params;
      onNodeUpdate?.(node.id, nextData);
      setParamsError('');
      return;
    }

    try {
      const parsed = jsyaml.load(trimmed);
      onNodeUpdate?.(node.id, { ...data, params: parsed });
      setParamsError('');
    } catch (error) {
      setParamsError(error instanceof Error ? error.message : 'Invalid YAML');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SQLSelectField
          label="Database"
          value={data.dialect || 'postgres'}
          options={DIALECT_OPTIONS}
          onValueChange={value => handleChange('dialect', value)}
          helper="Choose the SQL engine used by this request."
        />

        <SQLSelectField
          label="Request Mode"
          value={kind}
          options={KIND_OPTIONS}
          onValueChange={value => handleChange('kind', value)}
          helper="Use `query` for reads and `exec` for writes or DDL statements."
        />

        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Driver Override
          </label>
          <Input
            value={data.driver || ''}
            onChange={event => handleChange('driver', event.target.value)}
            placeholder="Optional driver name"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Query</label>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#161616] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SQL Editor</span>
            <span className="text-[11px] font-mono text-zinc-500">{(data.query || '').split('\n').length} lines</span>
          </div>
          <MonacoEditor
            height="220px"
            defaultLanguage="sql"
            value={data.query || ''}
            onChange={value => handleChange('query', value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 12 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Keep variables in `params` instead of concatenating them into the query string.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Timeout</label>
          <Input
            value={data.timeout || ''}
            onChange={event => handleChange('timeout', event.target.value)}
            placeholder="30s"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>

        <SQLSelectField
          label="On Error"
          value={data.on_error || data.error_policy?.on_error || 'stop'}
          options={ON_ERROR_OPTIONS}
          onValueChange={value => handleChange('on_error', value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SQLSelectField
          label="Validate Connectivity"
          value={validateConnectivity ? 'true' : 'false'}
          options={BOOLEAN_OPTIONS}
          onValueChange={value => handleConnectionChange('validate_connectivity', value === 'true')}
        />

        <SQLSelectField
          label="Allow Writes"
          value={allowWrites ? 'true' : 'false'}
          options={BOOLEAN_OPTIONS}
          onValueChange={value => handleBooleanChange('allow_writes', value)}
          triggerClassName={
            allowWrites
              ? 'border-red-400/30 bg-red-400/10 text-red-200'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
          }
        />
      </div>

      <div
        className={`p-3 rounded border text-xs ${
          allowWrites
            ? 'bg-red-400/8 border-red-400/20 text-red-200'
            : 'bg-emerald-400/8 border-emerald-400/20 text-emerald-200'
        }`}
      >
        {allowWrites
          ? 'Write execution is enabled for this request. Keep credentials and query text tightly scoped.'
          : kind === 'exec'
            ? 'Exec requests remain blocked for writes unless `allow_writes` is enabled.'
            : 'This request is configured for safe read-only execution by default.'}
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Connection</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Host</label>
            <Input
              value={connection.host || ''}
              onChange={event => handleConnectionChange('host', event.target.value)}
              placeholder="{{db_host}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Port</label>
            <Input
              value={connection.port ?? ''}
              onChange={event => handleConnectionChange('port', event.target.value)}
              placeholder={data.dialect === 'mysql' ? '3306' : '5432'}
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Database</label>
            <Input
              value={connection.database || ''}
              onChange={event => handleConnectionChange('database', event.target.value)}
              placeholder="app"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">User</label>
            <Input
              value={connection.user || ''}
              onChange={event => handleConnectionChange('user', event.target.value)}
              placeholder="{{db_user}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Password</label>
            <Input
              type="password"
              value={connection.password || ''}
              onChange={event => handleConnectionChange('password', event.target.value)}
              placeholder="{{db_password}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              DSN Override
            </label>
            <Input
              value={connection.dsn || ''}
              onChange={event => handleConnectionChange('dsn', event.target.value)}
              placeholder="Optional DSN/connection string"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">SSL Mode</label>
            <Input
              value={connection.ssl_mode || ''}
              onChange={event => handleConnectionChange('ssl_mode', event.target.value)}
              placeholder="disable, require, verify-full"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Charset</label>
            <Input
              value={connection.charset || ''}
              onChange={event => handleConnectionChange('charset', event.target.value)}
              placeholder="utf8mb4"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      </div>

      <EditableList
        title="Connection Options"
        items={options}
        onUpdate={handleOptionsUpdate}
        keyPlaceholder="option_name"
        valuePlaceholder="value"
        keyLabel="Option"
        valueLabel="Value"
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
      />

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Bound Parameters</p>
        <Textarea
          value={paramsText}
          onChange={event => {
            setParamsText(event.target.value);
            if (paramsError) {
              setParamsError('');
            }
          }}
          onBlur={handleParamsBlur}
          placeholder={'- "{{user_id}}"\n- 100'}
          className="w-full min-h-[120px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use YAML for positional arrays or named maps. Scenario variables such as <code>{'{{user_id}}'}</code> are
          supported.
        </p>
        {paramsError && (
          <div className="mt-2 p-3 bg-red-400/8 border border-red-400/20 rounded text-xs text-red-300">
            Invalid params YAML: {paramsError}
          </div>
        )}
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <EditableList
          title="Result Mapping"
          items={extract}
          onUpdate={handleExtractUpdate}
          keyPlaceholder="variable_name"
          valuePlaceholder="jsonpath('$[0].id')"
          keyLabel="Variable"
          valueLabel="Extractor"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Save SQL results into variables. For a single value use `jsonpath('$[0].id')`; for the full result set use
          `jsonpath('$')`.
        </p>
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Pooling</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Open Conns
            </label>
            <Input
              type="number"
              value={connection.max_open_conns ?? ''}
              onChange={event => handleConnectionNumberChange('max_open_conns', event.target.value)}
              placeholder="5"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Idle Conns
            </label>
            <Input
              type="number"
              value={connection.max_idle_conns ?? ''}
              onChange={event => handleConnectionNumberChange('max_idle_conns', event.target.value)}
              placeholder="2"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Conn Max Lifetime
            </label>
            <Input
              value={connection.conn_max_lifetime || ''}
              onChange={event => handleConnectionChange('conn_max_lifetime', event.target.value)}
              placeholder="5m"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Conn Max Idle Time
            </label>
            <Input
              value={connection.conn_max_idle_time || ''}
              onChange={event => handleConnectionChange('conn_max_idle_time', event.target.value)}
              placeholder="1m"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
