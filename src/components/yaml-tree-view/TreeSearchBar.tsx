import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface TreeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onReplace: (search: string, replacement: string, matchIndex?: number) => number;
  countMatches: (search: string) => number;
  searchMatchCount: number;
}

export function TreeSearchBar({
  value,
  onChange,
  onClear,
  onReplace,
  countMatches,
  searchMatchCount,
}: TreeSearchBarProps) {
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(value);
  const [searchText, setSearchText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [replaceMessage, setReplaceMessage] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchCount = useMemo(
    () => (replaceOpen ? countMatches(searchText) : 0),
    [countMatches, replaceOpen, searchText],
  );
  const currentMatch = Math.min(currentMatchIndex, Math.max(matchCount - 1, 0));

  const applySearch = () => onChange(searchDraft);

  const handleReplace = (matchIndex?: number) => {
    const replacements = onReplace(searchText, replacementText, matchIndex);
    setReplaceMessage(replacements > 0 ? `${replacements} replacement${replacements === 1 ? '' : 's'}` : 'No matches');
  };

  return (
    <div className="shrink-0 px-3 pt-3 pb-2">
      <div className="flex items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
        {/* Input container */}
        <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search nodes..."
            aria-label="Search nodes"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applySearch();
            }}
            className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none"
          />
          {value.trim() && (
            <span className="shrink-0 text-xs text-zinc-500" aria-label="Search result count">
              {searchMatchCount} result{searchMatchCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Close button */}
        {(value || searchDraft) && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft('');
              onClear();
            }}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={applySearch}
          aria-label="Search tree"
          className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 hover:bg-yellow-400/20 transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setReplaceOpen(open => {
              if (!open) {
                setSearchText(value);
                setCurrentMatchIndex(0);
                setReplaceMessage('');
              }
              return !open;
            });
            setReplaceMessage('');
          }}
          className="shrink-0 px-2.5 py-1.5 bg-[#0a0a0a] border border-white/10 rounded text-xs text-zinc-400 hover:border-yellow-400 hover:text-yellow-400 transition-colors"
        >
          Replace
        </button>
      </div>
      {replaceOpen && (
        <div className="mt-2 flex items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
          <input
            type="text"
            placeholder="Find text"
            aria-label="Find text to replace"
            value={searchText}
            onChange={event => {
              setSearchText(event.target.value);
              setCurrentMatchIndex(0);
              setReplaceMessage('');
            }}
            className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-yellow-400/60"
          />
          <input
            type="text"
            placeholder="Replace with"
            aria-label="Replacement text"
            value={replacementText}
            onChange={event => setReplacementText(event.target.value)}
            className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-yellow-400/60"
          />
          <button
            type="button"
            onClick={() => handleReplace(currentMatch)}
            disabled={!searchText || !replacementText || matchCount === 0}
            className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Replace selected
          </button>
          <button
            type="button"
            onClick={() => handleReplace()}
            disabled={!searchText || !replacementText || matchCount === 0}
            className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Replace all
          </button>
          <span className="shrink-0 min-w-12 text-center text-xs font-mono text-zinc-500" aria-label="Replace match position">
            {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : '0/0'}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMatchIndex(Math.max(currentMatch - 1, 0))}
            disabled={matchCount === 0}
            className="p-1.5 rounded border border-white/10 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            title="Previous match"
            aria-label="Previous replace match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMatchIndex(Math.min(currentMatch + 1, matchCount - 1))}
            disabled={matchCount === 0}
            className="p-1.5 rounded border border-white/10 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            title="Next match"
            aria-label="Next replace match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          {replaceMessage && <span className="shrink-0 text-xs text-zinc-500">{replaceMessage}</span>}
        </div>
      )}
    </div>
  );
}
