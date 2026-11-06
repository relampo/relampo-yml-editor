import type { SearchScope } from './search';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface TreeSearchBarProps {
  scope: SearchScope | null;
  onScopeChange: (scope: SearchScope, query: string) => void;
  occurrenceCount: number;
  searchMatchIndex?: number;
  onSearchNavigate?: (index: number) => void;
  selectedSearchReplaceable?: boolean;
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
  scope,
  onScopeChange,
  occurrenceCount,
  searchMatchIndex = 0,
  onSearchNavigate,
  selectedSearchReplaceable = true,
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
  const [hasSearched, setHasSearched] = useState(Boolean(value.trim()));
  const [searchDraft, setSearchDraft] = useState(value);
  const [replacementText, setReplacementText] = useState('');
  const [replacementResult, setReplacementResult] = useState<number | null>(null);
  const replaceMessage =
    replacementResult === null
      ? ''
      : replacementResult > 0
        ? `${replacementResult} ${t(replacementResult === 1 ? 'studioControls.replacement' : 'studioControls.replacements')}`
        : t('studioControls.noMatches');
  const [replaceApplied, setReplaceApplied] = useState(false);
  const matchCountAtReplacement = useRef(0);
  const matchCount = replaceOpen ? replaceMatchCount : 0;
  const currentMatch = Math.min(currentMatchIndex, Math.max(matchCount - 1, 0));
  const navigationCount = onSearchNavigate ? occurrenceCount : matchCount;
  const navigationIndex = onSearchNavigate ? searchMatchIndex : currentMatch;
  const navigate = (direction: number) => {
    const increment = direction > 0 && replaceApplied && matchCount < matchCountAtReplacement.current ? 0 : direction;
    setReplaceApplied(false);
    setReplacementResult(null);
    if (onSearchNavigate) onSearchNavigate(navigationIndex + increment);
    else onCurrentMatchIndexChange(Math.max(0, Math.min(navigationIndex + increment, navigationCount - 1)));
  };
  const replacementDisabled =
    scope !== 'requests' || !hasSearched || replaceApplied || !value.trim() || !replacementText || matchCount === 0;

  const applySearch = () => {
    if (!scope) return;
    const executedQuery = searchDraft.trim();
    setHasSearched(Boolean(executedQuery));
    setSearchDraft(executedQuery);
    setReplaceApplied(false);
    setReplacementResult(null);
    onCurrentMatchIndexChange(0);
    onChange(executedQuery);
  };

  const handleReplace = (matchIndex?: number) => {
    if (replacementDisabled) return;
    matchCountAtReplacement.current = matchCount;
    const replacements = onReplace(replacementText, matchIndex);
    if (replacements > 0) {
      setReplaceApplied(true);
    }
    setReplacementResult(replacements);
  };

  return (
    <div
      role="search"
      aria-label={t('studioControls.searchTree')}
      className="shrink-0 px-3 pt-3 pb-2"
    >
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
        {/* Input container */}
        <div className="min-w-0 basis-28 flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder={t('studioControls.searchNodes')}
            aria-label={t('studioControls.searchNodesLabel')}
            value={searchDraft}
            onChange={e => {
              setSearchDraft(e.target.value);
              setHasSearched(false);
              setReplaceOpen(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') applySearch();
            }}
            className="min-w-0 flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Close button */}
        {(value || searchDraft) && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft('');
              setHasSearched(false);
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
        <fieldset className="flex shrink-0 items-center gap-1">
          <legend className="sr-only">{t('studioControls.searchScope')}</legend>
          {(['requests', 'responses'] as const).map(option => (
            <label
              key={option}
              className={`relative cursor-pointer rounded border px-2 py-1.5 text-xs transition-colors ${scope === option ? 'border-white bg-[#0a0a0a] text-white' : 'border-white/20 bg-[#0a0a0a] text-zinc-300 hover:border-white/50'} focus-within:ring-2 focus-within:ring-white/60`}
            >
              <input
                type="radio"
                name="tree-search-scope"
                value={option}
                checked={scope === option}
                onChange={() => {
                  setReplaceOpen(false);
                  setHasSearched(false);
                  setReplaceApplied(false);
                  setReplacementResult(null);
                  onCurrentMatchIndexChange(0);
                  onScopeChange(option, searchDraft);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {option === 'requests' ? 'Requests' : 'Responses'}
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          onClick={applySearch}
          aria-label={t('studioControls.searchTree')}
          disabled={!scope || !searchDraft.trim()}
          className="shrink-0 px-2.5 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded text-xs text-yellow-400 enabled:hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {t('studioControls.search')}
        </button>
        {hasSearched && value.trim() && (onSearchNavigate || replaceOpen) && (
          <div
            className="flex shrink-0 items-center gap-1"
            role="group"
            aria-label={t('studioControls.searchNavigation')}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={!navigationCount}
              aria-label={t(replaceOpen ? 'studioControls.previousLabel' : 'studioControls.previousSearchMatch')}
              className="rounded border border-white/15 p-1.5 text-zinc-300 enabled:hover:bg-yellow-400/15 disabled:opacity-40"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              aria-label={t(replaceOpen ? 'studioControls.position' : 'studioControls.searchPosition')}
              className="shrink-0 whitespace-nowrap text-center text-xs font-mono tabular-nums text-yellow-300"
              style={{ width: `${Math.max(11, String(navigationCount).length * 2 + 3)}ch` }}
            >
              {navigationCount ? Math.min(navigationIndex + 1, navigationCount) : 0} / {navigationCount}
            </span>
            <button
              type="button"
              onClick={() => navigate(1)}
              disabled={!navigationCount}
              aria-label={t(replaceOpen ? 'studioControls.nextLabel' : 'studioControls.nextSearchMatch')}
              className="rounded border border-white/15 p-1.5 text-zinc-300 enabled:hover:bg-yellow-400/15 disabled:opacity-40"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (scope === 'requests' && hasSearched) setReplaceOpen(open => !open);
          }}
          disabled={scope !== 'requests' || !hasSearched || !value.trim()}
          className="shrink-0 px-2.5 py-1.5 bg-[#0a0a0a] border border-white/10 rounded text-xs text-zinc-400 enabled:hover:border-yellow-400 enabled:hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {t('studioControls.replace')}
        </button>
        {replaceOpen && scope === 'requests' && (
          <div
            role="group"
            aria-label={t('studioControls.replace')}
            className="flex min-w-0 flex-wrap items-center gap-2"
          >
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
              className="w-32 min-w-20 rounded border border-white/15 bg-[#0a0a0a] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-yellow-400/60"
            />
            <button
              type="button"
              onClick={() => handleReplace(currentMatch)}
              disabled={replacementDisabled || !selectedSearchReplaceable}
              className="shrink-0 rounded border border-yellow-400/30 bg-yellow-400/10 px-2 py-1.5 text-xs text-yellow-300 disabled:opacity-40"
            >
              {t('studioControls.selected')}
            </button>
            <button
              type="button"
              onClick={() => handleReplace()}
              disabled={replacementDisabled}
              className="shrink-0 rounded border border-yellow-400/30 bg-yellow-400/10 px-2 py-1.5 text-xs text-yellow-300 disabled:opacity-40"
            >
              {t('studioControls.all')}
            </button>
            {replaceMessage && <span className="text-xs text-yellow-400">{replaceMessage}</span>}
          </div>
        )}
      </div>
      {value.trim() && (
        <span
          className="mt-2 block text-xs text-zinc-400"
          aria-label={t('studioControls.resultCount')}
        >
          {occurrenceCount}{' '}
          {t(occurrenceCount === 1 ? 'studioControls.searchOccurrence' : 'studioControls.searchOccurrences')} ·{' '}
          {searchMatchCount}{' '}
          {t(searchMatchCount === 1 ? 'studioControls.searchNodeCount' : 'studioControls.searchNodesCount')}
        </span>
      )}
    </div>
  );
}
