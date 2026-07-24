import { Info, Upload } from 'lucide-react';
import React, { useId, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AuthConfig } from '../../types/yaml';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: 'text' | 'number';
  maxLength?: number;
  commitMode?: 'blur' | 'change';
  noMargin?: boolean;
}

export function EditableField({
  label,
  value,
  field,
  onChange,
  type = 'text',
  maxLength,
  commitMode = 'blur',
  noMargin = false,
}: EditableFieldProps) {
  // localValue is a buffered copy of `value` (committed on blur, or on every
  // keystroke for commitMode 'change'). It must re-sync whenever `value`
  // itself changes identity — e.g. this field instance gets reused for a
  // different underlying node/field — even mid-edit, matching the previous
  // effect-based behavior. Uses the store-previous-prop-and-compare-during
  // -render pattern instead of an effect so the reset lands in the same
  // render as the prop change instead of one render later.
  const [localValue, setLocalValue] = useState(String(value || ''));
  const [trackedValue, setTrackedValue] = useState(value);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setLocalValue(String(value || ''));
  }
  const inputId = useId();

  return (
    <div className={noMargin ? '' : 'mb-5'}>
      <label htmlFor={inputId} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input
        id={inputId}
        type={type}
        value={localValue}
        onChange={event => {
          const nextValue = event.target.value;
          setLocalValue(nextValue);
          if (commitMode === 'change') {
            onChange(field, nextValue);
          }
        }}
        onBlur={() => {
          if (commitMode === 'blur') {
            onChange(field, localValue);
          }
        }}
        maxLength={maxLength}
        className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-colors"
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
  const selectId = useId();
  return (
    <div className={noMargin ? '' : 'mb-5'}>
      <label htmlFor={selectId} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Select
        value={value}
        onValueChange={value => onChange(field, value)}
        disabled={disabled}
      >
        <SelectTrigger
          id={selectId}
          disabled={disabled}
          className="w-full h-9.5 border-white/10 bg-[#1a1a1a] text-zinc-300 font-mono data-[disabled]:opacity-60 data-[disabled]:cursor-not-allowed"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10">
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
    </div>
  );
}

interface FileFieldProps extends EditableFieldProps {
  noMargin?: boolean;
  showPathHint?: boolean;
  browseEnabled?: boolean;
  uploadFile?: (file: File) => Promise<string>;
  accept?: string;
}

export function FileField({
  label,
  value,
  field,
  onChange,
  noMargin = false,
  showPathHint = false,
  browseEnabled = true,
  uploadFile,
  accept,
}: FileFieldProps) {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pathHintId = useId();
  const requiresPathCapablePicker = showPathHint;
  const isBrowseDisabled = !browseEnabled || (requiresPathCapablePicker && !uploadFile);
  const showUnavailableHint = showPathHint && isBrowseDisabled;

  const handleBrowseClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isBrowseDisabled) return;

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadError(null);
    if (uploadFile) {
      try {
        setIsUploading(true);
        const path = await uploadFile(file);
        onChange(field, path);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'File upload failed');
      } finally {
        setIsUploading(false);
        event.target.value = '';
      }
      return;
    }
    onChange(field, file.name);
    event.target.value = '';
  };

  return (
    <div className={noMargin ? '' : 'mb-5'}>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</div>
      <div className="flex gap-2">
        <Input
          value={String(value || '')}
          onChange={event => onChange(field, event.target.value)}
          placeholder="path/to/file.csv"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono h-9.5"
          title={String(value || '')}
          aria-describedby={showUnavailableHint ? pathHintId : undefined}
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          disabled={isBrowseDisabled || isUploading}
          aria-describedby={showUnavailableHint ? pathHintId : undefined}
          title={
            isBrowseDisabled
              ? !browseEnabled
                ? language === 'es'
                  ? 'Disponible solo cuando ejecutas Relampo Studio localmente'
                  : 'Available only when running Relampo Studio locally'
                : language === 'es'
                  ? 'No hay un selector de archivos con ruta local disponible'
                  : 'No path-capable file picker is available'
              : undefined
          }
          className="px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/20 text-sm font-medium transition-colors flex items-center gap-2 shrink-0 h-9.5 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-500 disabled:hover:bg-white/5"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? (language === 'es' ? 'Subiendo...' : 'Uploading...') : t('yamlEditor.common.browse')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isBrowseDisabled}
          className="hidden"
        />
      </div>
      {uploadError && <p className="mt-2 text-xs text-red-300">{uploadError}</p>}
      {showUnavailableHint && (
        <div
          id={pathHintId}
          className="alert-info rounded-md p-3 text-[13px] flex items-start gap-2 mt-4"
        >
          <Info className="alert-info-icon w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {language === 'es' ? (
              <>
                La selección de archivos de datos solo está disponible cuando ejecutas Relampo Studio localmente. En el
                editor web no podemos acceder a archivos locales; escribe una ruta relativa o nombre de archivo que exista
                donde correrá relampo run.
              </>
            ) : (
              <>
                Data source file browsing is only available when running Relampo Studio locally. In the web editor, local
                files are not accessible; enter a relative path or file name that exists where relampo run will execute.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

type EditableAuthType = 'none' | 'bearer' | 'api_key' | 'basic';
type EditableAuthConfig = AuthConfig & { type: EditableAuthType };

function isAuthRecord(auth: unknown): auth is Record<string, unknown> {
  return !!auth && typeof auth === 'object' && !Array.isArray(auth);
}

function normalizeAuthEditorValue(auth: unknown): EditableAuthConfig {
  const source = isAuthRecord(auth) ? auth : {};
  const type = typeof source.type === 'string' ? source.type.trim().toLowerCase() : '';

  if (type === 'bearer') {
    return { type, token: typeof source.token === 'string' ? source.token : '' };
  }

  if (type === 'api_key') {
    return {
      type,
      name: typeof source.name === 'string' ? source.name : '',
      value: typeof source.value === 'string' ? source.value : '',
      in: source.in === 'query' ? 'query' : 'header',
    };
  }

  if (type === 'basic') {
    return {
      type,
      username: typeof source.username === 'string' ? source.username : '',
      password: typeof source.password === 'string' ? source.password : '',
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
  const authId = useId();

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
        <label htmlFor={`${authId}-type`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {scopeLabel} Authentication
        </label>
        <Select
          value={value.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger id={`${authId}-type`} className="w-full h-9.5 border-white/10 bg-[#1a1a1a] text-zinc-300 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10">
            <SelectItem value="none" className="font-mono">None</SelectItem>
            <SelectItem value="bearer" className="font-mono">Bearer</SelectItem>
            <SelectItem value="api_key" className="font-mono">API Key</SelectItem>
            <SelectItem value="basic" className="font-mono">Basic Auth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.type === 'bearer' && (
        <div>
          <label htmlFor={`${authId}-token`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Token</label>
          <Input
            id={`${authId}-token`}
            type="password"
            value={value.token || ''}
            onChange={event => handleFieldChange('token', event.target.value)}
            placeholder="{{api_token}}"
            className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
        </div>
      )}

      {value.type === 'api_key' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${authId}-key-name`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Key Name</label>
            <Input
              id={`${authId}-key-name`}
              value={value.name || ''}
              onChange={event => handleFieldChange('name', event.target.value)}
              placeholder="X-API-Key"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label htmlFor={`${authId}-send-in`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Send In</label>
            <Select
              value={value.in || 'header'}
              onValueChange={value => handleFieldChange('in', value)}
            >
              <SelectTrigger id={`${authId}-send-in`} className="w-full h-9.5 border-white/10 bg-[#1a1a1a] text-zinc-300 font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10">
                <SelectItem value="header" className="font-mono">Header</SelectItem>
                <SelectItem value="query" className="font-mono">Query Param</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor={`${authId}-key-value`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Key Value</label>
            <Input
              id={`${authId}-key-value`}
              type="password"
              value={value.value || ''}
              onChange={event => handleFieldChange('value', event.target.value)}
              placeholder="{{api_key}}"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
        </div>
      )}

      {value.type === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${authId}-username`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Username</label>
            <Input
              id={`${authId}-username`}
              value={value.username || ''}
              onChange={event => handleFieldChange('username', event.target.value)}
              placeholder="{{username}}"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div>
            <label htmlFor={`${authId}-password`} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Password</label>
            <Input
              id={`${authId}-password`}
              type="password"
              value={value.password || ''}
              onChange={event => handleFieldChange('password', event.target.value)}
              placeholder="{{password}}"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
  value: string | number | boolean | null | undefined;
  mono?: boolean;
  small?: boolean;
  editable?: boolean;
  onChange?: (value: string) => void;
  multiline?: boolean;
  noMargin?: boolean;
}

export function DetailField({
  label,
  value,
  mono,
  small,
  editable = true,
  onChange,
  multiline,
  noMargin = false,
}: DetailFieldProps) {
  const fieldId = useId();

  if (!editable) {
    return (
      <div className={noMargin ? '' : 'mb-4'}>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</div>
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
      <div className={noMargin ? '' : 'mb-4'}>
        <label htmlFor={fieldId} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
        <Textarea
          id={fieldId}
          value={String(value)}
          onChange={event => onChange?.(event.target.value)}
          className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''} min-h-20`}
        />
      </div>
    );
  }

  return (
    <div className={noMargin ? '' : 'mb-4'}>
      <label htmlFor={fieldId} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input
        id={fieldId}
        value={String(value)}
        onChange={event => onChange?.(event.target.value)}
        className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}
