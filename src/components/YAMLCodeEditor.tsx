import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface YAMLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function YAMLCodeEditor({ value, onChange }: YAMLCodeEditorProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    if (highlightRef.current) {
      const { html, matches } = highlightYAML(value, searchQuery, currentMatchIndex);
      highlightRef.current.innerHTML = html;
      setTotalMatches(matches);
      
      // Reset index if no matches
      if (matches === 0 && currentMatchIndex !== 0) {
        setCurrentMatchIndex(0);
      }
      
      // Auto-scroll al match actual
      if (matches > 0 && searchQuery.trim()) {
        setTimeout(() => {
          const currentMark = highlightRef.current?.querySelector('mark[data-current="true"]');
          if (currentMark) {
            currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 10);
      }
    }
  }, [value, searchQuery, currentMatchIndex]);

  const handleNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;
    
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const lineNumbers = value.split('\n').map((_, i) => i + 1).join('\n');

  return (
    <div className="relative h-full w-full bg-[#0a0a0a] flex flex-col font-mono text-sm">
      {/* Search Bar - Exact converter style */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 bg-[#0a0a0a]">
        <div className="flex items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
          {/* Input container */}
          <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder={t('yamlEditor.search.searchInYaml')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none font-sans"
            />
            <span className="text-xs text-zinc-500 font-semibold flex-shrink-0 font-mono">
              {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0'}
            </span>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex gap-1">
            <button
              onClick={handlePrevMatch}
              disabled={totalMatches === 0}
              className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              title={t('yamlEditor.search.previous')}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={totalMatches === 0}
              className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              title={t('yamlEditor.search.next')}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentMatchIndex(0);
              }}
              className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-all flex items-center justify-center"
              title={t('yamlEditor.search.closeSearch')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex-1 overflow-hidden">
      <div className="absolute inset-0 flex min-w-0">
        {/* Line numbers */}
        <div className="w-12 flex-shrink-0 bg-[#0a0a0a] border-r border-white/5 overflow-hidden">
          <pre className="py-3 px-2 text-right leading-6 text-zinc-600 select-none">
            {lineNumbers}
          </pre>
        </div>

        {/* Editor area */}
        <div className="flex-1 relative min-w-0">
          {/* Highlighted background */}
          <div
            ref={highlightRef}
            className="absolute inset-0 py-3 px-4 overflow-auto leading-6 pointer-events-none whitespace-pre-wrap break-words"
          />

          {/* Editable textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleTab}
            spellCheck={false}
            className="absolute inset-0 py-3 px-4 w-full h-full resize-none bg-transparent leading-6 outline-none overflow-auto whitespace-pre-wrap break-words caret-yellow-400"
            style={{
              color: 'transparent',
              caretColor: '#facc15',
              WebkitTextFillColor: 'transparent'
            }}
          />
        </div>
      </div>
      </div>
    </div>
  );
}

function highlightYAML(code: string, searchQuery: string = '', currentMatchIndex: number = 0): { html: string; matches: number } {
  let lines = code.split('\n');
  
  lines = lines.map(line => {
    if (line.trim() === '') {
      return ' ';
    }

    // Comments
    if (line.trim().startsWith('#')) {
      return `<span style="color: #71717a">${escapeHtml(line)}</span>`;
    }

    // Keys principales (sin indentación)
    if (/^[a-z_]+:/.test(line)) {
      const idx = line.indexOf(':');
      const key = line.substring(0, idx);
      const rest = line.substring(idx);
      return `<span style="color: #facc15; font-weight: 600">${escapeHtml(key)}</span><span style="color: #71717a">${escapeHtml(rest)}</span>`;
    }

    // List items con tipos de step (- request:, - group:, etc.)
    const listStepMatch = line.match(/^(\s+- )(request|group|loop|if|retry|think_time):(.*)/);
    if (listStepMatch) {
      const [, prefix, stepType, rest] = listStepMatch;
      return `<span style="color: #71717a">${prefix}</span><span style="color: #4ade80; font-weight: 700">${escapeHtml(stepType)}</span><span style="color: #71717a">:</span><span style="color: #e4e4e7">${escapeHtml(rest)}</span>`;
    }

    // Keys con indentación - resaltar tipos de step sin guión
    const match = line.match(/^(\s+)([a-z_]+):(.*)/);
    if (match) {
      const [, indent, key, rest] = match;
      
      // Tipos de steps en verde
      if (key === 'request' || key === 'group' || key === 'loop' || key === 'if' || key === 'retry' || key === 'think_time') {
        return `${indent}<span style="color: #4ade80; font-weight: 700">${escapeHtml(key)}</span><span style="color: #71717a">:</span><span style="color: #e4e4e7">${escapeHtml(rest)}</span>`;
      }
      
      return `${indent}<span style="color: #60a5fa">${escapeHtml(key)}</span><span style="color: #71717a">:</span><span style="color: #e4e4e7">${escapeHtml(rest)}</span>`;
    }

    // List items genéricos
    if (/^\s+- /.test(line)) {
      const m = line.match(/^(\s+- )(.*)/);
      if (m) {
        return `<span style="color: #71717a">${m[1]}</span><span style="color: #e4e4e7">${escapeHtml(m[2])}</span>`;
      }
    }

    // Default
    return `<span style="color: #e4e4e7">${escapeHtml(line)}</span>`;
  });
  
  // Count matches and highlight search results
  if (searchQuery.trim() !== '') {
    const regex = new RegExp(escapeRegex(searchQuery), 'gi');
    
    // Count total matches
    const allText = lines.join('\n');
    const matches = allText.match(regex);
    const totalMatches = matches ? matches.length : 0;
    
    // Apply highlighting with current match different
    let currentMatch = 0;
    lines = lines.map(line => {
      return line.replace(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi'), (match) => {
        const isCurrentMatch = currentMatch === currentMatchIndex;
        currentMatch++;
        
        if (isCurrentMatch) {
          return `<mark data-current="true" style="background-color: #facc15; color: #000; padding: 0 2px; border-radius: 2px; outline: 2px solid #f59e0b;">${match}</mark>`;
        }
        return `<mark style="background-color: #facc15; color: #000; padding: 0 2px; border-radius: 2px; opacity: 0.6;">${match}</mark>`;
      });
    });
    
    return { html: lines.join('\n'), matches: totalMatches };
  }
  
  return { html: lines.join('\n'), matches: 0 };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
