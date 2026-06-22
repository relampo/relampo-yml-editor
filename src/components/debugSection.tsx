import type { ReactNode } from 'react';
import { findMatchRanges, type SearchMode } from './debugSearch';

export function DebugSection({
  rows,
  body,
  searchText = '',
  searchMode = 'text',
  currentMatchIndex = 0,
}: {
  rows: Array<[string, string]>;
  body?: string;
  searchText?: string;
  searchMode?: SearchMode;
  currentMatchIndex?: number;
}) {
  const fullSearchText = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(body !== undefined ? [body] : []),
  ].join('\n');

  return (
    <div className="space-y-3">
      <div className="border border-white/10">
        {rows.map(([label, value], rowIndex) => {
          const previousText = rows
            .slice(0, rowIndex)
            .map(([prevLabel, prevValue]) => `${prevLabel}: ${prevValue}`)
            .join('\n');
          const startOffset = previousText ? previousText.length + 1 : 0;
          const hasActiveSearch = searchText.trim().length > 0;
          return (
            <div key={label} className="grid grid-cols-[minmax(100px,30%)_1fr] border-b border-white/10 last:border-b-0">
              <div
                className={`min-w-0 bg-white/3 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 ${
                  hasActiveSearch ? 'break-words' : 'truncate'
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
              <div className="min-w-0 px-3 py-2.5 text-sm text-zinc-200 break-words">
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
      {body !== undefined && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Body</p>
          <pre className="max-h-56 overflow-auto border border-white/10 bg-[#050505] p-3 text-xs leading-6 text-zinc-300">
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
