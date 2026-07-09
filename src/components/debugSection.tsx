import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { findMatchRanges, type SearchMode } from './debugSearch';
import type { BinaryBodyDownload } from '../utils/binaryBody';

export function DebugSection({
  rows,
  body,
  bodyDownload,
  searchText = '',
  searchMode = 'text',
  currentMatchIndex = 0,
  wrapLabels = false,
}: {
  rows: Array<[string, string]>;
  body?: string;
  bodyDownload?: BinaryBodyDownload | null;
  searchText?: string;
  searchMode?: SearchMode;
  currentMatchIndex?: number;
  // When true the label column wraps its full text instead of truncating it.
  // Used for the Variables tab so long names (e.g. javax.faces.ViewState) stay
  // fully readable rather than being clipped. RLP-585 #6.
  wrapLabels?: boolean;
}) {
  const fullSearchText = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(body !== undefined ? [body] : []),
  ].join('\n');
  const hasBody = body !== undefined;
  const hasActiveSearch = searchText.trim().length > 0;

  const downloadBody = () => {
    if (!bodyDownload) return;
    const blob = new Blob([bodyDownload.bytes], { type: bodyDownload.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = bodyDownload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {hasBody ? (
        <DebugMetadataDetails
          rows={rows}
          fullSearchText={fullSearchText}
          searchText={searchText}
          searchMode={searchMode}
          currentMatchIndex={currentMatchIndex}
          hasActiveSearch={hasActiveSearch}
        />
      ) : (
        <DebugRowsTable
          rows={rows}
          fullSearchText={fullSearchText}
          searchText={searchText}
          searchMode={searchMode}
          currentMatchIndex={currentMatchIndex}
          hasActiveSearch={hasActiveSearch}
          wrapLabels={wrapLabels}
          className="border border-white/10"
        />
      )}
      {body !== undefined && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Body</p>
            {bodyDownload && (
              <button
                type="button"
                onClick={downloadBody}
                className="ml-auto inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-xs font-medium text-zinc-300 hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-100"
                title="Download exact response bytes"
                aria-label="Download response body bytes"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download body</span>
              </button>
            )}
          </div>
          <pre className="min-h-72 max-h-[56vh] overflow-auto whitespace-pre-wrap break-words border border-white/10 bg-[#050505] p-3 text-xs leading-6 text-zinc-300">
            <HighlightedDebugText
              text={body}
              fullSearchText={fullSearchText}
              searchText={searchText}
              searchMode={searchMode}
              currentMatchIndex={currentMatchIndex}
              startOffset={rows.map(([label, value]) => `${label}: ${value}`).join('\n').length + 1}
            />
          </pre>
        </div>
      )}
    </div>
  );
}

function DebugMetadataDetails({
  rows,
  fullSearchText,
  searchText,
  searchMode,
  currentMatchIndex,
  hasActiveSearch,
}: {
  rows: Array<[string, string]>;
  fullSearchText: string;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  hasActiveSearch: boolean;
}) {
  const [open, setOpen] = useState(hasActiveSearch);

  useEffect(() => {
    if (hasActiveSearch) setOpen(true);
  }, [hasActiveSearch]);

  return (
    <details
      className="border border-white/10 bg-[#0a0a0a]"
      open={open}
      onToggle={event => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-300">
        Metadata and headers ({rows.length})
      </summary>
      <DebugRowsTable
        rows={rows}
        fullSearchText={fullSearchText}
        searchText={searchText}
        searchMode={searchMode}
        currentMatchIndex={currentMatchIndex}
        hasActiveSearch={hasActiveSearch}
        className="max-h-48 overflow-y-auto border-t border-white/10"
      />
    </details>
  );
}

function DebugRowsTable({
  rows,
  fullSearchText,
  searchText,
  searchMode,
  currentMatchIndex,
  hasActiveSearch,
  className,
  wrapLabels = false,
}: {
  rows: Array<[string, string]>;
  fullSearchText: string;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  hasActiveSearch: boolean;
  className: string;
  wrapLabels?: boolean;
}) {
  return (
    <div className={className}>
      {rows.map(([label, value], rowIndex) => {
        const previousText = rows
          .slice(0, rowIndex)
          .map(([prevLabel, prevValue]) => `${prevLabel}: ${prevValue}`)
          .join('\n');
        const startOffset = previousText ? previousText.length + 1 : 0;
        return (
          <div key={label} className="grid grid-cols-[minmax(100px,30%)_1fr] border-b border-white/10 last:border-b-0">
            <div
              className={`min-w-0 bg-white/3 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 ${
                hasActiveSearch || wrapLabels ? 'break-words' : 'truncate'
              }`}
              title={hasActiveSearch ? undefined : label}
            >
              <HighlightedDebugText
                text={label}
                fullSearchText={fullSearchText}
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
                startOffset={startOffset}
              />
            </div>
            <div className="min-w-0 break-words px-3 py-2.5 text-sm text-zinc-200">
              <HighlightedDebugText
                text={value}
                fullSearchText={fullSearchText}
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
                startOffset={startOffset + label.length + 2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HighlightedDebugText({
  text,
  fullSearchText,
  searchText,
  searchMode,
  currentMatchIndex,
  startOffset,
}: {
  text: string;
  fullSearchText: string;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  startOffset: number;
}) {
  const activeMatchRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const activeMatch = activeMatchRef.current;
    if (!activeMatch || !searchText) return;

    const frame = window.requestAnimationFrame(() => {
      activeMatch.scrollIntoView({ block: 'center', inline: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentMatchIndex, fullSearchText, searchMode, searchText, startOffset, text]);

  if (!text || !searchText) return <>{text}</>;
  const ranges = findMatchRanges(text, searchText, searchMode);
  if (ranges.length === 0) return <>{text}</>;

  const precedingMatches = findMatchRanges(fullSearchText.slice(0, startOffset), searchText, searchMode).length;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (cursor < range.start) nodes.push(text.slice(cursor, range.start));
    const active = precedingMatches + index === currentMatchIndex;
    nodes.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        ref={active ? activeMatchRef : undefined}
        data-match-index={precedingMatches + index}
        className={active ? 'rounded-sm bg-yellow-300 text-black ring-2 ring-amber-500' : 'rounded-sm bg-blue-500/40 text-blue-100'}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
