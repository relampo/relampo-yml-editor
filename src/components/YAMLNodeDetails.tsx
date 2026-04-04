import { AlertTriangle, BetweenHorizontalStart, Binary, Braces, Brackets, CheckCircle2, Clock3, Cookie, Cpu, FileText, Gauge, Hand, Mountain, Plus, Search, SearchX, ServerCrash, Tag, TextSearch, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AuthConfig, RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { EditableList } from './EditableList';
import { SparkCodeEditor } from './SparkCodeEditor';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { YAMLRequestDetails } from './YAMLRequestDetails';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: 'text' | 'number';
  maxLength?: number;
}

// Componente con estado local para evitar pérdida de foco - NUEVO ESTILO PREMIUM
function EditableField({ label, value, field, onChange, type = 'text', maxLength }: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(String(value || ''));

  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);

  const handleBlur = () => {
    onChange(field, localValue);
  };

  const isNameField = label.toLowerCase().includes('name');

  return (
    <div className="mb-5">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <Input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        maxLength={maxLength}
        className={`${isNameField ? 'w-[70px] shrink-0' : 'w-full'} h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all`}
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  field: string;
  options: { label: string; value: string }[];
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

function SelectField({ label, value, field, options, onChange, noMargin = false, disabled = false }: SelectFieldProps & { noMargin?: boolean }) {
  return (
    <div className={noMargin ? "" : "mb-5"}>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(field, e.target.value)}
        className={`w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Componente especial para campo File con botón Browse
function FileField({
  label,
  value,
  field,
  onChange,
  noMargin = false,
  showPathHint = false
}: EditableFieldProps & { noMargin?: boolean; showPathHint?: boolean }) {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Try Electron native dialog first if available
    if ((window as any).electron?.selectFile) {
      try {
        let path = await (window as any).electron.selectFile();
        // ipc handler returns a string or null; be defensive if an array is returned
        if (Array.isArray(path)) path = path[0];
        if (path) {
          onChange(field, path);
        }
        return;
      } catch (err) {
        console.error('Electron file selection failed:', err);
      }
    }

    // Fallback for browser
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // In Electron/Desktop, `file.path` is the absolute path. In browsers this is not available.
      // Prefer full path when present, otherwise fall back to filename.
      const path = (file as any).path || file.name;
      onChange(field, path);
    }
  };

  return (
    <div className={noMargin ? "" : "mb-5"}>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="path/to/file.csv"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono h-[38px]"
          title={String(value || '')}
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          className="px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/20 text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 h-[38px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          {t('yamlEditor.common.browse')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {showPathHint && (
        <div className="mt-1.5 space-y-0.5 text-[10px] text-zinc-400">
          {language === 'es' ? (
            <>
              <p>Local: en modo navegador, el selector de archivos normalmente solo devuelve el nombre del archivo. Copia y pega la ruta completa del CSV/TXT si vas a ejecutar este script localmente.</p>
              <p>Distribuido: usa solo el nombre del archivo o una ruta relativa (por ejemplo, users.csv). Relampo resuelve el resto automáticamente desde los nodos distribuidos.</p>
            </>
          ) : (
            <>
              <p>Local: in browser mode, the file picker usually returns only the file name. Copy/paste the full CSV/TXT path if you will run this script locally.</p>
              <p>Distributed: use only file name or relative path (for example, users.csv). Relampo resolves the remaining path details automatically across distributed nodes.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type EditableAuthType = 'none' | 'bearer' | 'api_key' | 'basic';
type EditableAuthConfig = AuthConfig & { type: EditableAuthType };

function normalizeAuthEditorValue(auth: any): EditableAuthConfig {
  const type = typeof auth?.type === 'string' ? auth.type.trim().toLowerCase() : '';
  if (type === 'bearer') {
    return { type, token: typeof auth?.token === 'string' ? auth.token : '' };
  }
  if (type === 'api_key') {
    return {
      type,
      name: typeof auth?.name === 'string' ? auth.name : '',
      value: typeof auth?.value === 'string' ? auth.value : '',
      in: auth?.in === 'query' ? 'query' : 'header',
    };
  }
  if (type === 'basic') {
    return {
      type,
      username: typeof auth?.username === 'string' ? auth.username : '',
      password: typeof auth?.password === 'string' ? auth.password : '',
    };
  }
  return { type: 'none' };
}

function authEditorValueToData(auth: EditableAuthConfig & { type: EditableAuthType }): AuthConfig | undefined {
  if ((auth.type as EditableAuthType) === 'none') return undefined;
  if (auth.type === 'bearer') {
    return { type: 'bearer', token: auth.token || '' };
  }
  if (auth.type === 'api_key') {
    return {
      type: 'api_key',
      name: auth.name || '',
      value: auth.value || '',
      in: auth.in || 'header',
    };
  }
  return {
    type: 'basic',
    username: auth.username || '',
    password: auth.password || '',
  };
}

interface AuthConfigEditorProps {
  auth?: AuthConfig;
  onChange: (auth?: AuthConfig) => void;
  scopeLabel: string;
}

function AuthConfigEditor({ auth, onChange, scopeLabel }: AuthConfigEditorProps) {
  const value = normalizeAuthEditorValue(auth);

  const handleTypeChange = (type: string) => {
    const nextType = type as EditableAuthType;
    if (nextType === 'none') {
      onChange(undefined);
      return;
    }

    if (nextType === 'bearer') {
      onChange({ type: 'bearer', token: '' });
      return;
    }
    if (nextType === 'api_key') {
      onChange({ type: 'api_key', name: '', value: '', in: 'header' });
      return;
    }
    onChange({ type: 'basic', username: '', password: '' });
  };

  const handleFieldChange = (field: keyof EditableAuthConfig, nextValue: string) => {
    onChange(authEditorValueToData({ ...value, [field]: nextValue } as EditableAuthConfig));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {scopeLabel} Authentication
        </label>
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px]"
        >
          <option value="none" className="bg-[#1a1a1a]">None</option>
          <option value="bearer" className="bg-[#1a1a1a]">Bearer</option>
          <option value="api_key" className="bg-[#1a1a1a]">API Key</option>
          <option value="basic" className="bg-[#1a1a1a]">Basic Auth</option>
        </select>
      </div>

      {value.type === 'bearer' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Token
          </label>
          <Input
            type="password"
            value={value.token || ''}
            onChange={(e) => handleFieldChange('token', e.target.value)}
            placeholder="{{api_token}}"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>
      )}

      {value.type === 'api_key' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Key Name
            </label>
            <Input
              value={value.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="X-API-Key"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Send In
            </label>
            <select
              value={value.in || 'header'}
              onChange={(e) => handleFieldChange('in', e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px]"
            >
              <option value="header" className="bg-[#1a1a1a]">Header</option>
              <option value="query" className="bg-[#1a1a1a]">Query Param</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Key Value
            </label>
            <Input
              type="password"
              value={value.value || ''}
              onChange={(e) => handleFieldChange('value', e.target.value)}
              placeholder="{{api_key}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      )}

      {value.type === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Username
            </label>
            <Input
              value={value.username || ''}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder="{{username}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Password
            </label>
            <Input
              type="password"
              value={value.password || ''}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="{{password}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      )}

      {value.type !== 'none' && (
        <div className="text-xs text-zinc-500">
          Secrets stay masked in the editor and serialize into the YAML `auth` block.
        </div>
      )}
    </div>
  );
}

interface YAMLNodeDetailsProps {
  node: YAMLNode | null;
  redirectedInfo?: RedirectedRequestInfo | null;
  redirectSourceInfo?: RedirectSourceInfo | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

export function YAMLNodeDetails({ node, redirectSourceInfo = null, onNodeUpdate }: YAMLNodeDetailsProps) {
  const { t } = useLanguage();
  const [nodeName, setNodeName] = useState(node?.name || '');
  const isRequestNode = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(
    node?.type || '',
  );

  // Sincronizar cuando cambia el nodo seleccionado
  useEffect(() => {
    setNodeName(node?.name || '');
  }, [node?.id, node?.name]);

  if (!node) {
    return (
      <div className='h-full bg-[#0a0a0a] flex flex-col'>
        <div className='px-6 py-3 border-b border-white/5 bg-[#111111]'>
          <div className='flex items-center gap-2'>
            <div className='w-1 h-4 bg-zinc-400 rounded-full' />
            <h3 className='text-xs font-semibold text-zinc-400 uppercase tracking-wider'>{t('yamlEditor.details')}</h3>
          </div>
        </div>

        <div className='flex-1 flex items-center justify-center p-6'>
          <div className='text-center'>
            <FileText className='w-12 h-12 text-zinc-700 mx-auto mb-3' />
            <p className='text-sm text-zinc-500'>{t('yamlEditor.selectNode')}</p>
            <p className='text-xs text-zinc-600 mt-1'>{t('yamlEditor.viewDetails')}</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTypeSpecificDetails = (node: YAMLNode): React.JSX.Element | null => {
    switch (node.type) {
      case 'test':
        return renderTestDetails(node, onNodeUpdate, nodeName, setNodeName);
      case 'variables':
        return renderVariablesDetails(node, onNodeUpdate);
      case 'data_source':
        return renderDataSourceDetails(node, onNodeUpdate, nodeName, setNodeName);
      case 'http_defaults':
        return renderHttpDefaultsDetails(node, onNodeUpdate);
      case 'scenarios':
        return renderScenariosContainerDetails(node, onNodeUpdate);
      case 'scenario':
        return renderScenarioDetails(node, onNodeUpdate, nodeName, setNodeName);
      case 'load':
        return (
          <LoadDetails
            node={node}
            onNodeUpdate={onNodeUpdate}
          />
        );
      case 'request':
      case 'get':
      case 'post':
      case 'put':
      case 'delete':
      case 'patch':
      case 'head':
      case 'options':
        return (
          <YAMLRequestDetails
            node={node}
            redirectSourceInfo={redirectSourceInfo}
            onNodeUpdate={onNodeUpdate}
          />
        );
      case 'group':
      case 'transaction':
        return renderGroupDetails(node, onNodeUpdate, nodeName, setNodeName);
      case 'if':
        return renderIfDetails(node, onNodeUpdate);
      case 'loop':
        return renderLoopDetails(node, onNodeUpdate);
      case 'retry':
        return renderRetryDetails(node, onNodeUpdate);
      case 'think_time':
        return renderThinkTimeDetails(node, onNodeUpdate);
      case 'cookies':
        return renderCookiesDetails(node, onNodeUpdate);
      case 'cache_manager':
        return renderCacheManagerDetails(node, onNodeUpdate);
      case 'error_policy':
        return renderErrorPolicyDetails(node, onNodeUpdate);
      case 'metrics':
        return renderMetricsDetails(node, onNodeUpdate);
      case 'spark_before':
      case 'spark_after':
        return renderSparkDetails(node, onNodeUpdate);
      case 'assertion':
        return renderAssertionDetails(node, onNodeUpdate);
      case 'extractor':
        return renderExtractorDetails(node, onNodeUpdate);
      case 'file':
        return renderFileDetails(node, onNodeUpdate);
      case 'header':
        return renderHeaderDetails(node, onNodeUpdate);
      case 'headers':
        return renderHeadersDetails(node, onNodeUpdate);
      default:
        return renderGenericDetails(node);
    }
  };

  return (
    <div className='h-full bg-[#0a0a0a] flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='px-6 py-3 border-b border-white/5 bg-[#111111] flex-shrink-0'>
        <div className={`flex gap-2 ${isRequestNode ? 'items-start' : 'items-center'}`}>
          <div className={`w-1 rounded-full bg-yellow-400 ${isRequestNode ? 'h-6 mt-0.5' : 'h-4'}`} />
          <h3
            className={`flex-1 ${isRequestNode ? 'text-base italic font-medium text-zinc-200 normal-case tracking-normal leading-snug whitespace-normal break-words' : 'text-xs font-semibold text-zinc-400 uppercase tracking-wider'}`}
          >
            {isRequestNode ? node.name : t('yamlEditor.details')}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-6'>
        {/* Node Name - Editable (Hide for data_source as it handles its own name field in the row) */}
        {node.type !== 'test' && node.type !== 'data_source' && (
          <div className='mb-6'>
            <label className='text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2'>
              {t('yamlEditor.common.name')}
            </label>
            <Input
              value={nodeName}
              onChange={e => setNodeName(e.target.value)}
              maxLength={50}
              onBlur={() => {
                if (onNodeUpdate && nodeName !== node.name) {
                  const updatedData = { ...node.data, __name: nodeName };
                  onNodeUpdate(node.id, updatedData);
                }
              }}
              style={{ width: `${Math.min(Math.max((nodeName || '').length + 2, 12), 48)}ch` }}
              className='max-w-full shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold'
              placeholder='Node name'
            />
          </div>
        )}

        {/* Type-specific details */}
        {node.type === 'data_source'
          ? renderDataSourceDetails(node, onNodeUpdate, nodeName, setNodeName)
          : renderTypeSpecificDetails(node)}
      </div>
    </div>
  );
}

function renderTestDetails(
  node: YAMLNode,
  onNodeUpdate?: (nodeId: string, data: any) => void,
  nodeName?: string,
  setNodeName?: (name: string) => void
): React.JSX.Element {
  const data = node.data || {};

  const handleChange = (field: string, value: string) => {
    if (!onNodeUpdate) return;
    onNodeUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Name and Version on the same line */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Name
          </label>
          <Input
            value={data.name || node.name || ''}
            maxLength={50}
            onChange={(e) => handleChange('name', e.target.value.slice(0, 50))}
            placeholder="Test Plan Name"
            className="w-[70px] shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
          />
        </div>
        <div className="w-24 shrink-0">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Version
          </label>
          <Input
            value={data.version || ''}
            maxLength={5}
            onChange={(e) => handleChange('version', e.target.value.slice(0, 5))}
            placeholder="1.0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono text-center"
          />
        </div>
      </div>

      {/* Description below, full width */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Description
        </label>
        <Textarea
          value={data.description || ''}
          maxLength={250}
          onChange={(e) => handleChange('description', e.target.value.slice(0, 250))}
          placeholder="Test description..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px] resize-none"
        />
      </div>
    </div>
  );
}

function renderVariablesDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};

  // Handle case where data is { variables: [{name, value}, ...] }
  const items = Array.isArray(data.variables)
    ? data.variables.reduce((acc: any, curr: any) => ({ ...acc, [curr.name]: curr.value }), {})
    : data;

  const handleUpdate = (updatedItems: Record<string, string>) => {
    if (!onNodeUpdate) return;

    if (Array.isArray(data.variables)) {
      const updatedArray = Object.entries(updatedItems).map(([name, value]) => ({ name, value }));
      onNodeUpdate(node.id, { ...data, variables: updatedArray });
    } else {
      onNodeUpdate(node.id, updatedItems);
    }
  };

  return (
    <EditableList
      title="Variables"
      items={items}
      onUpdate={handleUpdate}
      keyPlaceholder="variable_name"
      valuePlaceholder="value"
      keyLabel="Variable Name"
      valueLabel="Value"
      enableCheckboxes={false}
      enableBulkActions={false}
      variant="minimal"
    />
  );
}

function renderDataSourceDetails(
  node: YAMLNode,
  onNodeUpdate?: (nodeId: string, data: any) => void,
  nodeName?: string,
  setNodeName?: (name: string) => void
): React.JSX.Element {
  const data = node.data || {};
  const bind = data.bind || {};
  const showDiagnosis = false; // Set to true for debugging data mismatches

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      const updatedData = { ...data, [field]: value };
      // If we are updating 'file', preserve the full path under 'path' (canonical) and
      // remove legacy 'file' key to avoid duplicates. This ensures serializers that
      // expect 'path' will receive the full path.
      if (field === 'file') {
        updatedData.path = value;
        delete updatedData.file;
      }
      onNodeUpdate(node.id, updatedData);
    }
  };

  const handleBindUpdate = (updatedBind: Record<string, string>) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, bind: updatedBind });
    }
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Name */}
      <div>
        <div className="w-full">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Name
          </label>
          <Input
            value={nodeName || ''}
            onChange={(e) => setNodeName?.(e.target.value)}
            maxLength={50}
            onBlur={() => {
              if (onNodeUpdate && nodeName !== node.name) {
                const updatedData = { ...node.data, __name: nodeName };
                onNodeUpdate(node.id, updatedData);
              }
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold h-[38px]"
            placeholder="Name"
          />
        </div>
      </div>

      {/* Row 2: Type + File */}
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 items-end">
        <div>
          <SelectField
            label="Type"
            value={data.type || 'csv'}
            field="type"
            options={[
              { label: 'CSV', value: 'csv' },
              { label: 'TXT', value: 'txt' }
            ]}
            onChange={handleChange}
            noMargin={true}
          />
        </div>

        <div>
          <FileField label="File" value={data.file || data.path || ''} field="file" onChange={handleChange} noMargin={true} showPathHint />
        </div>
      </div>

      {/* Row 2: Variable Names */}
      <div className="w-full">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Variable Names (comma-separated)
        </label>
        <Input
          value={data.variable_names || ''}
          onChange={(e) => handleChange('variable_names', e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all h-[38px]"
          placeholder="var1, var2, var3"
        />
        <p className="text-[10px] text-zinc-500 mt-1 italic">
          Define variable names separated by commas manually.
        </p>
      </div>

      {/* Row 3: Mode and On Exhausted (conditional) */}
      <div className="flex gap-4">
        <div className="w-[120px] flex-shrink-0">
          <SelectField
            label="Mode"
            value={data.mode || 'per_vu'}
            field="mode"
            options={[
              { label: 'Per VU', value: 'per_vu' },
              { label: 'Shared', value: 'shared' },
              { label: 'Per Worker', value: 'per_worker' }
            ]}
            onChange={handleChange}
            noMargin={true}
          />
          {/* Mode tip - visible help text */}
          <p className="text-[10px] text-zinc-400 mt-1 italic">
            {data.mode === 'shared' && 'Un cursor global; filas consumidas una sola vez.'}
            {data.mode === 'per_worker' && 'Mapeo fijo 1:1: VU i → fila (i-1) % total. Misma fila, sin avance.'}
            {(!data.mode || data.mode === 'per_vu') && 'Cada VU cicla sobre la lista desde el inicio.'}
          </p>
        </div>

        <div className="w-[120px] flex-shrink-0">
          {data.mode !== 'per_worker' && (
            <SelectField
              label="On Exhausted"
              value={data.on_exhausted || 'recycle'}
              field="on_exhausted"
              options={[
                { label: 'Recycle', value: 'recycle' },
                { label: 'Stop', value: 'stop' }
              ]}
              onChange={handleChange}
              noMargin={true}
            />
          )}
        </div>
      </div>

      {/* Bind mappings - Solo para CSV */}
      {data.type !== 'txt' && Object.keys(bind).length > 0 && (
        <>
          <div className="h-px bg-white/10 my-4" />
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
              Column Bindings
            </label>
            <EditableList
              title="Bind"
              items={bind}
              onUpdate={handleBindUpdate}
              keyPlaceholder="csv_column"
              valuePlaceholder="variable_name"
              enableCheckboxes={false}
              enableBulkActions={false}
              variant="minimal"
            />
          </div>
        </>
      )}

      {showDiagnosis && (
        <div className="mt-8 pt-4 border-t border-white/5">
          <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">
            Debug: Node Data (Type: {node.type})
          </label>
          <pre className="p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-zinc-500 overflow-auto max-h-[150px]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function renderHttpDefaultsDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const headers = data.headers || {};

  // Campos principales (excluyendo headers)
  const mainFields = { ...data };
  delete mainFields.headers;
  delete mainFields.auth;


  const handleMainFieldsUpdate = (fields: Record<string, string>) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, {
        ...fields,
        headers: data.headers || {},
        ...(data.auth ? { auth: data.auth } : {}),
      });
    }
  };

  const handleHeadersUpdate = (updatedHeaders: Record<string, string>) => {
    if (onNodeUpdate) {
      const newData = { ...data, headers: updatedHeaders };
      onNodeUpdate(node.id, newData);
    }
  };

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!onNodeUpdate) return;
    if (!auth) {
      const { auth: _auth, ...rest } = data;
      onNodeUpdate(node.id, rest);
      return;
    }
    onNodeUpdate(node.id, { ...data, auth });
  };

  return (
    <div className="space-y-6">
      {/* Main Configuration Fields */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Configuration
        </label>
        <EditableList
          title="Fields"
          items={mainFields}
          onUpdate={handleMainFieldsUpdate}
          keyPlaceholder="field_name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Headers Section */}
      <div>
        <EditableList
          title="HTTP Headers"
          items={headers}
          onUpdate={handleHeadersUpdate}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />
      </div>

      <div className="h-px bg-white/10" />

      <AuthConfigEditor
        auth={data.auth}
        onChange={handleAuthUpdate}
        scopeLabel="Global"
      />
    </div>
  );
}

function renderScenariosContainerDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const scenarios = node.children || [];
  const scenarioCount = scenarios.length;

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Comments/Description */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Description / Comments
        </label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add notes or description about your scenarios..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px]"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Scenarios List */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Scenarios in this test
        </label>
        {scenarioCount === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            No scenarios defined. Right-click on "scenarios" in the tree to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className="p-3 bg-white/5 border-2 border-white/10 hover:border-purple-400/30 rounded-lg transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {scenario.name}
                    </div>
                    {scenario.data?.name && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {scenario.data.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderScenarioDetails(
  node: YAMLNode,
  onNodeUpdate?: (nodeId: string, data: any) => void,
  nodeName?: string,
  setNodeName?: (name: string) => void
): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      {/* Comments/Description */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Comments / Description
        </label>
        <Textarea
          value={data.comments || ''}
          onChange={(e) => handleChange('comments', e.target.value.slice(0, 250))}
          maxLength={250}
          placeholder="Add notes or comments about this scenario..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[80px]"
        />
      </div>
    </>
  );
}

function LoadDetails({ node, onNodeUpdate }: { node: YAMLNode; onNodeUpdate?: (nodeId: string, data: any) => void }): React.JSX.Element {
  const data = node.data || {};
  const rawLoadType = String(data.type || 'constant').toLowerCase().trim();
  const loadType: 'constant' | 'ramp' | 'ramp_up_down' | 'throughput' | 'intent' =
    rawLoadType === 'rampupdown' ||
    rawLoadType === 'ramp_updown' ||
    rawLoadType === 'rampup_down' ||
    rawLoadType === 'ramp-up-down' ||
    rawLoadType === 'ramp_up_down'
      ? 'ramp_up_down'
      : rawLoadType === 'ramp'
        ? 'ramp'
        : rawLoadType === 'throughput'
          ? 'throughput'
          : rawLoadType === 'intent'
            ? 'intent'
            : 'constant';

  const loadTypeDefaults: Record<string, Record<string, any>> = {
    constant: {
      users: '10',
      duration: '5m',
      iterations: '0',
      ramp_up: '0s',
    },
    ramp: {
      start_users: '1',
      end_users: '100',
      duration: '10m',
      iterations: '0',
    },
    ramp_up_down: {
      users: '50',
      duration: '10m',
      iterations: '0',
      ramp_up: '1m',
      ramp_down: '1m',
    },
    throughput: {
      target_rps: '20',
      duration: '10m',
      iterations: '0',
      ramp_up: '1m',
      ramp_down: '1m',
    },
    intent: {
      target_unit: 'rps',
      target_value: '3',
      duration: '10m',
      warmup: '30s',
      ramp_up: '30s',
      ramp_down: '30s',
      p95_max_ms: '800',
      error_rate_max_pct: '1',
      aggressiveness: 'medium',
      min_vus: '1',
      max_vus: '80',
    },
  };
  const loadTypeAllowedKeys: Record<string, string[]> = {
    constant: ['type', 'users', 'duration', 'iterations', 'ramp_up'],
    ramp: ['type', 'start_users', 'end_users', 'duration', 'iterations'],
    ramp_up_down: ['type', 'users', 'duration', 'iterations', 'ramp_up', 'ramp_down'],
    throughput: ['type', 'target_rps', 'duration', 'iterations', 'ramp_up', 'ramp_down'],
    intent: ['type', 'target_unit', 'target_value', 'duration', 'warmup', 'ramp_up', 'ramp_down', 'p95_max_ms', 'error_rate_max_pct', 'aggressiveness', 'min_vus', 'max_vus'],
  };

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) return;
    if (field === 'type') {
      const selectedType = String(value || 'constant').toLowerCase().trim();
      const defaults = loadTypeDefaults[selectedType] || {};
      const allowed = new Set(loadTypeAllowedKeys[selectedType] || ['type']);
      const normalized: Record<string, any> = { type: selectedType };
      for (const k of allowed) {
        if (k === 'type') continue;
        if (data[k] !== undefined && data[k] !== '') {
          normalized[k] = data[k];
        }
      }
      for (const [k, v] of Object.entries(defaults)) {
        if (!allowed.has(k)) continue;
        if (normalized[k] === undefined || normalized[k] === '') {
          normalized[k] = v;
        }
      }
      onNodeUpdate(node.id, normalized);
      return;
    }
    onNodeUpdate(node.id, { ...data, [field]: value });
  };
  const compactInputClass = 'w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono';
  const limited = (value: string) => value.slice(0, 5);
  const selectedLoadButtonStyle = {
    constant: {
      backgroundColor: 'rgba(59, 130, 246, 0.22)',
      color: '#93c5fd',
      borderColor: 'rgba(147, 197, 253, 0.55)',
      boxShadow: '0 10px 22px rgba(59, 130, 246, 0.22)',
    },
    ramp: {
      backgroundColor: 'rgba(168, 85, 247, 0.22)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.55)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.22)',
    },
    ramp_up_down: {
      backgroundColor: 'rgba(245, 158, 11, 0.22)',
      color: '#fcd34d',
      borderColor: 'rgba(252, 211, 77, 0.55)',
      boxShadow: '0 10px 22px rgba(245, 158, 11, 0.22)',
    },
    throughput: {
      backgroundColor: 'rgba(16, 185, 129, 0.22)',
      color: '#6ee7b7',
      borderColor: 'rgba(110, 231, 183, 0.55)',
      boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
    },
  } as const;
  const getVisualizationPoints = () => {
    const points: { time: number; users: number }[] = [];

    if (loadType === 'constant') {
      const users = parseInt(data.users) || 10;
      const rampUp = parseTimeToSeconds(data.ramp_up || '0s');
      const duration = parseTimeToSeconds(data.duration || '60s');

      if (rampUp > 0) {
        points.push({ time: 0, users: 0 });
        points.push({ time: rampUp, users: users });
        points.push({ time: duration, users: users });
      } else {
        points.push({ time: 0, users: users });
        points.push({ time: duration, users: users });
      }
    } else if (loadType === 'ramp') {
      const startUsers = parseInt(data.start_users) || 1;
      const endUsers = parseInt(data.end_users) || 100;
      const duration = parseTimeToSeconds(data.duration || '60s');

      points.push({ time: 0, users: startUsers });
      points.push({ time: duration, users: endUsers });
    } else if (loadType === 'ramp_up_down') {
      const users = parseInt(data.users) || 10;
      const duration = parseTimeToSeconds(data.duration || '60s');
      const rampUp = parseTimeToSeconds(data.ramp_up || '10s');
      const rampDown = parseTimeToSeconds(data.ramp_down || '10s');
      const holdStart = Math.min(rampUp, duration);
      const holdEnd = Math.max(holdStart, duration - rampDown);

      points.push({ time: 0, users: 0 });
      points.push({ time: holdStart, users: users });
      points.push({ time: holdEnd, users: users });
      points.push({ time: duration, users: 0 });
    } else if (loadType === 'throughput') {
      const targetRps = parseFloat(String(data.target_rps || '0')) || 10;
      const duration = parseTimeToSeconds(data.duration || '60s');
      const rampUp = parseTimeToSeconds(data.ramp_up || '0s');
      const rampDown = parseTimeToSeconds(data.ramp_down || '0s');
      const holdStart = Math.min(rampUp, duration);
      const holdEnd = Math.max(holdStart, duration - rampDown);

      points.push({ time: 0, users: 0 });
      points.push({ time: holdStart, users: targetRps });
      points.push({ time: holdEnd, users: targetRps });
      points.push({ time: duration, users: 0 });
    }

    return points;
  };

  const visualizationPoints = getVisualizationPoints();
  const intentTargetUnit = String(data.target_unit || 'rps').toLowerCase();
  const intentTargetValue = Math.max(0, parseFloat(String(data.target_value || '0')) || 0);
  const isIntent = loadType === 'intent';
  const isIntentVus = isIntent && intentTargetUnit === 'vus';
  const isIntentRps = isIntent && intentTargetUnit === 'rps';
  const intentMinVus = Math.max(0, parseFloat(String(data.min_vus || '0')) || 0);
  const intentMaxVus = Math.max(intentMinVus, parseFloat(String(data.max_vus || '0')) || intentMinVus);
  const showIntentVuBand = isIntentVus && intentMaxVus > intentMinVus;
  const intentRpsBandHalf = isIntentRps ? Math.max(0.3, intentTargetValue * 0.12) : 0;
  const intentRpsBandMin = Math.max(0, intentTargetValue - intentRpsBandHalf);
  const intentRpsBandMax = intentTargetValue + intentRpsBandHalf;
  const maxUsers = Math.max(
    ...visualizationPoints.map(p => p.users),
    showIntentVuBand ? intentMaxVus : 0,
    isIntentRps ? intentRpsBandMax : 0,
    10
  );
  const maxTime = Math.max(...visualizationPoints.map(p => p.time), 60);
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;
  const intentTargetPerMinute = (parseFloat(String(data.target_value || '0')) || 0) * 60;
  const chartHeightPx = 184;
  const yAxisLabel = loadType === 'throughput' || (loadType === 'intent' && intentTargetUnit === 'rps') ? 'RPS' : 'Users';
  const formatTimeLabel = (seconds: number): string => {
    const rounded = Math.max(0, Math.round(seconds));
    if (rounded >= 60) {
      return `${Math.round(rounded / 60)}m`;
    }
    return `${rounded}s`;
  };
  const timeAxisTicks = [0, 1, 2, 3, 4].map((i) => {
    const time = Math.round((maxTime / 4) * i);
    return {
      x: 40 + (i * 85),
      label: formatTimeLabel(time),
    };
  });
  const timeRanges = (() => {
    if (loadType === 'constant') {
      const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
      return rampUp > 0
        ? [
            { label: 'Ramp Up', start: 0, end: Math.min(rampUp, maxTime) },
            { label: 'Steady', start: Math.min(rampUp, maxTime), end: maxTime },
          ]
        : [{ label: 'Steady', start: 0, end: maxTime }];
    }
    if (loadType === 'ramp') {
      return [{ label: 'Ramp', start: 0, end: maxTime }];
    }
    const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
    const rampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
    const steadyStart = Math.min(rampUp, maxTime);
    const steadyEnd = Math.max(steadyStart, maxTime - rampDown);
    return [
      { label: 'Ramp Up', start: 0, end: steadyStart },
        { label: loadType === 'throughput' ? 'Target' : 'Steady', start: steadyStart, end: steadyEnd },
        { label: 'Ramp Down', start: steadyEnd, end: maxTime },
      ].filter((range) => range.end > range.start);
  })();
  const transitionMarkers = (() => {
    if (loadType === 'constant') {
      const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
      return rampUp > 0 && rampUp < maxTime
        ? [{ key: 'ramp-up', time: rampUp, label: formatTimeLabel(rampUp) }]
        : [];
    }
    if (loadType === 'ramp') {
      return [];
    }
    const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
    const rampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
    const steadyStart = Math.min(rampUp, maxTime);
    const steadyEnd = Math.max(steadyStart, maxTime - rampDown);
    return [
      steadyStart > 0 && steadyStart < maxTime
        ? { key: 'ramp-up', time: steadyStart, label: formatTimeLabel(steadyStart) }
        : null,
      steadyEnd > 0 && steadyEnd < maxTime
        ? { key: 'ramp-down', time: steadyEnd, label: formatTimeLabel(steadyEnd) }
        : null,
    ].filter(Boolean) as Array<{ key: string; time: number; label: string }>;
  })();
  const horizontalRanges = timeRanges.filter((range) => range.label === 'Steady' || range.label === 'Target');
  const verticalRanges = timeRanges.filter((range) => range.label !== 'Steady' && range.label !== 'Target');
  const loadColors = {
    constant: { stroke: '#60a5fa', fill: '#3b82f620' },
    ramp: { stroke: '#a78bfa', fill: '#a78bfa20' },
    ramp_up_down: { stroke: '#f59e0b', fill: '#f59e0b20' },
    throughput: { stroke: '#10b981', fill: '#10b98120' },
    intent: { stroke: '#fb7185', fill: '#fb718520' },
  } as const;
  const vizColor = loadColors[loadType];
  const dragRef = useRef<{ pointIdx: number | null }>({ pointIdx: null });
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const chartPoints = visualizationPoints.map((p) => {
    const x = 40 + ((p.time / maxTime) * 340);
    const y = 170 - ((p.users / maxUsers) * 160);
    return { ...p, x, y };
  });
  const linePoints = chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    '40,170',
    ...chartPoints.map((p) => `${p.x},${p.y}`),
    `${chartPoints[chartPoints.length - 1]?.x || 40},170`,
  ].join(' ');
  const horizontalRangeLabels = horizontalRanges.map((range) => {
    const startX = 40 + ((range.start / maxTime) * 340);
    const endX = 40 + ((range.end / maxTime) * 340);
    const centerX = (startX + endX) / 2;
    const plateauY = chartPoints[1]?.y ?? chartPoints[0]?.y ?? 90;
    const labelWidth = Math.max(52, range.label.length * 6.4);
    return {
      ...range,
      centerX,
      y: Math.max(20, plateauY - 14),
      width: labelWidth,
    };
  });
  const angledRangeLabels = verticalRanges.map((range) => {
    let from = chartPoints[0];
    let to = chartPoints[1] || chartPoints[0];
    if (range.label === 'Ramp Down' && chartPoints.length >= 4) {
      from = chartPoints[2];
      to = chartPoints[3];
    } else if (range.label === 'Ramp Down' && chartPoints.length >= 2) {
      from = chartPoints[chartPoints.length - 2];
      to = chartPoints[chartPoints.length - 1];
    } else if (range.label === 'Ramp' && chartPoints.length >= 2) {
      from = chartPoints[0];
      to = chartPoints[1];
    }
    const centerX = (from.x + to.x) / 2;
    const centerY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const isDescending = dy > 0;
    const normalX = isDescending ? 10 : -10;
    const normalY = -8;
    const labelWidth = Math.max(58, range.label.length * 6.5);
    return {
      ...range,
      x: centerX + normalX,
      y: centerY + normalY,
      angle,
      width: labelWidth,
    };
  });
  const intentBandY = {
    min: 170 - ((intentMinVus / maxUsers) * 160),
    max: 170 - ((intentMaxVus / maxUsers) * 160),
  };
  const intentBandHeight = Math.max(0, intentBandY.min - intentBandY.max);
  const intentTargetY = 170 - ((intentTargetValue / maxUsers) * 160);
  const intentRpsBandY = {
    min: 170 - ((intentRpsBandMin / maxUsers) * 160),
    max: 170 - ((intentRpsBandMax / maxUsers) * 160),
  };
  const intentRpsBandHeight = Math.max(0, intentRpsBandY.min - intentRpsBandY.max);
  const intentWarmupSec = Math.max(0, parseTimeToSeconds(String(data.warmup || '0s')));
  const intentWarmupX = 40 + (340 * Math.min(intentWarmupSec, maxTime) / maxTime);
  const intentMinY = 170 - ((intentMinVus / maxUsers) * 160);
  const intentWarmupIdleLine = showIntentVuBand && intentWarmupSec > 0 ? `40,${intentMinY} ${intentWarmupX},${intentMinY}` : '';
  const intentVuVariationLine = (() => {
    if (!showIntentVuBand) return '';
    const startX = intentWarmupSec > 0 ? Math.min(intentWarmupX, 380) : 40;
    const width = Math.max(0, 380 - startX);
    if (width <= 0) return '';
    const segments = 12;
    const amplitude = Math.max(0.8, Math.min((intentMaxVus - intentMinVus) / 2, 12) * 0.7);
    const center = intentTargetValue || (intentMinVus + intentMaxVus) / 2;
    return Array.from({ length: segments + 1 }).map((_, i) => {
      const ratio = i / segments;
      const x = startX + (width * ratio);
      const wave = Math.sin(ratio * Math.PI * 4);
      const rawValue = center + (wave * amplitude);
      const bounded = Math.max(intentMinVus, Math.min(intentMaxVus, rawValue));
      const y = 170 - ((bounded / maxUsers) * 160);
      return `${x},${y}`;
    }).join(' ');
  })();
  const intentRpsWarmupLine = isIntentRps && intentWarmupSec > 0 ? `40,${intentTargetY} ${intentWarmupX},${intentTargetY}` : '';
  const intentRpsVariationLine = (() => {
    if (!isIntentRps) return '';
    const startX = intentWarmupSec > 0 ? Math.min(intentWarmupX, 380) : 40;
    const width = Math.max(0, 380 - startX);
    if (width <= 0) return '';
    const segments = 12;
    const amplitude = Math.max(0.2, intentRpsBandHalf * 0.75);
    return Array.from({ length: segments + 1 }).map((_, i) => {
      const ratio = i / segments;
      const x = startX + (width * ratio);
      const wave = Math.sin(ratio * Math.PI * 4);
      const rawValue = intentTargetValue + (wave * amplitude);
      const bounded = Math.max(intentRpsBandMin, Math.min(intentRpsBandMax, rawValue));
      const y = 170 - ((bounded / maxUsers) * 160);
      return `${x},${y}`;
    }).join(' ');
  })();
  const intentWarmupRatio = maxTime > 0 ? Math.max(0, Math.min(1, intentWarmupSec / maxTime)) : 0;
  const intentWarmupPct = intentWarmupRatio * 100;
  const intentControlPct = Math.max(0, 100 - intentWarmupPct);
  const intentBehaviorHint = isIntentVus
    ? `After warmup, VUs are adjusted around target=${intentTargetValue.toFixed(0)} within ${intentMinVus.toFixed(0)}..${intentMaxVus.toFixed(0)} to keep SLOs.`
    : `After warmup, RPS is adjusted around target=${intentTargetValue.toFixed(2)} while respecting SLOs and VU guardrails ${intentMinVus.toFixed(0)}..${intentMaxVus.toFixed(0)}.`;

  const toDurationString = (seconds: number): string => {
    const s = Math.max(1, Math.round(seconds));
    if (s % 3600 === 0) return `${Math.round(s / 3600)}h`;
    if (s % 60 === 0) return `${Math.round(s / 60)}m`;
    return `${s}s`;
  };

  const extraHandles = (() => {
    if (chartPoints.length < 2)
      return [] as Array<{ pointIdx: number; x: number; y: number; time: number; users: number; kind: string }>;
    if (loadType === 'ramp_up_down' || loadType === 'throughput' || loadType === 'intent') {
      const left = chartPoints[1];
      const right = chartPoints[2] || chartPoints[1];
      return [
        {
          pointIdx: 11,
          x: (left.x + right.x) / 2,
          y: (left.y + right.y) / 2,
          time: (left.time + right.time) / 2,
          users: (left.users + right.users) / 2,
          kind: 'plateau',
        },
      ];
    }
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return [
      {
        pointIdx: 11,
        x: (first.x + last.x) / 2,
        y: (first.y + last.y) / 2,
        time: (first.time + last.time) / 2,
        users: (first.users + last.users) / 2,
        kind: 'mid',
      },
    ];
  })();

  const updateLoadFromDraggedPoint = (pointIdx: number, timeSec: number, valueY: number) => {
    const updates: Record<string, any> = {};
    const currentDuration = Math.max(1, parseTimeToSeconds(String(data.duration || '60s')));

    if (pointIdx === 11) {
      if (loadType === 'constant') {
        updates.users = String(Math.max(1, Math.round(valueY)));
      } else if (loadType === 'ramp') {
        updates.duration = toDurationString(Math.max(1, Math.round(timeSec)));
        updates.end_users = String(Math.max(0, Math.round(valueY)));
      } else if (loadType === 'ramp_up_down') {
        const duration = currentDuration;
        const currentRampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '10s')));
        const currentRampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '10s')));
        const holdEnd = Math.max(currentRampUp, duration - currentRampDown);
        const width = Math.max(0, holdEnd - currentRampUp);
        const desiredCenter = Math.max(0, Math.min(Math.round(timeSec), duration));
        const newRampUp = Math.max(0, Math.min(Math.round(desiredCenter - width / 2), Math.max(0, duration - width)));
        const newHoldEnd = Math.max(newRampUp, Math.min(duration, newRampUp + width));
        updates.ramp_up = toDurationString(newRampUp);
        updates.ramp_down = toDurationString(Math.max(0, duration - newHoldEnd));
        updates.users = String(Math.max(1, Math.round(valueY)));
      } else if (loadType === 'throughput') {
        const duration = currentDuration;
        const currentRampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
        const currentRampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
        const holdEnd = Math.max(currentRampUp, duration - currentRampDown);
        const width = Math.max(0, holdEnd - currentRampUp);
        const desiredCenter = Math.max(0, Math.min(Math.round(timeSec), duration));
        const newRampUp = Math.max(0, Math.min(Math.round(desiredCenter - width / 2), Math.max(0, duration - width)));
        const newHoldEnd = Math.max(newRampUp, Math.min(duration, newRampUp + width));
        updates.ramp_up = toDurationString(newRampUp);
        updates.ramp_down = toDurationString(Math.max(0, duration - newHoldEnd));
        updates.target_rps = String(Math.max(0.1, Math.round(valueY * 10) / 10));
      } else if (loadType === 'intent') {
        updates.target_value = String(Math.max(0.1, Math.round(valueY * 10) / 10));
      }
    } else if (loadType === 'constant') {
      if (visualizationPoints.length === 3) {
        if (pointIdx === 1) {
          const nextRamp = Math.max(0, Math.min(Math.round(timeSec), currentDuration));
          updates.ramp_up = toDurationString(nextRamp);
          updates.users = String(Math.max(1, Math.round(valueY)));
        } else if (pointIdx === 2) {
          const nextDuration = Math.max(1, Math.round(timeSec));
          updates.duration = toDurationString(nextDuration);
          updates.users = String(Math.max(1, Math.round(valueY)));
        }
      } else if (pointIdx === 1) {
        updates.duration = toDurationString(Math.max(1, Math.round(timeSec)));
        updates.users = String(Math.max(1, Math.round(valueY)));
      }
    } else if (loadType === 'ramp') {
      if (pointIdx === 0) {
        updates.start_users = String(Math.max(0, Math.round(valueY)));
      } else if (pointIdx === 1) {
        updates.duration = toDurationString(Math.max(1, Math.round(timeSec)));
        updates.end_users = String(Math.max(0, Math.round(valueY)));
      }
    } else if (loadType === 'ramp_up_down') {
      const duration = pointIdx === 3 ? Math.max(1, Math.round(timeSec)) : currentDuration;
      const currentRampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '10s')));
      const currentRampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '10s')));
      let rampUp = currentRampUp;
      let holdEnd = Math.max(0, duration - currentRampDown);
      if (pointIdx === 1) rampUp = Math.max(0, Math.min(Math.round(timeSec), duration));
      if (pointIdx === 2) holdEnd = Math.max(rampUp, Math.min(Math.round(timeSec), duration));
      if (pointIdx === 3) holdEnd = Math.max(rampUp, Math.min(holdEnd, duration));
      const rampDown = Math.max(0, duration - holdEnd);
      updates.duration = toDurationString(duration);
      updates.ramp_up = toDurationString(rampUp);
      updates.ramp_down = toDurationString(rampDown);
      if (pointIdx === 1 || pointIdx === 2) {
        updates.users = String(Math.max(1, Math.round(valueY)));
      }
    } else if (loadType === 'throughput') {
      const duration = pointIdx === 3 ? Math.max(1, Math.round(timeSec)) : currentDuration;
      const currentRampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
      const currentRampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
      let rampUp = currentRampUp;
      let holdEnd = Math.max(0, duration - currentRampDown);
      if (pointIdx === 1) rampUp = Math.max(0, Math.min(Math.round(timeSec), duration));
      if (pointIdx === 2) holdEnd = Math.max(rampUp, Math.min(Math.round(timeSec), duration));
      if (pointIdx === 3) holdEnd = Math.max(rampUp, Math.min(holdEnd, duration));
      const rampDown = Math.max(0, duration - holdEnd);
      updates.duration = toDurationString(duration);
      updates.ramp_up = toDurationString(rampUp);
      updates.ramp_down = toDurationString(rampDown);
      if (pointIdx === 1 || pointIdx === 2) {
        updates.target_rps = String(Math.max(0.1, Math.round(valueY * 10) / 10));
      }
    } else if (loadType === 'intent') {
      const duration = pointIdx === 3 ? Math.max(1, Math.round(timeSec)) : currentDuration;
      updates.duration = toDurationString(duration);
      if (pointIdx === 1 || pointIdx === 2) {
        const normalizedValue = Math.max(0.1, Math.round(valueY * 10) / 10);
        updates.target_value = String(normalizedValue);
      }
    }

    if (Object.keys(updates).length > 0) {
      if (onNodeUpdate) onNodeUpdate(node.id, { ...data, ...updates });
    }
  };


  return (
    <div className="space-y-6">
      {/* Load Type Selector */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Load Pattern
        </label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleChange('type', 'constant')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'constant'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={loadType === 'constant' ? selectedLoadButtonStyle.constant : undefined}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Constant</span>
          </button>
          <button
            onClick={() => handleChange('type', 'ramp')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'ramp'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={loadType === 'ramp' ? selectedLoadButtonStyle.ramp : undefined}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Lineal</span>
          </button>
          <button
            onClick={() => handleChange('type', 'ramp_up_down')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'ramp_up_down'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={loadType === 'ramp_up_down' ? selectedLoadButtonStyle.ramp_up_down : undefined}
          >
            <Mountain className="h-3.5 w-3.5" />
            <span>Ramp Up/Down</span>
          </button>
          <button
            onClick={() => handleChange('type', 'throughput')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'throughput'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={loadType === 'throughput' ? selectedLoadButtonStyle.throughput : undefined}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>Throughput</span>
          </button>
        </div>
      </div>

      {/* Dynamic Fields based on Load Type */}
      {loadType === 'constant' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Virtual Users</label>
              <Input
                type="number"
                maxLength={5}
                value={data.users || ''}
                onChange={(e) => handleChange('users', limited(e.target.value))}
                placeholder="10"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
              <Input
                maxLength={5}
                value={data.duration || ''}
                onChange={(e) => handleChange('duration', limited(e.target.value))}
                placeholder="5m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Iterations</label>
              <Input
                type="number"
                maxLength={5}
                value={data.iterations || ''}
                onChange={(e) => handleChange('iterations', limited(e.target.value))}
                placeholder="0"
                className={compactInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Up</label>
              <Input
                maxLength={5}
                value={data.ramp_up || ''}
                onChange={(e) => handleChange('ramp_up', limited(e.target.value))}
                placeholder="0s"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div />
          </div>
        </div>
      ) : loadType === 'ramp' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Start Users</label>
              <Input
                type="number"
                maxLength={5}
                value={data.start_users || ''}
                onChange={(e) => handleChange('start_users', limited(e.target.value))}
                placeholder="1"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">End Users</label>
              <Input
                type="number"
                maxLength={5}
                value={data.end_users || ''}
                onChange={(e) => handleChange('end_users', limited(e.target.value))}
                placeholder="100"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
              <Input
                maxLength={5}
                value={data.duration || ''}
                onChange={(e) => handleChange('duration', limited(e.target.value))}
                placeholder="10m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Iterations</label>
              <Input
                type="number"
                maxLength={5}
                value={data.iterations || ''}
                onChange={(e) => handleChange('iterations', limited(e.target.value))}
                placeholder="0"
                className={compactInputClass}
              />
            </div>
            <div />
            <div />
          </div>
        </div>
      ) : loadType === 'ramp_up_down' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Virtual Users</label>
              <Input
                type="number"
                maxLength={5}
                value={data.users || ''}
                onChange={(e) => handleChange('users', limited(e.target.value))}
                placeholder="50"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
              <Input
                maxLength={5}
                value={data.duration || ''}
                onChange={(e) => handleChange('duration', limited(e.target.value))}
                placeholder="10m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Iterations</label>
              <Input
                type="number"
                maxLength={5}
                value={data.iterations || ''}
                onChange={(e) => handleChange('iterations', limited(e.target.value))}
                placeholder="0"
                className={compactInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Up</label>
              <Input
                maxLength={5}
                value={data.ramp_up || ''}
                onChange={(e) => handleChange('ramp_up', limited(e.target.value))}
                placeholder="1m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Down</label>
              <Input
                maxLength={5}
                value={data.ramp_down || ''}
                onChange={(e) => handleChange('ramp_down', limited(e.target.value))}
                placeholder="1m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div />
          </div>
        </div>
      ) : loadType === 'intent' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Target Unit</label>
              <select
                value={data.target_unit || 'rps'}
                onChange={(e) => handleChange('target_unit', e.target.value)}
                className="w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="rps">RPS</option>
                <option value="vus">VU</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Target Value</label>
              <Input
                type="number"
                maxLength={5}
                value={data.target_value || ''}
                onChange={(e) => handleChange('target_value', limited(e.target.value))}
                placeholder="3"
                className={compactInputClass}
              />
              {intentTargetUnit === 'rps' && (
                <div className="mt-1 text-xs text-zinc-500">{intentTargetPerMinute.toFixed(0)} req/min</div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
              <Input
                maxLength={5}
                value={data.duration || ''}
                onChange={(e) => handleChange('duration', limited(e.target.value))}
                placeholder="10m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Warmup</label>
              <Input
                maxLength={5}
                value={data.warmup || ''}
                onChange={(e) => handleChange('warmup', limited(e.target.value))}
                placeholder="30s"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Up</label>
              <Input
                maxLength={5}
                value={data.ramp_up || ''}
                onChange={(e) => handleChange('ramp_up', limited(e.target.value))}
                placeholder="30s"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Down</label>
              <Input
                maxLength={5}
                value={data.ramp_down || ''}
                onChange={(e) => handleChange('ramp_down', limited(e.target.value))}
                placeholder="30s"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">P95 Max (ms)</label>
              <Input
                type="number"
                maxLength={5}
                value={data.p95_max_ms || ''}
                onChange={(e) => handleChange('p95_max_ms', limited(e.target.value))}
                placeholder="800"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Error Max (%)</label>
              <Input
                type="number"
                maxLength={5}
                value={data.error_rate_max_pct || ''}
                onChange={(e) => handleChange('error_rate_max_pct', limited(e.target.value))}
                placeholder="1"
                className={compactInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Aggressiveness</label>
              <select
                value={data.aggressiveness || 'medium'}
                onChange={(e) => handleChange('aggressiveness', e.target.value)}
                className="w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Min VUs</label>
              <Input
                type="number"
                maxLength={5}
                value={data.min_vus || ''}
                onChange={(e) => handleChange('min_vus', limited(e.target.value))}
                placeholder="1"
                className={compactInputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Max VUs</label>
              <Input
                type="number"
                maxLength={5}
                value={data.max_vus || ''}
                onChange={(e) => handleChange('max_vus', limited(e.target.value))}
                placeholder="80"
                className={compactInputClass}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Target RPS</label>
              <Input
                type="number"
                maxLength={5}
                value={data.target_rps || ''}
                onChange={(e) => handleChange('target_rps', limited(e.target.value))}
                placeholder="20"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">{throughputPerMinute.toFixed(0)} req/min</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Duration</label>
              <Input
                maxLength={5}
                value={data.duration || ''}
                onChange={(e) => handleChange('duration', limited(e.target.value))}
                placeholder="10m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Iterations</label>
              <Input
                type="number"
                maxLength={5}
                value={data.iterations || ''}
                onChange={(e) => handleChange('iterations', limited(e.target.value))}
                placeholder="0"
                className={compactInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Up</label>
              <Input
                maxLength={5}
                value={data.ramp_up || ''}
                onChange={(e) => handleChange('ramp_up', limited(e.target.value))}
                placeholder="1m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Ramp Down</label>
              <Input
                maxLength={5}
                value={data.ramp_down || ''}
                onChange={(e) => handleChange('ramp_down', limited(e.target.value))}
                placeholder="1m"
                className={compactInputClass}
              />
              <div className="mt-1 text-xs text-zinc-500">Format: 500ms, 5s, 5m</div>
            </div>
            <div />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Visualization */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Load Pattern Visualization
        </label>
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Visual preview</span>
            <span className="font-mono">
              Peak {yAxisLabel}: {maxUsers.toFixed(0)} | Total: {maxTime >= 60 ? `${Math.round(maxTime / 60)}m` : `${maxTime}s`}
            </span>
          </div>
          <div className="mb-2 text-[11px] text-zinc-400">
            Time ranges are shown for reference based on the current load configuration.
          </div>
          {showIntentVuBand && (
            <div className="mb-2 text-[11px] text-amber-300/90">
              Intent control band: warmup is prep-only (cyan). Ajustes comienzan en el marcador amarillo, justo al terminar warmup.
            </div>
          )}
          {isIntentRps && (
            <div className="mb-2 text-[11px] text-emerald-300/90">
              Intent RPS band: warmup is prep-only, then controlled RPS variability. VU guardrails: {intentMinVus.toFixed(0)}..{intentMaxVus.toFixed(0)}.
            </div>
          )}
          {isIntent && (
            <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400">
                <span>Execution Phases</span>
                <span className="font-mono text-[10px] normal-case">{intentBehaviorHint}</span>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2 py-0.5 text-cyan-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  warmup
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/40 bg-rose-400/15 px-2 py-0.5 text-rose-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                  violating
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  recovering
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  stable
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-zinc-800/80 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-400/70"
                  style={{ width: `${intentWarmupPct}%` }}
                />
                <div
                  className={`absolute inset-y-0 ${isIntentVus ? 'bg-amber-400/70' : 'bg-emerald-400/70'}`}
                  style={{ left: `${intentWarmupPct}%`, width: `${intentControlPct}%` }}
                />
                <div
                  className="absolute top-[-2px] h-[14px] w-[2px] bg-cyan-200/90"
                  style={{ left: `calc(${intentWarmupPct}% - 1px)` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-3 text-[10px] text-zinc-400">
                <div className="text-left">0s</div>
                <div className="text-center font-mono">warmup {Math.round(intentWarmupSec)}s</div>
                <div className="text-right font-mono">duration {Math.round(maxTime)}s</div>
              </div>
            </div>
          )}
          <svg viewBox="0 0 400 200" className="w-full" style={{ height: `${chartHeightPx}px` }}>
            <defs>
              <linearGradient id="loadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={vizColor.stroke} stopOpacity="0.32" />
                <stop offset="100%" stopColor={vizColor.stroke} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            <line x1="40" y1="10" x2="40" y2="170" stroke="#3f3f46" strokeWidth="2" />
            <line x1="40" y1="170" x2="380" y2="170" stroke="#3f3f46" strokeWidth="2" />

            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`h-${i}`}
                x1="40"
                y1={10 + (i * 40)}
                x2="380"
                y2={10 + (i * 40)}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray={i === 4 ? '0' : '3 5'}
              />
            ))}

            {[0, 1, 2, 3, 4].map(i => {
              const users = Math.round((maxUsers / 4) * (4 - i));
              return (
                <text
                  key={`y-${i}`}
                  x="35"
                  y={14 + (i * 40)}
                  fill="#71717a"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {users}
                </text>
              );
            })}

            {timeAxisTicks.map((tick, i) => (
              <text
                key={`x-${i}`}
                x={tick.x}
                y="185"
                fill="#71717a"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            ))}

            {transitionMarkers.map((marker) => {
              const x = 40 + ((marker.time / maxTime) * 340);
              return (
                <g key={marker.key}>
                  <line
                    x1={x}
                    y1="18"
                    x2={x}
                    y2="170"
                    stroke={vizColor.stroke}
                    strokeOpacity="0.5"
                    strokeWidth="1.4"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={x}
                    y="184"
                    fill={vizColor.stroke}
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="700"
                    fontFamily="monospace"
                    paintOrder="stroke"
                    stroke="#09090b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {marker.label}
                  </text>
                </g>
              );
            })}

            {horizontalRangeLabels.map((range, idx) => {
              return (
                <g key={`range-${idx}`}>
                  <text
                    x={range.centerX}
                    y={range.y}
                    fill="#e4e4e7"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="700"
                    paintOrder="stroke"
                    stroke="#09090b"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {range.label}
                  </text>
                </g>
              );
            })}

            {angledRangeLabels.map((range, idx) => {
              return (
                <g key={`vertical-range-${idx}`}>
                  <text
                    x={range.x}
                    y={range.y}
                    fill="#a1a1aa"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#09090b"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={`rotate(${range.angle} ${range.x} ${range.y})`}
                  >
                    {range.label}
                  </text>
                </g>
              );
            })}

            {showIntentVuBand && (
              <g>
                <rect
                  x="40"
                  y={intentBandY.max}
                  width="340"
                  height={intentBandHeight}
                  fill="#f59e0b18"
                  stroke="#f59e0b55"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={intentTargetY}
                  x2="380"
                  y2={intentTargetY}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                />
                {intentWarmupIdleLine && (
                  <polyline
                    points={intentWarmupIdleLine}
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
                {intentVuVariationLine && (
                  <polyline
                    points={intentVuVariationLine}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                )}
              </g>
            )}

            {isIntentRps && (
              <g>
                <rect
                  x="40"
                  y={intentRpsBandY.max}
                  width="340"
                  height={intentRpsBandHeight}
                  fill="#10b98118"
                  stroke="#10b98150"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={intentTargetY}
                  x2="380"
                  y2={intentTargetY}
                  stroke="#34d399"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                />
                {intentRpsWarmupLine && (
                  <polyline
                    points={intentRpsWarmupLine}
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
                {intentRpsVariationLine && (
                  <polyline
                    points={intentRpsVariationLine}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                )}
              </g>
            )}

            <polygon points={areaPoints} fill="url(#loadAreaGradient)" />
            <polyline
              points={linePoints}
              fill="none"
              stroke={vizColor.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <text x="200" y="198" fill="#a1a1aa" fontSize="11" textAnchor="middle" fontWeight="600">
              Time
            </text>
            <text
              x="15"
              y="100"
              fill="#a1a1aa"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
              transform="rotate(-90 15 100)"
            >
              {yAxisLabel}
            </text>
          </svg>
        </div>
      </div>

    </div>
  );
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60;
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    default:
      return 60;
  }
}

function renderGroupDetails(
  node: YAMLNode,
  onNodeUpdate?: (nodeId: string, data: any) => void,
  nodeName?: string,
  setNodeName?: (name: string) => void
): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!onNodeUpdate) return;
    if (!auth) {
      const { auth: _auth, ...rest } = data;
      onNodeUpdate(node.id, rest);
      return;
    }
    onNodeUpdate(node.id, { ...data, auth });
  };
  return (
    <div className="space-y-6">
      <EditableField label="Group Name" value={data.name || ''} field="name" onChange={handleChange} maxLength={50} />
      <DetailField label="Steps Count" value={node.children?.length || 0} mono />
      <div className="h-px bg-white/10" />
      <AuthConfigEditor
        auth={data.auth}
        onChange={handleAuthUpdate}
        scopeLabel="Group"
      />
    </div>
  );
}

function renderIfDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Condition */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Condition Expression
        </label>
        <Textarea
          value={data.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          placeholder="${'{'}status${'}'} === 200\n${'{'}user_id${'}'} != null\n${'{'}count${'}'} > 10"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-[100px]"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Steps will only execute if this condition evaluates to true
        </div>
      </div>

      {/* Steps Count */}
      <div className="p-3 bg-pink-400/10 border border-pink-400/20 rounded">
        <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">
          Conditional Steps
        </div>
        <div className="text-2xl font-bold text-pink-300 font-mono">
          {node.children?.length || 0}
        </div>
      </div>
    </div>
  );
}

function renderLoopDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };

  const loopCount = data.count || 1;
  const stepsCount = node.children?.length || 0;
  const totalIterations = loopCount * stepsCount;


  return (
    <div className="space-y-6">
      {/* Loop Count */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Loop Count
        </label>
        <Input
          type="number"
          value={data.count !== undefined ? data.count : 1}
          onChange={(e) => handleChange('count', parseInt(e.target.value) || 1)}
          placeholder="1"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Number of times to repeat the steps, or use variable ${'{'}loops${'}'}
        </div>
      </div>

      {/* Break Condition */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Break Condition (optional)
        </label>
        <Input
          value={data.break_on || ''}
          onChange={(e) => handleChange('break_on', e.target.value)}
          placeholder="${'{'}error${'}'} || ${'{'}stop${'}'}"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Exit loop early if condition is true
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            Steps Inside
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">
            {stepsCount}
          </div>
        </div>
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            Total Iterations
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">
            {totalIterations}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderRetryDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const backoffType = data.backoff || 'constant';

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Attempts - Common to all */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Max Attempts
        </label>
        <Input
          type="number"
          value={data.attempts !== undefined ? data.attempts : 3}
          onChange={(e) => handleChange('attempts', parseInt(e.target.value) || 3)}
          placeholder="3"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      {/* Backoff Type Selector */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Backoff Strategy
        </label>
        <select
          value={backoffType}
          onChange={(e) => handleChange('backoff', e.target.value)}
          className="w-full h-[38px] px-3 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="constant" className="bg-zinc-900">constant (same delay)</option>
          <option value="linear" className="bg-zinc-900">linear (incremental)</option>
          <option value="exponential" className="bg-zinc-900">exponential (2x each time)</option>
        </select>
      </div>

      {/* Conditional Fields Based on Backoff Type */}
      {backoffType === 'constant' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Delay
          </label>
          <Input
            value={data.initial_delay || data.delay || ''}
            onChange={(e) => handleChange('initial_delay', e.target.value)}
            placeholder="1s"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
          <div className="mt-1 text-xs text-zinc-500">
            Same delay between all retry attempts
          </div>
        </div>
      )}

      {backoffType === 'linear' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={(e) => handleChange('initial_delay', e.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Increment
            </label>
            <Input
              value={data.increment || ''}
              onChange={(e) => handleChange('increment', e.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Delay increases by this amount each retry (1s, 2s, 3s...)
            </div>
          </div>
        </>
      )}

      {backoffType === 'exponential' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={(e) => handleChange('initial_delay', e.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Multiplier
            </label>
            <Input
              type="number"
              value={data.multiplier !== undefined ? data.multiplier : 2}
              onChange={(e) => handleChange('multiplier', parseFloat(e.target.value) || 2)}
              placeholder="2"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Delay multiplied each retry (1s, 2s, 4s, 8s...)
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Delay (optional)
            </label>
            <Input
              value={data.max_delay || ''}
              onChange={(e) => handleChange('max_delay', e.target.value)}
              placeholder="30s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Cap maximum delay to prevent very long waits
            </div>
          </div>
        </>
      )}

      {/* Steps Count */}
      <div className="p-3 bg-white/5 border border-white/10 rounded">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Steps to Retry
        </div>
        <div className="text-2xl font-bold text-zinc-300 font-mono">
          {node.children?.length || 0}
        </div>
      </div>
    </div>
  );
}

function renderThinkTimeDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const hasFixed = data.duration !== undefined && String(data.duration).trim() !== '';
  const hasDistributionHints = data.mean !== undefined || data.std_dev !== undefined || String(data.distribution || '').toLowerCase() === 'normal';
  const mode: 'fixed' | 'range' | 'distribution' = hasFixed
    ? 'fixed'
    : hasDistributionHints
      ? 'distribution'
      : 'range';
  const fixedDuration = String(data.duration || '');
  const variableMin = String(data.min || '');
  const variableMax = String(data.max || '');
  const thinkTimeModes = [
    { value: 'fixed', label: 'Fixed', icon: Clock3 },
    { value: 'range', label: 'Range', icon: BetweenHorizontalStart },
    { value: 'distribution', label: 'Distribution', icon: Binary },
  ] as const;
  const thinkTimeModeButtonStyle: Record<'fixed' | 'range' | 'distribution', React.CSSProperties> = {
    fixed: {
      backgroundColor: 'rgba(249, 115, 22, 0.20)',
      color: '#fdba74',
      borderColor: 'rgba(253, 186, 116, 0.50)',
      boxShadow: '0 10px 22px rgba(249, 115, 22, 0.20)',
    },
    range: {
      backgroundColor: 'rgba(6, 182, 212, 0.20)',
      color: '#67e8f9',
      borderColor: 'rgba(103, 232, 249, 0.50)',
      boxShadow: '0 10px 22px rgba(6, 182, 212, 0.20)',
    },
    distribution: {
      backgroundColor: 'rgba(168, 85, 247, 0.20)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.50)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)',
    },
  };

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };

  const handleModeChange = (newMode: 'fixed' | 'range' | 'distribution') => {
    if (newMode === 'fixed') {
      const newData = { ...data };
      delete newData.min;
      delete newData.max;
      delete newData.mean;
      delete newData.std_dev;
      delete newData.distribution;
      if (!newData.duration) {
        newData.duration = '1s';
      }
      if (onNodeUpdate) onNodeUpdate(node.id, newData);
      return;
    }

    if (newMode === 'range') {
      const newData = { ...data };
      delete newData.duration;
      delete newData.mean;
      delete newData.std_dev;
      if (!newData.min) newData.min = '1s';
      if (!newData.max) newData.max = '3s';
      newData.distribution = 'uniform';
      if (onNodeUpdate) onNodeUpdate(node.id, newData);
      return;
    }

    // distribution
    const newData = { ...data };
    delete newData.duration;
    if (!newData.mean) newData.mean = '2s';
    if (!newData.std_dev) newData.std_dev = '500ms';
    // Keep guardrails to ensure runtime still has deterministic wait range today.
    if (!newData.min) newData.min = '1s';
    if (!newData.max) newData.max = '3s';
    if (!newData.distribution) newData.distribution = 'normal';
    if (onNodeUpdate) onNodeUpdate(node.id, newData);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Think Time Mode
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {thinkTimeModes.map((m) => {
            const active = mode === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => handleModeChange(m.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active
                  ? 'border-current text-white'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                  }`}
                style={active ? thinkTimeModeButtonStyle[m.value] : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields */}
      {mode === 'fixed' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Duration
              </label>
              <Input
                value={fixedDuration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Examples: 1s, 500ms, 2m (seconds, milliseconds, minutes)
          </div>
        </>
      ) : mode === 'range' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={(e) => handleChange('min', e.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={(e) => handleChange('max', e.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            ℹ️ Random delay is chosen between min and max on each execution.
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Mean
              </label>
              <Input
                value={String(data.mean || '')}
                onChange={(e) => handleChange('mean', e.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Std Dev
              </label>
              <Input
                value={String(data.std_dev || '')}
                onChange={(e) => handleChange('std_dev', e.target.value)}
                placeholder="500ms"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={(e) => handleChange('min', e.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={(e) => handleChange('max', e.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Distribution
              </label>
              <select
                value={String(data.distribution || 'normal')}
                onChange={(e) => handleChange('distribution', e.target.value)}
                className="w-full h-[38px] px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono outline-none"
              >
                <option value="normal" className="bg-[#1a1a1a]">normal</option>
                <option value="uniform" className="bg-[#1a1a1a]">uniform</option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            ℹ️ Distribution mode applies normal(mean/std_dev) in runtime, bounded by min/max guardrails.
          </div>
        </>
      )}
    </div>
  );
}

function renderCookiesDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const mode = String(data.mode || 'auto').toLowerCase();
  const normalizedMode = mode === 'manual' ? 'manual' : 'auto';
  const policy = String(data.policy || 'standard').toLowerCase();
  const persistAcrossIterations = data.persist_across_iterations !== false;
  const clearEachIteration = data.clear_each_iteration === true;
  const seedCookies: Array<{ name?: string; value?: string; domain?: string; path?: string }> = Array.isArray(
    data.cookies,
  )
    ? data.cookies
    : [];

  const updateData = (nextData: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, nextData);
  };

  const handleChange = (field: string, value: any) => {
    updateData({ ...data, [field]: value });
  };

  const handleModeChange = (nextMode: 'auto' | 'manual') => {
    if (nextMode === 'auto') {
      updateData({
        ...data,
        mode: 'auto',
        policy: 'standard',
        jar_scope: 'vu',
      });
      return;
    }
    updateData({
      ...data,
      mode: 'manual',
      policy: policy || 'standard',
      jar_scope: data.jar_scope || 'vu',
      persist_across_iterations: data.persist_across_iterations ?? true,
      clear_each_iteration: data.clear_each_iteration ?? false,
      cookies: seedCookies,
    });
  };

  const handlePolicyChange = (nextPolicy: string) => {
    if (nextPolicy === 'ignore_cookies') {
      updateData({
        ...data,
        policy: 'ignore_cookies',
      });
      return;
    }
    updateData({
      ...data,
      policy: 'standard',
    });
  };

  const updateSeedCookie = (index: number, field: string, value: string) => {
    const next = [...seedCookies];
    next[index] = { ...(next[index] || {}), [field]: value };
    handleChange('cookies', next);
  };

  const addSeedCookie = () => {
    handleChange('cookies', [
      ...seedCookies,
      { name: '', value: '', domain: '', path: '/' },
    ]);
  };

  const removeSeedCookie = (index: number) => {
    handleChange(
      'cookies',
      seedCookies.filter((_: any, i: number) => i !== index)
    );
  };

  const effectiveClearEachIteration = persistAcrossIterations ? false : clearEachIteration;
  const isIgnorePolicy = policy === 'ignore_cookies';
  const invalidSeedRows = seedCookies
    .map((cookie, index) => ({ cookie, index }))
    .filter(({ cookie }) => !String(cookie?.name || '').trim() || !String(cookie?.domain || '').trim())
    .map(({ index }) => index);
  const summaryLine = normalizedMode === 'auto'
    ? 'Auto + Standard + VU scope'
    : `Manual + ${isIgnorePolicy ? 'Ignore Cookies' : 'Standard'} + ${String(data.jar_scope || 'vu').toUpperCase()} scope + Persist ${persistAcrossIterations ? 'ON' : 'OFF'}`;
  const cookieSelectorStyle = {
    auto: {
      backgroundColor: 'rgba(236, 72, 153, 0.20)',
      color: '#f9a8d4',
      borderColor: 'rgba(249, 168, 212, 0.50)',
      boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)',
    },
    manual: {
      backgroundColor: 'rgba(168, 85, 247, 0.20)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.50)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)',
    },
    standard: {
      backgroundColor: 'rgba(59, 130, 246, 0.20)',
      color: '#93c5fd',
      borderColor: 'rgba(147, 197, 253, 0.50)',
      boxShadow: '0 10px 22px rgba(59, 130, 246, 0.20)',
    },
    ignore_cookies: {
      backgroundColor: 'rgba(239, 68, 68, 0.20)',
      color: '#fca5a5',
      borderColor: 'rgba(252, 165, 165, 0.50)',
      boxShadow: '0 10px 22px rgba(239, 68, 68, 0.20)',
    },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Mode</label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleModeChange('auto')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${normalizedMode === 'auto'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={normalizedMode === 'auto' ? cookieSelectorStyle.auto : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Cpu className="h-3.5 w-3.5" />
              <span>Auto (Recommended)</span>
            </span>
          </button>
          <button
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${normalizedMode === 'manual'
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={normalizedMode === 'manual' ? cookieSelectorStyle.manual : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Cookie className="h-3.5 w-3.5" />
              <Hand className="h-3.5 w-3.5" />
              <span>Manual</span>
            </span>
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      {normalizedMode === 'auto' ? (
        <div className="rounded border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs text-zinc-300">
          Auto applies the recommended cookie behavior automatically.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Policy</label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => handlePolicyChange('standard')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${!isIgnorePolicy
                  ? 'border-current text-white'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                  }`}
                style={!isIgnorePolicy ? cookieSelectorStyle.standard : undefined}
              >
                Standard
              </button>
              <button
                onClick={() => handlePolicyChange('ignore_cookies')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${isIgnorePolicy
                  ? 'border-current text-white'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                  }`}
                style={isIgnorePolicy ? cookieSelectorStyle.ignore_cookies : undefined}
              >
                Ignore Cookies
              </button>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Quick Presets</label>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => updateData({ ...data, mode: 'manual', policy: 'standard', jar_scope: 'vu', persist_across_iterations: true, clear_each_iteration: false })}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-all duration-200"
              >
                Default
              </button>
              <button
                onClick={() => updateData({ ...data, mode: 'manual', policy: 'ignore_cookies' })}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-all duration-200"
              >
                Stateless
              </button>
              <button
                onClick={() => updateData({ ...data, mode: 'manual', policy: 'standard', jar_scope: 'vu', persist_across_iterations: false, clear_each_iteration: true })}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-all duration-200"
              >
                Clean Iteration
              </button>
            </div>
          </div>

          {isIgnorePolicy && (
            <div className="rounded border border-blue-400/20 bg-blue-400/5 px-3 py-2 text-xs text-zinc-300">
              Ignore Cookies is active: persistence, jar scope and seed cookies are disabled.
            </div>
          )}

          <div className={`grid grid-cols-3 gap-4 ${isIgnorePolicy ? 'opacity-50' : ''}`}>
            <SelectField
              label="Persist Across Iterations"
              value={persistAcrossIterations ? 'true' : 'false'}
              field="persist_across_iterations"
              onChange={(_, value) => handleChange('persist_across_iterations', value === 'true')}
              options={[
                { label: 'true', value: 'true' },
                { label: 'false', value: 'false' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
            <SelectField
              label="Clear Each Iteration"
              value={effectiveClearEachIteration ? 'true' : 'false'}
              field="clear_each_iteration"
              onChange={(_, value) => handleChange('clear_each_iteration', value === 'true')}
              options={[
                { label: 'false', value: 'false' },
                { label: 'true', value: 'true' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
            <SelectField
              label="Jar Scope"
              value={data.jar_scope || 'vu'}
              field="jar_scope"
              onChange={handleChange}
              options={[
                { label: 'vu', value: 'vu' },
                { label: 'scenario', value: 'scenario' },
              ]}
              disabled={isIgnorePolicy}
              noMargin
            />
          </div>

          <div className={`rounded border border-white/10 bg-white/5 p-3 ${isIgnorePolicy ? 'opacity-50' : ''}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Seed Cookies</span>
              <button
                onClick={addSeedCookie}
                disabled={isIgnorePolicy}
                className="flex items-center gap-1 rounded-full border border-current px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                style={!isIgnorePolicy ? {
                  backgroundColor: 'rgba(16, 185, 129, 0.22)',
                  color: '#6ee7b7',
                  borderColor: 'rgba(110, 231, 183, 0.55)',
                  boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
                } : undefined}
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {seedCookies.length === 0 ? (
              <div className="text-xs text-zinc-500">No seed cookies configured.</div>
            ) : (
              <div className="space-y-2">
                {seedCookies.map((cookie: any, index: number) => (
                  <div key={`${index}-${cookie?.name || 'cookie'}`} className="grid grid-cols-12 gap-2">
                    <Input
                      value={cookie?.name || ''}
                      disabled={isIgnorePolicy}
                      onChange={(e) => updateSeedCookie(index, 'name', e.target.value)}
                      placeholder="name"
                      className="col-span-3 h-[34px] bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.value || ''}
                      disabled={isIgnorePolicy}
                      onChange={(e) => updateSeedCookie(index, 'value', e.target.value)}
                      placeholder="value"
                      className="col-span-3 h-[34px] bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.domain || ''}
                      disabled={isIgnorePolicy}
                      onChange={(e) => updateSeedCookie(index, 'domain', e.target.value)}
                      placeholder="domain"
                      className="col-span-3 h-[34px] bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <Input
                      value={cookie?.path || '/'}
                      disabled={isIgnorePolicy}
                      onChange={(e) => updateSeedCookie(index, 'path', e.target.value)}
                      placeholder="/"
                      className="col-span-2 h-[34px] bg-[#1a1a1a] border-white/10 text-zinc-300 text-xs font-mono"
                    />
                    <button
                      onClick={() => removeSeedCookie(index)}
                      disabled={isIgnorePolicy}
                      className="col-span-1 rounded border border-red-400/30 bg-red-400/10 text-xs font-medium text-red-300 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {invalidSeedRows.length > 0 && (
              <div className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-200">
                Seed cookie validation: rows {invalidSeedRows.map((i) => i + 1).join(', ')} require both name and domain.
              </div>
            )}
          </div>
        </>
      )}
      <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
        {summaryLine}
      </div>
    </div>
  );
}

function renderCacheManagerDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  const enabled = data.enabled !== false;
  const clearEachIteration = data.clear_each_iteration !== false;
  const maxElements = String(
    data.max_elements ??
    (data.max_size_mb ? parseInt(String(data.max_size_mb), 10) : 1000)
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Cache</label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleChange('enabled', true)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${enabled
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={enabled ? {
              backgroundColor: 'rgba(16, 185, 129, 0.22)',
              color: '#6ee7b7',
              borderColor: 'rgba(110, 231, 183, 0.55)',
              boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
            } : undefined}
          >
            Enabled
          </button>
          <button
            onClick={() => handleChange('enabled', false)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${!enabled
              ? 'border-current text-white'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={!enabled ? {
              backgroundColor: 'rgba(244, 63, 94, 0.20)',
              color: '#fda4af',
              borderColor: 'rgba(253, 164, 175, 0.55)',
              boxShadow: '0 10px 22px rgba(244, 63, 94, 0.20)',
            } : undefined}
          >
            Disabled
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      <div className={`${!enabled ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <SelectField
            label="Clear Each Iteration"
            value={clearEachIteration ? 'true' : 'false'}
            field="clear_each_iteration"
            options={[
              { label: 'true', value: 'true' },
              { label: 'false', value: 'false' },
            ]}
            disabled={!enabled}
            onChange={(_, value) => handleChange('clear_each_iteration', value === 'true')}
            noMargin
          />

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Elements
            </label>
            <Input
              type="number"
              value={maxElements}
              disabled={!enabled}
              onChange={(e) => {
                const parsed = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                handleChange('max_elements', parsed);
              }}
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all"
            />
          </div>
        </div>

        <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
          {`Cache ${enabled ? 'ON' : 'OFF'} + ClearEachIteration ${clearEachIteration ? 'ON' : 'OFF'} + MaxElements ${maxElements}`}
        </div>
      </div>

    </div>
  );
}

function renderErrorPolicyDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  return <ErrorPolicyDetails node={node} onNodeUpdate={onNodeUpdate} />;
}

function ErrorPolicyDetails({ node, onNodeUpdate }: { node: YAMLNode; onNodeUpdate?: (nodeId: string, data: any) => void }): React.JSX.Element {
  const data = node.data || {};
  const activeRules = Array.isArray(data.active_rules)
    ? (data.active_rules.filter((r: string) => ['on_4xx', 'on_5xx', 'on_timeout'].includes(r)) as Array<'on_4xx' | 'on_5xx' | 'on_timeout'>)
    : [];


  const currentValueForRule = (rule: 'on_4xx' | 'on_5xx' | 'on_timeout') =>
    String(data[rule] || (rule === 'on_4xx' ? 'continue' : 'stop'));

  const updateData = (nextData: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, nextData);
  };

  const handleRuleClick = (rule: 'on_4xx' | 'on_5xx' | 'on_timeout') => {
    const nextActiveRules = activeRules.includes(rule)
      ? activeRules.filter((r) => r !== rule)
      : [...activeRules, rule];
    updateData({ ...data, active_rules: nextActiveRules });
  };

  const tabStyle = {
    on_4xx: {
      backgroundColor: 'rgba(245, 158, 11, 0.20)',
      color: '#fcd34d',
      borderColor: 'rgba(252, 211, 77, 0.50)',
      boxShadow: '0 10px 22px rgba(245, 158, 11, 0.20)',
    },
    on_5xx: {
      backgroundColor: 'rgba(244, 63, 94, 0.20)',
      color: '#fda4af',
      borderColor: 'rgba(253, 164, 175, 0.55)',
      boxShadow: '0 10px 22px rgba(244, 63, 94, 0.20)',
    },
    on_timeout: {
      backgroundColor: 'rgba(56, 189, 248, 0.20)',
      color: '#7dd3fc',
      borderColor: 'rgba(125, 211, 252, 0.55)',
      boxShadow: '0 10px 22px rgba(56, 189, 248, 0.20)',
    },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Rules</label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleRuleClick('on_4xx')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_4xx')
              ? 'border-current text-white ring-1 ring-white/30'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={activeRules.includes('on_4xx') ? tabStyle.on_4xx : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>On 4xx</span>
            </span>
          </button>
          <button
            onClick={() => handleRuleClick('on_5xx')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_5xx')
              ? 'border-current text-white ring-1 ring-white/30'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={activeRules.includes('on_5xx') ? tabStyle.on_5xx : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <ServerCrash className="h-3.5 w-3.5" />
              <span>On 5xx</span>
            </span>
          </button>
          <button
            onClick={() => handleRuleClick('on_timeout')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${activeRules.includes('on_timeout')
              ? 'border-current text-white ring-1 ring-white/30'
              : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
              }`}
            style={activeRules.includes('on_timeout') ? tabStyle.on_timeout : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>On Timeout</span>
            </span>
          </button>
        </div>
      </div>
      <div className="h-px bg-white/10" />

      <div className="grid grid-cols-3 gap-4">
        {(['on_4xx', 'on_5xx', 'on_timeout'] as const).map((rule) => {
          const isActive = activeRules.includes(rule);
          const label = rule === 'on_4xx'
            ? 'On 4xx Action'
            : rule === 'on_5xx'
              ? 'On 5xx Action'
              : 'On Timeout Action';

          return (
            <div key={rule} className={isActive ? '' : 'opacity-50'}>
              <SelectField
                label={label}
                value={currentValueForRule(rule)}
                field={rule}
                onChange={(_, value) => updateData({ ...data, [rule]: value })}
                options={[
                  { label: 'continue', value: 'continue' },
                  { label: 'stop', value: 'stop' },
                ]}
                disabled={!isActive}
                noMargin
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderMetricsDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Enabled</label>
        <select
          value={data.enabled ? 'true' : 'false'}
          onChange={(e) => handleChange('enabled', e.target.value === 'true')}
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
      <EditableField label="Collect Interval" value={data.collect_interval || ''} field="collect_interval" onChange={handleChange} />
    </div>
  );
}

// 🔥 SPARK SCRIPT DETAILS (Editable with Syntax Highlighting)
function renderSparkDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};

  const handleScriptChange = (newScript: string) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, script: newScript });
    }
  };

  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {'</>'} Spark Script (JavaScript)
        </label>
        <SparkCodeEditor
          value={data.script || ''}
          onChange={handleScriptChange}
          placeholder="// Write your JavaScript code here..."
          minHeight="280px"
        />
      </div>
    </>
  );
}

// ASSERTION DETAILS (Pulse format - Editable with Conditional Fields)
function renderAssertionDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const assertionType = data.type || 'status';
  const isAssertionTypeSelectionAllowed = data.__allowTypeSelection === true;
  const lockedAssertionType = typeof data.__lockedType === 'string' && data.__lockedType.trim() !== ''
    ? data.__lockedType.trim()
    : '';
  const effectiveAssertionLockedType = lockedAssertionType || assertionType;
  const isAssertionTypeLocked = !isAssertionTypeSelectionAllowed && effectiveAssertionLockedType !== '';
  const assertionTypes = [
    { value: 'status', label: 'Status', icon: CheckCircle2 },
    { value: 'status_in', label: 'Status in', icon: CheckCircle2 },
    { value: 'contains', label: 'Contains', icon: Search },
    { value: 'not_contains', label: 'Not contains', icon: SearchX },
    { value: 'regex', label: 'Regex', icon: TextSearch },
    { value: 'response_time', label: 'Response time', icon: Clock3 },
    { value: 'response_size', label: 'Response size', icon: Binary },
    { value: 'header', label: 'Header', icon: Tag },
    { value: 'json', label: 'Jsonpath', icon: Braces },
  ] as const;
  const assertionTypeButtonStyle: Record<string, React.CSSProperties> = {
    status: {
      backgroundColor: 'rgba(34, 197, 94, 0.20)',
      color: '#86efac',
      borderColor: 'rgba(134, 239, 172, 0.50)',
      boxShadow: '0 10px 22px rgba(34, 197, 94, 0.20)',
    },
    status_in: {
      backgroundColor: 'rgba(34, 197, 94, 0.20)',
      color: '#86efac',
      borderColor: 'rgba(134, 239, 172, 0.50)',
      boxShadow: '0 10px 22px rgba(34, 197, 94, 0.20)',
    },
    contains: {
      backgroundColor: 'rgba(56, 189, 248, 0.20)',
      color: '#7dd3fc',
      borderColor: 'rgba(125, 211, 252, 0.50)',
      boxShadow: '0 10px 22px rgba(56, 189, 248, 0.20)',
    },
    not_contains: {
      backgroundColor: 'rgba(245, 158, 11, 0.20)',
      color: '#fcd34d',
      borderColor: 'rgba(252, 211, 77, 0.50)',
      boxShadow: '0 10px 22px rgba(245, 158, 11, 0.20)',
    },
    regex: {
      backgroundColor: 'rgba(168, 85, 247, 0.20)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.50)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)',
    },
    response_time: {
      backgroundColor: 'rgba(249, 115, 22, 0.20)',
      color: '#fdba74',
      borderColor: 'rgba(253, 186, 116, 0.50)',
      boxShadow: '0 10px 22px rgba(249, 115, 22, 0.20)',
    },
    response_size: {
      backgroundColor: 'rgba(99, 102, 241, 0.20)',
      color: '#a5b4fc',
      borderColor: 'rgba(165, 180, 252, 0.50)',
      boxShadow: '0 10px 22px rgba(99, 102, 241, 0.20)',
    },
    header: {
      backgroundColor: 'rgba(236, 72, 153, 0.20)',
      color: '#f9a8d4',
      borderColor: 'rgba(249, 168, 212, 0.50)',
      boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)',
    },
    json: {
      backgroundColor: 'rgba(6, 182, 212, 0.20)',
      color: '#67e8f9',
      borderColor: 'rgba(103, 232, 249, 0.50)',
      boxShadow: '0 10px 22px rgba(6, 182, 212, 0.20)',
    },
  };

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      if (field === 'type' && isAssertionTypeLocked && value !== effectiveAssertionLockedType) {
        return;
      }
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };

  return (
    <>
      {/* Assertion Type Selector (single-select pills) */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Assertion Type
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {assertionTypes.map((type) => {
            const active = assertionType === type.value;
            const disabled = isAssertionTypeLocked && type.value !== effectiveAssertionLockedType;
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                disabled={disabled}
                onClick={() => handleChange('type', type.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active
                  ? 'border-current text-white'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                  }`}
                style={active ? assertionTypeButtonStyle[type.value] : undefined}
                aria-disabled={disabled}
              >
                <span className={`inline-flex items-center gap-1.5 ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {isAssertionTypeLocked && (
          <p className="mt-2 text-xs text-zinc-500">
            Type locked to <span className="text-zinc-300 font-mono">{effectiveAssertionLockedType}</span> after loading or saving.
          </p>
        )}
      </div>

      {/* Conditional Fields Based on Type */}
      {(assertionType === 'status' || assertionType === 'status_in') && (
        <div className="mb-4 grid grid-cols-1 gap-3 items-end">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            {assertionType === 'status' ? 'Expected Status Code' : 'Expected Status Codes (comma separated)'}
          </label>
          <Input
            value={data.value !== undefined ? String(data.value) : ''}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder={assertionType === 'status' ? '200' : '200, 201, 204'}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all"
          />
        </div>
      )}

      {(assertionType === 'contains' || assertionType === 'not_contains') && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Text to {assertionType === 'contains' ? 'Find' : 'Not Find'}
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="Expected text in response..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all"
            />
          </div>
          <div className="h-[38px] flex items-center">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={data.ignore_case || false}
                onChange={(e) => handleChange('ignore_case', e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-green-500"
              />
              <span className="text-sm text-zinc-300">Ignore case</span>
            </label>
          </div>
        </div>
      )}

      {assertionType === 'regex' && (
        <div className="mb-4 flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Regular Expression Pattern
            </label>
            <Input
              value={data.pattern || ''}
              onChange={(e) => handleChange('pattern', e.target.value)}
              placeholder="token=([a-f0-9]+)"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="w-[150px] shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Match Number
            </label>
            <Input
              type="number"
              value={data.match_no !== undefined && data.match_no !== null ? data.match_no : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  handleChange('match_no', '');
                  return;
                }
                const parsed = parseInt(raw, 10);
                handleChange('match_no', Number.isNaN(parsed) ? '' : parsed);
              }}
              placeholder="1"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {assertionType === 'response_time' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Max Response Time (ms)
          </label>
          <Input
            type="number"
            value={data.max_ms !== undefined ? data.max_ms : ''}
            onChange={(e) => handleChange('max_ms', parseInt(e.target.value) || 0)}
            placeholder="2000"
            className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
          />
        </div>
      )}

      {assertionType === 'response_size' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Expected Size (bytes)
          </label>
          <Input
            type="number"
            value={data.size !== undefined ? data.size : ''}
            onChange={(e) => handleChange('size', parseInt(e.target.value) || 0)}
            placeholder="1024"
            className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
          />
        </div>
      )}

      {assertionType === 'header' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Header Name
            </label>
            <Input
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Content-Type, Authorization..."
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Expected Header Value
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="application/json"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {assertionType === 'json' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              JSONPath Expression
            </label>
            <Input
              value={data.path || ''}
              onChange={(e) => handleChange('path', e.target.value)}
              placeholder="$.data.id"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Expected Value
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="123"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </div>
      )}
    </>
  );
}

// EXTRACTOR DETAILS (Pulse format - Editable with Conditional Fields)
function renderExtractorDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const extractorType = data.type || 'regex';
  const isExtractorTypeSelectionAllowed = data.__allowTypeSelection === true;
  const lockedExtractorType = typeof data.__lockedType === 'string' && data.__lockedType.trim() !== ''
    ? data.__lockedType.trim()
    : '';
  const effectiveExtractorLockedType = lockedExtractorType || extractorType;
  const isExtractorTypeLocked = !isExtractorTypeSelectionAllowed && effectiveExtractorLockedType !== '';
  const extractorTypes = [
    { value: 'regex', label: 'Regex', icon: TextSearch },
    { value: 'jsonpath', label: 'Jsonpath', icon: Braces },
    { value: 'xpath', label: 'Xpath', icon: Brackets },
    { value: 'boundary', label: 'Boundary', icon: BetweenHorizontalStart },
  ] as const;
  const extractorTypeButtonStyle: Record<string, React.CSSProperties> = {
    regex: {
      backgroundColor: 'rgba(168, 85, 247, 0.20)',
      color: '#d8b4fe',
      borderColor: 'rgba(216, 180, 254, 0.50)',
      boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)',
    },
    jsonpath: {
      backgroundColor: 'rgba(6, 182, 212, 0.20)',
      color: '#67e8f9',
      borderColor: 'rgba(103, 232, 249, 0.50)',
      boxShadow: '0 10px 22px rgba(6, 182, 212, 0.20)',
    },
    xpath: {
      backgroundColor: 'rgba(236, 72, 153, 0.20)',
      color: '#f9a8d4',
      borderColor: 'rgba(249, 168, 212, 0.50)',
      boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)',
    },
    boundary: {
      backgroundColor: 'rgba(249, 115, 22, 0.20)',
      color: '#fdba74',
      borderColor: 'rgba(253, 186, 116, 0.50)',
      boxShadow: '0 10px 22px rgba(249, 115, 22, 0.20)',
    },
  };
  const extractorVariableName = data.var ?? data.variable ?? '';
  const extractorSource = data.from || 'body';

  const getExtractorDefaults = (type: string) => {
    if (type === 'regex') {
      return {
        type: 'regex',
        from: 'body',
        pattern: data.pattern || '',
        capture_mode: data.capture_mode || 'first',
        capture_index: data.capture_index || '2',
        group: data.group ?? 1,
        default: data.default || '',
      };
    }
    if (type === 'jsonpath') {
      return {
        type: 'jsonpath',
        from: data.from || 'body',
        expression: data.expression || data.pattern || '$.data.id',
        default: data.default || '',
      };
    }
    if (type === 'xpath') {
      return {
        type: 'xpath',
        from: data.from || 'body',
        expression: data.expression || data.pattern || '//title/text()',
        namespace: data.namespace || '',
        default: data.default || '',
      };
    }
    return {
      type: 'boundary',
      from: data.from || 'body',
      left_boundary: data.left_boundary || '<title>',
      right_boundary: data.right_boundary || '</title>',
      default: data.default || '',
    };
  };

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      if (field === 'var') {
        // Keep legacy `variable` in sync so clearing the field does not restore old fallback values.
        onNodeUpdate(node.id, { ...data, var: value, variable: value });
        return;
      }
      if (field === 'type') {
        if (isExtractorTypeLocked && value !== effectiveExtractorLockedType) {
          return;
        }
        onNodeUpdate(node.id, { ...data, ...getExtractorDefaults(value), var: extractorVariableName, variable: extractorVariableName });
        return;
      }
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };

  return (
    <>
      {/* Extractor Type */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Extractor Type
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {extractorTypes.map((type) => {
            const active = extractorType === type.value;
            const disabled = isExtractorTypeLocked && type.value !== effectiveExtractorLockedType;
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                disabled={disabled}
                onClick={() => handleChange('type', type.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active
                  ? 'border-current text-white'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                  }`}
                style={active ? extractorTypeButtonStyle[type.value] : undefined}
                aria-disabled={disabled}
              >
                <span className={`inline-flex items-center gap-1.5 ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {isExtractorTypeLocked && (
          <p className="mt-2 text-xs text-zinc-500">
            Type locked to <span className="text-zinc-300 font-mono">{effectiveExtractorLockedType}</span> after loading or saving.
          </p>
        )}
      </div>

      {/* Variable Name - common to all types */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Variable Name *
        </label>
        <Input
          value={extractorVariableName}
          onChange={(e) => handleChange('var', e.target.value)}
          placeholder="extracted_value"
          maxLength={50}
          className="w-full max-w-[360px] px-3 py-2 bg-purple-400/5 border border-purple-400/20 text-purple-400 text-sm font-mono font-bold focus:border-purple-400/40"
        />
      </div>

      {/* Conditional Fields Based on Type */}
      {extractorType === 'regex' && (
        <>
          <div className="mb-4 flex items-end gap-3">
            <div className="w-[220px] shrink-0">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Extractor From
              </label>
              <select
                value={extractorSource}
                onChange={(e) => handleChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="body" className="bg-zinc-900">body</option>
                <option value="headers" className="bg-zinc-900">headers</option>
                <option value="status_line" className="bg-zinc-900">status_line</option>
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Regular Expression Pattern *
              </label>
              <Input
                value={data.pattern || ''}
                onChange={(e) => handleChange('pattern', e.target.value)}
                placeholder="token=([a-zA-Z0-9_-]+)"
                className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
          <div className="mb-4 mt-[-4px]">
            <div className="text-xs text-zinc-500">
              Variable: {'{{'}{extractorVariableName || 'VAR'}{'}'} | Use capture groups () in pattern
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Capture Mode
              </label>
              <select
                value={data.capture_mode || 'first'}
                onChange={(e) => handleChange('capture_mode', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="first" className="bg-zinc-900">first match</option>
                <option value="all" className="bg-zinc-900">all matches</option>
                <option value="index" className="bg-zinc-900">specific match index</option>
                <option value="random" className="bg-zinc-900">random match</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Capture Group
              </label>
              <Input
                type="number"
                min={1}
                value={data.group !== undefined ? data.group : 1}
                onChange={(e) => handleChange('group', parseInt(e.target.value, 10) || 1)}
                placeholder="1"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Default Value (if not found)
              </label>
              <Input
                value={data.default || ''}
                onChange={(e) => handleChange('default', e.target.value)}
                placeholder="NOT_FOUND"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
          {String(data.capture_mode || 'first') === 'index' && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Match Index
              </label>
              <Input
                type="number"
                min={1}
                value={data.capture_index !== undefined ? data.capture_index : '2'}
                onChange={(e) => handleChange('capture_index', e.target.value)}
                placeholder="2"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          )}
          <div className="mb-4">
            <div className="mt-1 text-xs text-zinc-500">
              Group 1 = first (...) in your regex
            </div>
          </div>
        </>
      )}

      {extractorType === 'jsonpath' && (
        <>
          <div className="mb-4 flex items-end gap-3">
            <div className="w-[220px] shrink-0">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Extractor From
              </label>
              <select
                value={extractorSource}
                onChange={(e) => handleChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="body" className="bg-zinc-900">body</option>
                <option value="headers" className="bg-zinc-900">headers</option>
                <option value="status_line" className="bg-zinc-900">status_line</option>
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                JSONPath Expression *
              </label>
              <Input
                value={data.expression || data.pattern || ''}
                onChange={(e) => handleChange('expression', e.target.value)}
                placeholder="$.data.id"
                className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
          <div className="mb-4 mt-[-4px]">
            <div className="mt-1 text-xs text-zinc-500">
              Examples: $.users[0].name, $.data[*].id, $..price
            </div>
          </div>
        </>
      )}

      {extractorType === 'xpath' && (
        <>
          <div className="mb-4 flex items-end gap-3">
            <div className="w-[220px] shrink-0">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Extractor From
              </label>
              <select
                value={extractorSource}
                onChange={(e) => handleChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="body" className="bg-zinc-900">body</option>
                <option value="headers" className="bg-zinc-900">headers</option>
                <option value="status_line" className="bg-zinc-900">status_line</option>
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                XPath Expression *
              </label>
              <Input
                value={data.expression || data.pattern || ''}
                onChange={(e) => handleChange('expression', e.target.value)}
                placeholder="//div[@class='title']/text()"
                className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
          <div className="mb-4 mt-[-4px]">
            <div className="mt-1 text-xs text-zinc-500">
              Extract data from XML/HTML using XPath
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Namespace (optional)
              </label>
              <Input
                value={data.namespace || ''}
                onChange={(e) => handleChange('namespace', e.target.value)}
                placeholder="xmlns:ns=http://example.com"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Default Value (if not found)
              </label>
              <Input
                value={data.default || ''}
                onChange={(e) => handleChange('default', e.target.value)}
                placeholder="NOT_FOUND"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
        </>
      )}

      {extractorType === 'boundary' && (
        <>
          <div className="mb-4 flex items-end gap-3">
            <div className="w-[220px] shrink-0">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Extractor From
              </label>
              <select
                value={extractorSource}
                onChange={(e) => handleChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              >
                <option value="body" className="bg-zinc-900">body</option>
                <option value="headers" className="bg-zinc-900">headers</option>
                <option value="status_line" className="bg-zinc-900">status_line</option>
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Left Boundary *
              </label>
              <Input
                value={data.left_boundary || ''}
                onChange={(e) => handleChange('left_boundary', e.target.value)}
                placeholder="&lt;title&gt;"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Right Boundary *
              </label>
              <Input
                value={data.right_boundary || ''}
                onChange={(e) => handleChange('right_boundary', e.target.value)}
                placeholder="&lt;/title&gt;"
                className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
            </div>
          </div>
        </>
      )}

      {/* Default Value - Common to all non-regex/xpath types */}
      {extractorType !== 'regex' && extractorType !== 'xpath' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Default Value (if not found)
          </label>
          <Input
            value={data.default || ''}
            onChange={(e) => handleChange('default', e.target.value)}
            placeholder="NOT_FOUND"
            className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
          />
        </div>
      )}
    </>
  );
}

// HEADER DETAILS
function renderHeaderDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };

  // Sugerencias de headers comunes
  const commonHeaders = [
    'Authorization',
    'Content-Type',
    'Accept',
    'User-Agent',
    'Accept-Language',
    'Accept-Encoding',
    'Cache-Control',
    'X-Api-Key',
    'X-Requested-With',
  ];

  return (
    <div className="space-y-4">
      <div className="py-3 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/[0.02] transition-colors group">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0 w-[70px]">
            <Input
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Content-Type"
              list="header-names-list"
              className="flex-1 px-2 py-1 text-xs font-mono text-purple-400 font-bold bg-purple-400/5 border-purple-400/20 focus:border-purple-400/40"
            />
            <span className="text-zinc-500 font-bold shrink-0">=</span>
          </div>
          <div className="w-0 flex-1 min-w-0">
            <Input
              value={data.value || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="application/json"
              className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        <datalist id="header-names-list">
          {commonHeaders.map(header => (
            <option key={header} value={header} />
          ))}
        </datalist>
      </div>

      {/* Info box */}
      <div className="p-3 bg-slate-400/5 border border-slate-400/20 rounded text-xs text-zinc-400">
        🏷️ This header will be sent with the HTTP request
      </div>
    </div>
  );
}

// HEADERS CONTAINER DETAILS
function renderHeadersDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};

  const handleUpdate = (items: Record<string, string>) => {
    if (!onNodeUpdate) return;
    onNodeUpdate(node.id, items);
  };

  return (
    <>
      <EditableList
        title="HTTP Headers"
        items={data}
        onUpdate={handleUpdate}
        keyPlaceholder="Header-Name"
        valuePlaceholder="Header value"
        keyLabel="Header Name"
        valueLabel="Value"
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
      />

      {/* Info box */}
      <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded text-xs text-zinc-400">
        🏷️ These headers will be sent with the HTTP request
      </div>
    </>
  );
}

// FILE UPLOAD DETAILS
function renderFileDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): React.JSX.Element {
  const data = node.data || {};
  const pathValue = String(data.path || '').trim();
  const mimeValue = String(data.mime || data.mime_type || '').trim();

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) return;
    const raw = String(value ?? '');

    if (field === 'path') {
      const nextData: Record<string, any> = { ...data, path: raw };
      // Backend requires files[].field; use a safe fallback for better UX.
      if (!String(nextData.field || '').trim() && raw.trim()) {
        nextData.field = 'file';
      }
      onNodeUpdate(node.id, nextData);
      return;
    }

    if (field === 'mime' || field === 'mime_type') {
      const { mime_type: _legacyMimeType, ...rest } = data;
      onNodeUpdate(node.id, { ...rest, mime: raw });
      return;
    }

    onNodeUpdate(node.id, { ...data, [field]: raw });
  };

  // MIME types comunes
  const commonMimeTypes = [
    'application/pdf',
    'application/json',
    'application/xml',
    'application/zip',
    'text/plain',
    'text/csv',
    'text/html',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'audio/mpeg',
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
        <FileField
          label="File Path"
          value={data.path || ''}
          field="path"
          onChange={handleChange}
          noMargin
        />
        </div>

        <div className="min-w-0">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            MIME Type
          </label>
          <select
            value={mimeValue}
            onChange={(e) => handleChange('mime', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono h-[38px] outline-none"
          >
            <option value="" className="bg-[#1a1a1a]">application/octet-stream</option>
            {commonMimeTypes.map((mime) => (
              <option key={mime} value={mime} className="bg-[#1a1a1a]">
                {mime}
              </option>
            ))}
            {mimeValue && !commonMimeTypes.includes(mimeValue) && (
              <option value={mimeValue} className="bg-[#1a1a1a]">
                {mimeValue}
              </option>
            )}
          </select>
          <div className="mt-1 text-xs text-zinc-500">
            Common: application/pdf, image/jpeg, text/csv
          </div>
        </div>
      </div>

      {!pathValue && (
        <div className="mb-4 p-3 bg-red-400/8 border border-red-400/25 rounded text-xs text-red-300">
          Required: path
        </div>
      )}

      {/* Info box */}
      <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded text-xs text-zinc-400">
        📎 This file will be uploaded as multipart/form-data
      </div>
    </>
  );
}

function renderGenericDetails(node: YAMLNode): React.JSX.Element {
  if (!node.data || Object.keys(node.data).length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No additional properties
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        Properties
      </label>
      <pre className="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
        {JSON.stringify(node.data, null, 2)}
      </pre>
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  value: any;
  mono?: boolean;
  small?: boolean;
  editable?: boolean;
  onChange?: (value: any) => void;
  multiline?: boolean;
}

function DetailField({ label, value, mono, small, editable = true, onChange, multiline }: DetailFieldProps) {
  if (!editable) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {label}
        </label>
        <div className={`px-3 py-2 bg-white/5 border border-white/10 rounded ${small ? 'text-xs' : 'text-sm'} text-zinc-300 ${mono ? 'font-mono' : ''}`}>
          {String(value)}
        </div>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {label}
        </label>
        <Textarea
          value={String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''} min-h-[80px]`}
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <Input
        value={String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}
