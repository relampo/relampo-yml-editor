import { useStudioTheme } from '../hooks/useStudioTheme';
import { RELAMPO_YAML_THEME, RELAMPO_YAML_LIGHT_THEME } from '../utils/studioMonacoThemes';
import Editor, { Monaco } from '@monaco-editor/react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { editor as MonacoEditorNS, languages as MonacoLanguagesNS } from 'monaco-editor';
import { useLanguage } from '../contexts/LanguageContext';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';

interface YAMLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  active?: boolean;
  largeFileMode?: boolean;
}

// Pure, static Monaco config — doesn't depend on props/state, so it lives once at module scope
// instead of being rebuilt (and re-typed) on every editor mount.
const YAML_MONARCH_LANGUAGE: MonacoLanguagesNS.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/#.*$/, 'comment'],
      [/^(\s*-\s*)([a-zA-Z_][\w-]*)(\s*:)(.*)$/, ['white', 'key', 'delimiter.colon', 'value']],
      [/^(\s*)([a-zA-Z_][\w-]*)(\s*:)(.*)$/, ['white', 'key', 'delimiter.colon', 'value']],
      [/^(\s*)(["'][^"']+["'])(\s*:)(.*)$/, ['white', 'key', 'delimiter.colon', 'value']],
      [/^\s*-\s+/, 'delimiter'],
      [/:/, 'delimiter.colon'],
      [/"[^"]*"/, 'string'],
      [/'[^']*'/, 'string'],
      [/\b\d+(\.\d+)?\b/, 'number'],
      [/\b(true|false|null)\b/, 'value'],
    ],
  },
};


interface SearchToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  totalMatches: number;
  currentMatchIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
}

function SearchToolbar({
  searchQuery,
  onSearchQueryChange,
  totalMatches,
  currentMatchIndex,
  onPrev,
  onNext,
  onClear,
}: SearchToolbarProps) {
  const { t } = useLanguage();
  return (
    <div className="shrink-0 px-3 pt-3 pb-2 bg-[#0a0a0a]">
      <div
        className={`flex items-center gap-2 p-3 bg-[#111111] border rounded-lg transition-colors ${
          searchQuery.trim() ? 'border-yellow-400/35' : 'border-white/10'
        }`}
      >
        <div
          className={`flex-1 flex items-center gap-2 bg-[#0a0a0a] border rounded px-3 py-1.5 transition-colors ${
            searchQuery.trim() ? 'border-yellow-400/45' : 'border-white/10'
          }`}
        >
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder={t('yamlEditor.requestDetails.searchInYaml')}
            aria-label={t('yamlEditor.requestDetails.searchInYamlLabel')}
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none font-sans selection:bg-blue-500/40 selection:text-blue-100"
          />
          <span className="text-xs text-zinc-500 font-semibold shrink-0 font-mono">
            {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0'}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={totalMatches === 0}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title={t('yamlEditor.requestDetails.previous')}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={totalMatches === 0}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title={t('yamlEditor.requestDetails.next')}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title={t('yamlEditor.requestDetails.clearSearch')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface YAMLMonacoPaneProps {
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onMount: ComponentProps<typeof Editor>['onMount'];
  options: ComponentProps<typeof Editor>['options'];
}

function YAMLMonacoPane({ value, readOnly, onChange, onMount, options }: YAMLMonacoPaneProps) {
  const theme = useStudioTheme();
  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        height="100%"
        language="yaml-relampo"
        value={value}
        onChange={(nextValue: string | undefined) => {
          if (!readOnly) onChange(nextValue || '');
        }}
        onMount={onMount}
        theme={theme === 'light' ? 'relampo-yaml-light' : 'relampo-yaml-dark'}
        options={options}
      />
    </div>
  );
}

export function YAMLCodeEditor({
  value,
  onChange,
  readOnly = false,
  active = true,
  largeFileMode = false,
}: YAMLCodeEditorProps) {
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const findDecorationsRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<MonacoEditorNS.FindMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const totalMatches = matches.length;

  // Stabilized on `searchQuery` alone (the only reactive value it reads) so effects that
  // depend on it only re-run when the search text actually changes, not on every render.
  const recomputeMatches = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !searchQuery.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const model = editor.getModel();
    if (!model) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const nextMatches = model.findMatches(searchQuery, false, false, false, null, true);
    setMatches(nextMatches);
    setCurrentMatchIndex(prev => (nextMatches.length === 0 ? 0 : Math.min(prev, nextMatches.length - 1)));
  }, [searchQuery]);

  useEffect(() => {
    if (!active) return;
    recomputeMatches();
  }, [active, recomputeMatches]);

  useEffect(() => {
    if (!active || largeFileMode || !searchQuery.trim()) return;
    recomputeMatches();
  }, [value, active, largeFileMode, searchQuery, recomputeMatches]);

  // Decorations + reveal-on-scroll are both direct consequences of `matches`/`currentMatchIndex`
  // changing, so they're combined into a single external-system sync instead of two effects
  // chained off the same state update.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!findDecorationsRef.current) {
      findDecorationsRef.current = editor.createDecorationsCollection([]);
    }

    if (!searchQuery.trim() || matches.length === 0) {
      findDecorationsRef.current.set([]);
    } else {
      const decorations: MonacoEditorNS.IModelDeltaDecoration[] = matches.map((m, idx) => ({
        range: m.range,
        options: {
          // inlineClassName highlights the exact matched text (className decorates line/container)
          inlineClassName: idx === currentMatchIndex ? 'relampo-find-current' : 'relampo-find-match',
        },
      }));
      findDecorationsRef.current.set(decorations);
    }

    if (!active) return;
    if (matches.length === 0) return;
    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch) return;
    editor.revealRangeInCenter(currentMatch.range);
  }, [matches, currentMatchIndex, searchQuery, active]);

  const theme = useStudioTheme();

  const handleEditorDidMount = (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => {
    monacoRef.current = monaco;
    try {
      if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'yaml-relampo')) {
        monaco.languages.register({ id: 'yaml-relampo' });
      }
    } catch {
      // ignore duplicate registration races in dev/hot reload
    }
    monaco.languages.setMonarchTokensProvider('yaml-relampo', YAML_MONARCH_LANGUAGE);
    monaco.editor.defineTheme('relampo-yaml-dark', RELAMPO_YAML_THEME);
    monaco.editor.defineTheme('relampo-yaml-light', RELAMPO_YAML_LIGHT_THEME);
    monaco.editor.setTheme(theme === 'light' ? 'relampo-yaml-light' : 'relampo-yaml-dark');
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'yaml-relampo');
    }
    editorRef.current = editor;
    findDecorationsRef.current = editor.createDecorationsCollection([]);
    if (searchQuery.trim()) {
      recomputeMatches();
    }
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % totalMatches);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches);
  };

  const handleSearchQueryChange = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    setCurrentMatchIndex(0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
    setMatches([]);
  };

  const editorOptions = useMemo(
    () => ({
      readOnly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: largeFileMode ? ('off' as const) : ('on' as const),
      automaticLayout: true,
      renderLineHighlight: 'none' as const,
      occurrencesHighlight: 'off' as const,
      selectionHighlight: false,
      codeLens: false,
      folding: !largeFileMode,
      links: !largeFileMode,
      wordBasedSuggestions: largeFileMode ? ('off' as const) : ('currentDocument' as const),
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false,
      },
      lineNumbersMinChars: 3,
      padding: { top: 12, bottom: 12 },
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never' as const,
        seedSearchStringFromSelection: 'never' as const,
      },
    }),
    [readOnly, largeFileMode],
  );

  return (
    <div className="relative h-full w-full bg-[#0a0a0a] flex flex-col text-sm">
      <SearchToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        totalMatches={totalMatches}
        currentMatchIndex={currentMatchIndex}
        onPrev={handlePrevMatch}
        onNext={handleNextMatch}
        onClear={handleClearSearch}
      />

      <YAMLMonacoPane
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={editorOptions}
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
