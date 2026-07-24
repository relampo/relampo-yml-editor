import Editor from '@monaco-editor/react';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { JSX, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { StringMap } from '../../types/shared';
import type { YAMLValue } from '../../types/yaml';
import type { SearchMode } from '../debugSearch';
import { Input } from '../ui/input';

export type BodyType = 'none' | 'json' | 'form' | 'raw';

interface HighlightedTextProps {
  text: string;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
}

function HighlightedText({ text, searchText, searchMode, currentMatchIndex }: HighlightedTextProps) {
  if (!searchText || !text) return <>{text}</>;
  const ranges = findMatchRanges(text, searchText, searchMode);
  if (ranges.length === 0) return <>{text}</>;
  const nodes: Array<JSX.Element | string> = [];
  let cursor = 0;
  ranges.forEach((r, idx) => {
    if (cursor < r.start) nodes.push(text.slice(cursor, r.start));
    const isActive = idx === currentMatchIndex;
    nodes.push(
      <mark
        key={`${r.start}-${r.end}`}
        data-match-index={idx}
        className={
          isActive
            ? 'bg-yellow-300 text-black ring-2 ring-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.45)] rounded-sm'
            : 'bg-yellow-300/80 text-black rounded-sm'
        }
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

interface BodyTypeSelectorProps {
  body: YAMLValue;
  onBodyChange: (body: YAMLValue, type: BodyType) => void;
  contentType?: string;
  bodyRaw?: YAMLValue;
  className?: string;
  searchText?: string;
  searchMode?: SearchMode;
  currentMatchIndex?: number;
  hideTypeLabel?: boolean;
}

interface FormDataItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

function createFormDataItem(overrides: Partial<Omit<FormDataItem, 'id'>> = {}): FormDataItem {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true, ...overrides };
}

const MONACO_SWITCH_LINE_THRESHOLD = 2000;
const MONACO_SWITCH_SIZE_THRESHOLD = 120 * 1024;
const BODY_FIXED_HEIGHT = 300;
const BODY_SYNC_UNSET = Symbol('body-sync-unset');

function isBodyRecord(value: unknown): value is Record<string, YAMLValue> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isYAMLValue(value: unknown): value is YAMLValue {
  if (value == null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isYAMLValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isYAMLValue);
  }
  return false;
}

function hasBodyContent(body: YAMLValue): boolean {
  return !(
    body == null ||
    body === '' ||
    (Array.isArray(body) && body.length === 0) ||
    (isBodyRecord(body) && Object.keys(body).length === 0)
  );
}

function getContentTypeBodyType(contentType: string | undefined): BodyType | null {
  const mime = contentType?.toLowerCase().split(';', 1)[0]?.trim();
  if (!mime) return null;
  if (mime === 'application/json' || mime.endsWith('+json')) return 'json';
  if (mime === 'application/x-www-form-urlencoded' || mime === 'multipart/form-data') return 'form';
  return null;
}

function getBodyEditorText(value: YAMLValue): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return JSON.stringify(value, null, 2);
}

function getJsonEditorText(body: YAMLValue, bodyRaw: YAMLValue): string {
  if ((body == null || body === '') && typeof bodyRaw === 'string') return bodyRaw;
  return getBodyEditorText(body);
}

function parseFormText(value: string): FormDataItem[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams(trimmed);
  const items = Array.from(params.entries()).map(([key, itemValue]) => createFormDataItem({ key, value: itemValue }));

  return items.length > 0 ? items : null;
}

function toFormDataItemsFromRecord(body: Record<string, YAMLValue>): FormDataItem[] {
  return Object.entries(body).map(([key, value]) => createFormDataItem({ key, value: value == null ? '' : String(value) }));
}

function getFormDataItems(body: YAMLValue, bodyRaw: YAMLValue): FormDataItem[] {
  const stringItems = typeof body === 'string' ? parseFormText(body) : null;
  if (stringItems) return stringItems;

  if (Array.isArray(body)) {
    const items = body.flatMap(item => (isBodyRecord(item) ? toFormDataItemsFromRecord(item) : []));
    return items.length > 0 ? items : [createFormDataItem()];
  }

  if (isBodyRecord(body)) {
    const items = toFormDataItemsFromRecord(body);
    return items.length > 0 ? items : [createFormDataItem()];
  }

  const rawItems = typeof bodyRaw === 'string' ? parseFormText(bodyRaw) : null;
  if (rawItems) return rawItems;

  return [createFormDataItem()];
}

function inferBodyType(body: YAMLValue, bodyRaw: YAMLValue, contentType: string | undefined): BodyType {
  const contentBodyType = getContentTypeBodyType(contentType);
  if (contentBodyType) return contentBodyType;

  if (!hasBodyContent(body) && typeof bodyRaw === 'string' && bodyRaw.trim()) return 'raw';

  if (typeof body === 'string') {
    try {
      JSON.parse(body);
      return 'json';
    } catch {
      return 'raw';
    }
  }

  if (Array.isArray(body)) return 'json';

  if (isBodyRecord(body)) {
    const keys = Object.keys(body);
    const seemsLikeFormData = keys.every(k => typeof body[k] === 'string' || typeof body[k] === 'number');
    return seemsLikeFormData && keys.length <= 20 ? 'form' : 'json';
  }

  return 'raw';
}

function shouldUseMonaco(text: string): boolean {
  if (!text) return false;
  const lines = text.split('\n').length;
  const bytes = new Blob([text]).size;
  return lines > MONACO_SWITCH_LINE_THRESHOLD || bytes > MONACO_SWITCH_SIZE_THRESHOLD;
}

function buildFormBody(items: FormDataItem[], asArray: boolean): YAMLValue {
  const enabledItems = items.filter(item => item.enabled && item.key.trim());
  if (asArray) {
    return enabledItems.map(item => ({ [item.key]: item.value }));
  }

  const obj: StringMap = {};
  enabledItems.forEach(item => {
    obj[item.key] = item.value;
  });
  return obj;
}

interface TextBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  language: 'json' | 'plaintext';
  useMonaco: boolean;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  highlightRef: RefObject<HTMLPreElement | null>;
  onFocus: () => void;
  onBlur: () => void;
  onScroll: () => void;
}

function TextBodyEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  language,
  useMonaco,
  searchText,
  searchMode,
  currentMatchIndex,
  textareaRef,
  highlightRef,
  onFocus,
  onBlur,
  onScroll,
}: TextBodyEditorProps) {
  if (useMonaco) {
    return (
      <div
        className="w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
        style={{
          height: BODY_FIXED_HEIGHT,
          minHeight: BODY_FIXED_HEIGHT,
        }}
      >
        <MonacoBodyEditor
          value={value}
          onChange={onChange}
          language={language}
          searchText={searchText}
          searchMode={searchMode}
          currentMatchIndex={currentMatchIndex}
        />
      </div>
    );
  }

  if (searchText) {
    return (
      <div
        className="relative w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
        style={{
          height: BODY_FIXED_HEIGHT,
          minHeight: BODY_FIXED_HEIGHT,
        }}
      >
        <pre
          ref={highlightRef}
          className="absolute inset-0 m-0 p-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-y-auto overflow-x-auto pointer-events-none"
        >
          <HighlightedText
            text={value}
            searchText={searchText}
            searchMode={searchMode}
            currentMatchIndex={currentMatchIndex}
          />
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onScroll={onScroll}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{ height: '100%', minHeight: '100%' }}
          className="relative w-full h-full bg-transparent border-0 text-transparent caret-zinc-200 text-sm font-mono resize-none overflow-y-auto overflow-x-auto selection:bg-yellow-200/40 outline-none p-3"
        />
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{
        height: BODY_FIXED_HEIGHT,
        minHeight: BODY_FIXED_HEIGHT,
      }}
      className="w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3"
    />
  );
}

interface FormDataFieldsProps {
  items: FormDataItem[];
  onFieldChange: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function FormDataFields({ items, onFieldChange, onAdd, onRemove }: FormDataFieldsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Form Data (application/x-www-form-urlencoded)
        </span>
        <button type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Field
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2"
          >
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={e => onFieldChange(index, 'enabled', e.target.checked)}
              aria-label={item.key ? `Enable ${item.key}` : 'Enable field'}
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <Input
              value={item.key}
              onChange={e => onFieldChange(index, 'key', e.target.value)}
              placeholder="field_name"
              className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
            <span className="text-zinc-600">=</span>
            <Input
              value={item.value}
              onChange={e => onFieldChange(index, 'value', e.target.value)}
              placeholder="value"
              className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
            <button type="button"
              onClick={() => onRemove(index)}
              aria-label={item.key ? `Remove ${item.key}` : 'Remove field'}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const BODY_TYPE_OPTIONS: Array<{ type: BodyType; label: string }> = [
  { type: 'none', label: 'None' },
  { type: 'json', label: 'JSON' },
  { type: 'form', label: 'Form Data' },
  { type: 'raw', label: 'Raw Text' },
];

interface BodyTypeToggleProps {
  bodyType: BodyType;
  onChange: (type: BodyType) => void;
  hideLabel: boolean;
  error: string;
}

function BodyTypeToggle({ bodyType, onChange, hideLabel, error }: BodyTypeToggleProps) {
  return (
    <div className="mb-4">
      {!hideLabel && (
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Body Type</p>
      )}
      <div className="flex gap-2">
        {BODY_TYPE_OPTIONS.map(({ type, label }) => (
          <button type="button"
            key={type}
            onClick={() => onChange(type)}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              bodyType === type
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-zinc-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
          {error}
        </div>
      )}
    </div>
  );
}

function useBodySearchSync(
  bodyType: BodyType,
  searchText: string,
  searchMode: SearchMode,
  currentMatchIndex: number,
  jsonValue: string,
  rawValue: string,
  jsonTextareaRef: RefObject<HTMLTextAreaElement | null>,
  rawTextareaRef: RefObject<HTMLTextAreaElement | null>,
  jsonHighlightRef: RefObject<HTMLPreElement | null>,
  rawHighlightRef: RefObject<HTMLPreElement | null>,
) {
  useEffect(() => {
    if (!searchText) return;
    if (bodyType !== 'json' && bodyType !== 'raw') return;
    const highlight =
      bodyType === 'json' ? jsonHighlightRef.current : bodyType === 'raw' ? rawHighlightRef.current : null;
    const textarea = bodyType === 'json' ? jsonTextareaRef.current : bodyType === 'raw' ? rawTextareaRef.current : null;
    if (!highlight) return;

    const raf = requestAnimationFrame(() => {
      const activeMark = highlight.querySelector(`mark[data-match-index="${currentMatchIndex}"]`) as HTMLElement | null;
      if (!activeMark) return;
      activeMark.scrollIntoView({ block: 'center', inline: 'nearest' });

      if (textarea) {
        textarea.scrollTop = highlight.scrollTop;
        textarea.scrollLeft = highlight.scrollLeft;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [searchText, currentMatchIndex, bodyType, jsonValue, rawValue, jsonHighlightRef, rawHighlightRef, jsonTextareaRef, rawTextareaRef]);

  useEffect(() => {
    if (!searchText) return;
    if (bodyType !== 'json' && bodyType !== 'raw') return;
    const text = bodyType === 'json' ? jsonValue : rawValue;
    const ranges = findMatchRanges(text, searchText, searchMode);
    const current = ranges[currentMatchIndex];
    const textarea = bodyType === 'json' ? jsonTextareaRef.current : rawTextareaRef.current;
    if (!textarea || !current) return;

    const raf = requestAnimationFrame(() => {
      textarea.setSelectionRange(current.start, current.end);
    });

    return () => cancelAnimationFrame(raf);
  }, [searchText, searchMode, currentMatchIndex, bodyType, jsonValue, rawValue, jsonTextareaRef, rawTextareaRef]);
}

export function BodyTypeSelector({
  body,
  onBodyChange,
  contentType,
  bodyRaw,
  className = '',
  searchText = '',
  searchMode = 'text',
  currentMatchIndex = 0,
  hideTypeLabel = false,
}: BodyTypeSelectorProps) {
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [typeSwitchError, setTypeSwitchError] = useState('');
  const [, setIsEditingJson] = useState(false);
  const [, setIsEditingRaw] = useState(false);
  const [formData, setFormData] = useState<FormDataItem[]>([createFormDataItem()]);
  const jsonTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const jsonHighlightRef = useRef<HTMLPreElement | null>(null);
  const rawHighlightRef = useRef<HTMLPreElement | null>(null);

  // Body/bodyRaw/contentType are the source of truth (e.g. switching between
  // YAML nodes); the local editing buffers below mirror them. Re-derived here
  // during render rather than in an effect (the React-sanctioned
  // "adjust state on prop change" pattern: store the last-seen props and
  // conditionally setState when they differ) so the sync lands before paint.
  const [syncedProps, setSyncedProps] = useState<
    { body: YAMLValue; bodyRaw: YAMLValue | undefined; contentType: string | undefined } | typeof BODY_SYNC_UNSET
  >(BODY_SYNC_UNSET);

  if (
    syncedProps === BODY_SYNC_UNSET ||
    body !== syncedProps.body ||
    bodyRaw !== syncedProps.bodyRaw ||
    contentType !== syncedProps.contentType
  ) {
    setSyncedProps({ body, bodyRaw, contentType });

    const hasBodyRaw = typeof bodyRaw === 'string' && bodyRaw.trim().length > 0;
    if (!hasBodyRaw && !hasBodyContent(body)) {
      setBodyType('none');
    } else {
      const nextBodyType = inferBodyType(body, bodyRaw, contentType);
      setBodyType(nextBodyType);

      if (nextBodyType === 'json') {
        setJsonValue(getJsonEditorText(body, bodyRaw));
      } else if (nextBodyType === 'form') {
        setFormData(getFormDataItems(body, bodyRaw));
      } else {
        setRawValue(!hasBodyContent(body) && typeof bodyRaw === 'string' ? bodyRaw : getBodyEditorText(body));
      }
    }
  }

  const handleBodyTypeChange = (newType: BodyType) => {
    const hasCurrentBodyContent = () => {
      if (bodyType === 'json') return jsonValue.trim().length > 0;
      if (bodyType === 'raw') return rawValue.trim().length > 0;
      if (bodyType === 'form') {
        return formData.some(item => item.key.trim().length > 0 || item.value.trim().length > 0);
      }
      return false;
    };

    if (newType !== bodyType && hasCurrentBodyContent()) {
      setTypeSwitchError('Clear current body content before changing Body Type.');
      return;
    }

    setBodyType(newType);
    setTypeSwitchError('');

    setJsonError('');

    if (newType === 'none') {
      onBodyChange(null, newType);
    } else if (newType === 'json' && bodyType === 'form') {
      const obj: StringMap = {};
      formData.forEach(item => {
        if (item.enabled && item.key) {
          obj[item.key] = item.value;
        }
      });
      setJsonValue(JSON.stringify(obj, null, 2));
      onBodyChange(obj, newType);
    } else if (newType === 'form' && bodyType === 'json') {
      try {
        const parsed: unknown = JSON.parse(jsonValue);
        if (!isBodyRecord(parsed)) {
          setFormData([createFormDataItem()]);
          return;
        }
        const items: FormDataItem[] = Object.entries(parsed).map(([k, v]) => createFormDataItem({ key: k, value: String(v) }));
        setFormData(items.length > 0 ? items : [createFormDataItem()]);
        onBodyChange(parsed, newType);
      } catch {
        setFormData([createFormDataItem()]);
      }
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    if (typeSwitchError && value.trim().length === 0) {
      setTypeSwitchError('');
    }

    try {
      const parsed: unknown = JSON.parse(value);
      if (!isYAMLValue(parsed)) {
        setJsonError('Unsupported JSON value');
        onBodyChange(value, 'json');
        return;
      }
      setJsonError('');
      onBodyChange(parsed, 'json');
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
      onBodyChange(value, 'json');
    }
  };

  const handleRawChange = (value: string) => {
    setRawValue(value);
    if (typeSwitchError && value.trim().length === 0) {
      setTypeSwitchError('');
    }
    onBodyChange(value, 'raw');
  };

  const handleFormDataChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    setFormData(newFormData);
    if (typeSwitchError) {
      const hasAny = newFormData.some(item => item.key.trim().length > 0 || item.value.trim().length > 0);
      if (!hasAny) setTypeSwitchError('');
    }

    onBodyChange(buildFormBody(newFormData, Array.isArray(body)), 'form');
  };

  const handleAddFormDataItem = () => {
    setFormData([...formData, createFormDataItem()]);
  };

  const handleRemoveFormDataItem = (index: number) => {
    const newFormData = formData.filter((_, i) => i !== index);
    const normalized = newFormData.length > 0 ? newFormData : [createFormDataItem()];
    setFormData(normalized);
    if (typeSwitchError) {
      const hasAny = normalized.some(item => item.key.trim().length > 0 || item.value.trim().length > 0);
      if (!hasAny) setTypeSwitchError('');
    }

    onBodyChange(buildFormBody(newFormData, Array.isArray(body)), 'form');
  };

  const useMonacoForJson = useMemo(() => shouldUseMonaco(jsonValue), [jsonValue]);
  const useMonacoForRaw = useMemo(() => shouldUseMonaco(rawValue), [rawValue]);

  const syncScroll = (type: 'json' | 'raw') => {
    const textarea = type === 'json' ? jsonTextareaRef.current : rawTextareaRef.current;
    const highlight = type === 'json' ? jsonHighlightRef.current : rawHighlightRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  useBodySearchSync(
    bodyType,
    searchText,
    searchMode,
    currentMatchIndex,
    jsonValue,
    rawValue,
    jsonTextareaRef,
    rawTextareaRef,
    jsonHighlightRef,
    rawHighlightRef,
  );

  return (
    <div className={className}>
      <BodyTypeToggle
        bodyType={bodyType}
        onChange={handleBodyTypeChange}
        hideLabel={hideTypeLabel}
        error={typeSwitchError}
      />

      {bodyType === 'json' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">JSON Body</span>
            {jsonError ? (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                Invalid JSON
              </div>
            ) : (
              jsonValue && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Valid JSON
                </div>
              )
            )}
          </div>
          <TextBodyEditor
            value={jsonValue}
            onChange={handleJsonChange}
            placeholder='{\n  "key": "value"\n}'
            ariaLabel="JSON body"
            language="json"
            useMonaco={useMonacoForJson}
            searchText={searchText}
            searchMode={searchMode}
            currentMatchIndex={currentMatchIndex}
            textareaRef={jsonTextareaRef}
            highlightRef={jsonHighlightRef}
            onFocus={() => setIsEditingJson(true)}
            onBlur={() => setIsEditingJson(false)}
            onScroll={() => syncScroll('json')}
          />
          {jsonError && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
              {jsonError}
            </div>
          )}
        </div>
      )}

      {bodyType === 'form' && (
        <FormDataFields
          items={formData}
          onFieldChange={handleFormDataChange}
          onAdd={handleAddFormDataItem}
          onRemove={handleRemoveFormDataItem}
        />
      )}

      {bodyType === 'raw' && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Raw Body (text/plain)
          </p>
          <TextBodyEditor
            value={rawValue}
            onChange={handleRawChange}
            placeholder="Enter raw text content..."
            ariaLabel="Raw body text"
            language="plaintext"
            useMonaco={useMonacoForRaw}
            searchText={searchText}
            searchMode={searchMode}
            currentMatchIndex={currentMatchIndex}
            textareaRef={rawTextareaRef}
            highlightRef={rawHighlightRef}
            onFocus={() => setIsEditingRaw(true)}
            onBlur={() => setIsEditingRaw(false)}
            onScroll={() => syncScroll('raw')}
          />
        </div>
      )}

      {bodyType === 'none' && (
        <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
          No body content
        </div>
      )}
    </div>
  );
}

interface MonacoBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'json' | 'plaintext';
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
}

function offsetToPosition(text: string, offset: number) {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  let lineNumber = 1;
  let column = 1;
  for (let i = 0; i < safeOffset; i += 1) {
    if (text[i] === '\n') {
      lineNumber += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { lineNumber, column };
}

function MonacoBodyEditor({
  value,
  onChange,
  language,
  searchText,
  searchMode,
  currentMatchIndex,
}: MonacoBodyEditorProps) {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);

  const matchRanges = useMemo(() => findMatchRanges(value, searchText, searchMode), [value, searchText, searchMode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!decorationsRef.current) {
      decorationsRef.current = editor.createDecorationsCollection([]);
    }
    if (!searchText || matchRanges.length === 0) {
      decorationsRef.current.set([]);
      return;
    }

    const decorations: MonacoEditorNS.IModelDeltaDecoration[] = matchRanges.map((r, idx) => {
      const start = offsetToPosition(value, r.start);
      const end = offsetToPosition(value, r.end);
      return {
        range: {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        },
        options: {
          inlineClassName: idx === currentMatchIndex ? 'relampo-find-current' : 'relampo-find-match',
        },
      };
    });

    decorationsRef.current.set(decorations);
  }, [value, searchText, matchRanges, currentMatchIndex]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !searchText || matchRanges.length === 0) return;
    const current = matchRanges[currentMatchIndex];
    if (!current) return;
    const start = offsetToPosition(value, current.start);
    const end = offsetToPosition(value, current.end);
    const range = {
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    };
    editor.setSelection(range);
    editor.revealRangeInCenterIfOutsideViewport(range);
    editor.revealRangeInCenter(range);
  }, [value, searchText, matchRanges, currentMatchIndex]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        value={value}
        onMount={editor => {
          editorRef.current = editor;
          decorationsRef.current = editor.createDecorationsCollection([]);
        }}
        onChange={next => onChange(next || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 13,
          padding: { top: 10, bottom: 10 },
          renderLineHighlight: 'none',
        }}
      />
      <style>{`
        .relampo-find-match {
          background-color: rgba(253, 224, 71, 0.75);
          color: #000000;
          border-radius: 2px;
        }
        .relampo-find-current {
          background-color: rgba(253, 224, 71, 1);
          color: #000000;
          outline: 2px solid rgba(245, 158, 11, 1);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.45);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// The regex `pattern` here is intentionally used unescaped: this branch only runs when
// `mode === 'regex'`, i.e. the user explicitly opted into regex search and is authoring
// the pattern themselves (mirrors the canonical implementation in debugSearch.ts).
// Escaping it would defeat the regex-search feature; literal search is handled by the
// `mode === 'text'` branch above. Invalid patterns are caught and yield no matches.
function findMatchRanges(text: string, pattern: string, mode: SearchMode): Array<{ start: number; end: number }> {
  if (!text || !pattern) return [];
  if (mode === 'text') {
    const ranges: Array<{ start: number; end: number }> = [];
    const hay = text.toLowerCase();
    const needle = pattern.toLowerCase();
    let pos = 0;
    while (pos <= hay.length - needle.length) {
      const idx = hay.indexOf(needle, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + needle.length });
      pos = idx + Math.max(needle.length, 1);
    }
    return ranges;
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern, 'gi');
  } catch {
    return [];
  }
  const ranges: Array<{ start: number; end: number }> = [];
  for (const m of text.matchAll(re)) {
    const start = m.index ?? -1;
    if (start < 0) continue;
    const full = m[0] ?? '';
    const g1 = m.length > 1 ? (m[1] ?? '') : '';
    let s = start;
    let e = start + full.length;
    if (g1) {
      const rel = full.indexOf(g1);
      if (rel >= 0) {
        s = start + rel;
        e = s + g1.length;
      }
    }
    ranges.push({ start: s, end: e });
    if (full.length === 0) break;
  }
  return ranges;
}
