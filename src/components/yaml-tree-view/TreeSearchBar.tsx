import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useState } from 'react';

interface TreeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onReplace: (replacement: string, matchIndex?: number) => number;
  replaceMatchCount: number;
  currentMatchIndex: number;
  onCurrentMatchIndexChange: (index: number) => void;
  searchMatchCount: number;
}

export function TreeSearchBar({
  value,
  onChange,
  onClear,
  onReplace,
  replaceMatchCount,
  currentMatchIndex,
  onCurrentMatchIndexChange,
  searchMatchCount,
}: TreeSearchBarProps) {
  const { t } = useLanguage();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(value);
  const [replacementText, setReplacementText] = useState('');
  const [replacementResult, setReplacementResult] = useState<number | null>(null);
  const replaceMessage = replacementResult === null ? '' : replacementResult > 0
    ? `${replacementResult} ${t(replacementResult === 1 ? 'studioControls.replacement' : 'studioControls.replacements')}`
    : t('studioControls.noMatches');
  const [replaceApplied, setReplaceApplied] = useState(false);
  const matchCount = replaceOpen ? replaceMatchCount : 0;
  const currentMatch = Math.min(currentMatchIndex, Math.max(matchCount - 1, 0));
  const replacementDisabled = replaceApplied || !value.trim() || !replacementText || matchCount === 0;

  const applySearch = () => {
    const executedQuery = searchDraft.trim();
    setSearchDraft(executedQuery);
    setReplaceApplied(false);
    setReplacementResult(null);
    onCurrentMatchIndexChange(0);
    onChange(executedQuery);
  };

  const handleReplace = (matchIndex?: number) => {
    const replacements = onReplace(replacementText, matchIndex);
    if (replacements > 0) {
      setReplaceApplied(true);
    }
    setReplacementResult(replacements);
  };

  return (
    <div className="shrink-0 px-3 pt-3 pb-2">
      <div className="flex items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
        {/* Input container */}
        <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder={t('studioControls.searchNodes')}
            aria-label={t('studioControls.searchNodesLabel')}
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applySearch();
            }}
            className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none"
          />
          {value.trim() && (
            <span className="shrink-0 text-xs text-zinc-500" aria-label={t('studioControls.resultCount')}>
              {searchMatchCount} {t(searchMatchCount === 1 ? 'studioControls.result' : 'studioControls.results')}
            </span>
          )}
        </div>

        {/* Close button */}
        {(value || searchDraft) && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft('');
              setReplaceOpen(false);
              setReplacementText('');
              setReplacementResult(null);
              setReplaceApplied(false);
              onCurrentMatchIndexChange(0);
              onClear();
            }}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title={t('studioControls.closeSearch')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={applySearch}
          aria-label={t('studioControls.searchTree')}
          className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 hover:bg-yellow-400/20 transition-colors"
        >
          {t('studioControls.search')}
        </button>
        <button
          type="button"
          onClick={() => setReplaceOpen(open => !open)}
          className="shrink-0 px-2.5 py-1.5 bg-[#0a0a0a] border border-white/10 rounded text-xs text-zinc-400 hover:border-yellow-400 hover:text-yellow-400 transition-colors"
        >
          {t('studioControls.replace')}
        </button>
      </div>
      {replaceOpen && (
        <div className="mt-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('studioControls.findText')}
              aria-label={t('studioControls.findTextLabel')}
              value={value}
              readOnly
              className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 outline-none"
            />
            <input
              type="text"
              placeholder={t('studioControls.replaceWith')}
              aria-label={t('studioControls.replacementLabel')}
              value={replacementText}
              onChange={event => {
                setReplacementText(event.target.value);
                setReplacementResult(null);
                setReplaceApplied(false);
              }}
              className="min-w-0 flex-1 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 outline-none focus:border-yellow-400/60"
            />
            <span className="shrink-0 min-w-14 text-center text-xs font-mono text-zinc-500" aria-label={t('studioControls.position')}>
              {matchCount > 0 ? `${currentMatch + 1} / ${matchCount}` : '0 / 0'}
            </span>
            <button
              type="button"
              onClick={() => onCurrentMatchIndexChange(Math.max(currentMatch - 1, 0))}
              disabled={matchCount === 0}
              className="p-1.5 rounded border border-white/10 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              title={t('studioControls.previous')}
              aria-label={t('studioControls.previousLabel')}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onCurrentMatchIndexChange(Math.min(currentMatch + 1, matchCount - 1))}
              disabled={matchCount === 0}
              className="p-1.5 rounded border border-white/10 text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              title={t('studioControls.next')}
              aria-label={t('studioControls.nextLabel')}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleReplace(currentMatch)}
              disabled={replacementDisabled}
              className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('studioControls.selected')}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleReplace()}
              disabled={replacementDisabled}
              className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('studioControls.all')}
            </button>
            {replaceMessage && <span className="shrink-0 text-xs text-yellow-400">{replaceMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
