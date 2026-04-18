import Editor from '@monaco-editor/react';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { JSX, useEffect, useMemo, useRef, useState } from 'react';
import type { StringMap } from '../../types/shared';
import { Input } from '../ui/input';

type BodyType = 'none' | 'json' | 'form' | 'raw';
type SearchMode = 'text' | 'regex';

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
        key={`${r.start}-${r.end}-${idx}`}
        data-match-index={idx}
        className={
          isActive
            ? 'bg-yellow-300 text-black ring-2 ring-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.45)] rounded-sm'
            : 'rounded-sm'
        }
        style={isActive ? undefined : { backgroundColor: 'rgba(59,130,246,0.4)', color: '#dbeafe' }}
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
  body: any;
  onBodyChange: (body: any, type: BodyType) => void;
  className?: string;
  searchText?: string;
  searchMode?: SearchMode;
  currentMatchIndex?: number;
  hideTypeLabel?: boolean;
}

interface FormDataItem {
  key: string;
  value: string;
  enabled: boolean;
}

const MONACO_SWITCH_LINE_THRESHOLD = 2000;
const MONACO_SWITCH_SIZE_THRESHOLD = 120 * 1024;
const BODY_FIXED_HEIGHT = 300;

export function BodyTypeSelector({
  body,
  onBodyChange,
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
  const [formData, setFormData] = useState<FormDataItem[]>([{ key: '', value: '', enabled: true }]);
  const jsonTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const jsonHighlightRef = useRef<HTMLPreElement | null>(null);
  const rawHighlightRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!body || Object.keys(body).length === 0) {
      setBodyType('none');
      return;
    }

    if (typeof body === 'string') {
      try {
        JSON.parse(body);
        setBodyType('json');
        setJsonValue(body);
      } catch {
        setBodyType('raw');
        setRawValue(body);
      }
    } else if (typeof body === 'object') {
      const keys = Object.keys(body);
      const seemsLikeFormData = keys.every(k => typeof body[k] === 'string' || typeof body[k] === 'number');

      if (seemsLikeFormData && keys.length <= 20) {
        setBodyType('form');
        const items: FormDataItem[] = keys.map(k => ({
          key: k,
          value: String(body[k]),
          enabled: true,
        }));
        setFormData(items.length > 0 ? items : [{ key: '', value: '', enabled: true }]);
      } else {
        setBodyType('json');
        setJsonValue(JSON.stringify(body, null, 2));
      }
    }
  }, [body]);

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
      formData
        .filter(item => item.enabled && item.key)
        .forEach(item => {
          obj[item.key] = item.value;
        });
      setJsonValue(JSON.stringify(obj, null, 2));
      onBodyChange(obj, newType);
    } else if (newType === 'form' && bodyType === 'json') {
      try {
        const obj = JSON.parse(jsonValue);
        const items: FormDataItem[] = Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: String(v),
          enabled: true,
        }));
        setFormData(items.length > 0 ? items : [{ key: '', value: '', enabled: true }]);
        onBodyChange(obj, newType);
      } catch {
        setFormData([{ key: '', value: '', enabled: true }]);
      }
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    if (typeSwitchError && value.trim().length === 0) {
      setTypeSwitchError('');
    }

    try {
      const parsed = JSON.parse(value);
      setJsonError('');
      onBodyChange(parsed, 'json');
    } catch (e: any) {
      setJsonError(e.message);
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

  const shouldUseMonaco = (text: string) => {
    if (!text) return false;
    const lines = text.split('\n').length;
    const bytes = new Blob([text]).size;
    return lines > MONACO_SWITCH_LINE_THRESHOLD || bytes > MONACO_SWITCH_SIZE_THRESHOLD;
  };

  const handleFormDataChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    setFormData(newFormData);
    if (typeSwitchError) {
      const hasAny = newFormData.some(item => item.key.trim().length > 0 || item.value.trim().length > 0);
      if (!hasAny) setTypeSwitchError('');
    }

    const obj: StringMap = {};
    newFormData
      .filter(item => item.enabled && item.key.trim())
      .forEach(item => {
        obj[item.key] = item.value;
      });
    onBodyChange(obj, 'form');
  };

  const handleAddFormDataItem = () => {
    setFormData([...formData, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveFormDataItem = (index: number) => {
    const newFormData = formData.filter((_, i) => i !== index);
    const normalized = newFormData.length > 0 ? newFormData : [{ key: '', value: '', enabled: true }];
    setFormData(normalized);
    if (typeSwitchError) {
      const hasAny = normalized.some(item => item.key.trim().length > 0 || item.value.trim().length > 0);
      if (!hasAny) setTypeSwitchError('');
    }

    const obj: StringMap = {};
    newFormData
      .filter(item => item.enabled && item.key.trim())
      .forEach(item => {
        obj[item.key] = item.value;
      });
    onBodyChange(obj, 'form');
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
  }, [searchText, currentMatchIndex, bodyType, jsonValue, rawValue]);

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
  }, [searchText, searchMode, currentMatchIndex, bodyType, jsonValue, rawValue]);

  return (
    <div className={className}>
      <div className="mb-4">
        {!hideTypeLabel && (
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Body Type</p>
        )}
        <div className="flex gap-2">
          {[
            { type: 'none' as BodyType, label: 'None' },
            { type: 'json' as BodyType, label: 'JSON' },
            { type: 'form' as BodyType, label: 'Form Data' },
            { type: 'raw' as BodyType, label: 'Raw Text' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleBodyTypeChange(type)}
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
        {typeSwitchError && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
            {typeSwitchError}
          </div>
        )}
      </div>

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
          {useMonacoForJson ? (
            <div
              className="w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
            >
              <MonacoBodyEditor
                value={jsonValue}
                onChange={handleJsonChange}
                language="json"
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
              />
            </div>
          ) : searchText ? (
            <div
              className="relative w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
            >
              <pre
                ref={jsonHighlightRef}
                className="absolute inset-0 m-0 p-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-y-auto overflow-x-auto pointer-events-none"
              >
                <HighlightedText
                  text={jsonValue}
                  searchText={searchText}
                  searchMode={searchMode}
                  currentMatchIndex={currentMatchIndex}
                />
              </pre>
              <textarea
                ref={jsonTextareaRef}
                value={jsonValue}
                onChange={e => handleJsonChange(e.target.value)}
                onScroll={() => syncScroll('json')}
                onFocus={() => setIsEditingJson(true)}
                onBlur={() => setIsEditingJson(false)}
                placeholder='{\n  "key": "value"\n}'
                style={{ height: '100%', minHeight: '100%' }}
                className="relative w-full h-full bg-transparent border-0 text-transparent caret-zinc-200 text-sm font-mono resize-none overflow-y-auto overflow-x-auto selection:bg-yellow-200/40 outline-none p-3"
              />
            </div>
          ) : (
            <textarea
              value={jsonValue}
              onChange={e => handleJsonChange(e.target.value)}
              placeholder='{\n  "key": "value"\n}'
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
              className="w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3"
            />
          )}
          {jsonError && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
              {jsonError}
            </div>
          )}
        </div>
      )}

      {bodyType === 'form' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Form Data (application/x-www-form-urlencoded)
            </span>
            <button
              onClick={handleAddFormDataItem}
              className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Field
            </button>
          </div>
          <div className="space-y-2">
            {formData.map((item, index) => (
              <div
                key={item.key || index}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={e => handleFormDataChange(index, 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <Input
                  value={item.key}
                  onChange={e => handleFormDataChange(index, 'key', e.target.value)}
                  placeholder="field_name"
                  className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
                />
                <span className="text-zinc-600">=</span>
                <Input
                  value={item.value}
                  onChange={e => handleFormDataChange(index, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
                />
                <button
                  onClick={() => handleRemoveFormDataItem(index)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {bodyType === 'raw' && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Raw Body (text/plain)
          </p>
          {useMonacoForRaw ? (
            <div
              className="w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
            >
              <MonacoBodyEditor
                value={rawValue}
                onChange={handleRawChange}
                language="plaintext"
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
              />
            </div>
          ) : searchText ? (
            <div
              className="relative w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
            >
              <pre
                ref={rawHighlightRef}
                className="absolute inset-0 m-0 p-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-y-auto overflow-x-auto pointer-events-none"
              >
                <HighlightedText
                  text={rawValue}
                  searchText={searchText}
                  searchMode={searchMode}
                  currentMatchIndex={currentMatchIndex}
                />
              </pre>
              <textarea
                ref={rawTextareaRef}
                value={rawValue}
                onChange={e => handleRawChange(e.target.value)}
                onScroll={() => syncScroll('raw')}
                onFocus={() => setIsEditingRaw(true)}
                onBlur={() => setIsEditingRaw(false)}
                placeholder="Enter raw text content..."
                style={{ height: '100%', minHeight: '100%' }}
                className="relative w-full h-full bg-transparent border-0 text-transparent caret-zinc-200 text-sm font-mono resize-none overflow-y-auto overflow-x-auto selection:bg-yellow-200/40 outline-none p-3"
              />
            </div>
          ) : (
            <textarea
              value={rawValue}
              onChange={e => handleRawChange(e.target.value)}
              placeholder="Enter raw text content..."
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
              className="w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3"
            />
          )}
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

  const offsetToPosition = (text: string, offset: number) => {
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
  };

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
          background-color: rgba(59, 130, 246, 0.4);
          color: #dbeafe;
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

function findMatchRanges(text: string, query: string, mode: SearchMode): Array<{ start: number; end: number }> {
  if (!text || !query) return [];
  if (mode === 'text') {
    const ranges: Array<{ start: number; end: number }> = [];
    const hay = text.toLowerCase();
    const needle = query.toLowerCase();
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
    re = new RegExp(query, 'gi');
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
