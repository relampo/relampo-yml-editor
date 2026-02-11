import { useEffect, useRef } from 'react';

interface YAMLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function YAMLCodeEditor({ value, onChange }: YAMLCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = highlightYAML(value);
    }
  }, [value]);

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
    <div className="relative h-full w-full bg-[#0a0a0a] overflow-hidden font-mono text-sm">
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
  );
}

function highlightYAML(code: string): string {
  const lines = code.split('\n');
  
  return lines.map(line => {
    if (line.trim() === '') {
      return ' ';
    }

    // Comentarios
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
  }).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}