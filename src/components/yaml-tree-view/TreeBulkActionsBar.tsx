import { BetweenHorizontalStart } from 'lucide-react';

interface TreeBulkActionsBarProps {
  selectedCount: number;
  hasActionableSelection: boolean;
  allSelectedDisabled: boolean;
  canCreateTransaction: boolean;
  validationMessage: string | null;
  onCreateTransaction: () => void;
  onDuplicate: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
}

export function TreeBulkActionsBar({
  selectedCount,
  hasActionableSelection,
  allSelectedDisabled,
  canCreateTransaction,
  validationMessage,
  onCreateTransaction,
  onDuplicate,
  onToggleEnabled,
  onDelete,
}: TreeBulkActionsBarProps) {
  return (
    <div className="shrink-0 px-3 pb-2">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{selectedCount} selected</span>
        <button type="button"
          onClick={onCreateTransaction}
          disabled={!canCreateTransaction}
          className="px-2.5 py-1.5 text-xs font-semibold rounded border border-teal-400/20 text-teal-200 hover:bg-teal-400/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <BetweenHorizontalStart className="w-3.5 h-3.5" />
          Create Transaction
        </button>
        <button type="button"
          onClick={onDuplicate}
          disabled={!hasActionableSelection}
          className="px-2.5 py-1.5 text-xs font-semibold rounded border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Duplicate
        </button>
        <button type="button"
          onClick={onToggleEnabled}
          disabled={!hasActionableSelection}
          className="px-2.5 py-1.5 text-xs font-semibold rounded border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allSelectedDisabled ? 'Enable' : 'Disable'}
        </button>
        <button type="button"
          onClick={onDelete}
          disabled={!hasActionableSelection}
          className="px-2.5 py-1.5 text-xs font-semibold rounded border border-red-400/20 text-red-300 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete
        </button>
        {!canCreateTransaction && <span className="text-xs text-zinc-500">{validationMessage}</span>}
      </div>
    </div>
  );
}
