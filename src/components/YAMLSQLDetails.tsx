import { Info } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import * as jsyaml from 'js-yaml';
import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { StringMap } from '../types/shared';
import type { YAMLNode } from '../types/yaml';
import { EditableList } from './EditableList';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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

const SQL_PARAMS_SYNC_UNSET = Symbol('sql-params-sync-unset');

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
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  helper?: string;
  triggerClassName?: string;
}

function SQLSelectField({ id, label, value, options, onValueChange, helper, triggerClassName }: SQLSelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Select
        value={value}
        onValueChange={onValueChange}
      >
        <SelectTrigger
          id={id}
          className={`w-full border-white/10 bg-white/5 font-mono text-zinc-200 ${triggerClassName || ''}`}
        >
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

interface SQLBasicsRowProps {
  dialect: string;
  kind: string;
  driver: string;
  databaseHelper?: string;
  requestModeHelper?: string;
  onDialectChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onDriverChange: (value: string) => void;
}

function SQLBasicsRow({
  dialect,
  kind,
  driver,
  databaseHelper,
  requestModeHelper,
  onDialectChange,
  onKindChange,
  onDriverChange,
}: SQLBasicsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SQLSelectField
        id="sql-database"
        label="Database"
        value={dialect}
        options={DIALECT_OPTIONS}
        onValueChange={onDialectChange}
        helper={databaseHelper}
      />

      <SQLSelectField
        id="sql-request-mode"
        label="Request Mode"
        value={kind}
        options={KIND_OPTIONS}
        onValueChange={onKindChange}
        helper={requestModeHelper}
      />

      <div>
        <label htmlFor="sql-driver-override" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Driver Override
        </label>
        <Input
          id="sql-driver-override"
          value={driver}
          onChange={event => onDriverChange(event.target.value)}
          placeholder="Optional driver name"
          className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>
    </div>
  );
}

interface SQLQueryEditorProps {
  query: string;
  onChange: (value: string) => void;
  helper: string;
}

function SQLQueryEditor({ query, onChange, helper }: SQLQueryEditorProps) {
  return (
    <div>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Query</div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#161616] px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SQL Editor</span>
          <span className="text-[11px] font-mono text-zinc-500">{query.split('\n').length} lines</span>
        </div>
        <MonacoEditor
          height="220px"
          defaultLanguage="sql"
          value={query}
          onChange={value => onChange(value || '')}
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
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

interface SQLWriteStatusBannerProps {
  allowWrites: boolean;
  kind: string;
}

function SQLWriteStatusBanner({ allowWrites, kind }: SQLWriteStatusBannerProps) {
  if (allowWrites) {
    return (
      <div className="p-3 rounded border text-xs bg-red-400/8 border-red-400/20 text-red-200">
        Write execution is enabled for this request. Keep credentials and query text tightly scoped.
      </div>
    );
  }
  if (kind === 'exec') {
    return (
      <div className="p-3 rounded border text-xs bg-yellow-400/8 border-yellow-400/20 text-yellow-200">
        Exec requests remain blocked for writes unless `allow_writes` is enabled.
      </div>
    );
  }
  return (
    <div className="alert-info rounded-md p-3 text-xs flex items-start gap-2">
      <Info className="alert-info-icon w-4 h-4 mt-0.5 shrink-0" />
      <span>This request is configured for safe read-only execution by default.</span>
    </div>
  );
}

interface ConnectionTextFieldSpec {
  id: string;
  field: string;
  label: string;
  placeholder: string;
  type?: string;
  useNullishFallback?: boolean;
}

function SQLConnectionFields({
  connection,
  fields,
  onFieldChange,
}: {
  connection: any;
  fields: ConnectionTextFieldSpec[];
  onFieldChange: (field: string, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Connection</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              {f.label}
            </label>
            <Input
              id={f.id}
              type={f.type}
              value={f.useNullishFallback ? (connection[f.field] ?? '') : connection[f.field] || ''}
              onChange={event => onFieldChange(f.field, event.target.value)}
              placeholder={f.placeholder}
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PoolingFieldSpec {
  id: string;
  field: string;
  label: string;
  placeholder: string;
  numeric?: boolean;
}

const POOLING_FIELDS: PoolingFieldSpec[] = [
  { id: 'sql-max-open-conns', field: 'max_open_conns', label: 'Max Open Conns', placeholder: '5', numeric: true },
  { id: 'sql-max-idle-conns', field: 'max_idle_conns', label: 'Max Idle Conns', placeholder: '2', numeric: true },
  { id: 'sql-conn-max-lifetime', field: 'conn_max_lifetime', label: 'Conn Max Lifetime', placeholder: '5m' },
  { id: 'sql-conn-max-idle-time', field: 'conn_max_idle_time', label: 'Conn Max Idle Time', placeholder: '1m' },
];

function SQLPoolingFields({
  connection,
  onNumberFieldChange,
  onFieldChange,
}: {
  connection: any;
  onNumberFieldChange: (field: string, value: string) => void;
  onFieldChange: (field: string, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Pooling</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {POOLING_FIELDS.map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              {f.label}
            </label>
            <Input
              id={f.id}
              type={f.numeric ? 'number' : undefined}
              value={f.numeric ? (connection[f.field] ?? '') : connection[f.field] || ''}
              onChange={event =>
                f.numeric
                  ? onNumberFieldChange(f.field, event.target.value)
                  : onFieldChange(f.field, event.target.value)
              }
              placeholder={f.placeholder}
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SQLParamsFieldProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  helperBefore: string;
  helperAfter: string;
}

function SQLParamsField({ value, error, onChange, onBlur, helperBefore, helperAfter }: SQLParamsFieldProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Bound Parameters</p>
      <Textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={'- "{{user_id}}"\n- 100'}
        className="w-full min-h-30 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
      />
      <p className="mt-1 text-xs text-zinc-500">
        {helperBefore} <code>{'{{user_id}}'}</code> {helperAfter}
      </p>
      {error && (
        <div className="mt-2 p-3 bg-red-400/8 border border-red-400/20 rounded text-xs text-red-300">
          Invalid params YAML: {error}
        </div>
      )}
    </div>
  );
}

export function YAMLSQLDetails({ node, onNodeUpdate }: YAMLSQLDetailsProps) {
  const { t } = useLanguage();
  const data = useMemo(() => node.data || {}, [node.data]);
  const connection = data.connection || {};
  const options = connection.options || {};
  const extract = data.extract || {};
  const kind = data.kind || 'query';
  const allowWrites = data.allow_writes === true || data.allow_write === true;
  const validateConnectivity = connection.validate_connectivity === true;
  const [paramsText, setParamsText] = useState('');
  const [paramsError, setParamsError] = useState('');

  // data.params (and which node we're on) is the source of truth for the
  // params textarea; re-derived here during render rather than in an effect
  // (the React-sanctioned "adjust state on prop change" pattern: store the
  // last-seen params/node.id and conditionally setState when they differ) so
  // the sync lands before paint. In-progress edits live only in `paramsText`
  // until blur commits them, so this never clobbers unsaved typing.
  const [syncedParams, setSyncedParams] = useState<{ params: any; nodeId: string } | typeof SQL_PARAMS_SYNC_UNSET>(
    SQL_PARAMS_SYNC_UNSET,
  );

  if (syncedParams === SQL_PARAMS_SYNC_UNSET || data.params !== syncedParams.params || node.id !== syncedParams.nodeId) {
    setSyncedParams({ params: data.params, nodeId: node.id });
    setParamsText(stringifyParams(data.params));
    setParamsError('');
  }

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

  const handleOptionsUpdate = (updatedOptions: StringMap) => {
    onNodeUpdate?.(node.id, {
      ...data,
      connection: {
        ...connection,
        options: updatedOptions,
      },
    });
  };

  const handleExtractUpdate = (updatedExtract: StringMap) => {
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

  const handleParamsTextChange = (value: string) => {
    setParamsText(value);
    if (paramsError) {
      setParamsError('');
    }
  };

  const connectionTextFields: ConnectionTextFieldSpec[] = [
    { id: 'sql-host', field: 'host', label: 'Host', placeholder: '{{db_host}}' },
    {
      id: 'sql-port',
      field: 'port',
      label: 'Port',
      placeholder: data.dialect === 'mysql' ? '3306' : '5432',
      useNullishFallback: true,
    },
    { id: 'sql-connection-database', field: 'database', label: 'Database', placeholder: 'app' },
    { id: 'sql-user', field: 'user', label: 'User', placeholder: '{{db_user}}' },
    { id: 'sql-password', field: 'password', label: 'Password', placeholder: '{{db_password}}', type: 'password' },
    { id: 'sql-dsn-override', field: 'dsn', label: 'DSN Override', placeholder: 'Optional DSN/connection string' },
    { id: 'sql-ssl-mode', field: 'ssl_mode', label: 'SSL Mode', placeholder: 'disable, require, verify-full' },
    { id: 'sql-charset', field: 'charset', label: 'Charset', placeholder: 'utf8mb4' },
  ];

  return (
    <div className="space-y-6">
      <SQLBasicsRow
        dialect={data.dialect || 'postgres'}
        kind={kind}
        driver={data.driver || ''}
        databaseHelper={t('yamlEditor.sql.helpers.database')}
        requestModeHelper={t('yamlEditor.sql.helpers.requestMode')}
        onDialectChange={value => handleChange('dialect', value)}
        onKindChange={value => handleChange('kind', value)}
        onDriverChange={value => handleChange('driver', value)}
      />

      <SQLQueryEditor
        query={data.query || ''}
        onChange={value => handleChange('query', value)}
        helper={t('yamlEditor.sql.helpers.query')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="sql-timeout" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Timeout</label>
          <Input
            id="sql-timeout"
            value={data.timeout || ''}
            onChange={event => handleChange('timeout', event.target.value)}
            placeholder="30s"
            className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>

        <SQLSelectField
          id="sql-on-error"
          label="On Error"
          value={data.on_error || data.error_policy?.on_error || 'stop'}
          options={ON_ERROR_OPTIONS}
          onValueChange={value => handleChange('on_error', value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SQLSelectField
          id="sql-validate-connectivity"
          label="Validate Connectivity"
          value={validateConnectivity ? 'true' : 'false'}
          options={BOOLEAN_OPTIONS}
          onValueChange={value => handleConnectionChange('validate_connectivity', value === 'true')}
        />

        <SQLSelectField
          id="sql-allow-writes"
          label="Allow Writes"
          value={allowWrites ? 'true' : 'false'}
          options={BOOLEAN_OPTIONS}
          onValueChange={value => handleBooleanChange('allow_writes', value)}
          triggerClassName={
            allowWrites
              ? 'border-red-400/30 bg-red-400/10 text-red-200'
              : ''
          }
        />
      </div>

      <SQLWriteStatusBanner allowWrites={allowWrites} kind={kind} />

      <div className="h-px bg-white/10" />

      <SQLConnectionFields connection={connection} fields={connectionTextFields} onFieldChange={handleConnectionChange} />

      <EditableList
        title="Connection Options"
        items={options}
        onUpdate={handleOptionsUpdate}
        keyPlaceholder="option_name"
        valuePlaceholder="value"
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
      />

      <div className="h-px bg-white/10" />

      <SQLParamsField
        value={paramsText}
        error={paramsError}
        onChange={handleParamsTextChange}
        onBlur={handleParamsBlur}
        helperBefore={t('yamlEditor.sql.helpers.params.beforeVar')}
        helperAfter={t('yamlEditor.sql.helpers.params.afterVar')}
      />

      <div className="h-px bg-white/10" />

      <div>
        <EditableList
          title="Result Mapping"
          items={extract}
          onUpdate={handleExtractUpdate}
          keyPlaceholder="variable_name"
          valuePlaceholder="jsonpath('$[0].id')"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
        />
        <p className="mt-2 text-xs text-zinc-500">
          {t('yamlEditor.sql.helpers.resultMapping')}
        </p>
      </div>

      <div className="h-px bg-white/10" />

      <SQLPoolingFields
        connection={connection}
        onNumberFieldChange={handleConnectionNumberChange}
        onFieldChange={handleConnectionChange}
      />
    </div>
  );
}
