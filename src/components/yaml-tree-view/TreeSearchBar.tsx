import { Search, X } from 'lucide-react';

interface TreeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function TreeSearchBar({ value, onChange, onClear }: TreeSearchBarProps) {
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
          <button type="button"
            onClick={onClear}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
