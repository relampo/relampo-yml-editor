import Editor from '@monaco-editor/react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { JSX, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './ui/input';

interface YAMLResponseDetailsProps {
  response: any;
  onResponseUpdate: (updatedResponse: any) => void;
  searchText?: string;
  searchMode?: 'text' | 'regex';
  replaceValue?: string;
  currentMatchIndex?: number; // Kept for API compatibility
  onSearchChange?: (value: string) => void;
  onSearchModeChange?: (mode: 'text' | 'regex') => void;
  onReplaceValueChange?: (value: string) => void;
  onNavigate?: (index: number) => void;
}

const BODY_FIXED_HEIGHT = 300;
const MONACO_SWITCH_LINE_THRESHOLD = 2000;
const MONACO_SWITCH_SIZE_THRESHOLD = 120 * 1024;

interface HeaderLineProps {
  line: string;
  className: string;
  ranges: Array<{ start: number; end: number }>;
  startIndex: number;
  currentMatchIndex: number;
  hasSearch: boolean;
}

function HeaderLine({ line, className, ranges, startIndex, currentMatchIndex, hasSearch }: HeaderLineProps) {
  if (ranges.length === 0 || !hasSearch) {
    return <span className={className}>{line}</span>;
  }
  const parts: Array<JSX.Element | string> = [];
  let cursor = 0;
  ranges.forEach((r, idx) => {
    if (cursor < r.start) parts.push(line.slice(cursor, r.start));
    const absoluteIndex = startIndex + idx;
    const isActive = absoluteIndex === currentMatchIndex;
    parts.push(
      <mark
        key={`header-${absoluteIndex}-${r.start}-${r.end}`}
        data-header-match-index={absoluteIndex}
        className={
          isActive
            ? 'bg-yellow-300 text-black ring-2 ring-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.45)] rounded-sm'
            : 'rounded-sm'
        }
        style={isActive ? undefined : { backgroundColor: 'rgba(59,130,246,0.4)', color: '#dbeafe' }}
      >
        {line.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < line.length) parts.push(line.slice(cursor));
  return <span className={className}>{parts}</span>;
}

interface HighlightedTextProps {
  text: string;
  searchText: string;
  searchMode: 'text' | 'regex';
  currentMatchIndex: number;
}

function HighlightedText({ text, searchText, searchMode, currentMatchIndex }: HighlightedTextProps) {
  if (!text || !searchText) return <>{text}</>;
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

export function YAMLResponseDetails({
  response,
  searchText = '',
  searchMode = 'text',
  currentMatchIndex = 0,
  onSearchChange,
  onSearchModeChange,
  onNavigate,
}: YAMLResponseDetailsProps) {
  const formData = response || {};
  const [headersCollapsed, setHeadersCollapsed] = useState(false);
  const [headerSearchText, setHeaderSearchText] = useState('');
  const [headerSearchMode, setHeaderSearchMode] = useState<'text' | 'regex'>('text');
  const [headerCurrentMatchIndex, setHeaderCurrentMatchIndex] = useState(0);
  const headersContentRef = useRef<HTMLDivElement | null>(null);
  const responseBodyRef = useRef<HTMLPreElement | null>(null);
  const responseBodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getStatusReason = (status?: number) => {
    if (!status) return 'Unknown';
    if (status >= 200 && status < 300) return 'OK';
    if (status >= 300 && status < 400) return 'Redirect';
    if (status >= 400 && status < 500) return 'Client Error';
    if (status >= 500) return 'Server Error';
    return 'Unknown';
  };

  const bodyText = useMemo(
    () =>
      !response
        ? ''
        : formData.body
          ? typeof formData.body === 'string'
            ? formData.body
            : JSON.stringify(formData.body, null, 2)
          : '',
    [response, formData.body],
  );

  const shouldUseMonaco = (text: string) => {
    if (!text) return false;
    const lines = text.split('\n').length;
    const bytes = new Blob([text]).size;
    return lines > MONACO_SWITCH_LINE_THRESHOLD || bytes > MONACO_SWITCH_SIZE_THRESHOLD;
  };
  const useMonacoForResponse = shouldUseMonaco(bodyText);

  const headerEntries = useMemo(() => {
    if (!response) return [] as Array<[string, string]>;
    const raw = formData.headers;
    if (!raw) return [] as Array<[string, string]>;
    if (Array.isArray(raw)) {
      return raw
        .map(item => {
          if (!item) return null;
          if (Array.isArray(item) && item.length >= 2) {
            return [String(item[0]), String(item[1])] as [string, string];
          }
          if (typeof item === 'object') {
            const key = String((item as any).key ?? (item as any).name ?? '');
            const value = String((item as any).value ?? '');
            if (!key) return null;
            return [key, value] as [string, string];
          }
          return null;
        })
        .filter(Boolean) as Array<[string, string]>;
    }
    if (typeof raw === 'object') {
      return Object.entries(raw).map(([k, v]) => [k, String(v ?? '')] as [string, string]);
    }
    return [] as Array<[string, string]>;
  }, [response, formData.headers]);

  const headerStatusLine = useMemo(
    () =>
      !response
        ? ''
        : `${String(formData.http_version || 'HTTP/1.1')} ${String(formData.status || 0)} ${String(formData.status_text || getStatusReason(formData.status))}`,
    [response, formData.http_version, formData.status, formData.status_text],
  );

  const headerLines = useMemo(
    () => [headerStatusLine, ...headerEntries.map(([k, v]) => `${k}: ${v}`)],
    [headerStatusLine, headerEntries],
  );

  const buildHeaderSearchRegex = () => {
    if (!headerSearchText || headerSearchMode !== 'regex') return null;
    try {
      return new RegExp(headerSearchText, 'gi');
    } catch {
      return null;
    }
  };
  const headerRegexInvalid = !!headerSearchText && headerSearchMode === 'regex' && !buildHeaderSearchRegex();

  const collectHeaderMatchesForLine = (text: string) => {
    if (!text || !headerSearchText) return [] as Array<{ start: number; end: number }>;
    const out: Array<{ start: number; end: number }> = [];
    if (headerSearchMode === 'text') {
      const hay = text.toLowerCase();
      const needle = headerSearchText.toLowerCase();
      let pos = 0;
      while (pos <= hay.length - needle.length) {
        const idx = hay.indexOf(needle, pos);
        if (idx === -1) break;
        out.push({ start: idx, end: idx + needle.length });
        pos = idx + Math.max(needle.length, 1);
      }
      return out;
    }
    const re = buildHeaderSearchRegex();
    if (!re) return out;
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
      out.push({ start: s, end: e });
      if (full.length === 0) break;
    }
    return out;
  };

  const headerLineMatches = useMemo(
    () => headerLines.map(line => collectHeaderMatchesForLine(line)),
    [headerLines, headerSearchText, headerSearchMode],
  );
  const headerTotalMatches = useMemo(
    () => headerLineMatches.reduce((acc, ranges) => acc + ranges.length, 0),
    [headerLineMatches],
  );

  useEffect(() => {
    if (headerTotalMatches === 0) {
      setHeaderCurrentMatchIndex(0);
      return;
    }
    if (headerCurrentMatchIndex >= headerTotalMatches) {
      setHeaderCurrentMatchIndex(prev => Math.min(prev, headerTotalMatches - 1));
    }
  }, [headerTotalMatches, headerCurrentMatchIndex]);

  useEffect(() => {
    if (!headerSearchText || headerTotalMatches === 0 || !headersContentRef.current) return;
    const container = headersContentRef.current;
    const raf = requestAnimationFrame(() => {
      const activeMark = container.querySelector(
        `mark[data-header-match-index="${headerCurrentMatchIndex}"]`,
      ) as HTMLElement | null;
      if (!activeMark) return;
      const targetTop = Math.max(0, activeMark.offsetTop - container.clientHeight / 2 + activeMark.offsetHeight / 2);
      container.scrollTop = targetTop;
    });
    return () => cancelAnimationFrame(raf);
  }, [headerSearchText, headerTotalMatches, headerCurrentMatchIndex, headerLines, headersCollapsed]);

  const buildSearchRegex = () => {
    if (!searchText || searchMode !== 'regex') return null;
    try {
      return new RegExp(searchText, 'gi');
    } catch {
      return null;
    }
  };
  const collectMatches = (text: string) => {
    if (!text || !searchText) return [] as Array<{ start: number; end: number }>;
    const out: Array<{ start: number; end: number }> = [];
    if (searchMode === 'text') {
      const hay = text.toLowerCase();
      const needle = searchText.toLowerCase();
      let pos = 0;
      while (pos <= hay.length - needle.length) {
        const idx = hay.indexOf(needle, pos);
        if (idx === -1) break;
        out.push({ start: idx, end: idx + needle.length });
        pos = idx + Math.max(needle.length, 1);
      }
      return out;
    }
    const re = buildSearchRegex();
    if (!re) return out;
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
      out.push({ start: s, end: e });
      if (full.length === 0) break;
    }
    return out;
  };
  const matches = collectMatches(bodyText);
  const totalMatches = matches.length;
  const regexInvalid = !!searchText && searchMode === 'regex' && !buildSearchRegex();

  useEffect(() => {
    if (!searchText || totalMatches === 0 || useMonacoForResponse || !responseBodyRef.current) return;
    const highlight = responseBodyRef.current;
    const textarea = responseBodyTextareaRef.current;
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
  }, [searchText, totalMatches, currentMatchIndex, formData.body, useMonacoForResponse]);

  useEffect(() => {
    if (!searchText || totalMatches === 0 || useMonacoForResponse) return;
    const current = matches[currentMatchIndex];
    const textarea = responseBodyTextareaRef.current;
    if (!textarea || !current) return;

    const raf = requestAnimationFrame(() => {
      try {
        textarea.setSelectionRange(current.start, current.end);
      } catch {
        // ignore readonly selection issues
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [searchText, searchMode, currentMatchIndex, bodyText, totalMatches, useMonacoForResponse]);

  if (!response) {
    return <div className="text-sm text-zinc-500 italic">No response data recorded</div>;
  }

  const handlePrevious = () => {
    if (!onNavigate || totalMatches === 0) return;
    const newIndex = currentMatchIndex === 0 ? totalMatches - 1 : currentMatchIndex - 1;
    onNavigate(newIndex);
  };
  const handleNext = () => {
    if (!onNavigate || totalMatches === 0) return;
    const newIndex = currentMatchIndex === totalMatches - 1 ? 0 : currentMatchIndex + 1;
    onNavigate(newIndex);
  };
  const handleHeaderPrevious = () => {
    if (headerTotalMatches === 0) return;
    setHeaderCurrentMatchIndex(prev => (prev === 0 ? headerTotalMatches - 1 : prev - 1));
  };
  const handleHeaderNext = () => {
    if (headerTotalMatches === 0) return;
    setHeaderCurrentMatchIndex(prev => (prev === headerTotalMatches - 1 ? 0 : prev + 1));
  };

  const syncBodyScroll = () => {
    const textarea = responseBodyTextareaRef.current;
    const highlight = responseBodyRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  const responseSearchControls = (
    <div className="p-3 border border-white/10 rounded bg-[#0a0a0a] mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchText}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder="Search in response body..."
            className="pl-9 pr-3 bg-white/5 border-white/10 text-zinc-300 text-sm focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/30"
          />
        </div>
        <div className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5">
          <button
            onClick={() => onSearchModeChange?.('text')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              searchMode === 'text'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => onSearchModeChange?.('regex')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              searchMode === 'regex'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Regex
          </button>
        </div>
        {searchText && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 px-2 min-w-15 text-center font-mono">
              {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0'}
            </span>
            <button
              onClick={handlePrevious}
              disabled={totalMatches === 0}
              className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            </button>
            <button
              onClick={handleNext}
              disabled={totalMatches === 0}
              className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        )}
      </div>
      {regexInvalid && <div className="mt-2 text-xs text-red-400">Invalid regex pattern</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Response Headers (Collapsible) */}
      <div className="border border-white/10 rounded bg-[#0a0a0a] overflow-hidden">
        <button
          onClick={() => setHeadersCollapsed(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Response Headers</span>
          <span className="text-xs text-zinc-400">{headersCollapsed ? 'Show' : 'Hide'}</span>
        </button>
        {!headersCollapsed && (
          <div className="p-3 pt-0">
            <div className="p-3 border border-white/10 rounded bg-[#0a0a0a] mt-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1">
                  <Input
                    value={headerSearchText}
                    onChange={e => setHeaderSearchText(e.target.value)}
                    placeholder="Search in headers..."
                    className="pr-3 bg-white/5 border-white/10 text-zinc-300 text-sm focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/30"
                  />
                </div>
                <div className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5">
                  <button
                    onClick={() => setHeaderSearchMode('text')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      headerSearchMode === 'text'
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setHeaderSearchMode('regex')}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      headerSearchMode === 'regex'
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Regex
                  </button>
                </div>
                {headerSearchText && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 px-2 min-w-15 text-center font-mono">
                      {headerTotalMatches > 0 ? `${headerCurrentMatchIndex + 1}/${headerTotalMatches}` : '0/0'}
                    </span>
                    <button
                      onClick={handleHeaderPrevious}
                      disabled={headerTotalMatches === 0}
                      className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Previous match"
                    >
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={handleHeaderNext}
                      disabled={headerTotalMatches === 0}
                      className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Next match"
                    >
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                )}
              </div>
              {headerRegexInvalid && <div className="mt-2 text-xs text-red-400">Invalid regex pattern</div>}
            </div>
            <div className="mt-2 rounded-md border border-white/10 bg-black/30 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 bg-white/3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Raw HTTP Headers
                </span>
              </div>
              <div
                ref={headersContentRef}
                className="max-h-65 overflow-auto px-3 py-2 font-mono text-xs leading-6"
              >
                {(() => {
                  let globalMatchIndex = 0;
                  const statusRanges = collectHeaderMatchesForLine(headerStatusLine);
                  const statusStartIndex = globalMatchIndex;
                  globalMatchIndex += statusRanges.length;

                  const entryData = headerEntries.map(([key, value]) => {
                    const lineText = `${key}: ${value}`;
                    const ranges = collectHeaderMatchesForLine(lineText);
                    const startIndex = globalMatchIndex;
                    globalMatchIndex += ranges.length;
                    return { lineText, ranges, startIndex };
                  });

                  return (
                    <>
                      <div className="text-zinc-100">
                        <HeaderLine
                          line={headerStatusLine}
                          className="text-zinc-100"
                          ranges={statusRanges}
                          startIndex={statusStartIndex}
                          currentMatchIndex={headerCurrentMatchIndex}
                          hasSearch={!!headerSearchText}
                        />
                      </div>
                      {headerEntries.length > 0 ? (
                        entryData.map(({ lineText, ranges, startIndex }, idx) => (
                          <div
                            key={`${headerEntries[idx][0]}-${idx}`}
                            className="text-zinc-300"
                          >
                            <HeaderLine
                              line={lineText}
                              className="text-zinc-200 break-all"
                              ranges={ranges}
                              startIndex={startIndex}
                              currentMatchIndex={headerCurrentMatchIndex}
                              hasSearch={!!headerSearchText}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-500 italic">No headers captured</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/10" />

      {/* Response Body */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Response Body</p>
          {searchText && totalMatches > 0 && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span>✓</span> {totalMatches} match(es)
            </span>
          )}
        </div>
        {responseSearchControls}
        <div className="space-y-2">
          {useMonacoForResponse ? (
            <div
              className="w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
            >
              <MonacoResponseBodyEditor
                value={bodyText}
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
                ref={responseBodyRef}
                className="absolute inset-0 m-0 p-3 text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-y-auto overflow-x-auto pointer-events-none"
              >
                <HighlightedText
                  text={bodyText}
                  searchText={searchText}
                  searchMode={searchMode}
                  currentMatchIndex={currentMatchIndex}
                />
              </pre>
              <textarea
                ref={responseBodyTextareaRef}
                value={bodyText}
                readOnly
                onScroll={syncBodyScroll}
                placeholder="Response body..."
                style={{ height: '100%', minHeight: '100%' }}
                className="relative w-full h-full bg-transparent border-0 text-transparent caret-transparent text-sm font-mono resize-none overflow-y-auto overflow-x-auto selection:bg-yellow-200/40 outline-none p-3"
              />
            </div>
          ) : (
            <textarea
              value={bodyText}
              readOnly
              placeholder="Response body..."
              style={{
                height: BODY_FIXED_HEIGHT,
                minHeight: BODY_FIXED_HEIGHT,
              }}
              className="w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3"
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface MonacoResponseBodyEditorProps {
  value: string;
  searchText: string;
  searchMode: 'text' | 'regex';
  currentMatchIndex: number;
}

function MonacoResponseBodyEditor({ value, searchText, searchMode, currentMatchIndex }: MonacoResponseBodyEditorProps) {
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
        language="json"
        value={value}
        onMount={editor => {
          editorRef.current = editor;
          decorationsRef.current = editor.createDecorationsCollection([]);
        }}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 12,
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

function findMatchRanges(text: string, query: string, mode: 'text' | 'regex'): Array<{ start: number; end: number }> {
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
