import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AuthConfig } from '../../types/yaml';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: 'text' | 'number';
  maxLength?: number;
}

export function EditableField({ label, value, field, onChange, type = 'text', maxLength }: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(String(value || ''));

  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);

  const isNameField = label.toLowerCase().includes('name');

  return (
    <div className="mb-5">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input
        type={type}
        value={localValue}
        onChange={event => setLocalValue(event.target.value)}
        onBlur={() => onChange(field, localValue)}
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
  noMargin?: boolean;
}

export function SelectField({
  label,
  value,
  field,
  options,
  onChange,
  disabled = false,
  noMargin = false,
}: SelectFieldProps) {
  return (
    <div className={noMargin ? '' : 'mb-5'}>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={event => onChange(field, event.target.value)}
        className={`w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#1a1a1a]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FileFieldProps extends EditableFieldProps {
  noMargin?: boolean;
  showPathHint?: boolean;
}

export function FileField({ label, value, field, onChange, noMargin = false, showPathHint = false }: FileFieldProps) {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = async (event: React.MouseEvent) => {
    event.preventDefault();

    if ((window as any).electron?.selectFile) {
      try {
        let path = await (window as any).electron.selectFile();
        if (Array.isArray(path)) {
          path = path[0];
        }
        if (path) {
          onChange(field, path);
        }
        return;
      } catch (error) {
        console.error('Electron file selection failed:', error);
      }
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const path = (file as any).path || file.name;
    onChange(field, path);
  };

  return (
    <div className={noMargin ? '' : 'mb-5'}>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <div className="flex gap-2">
        <Input
          value={String(value || '')}
          onChange={event => onChange(field, event.target.value)}
          placeholder="path/to/file.csv"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono h-[38px]"
          title={String(value || '')}
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          className="px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/20 text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 h-[38px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line
              x1="12"
              y1="3"
              x2="12"
              y2="15"
            />
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
              <p>
                Local: en modo navegador, el selector de archivos normalmente solo devuelve el nombre del archivo. Copia
                y pega la ruta completa del CSV/TXT si vas a ejecutar este script localmente.
              </p>
              <p>
                Distribuido: usa solo el nombre del archivo o una ruta relativa (por ejemplo, users.csv). Relampo
                resuelve el resto automáticamente desde los nodos distribuidos.
              </p>
            </>
          ) : (
            <>
              <p>
                Local: in browser mode, the file picker usually returns only the file name. Copy/paste the full CSV/TXT
                path if you will run this script locally.
              </p>
              <p>
                Distributed: use only file name or relative path (for example, users.csv). Relampo resolves the
                remaining path details automatically across distributed nodes.
              </p>
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

function authEditorValueToData(auth: EditableAuthConfig): AuthConfig | undefined {
  if (auth.type === 'none') {
    return undefined;
  }
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

export function AuthConfigEditor({ auth, onChange, scopeLabel }: AuthConfigEditorProps) {
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
    onChange(
      authEditorValueToData({
        ...value,
        [field]: nextValue,
      } as EditableAuthConfig),
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {scopeLabel} Authentication
        </label>
        <select
          value={value.type}
          onChange={event => handleTypeChange(event.target.value)}
          className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px]"
        >
          <option
            value="none"
            className="bg-[#1a1a1a]"
          >
            None
          </option>
          <option
            value="bearer"
            className="bg-[#1a1a1a]"
          >
            Bearer
          </option>
          <option
            value="api_key"
            className="bg-[#1a1a1a]"
          >
            API Key
          </option>
          <option
            value="basic"
            className="bg-[#1a1a1a]"
          >
            Basic Auth
          </option>
        </select>
      </div>

      {value.type === 'bearer' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Token</label>
          <Input
            type="password"
            value={value.token || ''}
            onChange={event => handleFieldChange('token', event.target.value)}
            placeholder="{{api_token}}"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>
      )}

      {value.type === 'api_key' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Key Name</label>
            <Input
              value={value.name || ''}
              onChange={event => handleFieldChange('name', event.target.value)}
              placeholder="X-API-Key"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Send In</label>
            <select
              value={value.in || 'header'}
              onChange={event => handleFieldChange('in', event.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all outline-none appearance-none h-[38px]"
            >
              <option
                value="header"
                className="bg-[#1a1a1a]"
              >
                Header
              </option>
              <option
                value="query"
                className="bg-[#1a1a1a]"
              >
                Query Param
              </option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Key Value</label>
            <Input
              type="password"
              value={value.value || ''}
              onChange={event => handleFieldChange('value', event.target.value)}
              placeholder="{{api_key}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      )}

      {value.type === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Username</label>
            <Input
              value={value.username || ''}
              onChange={event => handleFieldChange('username', event.target.value)}
              placeholder="{{username}}"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Password</label>
            <Input
              type="password"
              value={value.password || ''}
              onChange={event => handleFieldChange('password', event.target.value)}
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

interface DetailFieldProps {
  label: string;
  value: any;
  mono?: boolean;
  small?: boolean;
  editable?: boolean;
  onChange?: (value: any) => void;
  multiline?: boolean;
}

export function DetailField({ label, value, mono, small, editable = true, onChange, multiline }: DetailFieldProps) {
  if (!editable) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
        <div
          className={`px-3 py-2 bg-white/5 border border-white/10 rounded ${small ? 'text-xs' : 'text-sm'} text-zinc-300 ${mono ? 'font-mono' : ''}`}
        >
          {String(value)}
        </div>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
        <Textarea
          value={String(value)}
          onChange={event => onChange?.(event.target.value)}
          className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''} min-h-[80px]`}
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input
        value={String(value)}
        onChange={event => onChange?.(event.target.value)}
        className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}
