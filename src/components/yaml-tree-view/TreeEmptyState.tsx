import { Plus } from 'lucide-react';

interface TreeEmptyStateProps {
  description: string;
  buttonLabel: string;
  onCreateRoot: () => void;
}

export function TreeEmptyState({ description, buttonLabel, onCreateRoot }: TreeEmptyStateProps) {
  return (
    <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-sm text-zinc-500 mb-8 max-w-70 mx-auto">{description}</p>

        <button type="button"
          onClick={onCreateRoot}
          className="group relative px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-[background-color,transform] duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-xl shadow-yellow-400/10"
        >
          <Plus className="w-5 h-5" />
          <span>{buttonLabel}</span>
          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
