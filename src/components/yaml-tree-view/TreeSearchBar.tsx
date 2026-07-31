import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface TreeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onReplace: (search: string, replacement: string) => number;
}

export function TreeSearchBar({ value, onChange, onClear, onReplace }: TreeSearchBarProps) {
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [replaceMessage, setReplaceMessage] = useState('');

  const handleReplace = () => {
    const replacements = onReplace(searchText, replacementText);
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
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Close button */}
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setReplaceOpen(open => !open);
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
            onChange={event => setSearchText(event.target.value)}
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
            onClick={handleReplace}
            disabled={!searchText}
            className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Replace all
          </button>
          {replaceMessage && <span className="shrink-0 text-xs text-zinc-500">{replaceMessage}</span>}
        </div>
      )}
    </div>
  );
}
