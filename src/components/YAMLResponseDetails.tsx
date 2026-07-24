import Editor from '@monaco-editor/react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { JSX, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { YAMLValue } from '../types/yaml';
import { binaryBodyDisplay, binaryBodyDownload, type BinaryBodyDownload } from '../utils/binaryBody';
import type { SearchMode } from './debugSearch';
import { Input } from './ui/input';

interface YAMLResponseDetailsProps {
  response: YAMLValue;
  onResponseUpdate: (updatedResponse: YAMLValue) => void;
  searchText?: string;
  searchInputValue?: string;
  searchMode?: SearchMode;
  replaceValue?: string;
  currentMatchIndex?: number;
  onSearchChange?: (value: string) => void;
  onSearchModeChange?: (mode: SearchMode) => void;
  onReplaceValueChange?: (value: string) => void;
  onNavigate?: (index: number) => void;
}

const BODY_FIXED_HEIGHT = 300;
const MONACO_SWITCH_LINE_THRESHOLD = 2000;
const MONACO_SWITCH_SIZE_THRESHOLD = 120 * 1024;

function isResponseRecord(value: YAMLValue): value is Record<string, YAMLValue> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getStatusReason(status?: number) {
  if (!status) return 'Unknown';
  if (status >= 200 && status < 300) return 'OK';
  if (status >= 300 && status < 400) return 'Redirect';
  if (status >= 400 && status < 500) return 'Client Error';
  if (status >= 500) return 'Server Error';
  return 'Unknown';
}

function shouldUseMonaco(text: string) {
  if (!text) return false;
  const lines = text.split('\n').length;
  const bytes = new Blob([text]).size;
  return lines > MONACO_SWITCH_LINE_THRESHOLD || bytes > MONACO_SWITCH_SIZE_THRESHOLD;
}

// Regex-mode search intentionally hands the user's raw text to `new RegExp` —
// the whole point of the Text/Regex toggle is that Regex mode matches real
// regex syntax, so escaping metacharacters here would silently make it behave
// like Text mode. `pattern` (rather than "search term") reflects that intent;
// invalid syntax is caught and surfaced via the null return. RLP.
function buildDynamicRegex(pattern: string, flags: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

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
  const re = buildDynamicRegex(pattern, 'gi');
  if (!re) return [];
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

// A binary body — a recorded byte-indexed object ({"0":48,...}) or a mojibake
// string — collapses to a compact, tool-consistent notice instead of dumping
// the raw bytes. RLP-555.
function computeBodyText(response: YAMLValue, body: YAMLValue, headers: YAMLValue): string {
  if (!response || !body) return '';
  const binary = binaryBodyDisplay(body, headers);
  if (binary != null) return binary;
  return typeof body === 'string' ? body : JSON.stringify(body, null, 2);
}

function parseHeaderEntries(headers: YAMLValue): Array<[string, string]> {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers.flatMap(item => {
      if (!item) return [];
      if (Array.isArray(item) && item.length >= 2) {
        return [[String(item[0]), String(item[1])] as [string, string]];
      }
      if (isResponseRecord(item)) {
        const key = String(item.key ?? item.name ?? '');
        const value = String(item.value ?? '');
        if (!key) return [];
        return [[key, value] as [string, string]];
      }
      return [];
    });
  }
  if (isResponseRecord(headers)) {
    return Object.entries(headers).map(([k, v]) => [k, String(v ?? '')] as [string, string]);
  }
  return [];
}

function buildHeaderStatusLine(httpVersion: YAMLValue, status: YAMLValue, statusText: YAMLValue): string {
  return `${String(httpVersion || 'HTTP/1.1')} ${String(status || 0)} ${String(statusText || getStatusReason(typeof status === 'number' ? status : undefined))}`;
}

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
            : 'bg-yellow-300/80 text-black rounded-sm'
        }
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
  searchMode: SearchMode;
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

interface SearchBarProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  hasSearch: boolean;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  placeholder: string;
  showIcon?: boolean;
  totalMatches: number;
  currentMatchIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  invalidRegex: boolean;
  containerClassName: string;
}

// Shared search bar for the header panel and the response body panel — same
// text/regex toggle, match counter, and prev/next controls, only the wiring
// (controlled input vs. debounced prop, local vs. lifted match index) differs.
function SearchBar({
  inputValue,
  onInputChange,
  hasSearch,
  mode,
  onModeChange,
  placeholder,
  showIcon,
  totalMatches,
  currentMatchIndex,
  onPrevious,
  onNext,
  invalidRegex,
  containerClassName,
}: SearchBarProps) {
  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1">
          {showIcon && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
          <Input
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            placeholder={placeholder}
            className={`${showIcon ? 'pl-9' : ''} pr-3 bg-white/5 border-white/10 text-zinc-300 text-sm focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/30`}
          />
        </div>
        <div className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5">
          <button type="button"
            onClick={() => onModeChange('text')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'text'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Text
          </button>
          <button type="button"
            onClick={() => onModeChange('regex')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              mode === 'regex'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Regex
          </button>
        </div>
        {hasSearch && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 px-2 min-w-15 text-center font-mono">
              {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0'}
            </span>
            <button type="button"
              onClick={onPrevious}
              disabled={totalMatches === 0}
              className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            </button>
            <button type="button"
              onClick={onNext}
              disabled={totalMatches === 0}
              className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        )}
      </div>
      {invalidRegex && <div className="mt-2 text-xs text-red-400">Invalid regex pattern</div>}
    </div>
  );
}

interface RawHeadersListProps {
  containerRef: RefObject<HTMLDivElement | null>;
  headerStatusLine: string;
  headerEntries: Array<[string, string]>;
  headerLineMatches: Array<Array<{ start: number; end: number }>>;
  currentMatchIndex: number;
  hasSearch: boolean;
}

function RawHeadersList({
  containerRef,
  headerStatusLine,
  headerEntries,
  headerLineMatches,
  currentMatchIndex,
  hasSearch,
}: RawHeadersListProps) {
  const [statusRanges, ...entryRanges] = headerLineMatches;
  let globalMatchIndex = statusRanges?.length ?? 0;
  const entryData = headerEntries.map(([key, value], idx) => {
    const ranges = entryRanges[idx] ?? [];
    const startIndex = globalMatchIndex;
    globalMatchIndex += ranges.length;
    return { key, value, ranges, startIndex };
  });

  return (
    <div className="mt-2 rounded-md border border-white/10 bg-black/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-white/3">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Raw HTTP Headers</span>
      </div>
      <div ref={containerRef} className="max-h-65 overflow-auto px-3 py-2 font-mono text-xs leading-6">
        <div className="text-zinc-100">
          <HeaderLine
            line={headerStatusLine}
            className="text-zinc-100"
            ranges={statusRanges ?? []}
            startIndex={0}
            currentMatchIndex={currentMatchIndex}
            hasSearch={hasSearch}
          />
        </div>
        {headerEntries.length > 0 ? (
          entryData.map(({ key, value, ranges, startIndex }) => (
            <div key={`${key}-${value}-${startIndex}`} className="text-zinc-300">
              <HeaderLine
                line={`${key}: ${value}`}
                className="text-zinc-200 break-all"
                ranges={ranges}
                startIndex={startIndex}
                currentMatchIndex={currentMatchIndex}
                hasSearch={hasSearch}
              />
            </div>
          ))
        ) : (
          <div className="text-zinc-500 italic">No headers captured</div>
        )}
      </div>
    </div>
  );
}

interface ResponseHeadersPanelProps {
  headers: YAMLValue;
  httpVersion: YAMLValue;
  status: YAMLValue;
  statusText: YAMLValue;
  // Header search falls back to the body's search text when the user hasn't
  // typed anything into the header-specific search box.
  fallbackSearchText: string;
}

function ResponseHeadersPanel({ headers, httpVersion, status, statusText, fallbackSearchText }: ResponseHeadersPanelProps) {
  const [headersCollapsed, setHeadersCollapsed] = useState(false);
  const [headerSearchText, setHeaderSearchText] = useState('');
  const [headerSearchMode, setHeaderSearchMode] = useState<SearchMode>('text');
  const [headerCurrentMatchIndex, setHeaderCurrentMatchIndex] = useState(0);
  const headersContentRef = useRef<HTMLDivElement | null>(null);

  const headerEntries = useMemo(() => parseHeaderEntries(headers), [headers]);
  const headerStatusLine = useMemo(
    () => buildHeaderStatusLine(httpVersion, status, statusText),
    [httpVersion, status, statusText],
  );
  const headerLines = useMemo(
    () => [headerStatusLine, ...headerEntries.map(([k, v]) => `${k}: ${v}`)],
    [headerStatusLine, headerEntries],
  );

  const trimmedHeaderSearch = headerSearchText.trim();
  const effectiveHeaderSearch = trimmedHeaderSearch || fallbackSearchText.trim();
  const effectiveHeaderSearchMode: SearchMode = trimmedHeaderSearch ? headerSearchMode : 'text';
  const headerRegexInvalid =
    !!effectiveHeaderSearch && effectiveHeaderSearchMode === 'regex' && !buildDynamicRegex(effectiveHeaderSearch, 'gi');

  const headerLineMatches = useMemo(
    () => headerLines.map(line => findMatchRanges(line, effectiveHeaderSearch, effectiveHeaderSearchMode)),
    [headerLines, effectiveHeaderSearch, effectiveHeaderSearchMode],
  );
  const headerTotalMatches = useMemo(
    () => headerLineMatches.reduce((acc, ranges) => acc + ranges.length, 0),
    [headerLineMatches],
  );
  // Derived (not stored-then-synced): clamp during render instead of adjusting
  // state from an effect whenever the match count shrinks.
  const headerCurrentMatchIndexClamped =
    headerTotalMatches === 0 ? 0 : Math.min(headerCurrentMatchIndex, headerTotalMatches - 1);

  useEffect(() => {
    if (!headerSearchText || headerTotalMatches === 0 || !headersContentRef.current) return;
    const container = headersContentRef.current;
    const raf = requestAnimationFrame(() => {
      const activeMark = container.querySelector(
        `mark[data-header-match-index="${headerCurrentMatchIndexClamped}"]`,
      ) as HTMLElement | null;
      if (!activeMark) return;
      const targetTop = Math.max(0, activeMark.offsetTop - container.clientHeight / 2 + activeMark.offsetHeight / 2);
      container.scrollTop = targetTop;
    });
    return () => cancelAnimationFrame(raf);
  }, [headerSearchText, headerTotalMatches, headerCurrentMatchIndexClamped, headerLines, headersCollapsed]);

  const handleHeaderPrevious = () => {
    if (headerTotalMatches === 0) return;
    setHeaderCurrentMatchIndex(
      headerCurrentMatchIndexClamped === 0 ? headerTotalMatches - 1 : headerCurrentMatchIndexClamped - 1,
    );
  };
  const handleHeaderNext = () => {
    if (headerTotalMatches === 0) return;
    setHeaderCurrentMatchIndex(
      headerCurrentMatchIndexClamped === headerTotalMatches - 1 ? 0 : headerCurrentMatchIndexClamped + 1,
    );
  };

  return (
    <div className="border border-white/10 rounded bg-[#0a0a0a] overflow-hidden">
      <button type="button"
        onClick={() => setHeadersCollapsed(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Response Headers</span>
        <span className="text-xs text-zinc-400">{headersCollapsed ? 'Show' : 'Hide'}</span>
      </button>
      {!headersCollapsed && (
        <div className="p-3 pt-0">
          <SearchBar
            inputValue={headerSearchText}
            onInputChange={setHeaderSearchText}
            hasSearch={!!headerSearchText}
            mode={headerSearchMode}
            onModeChange={setHeaderSearchMode}
            placeholder="Search in headers..."
            totalMatches={headerTotalMatches}
            currentMatchIndex={headerCurrentMatchIndexClamped}
            onPrevious={handleHeaderPrevious}
            onNext={handleHeaderNext}
            invalidRegex={headerRegexInvalid}
            containerClassName="p-3 border border-white/10 rounded bg-[#0a0a0a] mt-2 mb-2"
          />
          <RawHeadersList
            containerRef={headersContentRef}
            headerStatusLine={headerStatusLine}
            headerEntries={headerEntries}
            headerLineMatches={headerLineMatches}
            currentMatchIndex={headerCurrentMatchIndexClamped}
            hasSearch={!!effectiveHeaderSearch}
          />
        </div>
      )}
    </div>
  );
}

interface ResponseBodyPanelProps {
  bodyText: string;
  binaryDownload: BinaryBodyDownload | null;
  searchText: string;
  searchInputValue: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  onSearchChange?: (value: string) => void;
  onSearchModeChange?: (mode: SearchMode) => void;
  onNavigate?: (index: number) => void;
}

function ResponseBodyPanel({
  bodyText,
  binaryDownload,
  searchText,
  searchInputValue,
  searchMode,
  currentMatchIndex,
  onSearchChange,
  onSearchModeChange,
  onNavigate,
}: ResponseBodyPanelProps) {
  const responseBodyRef = useRef<HTMLPreElement | null>(null);
  const responseBodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const useMonacoForResponse = shouldUseMonaco(bodyText);
  const matches = useMemo(() => findMatchRanges(bodyText, searchText, searchMode), [bodyText, searchText, searchMode]);
  const totalMatches = matches.length;
  const regexInvalid = !!searchText && searchMode === 'regex' && !buildDynamicRegex(searchText, 'gi');

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
  }, [searchText, totalMatches, currentMatchIndex, bodyText, useMonacoForResponse]);

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
  }, [searchText, currentMatchIndex, totalMatches, useMonacoForResponse, matches]);

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

  const downloadResponseBody = () => {
    if (!binaryDownload) return;
    const blob = new Blob([binaryDownload.bytes], { type: binaryDownload.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = binaryDownload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const syncBodyScroll = () => {
    const textarea = responseBodyTextareaRef.current;
    const highlight = responseBodyRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Response Body</p>
        {searchText && totalMatches > 0 && (
          <span className="text-xs text-yellow-400 flex items-center gap-1">
            <span>✓</span> {totalMatches} match(es)
          </span>
        )}
        {binaryDownload && (
          <button
            type="button"
            onClick={downloadResponseBody}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-xs font-medium text-zinc-300 hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-100"
            title="Download exact recorded response bytes"
            aria-label="Download response body bytes"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download body</span>
          </button>
        )}
      </div>
      <SearchBar
        inputValue={searchInputValue}
        onInputChange={value => onSearchChange?.(value)}
        hasSearch={!!searchText}
        mode={searchMode}
        onModeChange={mode => onSearchModeChange?.(mode)}
        placeholder="Search in response body..."
        showIcon
        totalMatches={totalMatches}
        currentMatchIndex={currentMatchIndex}
        onPrevious={handlePrevious}
        onNext={handleNext}
        invalidRegex={regexInvalid}
        containerClassName="p-3 border border-white/10 rounded bg-[#0a0a0a] mt-3"
      />
      <div className="space-y-2">
        {useMonacoForResponse ? (
          <div
            className="w-full h-75 rounded-md border border-white/10 bg-white/5 overflow-hidden"
            style={{ height: BODY_FIXED_HEIGHT, minHeight: BODY_FIXED_HEIGHT }}
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
            style={{ height: BODY_FIXED_HEIGHT, minHeight: BODY_FIXED_HEIGHT }}
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
              aria-label="Response body"
              style={{ height: '100%', minHeight: '100%' }}
              className="relative w-full h-full bg-transparent border-0 text-transparent caret-transparent text-sm font-mono resize-none overflow-y-auto overflow-x-auto selection:bg-yellow-200/40 outline-none p-3"
            />
          </div>
        ) : (
          <textarea
            value={bodyText}
            readOnly
            placeholder="Response body..."
            aria-label="Response body"
            style={{ height: BODY_FIXED_HEIGHT, minHeight: BODY_FIXED_HEIGHT }}
            className="w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3"
          />
        )}
      </div>
    </div>
  );
}

export function YAMLResponseDetails({
  response,
  searchText = '',
  searchInputValue = '',
  searchMode = 'text',
  currentMatchIndex = 0,
  onSearchChange,
  onSearchModeChange,
  onNavigate,
}: YAMLResponseDetailsProps) {
  const formData = isResponseRecord(response) ? response : {};

  const bodyText = useMemo(
    () => computeBodyText(response, formData.body, formData.headers),
    [response, formData.body, formData.headers],
  );
  const binaryDownload = useMemo(
    () => (response ? binaryBodyDownload(formData.body, formData.headers) : null),
    [response, formData.body, formData.headers],
  );

  if (!response) {
    return <div className="text-sm text-zinc-500 italic">No response data recorded</div>;
  }

  return (
    <div className="space-y-6">
      <ResponseHeadersPanel
        headers={formData.headers}
        httpVersion={formData.http_version}
        status={formData.status}
        statusText={formData.status_text}
        fallbackSearchText={searchText}
      />

      <div className="h-px bg-white/10" />

      <ResponseBodyPanel
        bodyText={bodyText}
        binaryDownload={binaryDownload}
        searchText={searchText}
        searchInputValue={searchInputValue}
        searchMode={searchMode}
        currentMatchIndex={currentMatchIndex}
        onSearchChange={onSearchChange}
        onSearchModeChange={onSearchModeChange}
        onNavigate={onNavigate}
      />
    </div>
  );
}

interface MonacoResponseBodyEditorProps {
  value: string;
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

function MonacoResponseBodyEditor({ value, searchText, searchMode, currentMatchIndex }: MonacoResponseBodyEditorProps) {
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
