import type { ComponentProps, CSSProperties } from 'react';
import { Input } from './input';

export function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/35 text-yellow-200 rounded-sm not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

interface HighlightedInputProps extends ComponentProps<typeof Input> {
  searchText?: string;
  overlayClass?: string;
  /** Layout classes for the wrapper that replaces the input in the parent
   *  layout when a match is highlighted (e.g. `flex-1`). */
  containerClass?: string;
  containerStyle?: CSSProperties;
}

export function HighlightedInput({
  searchText = '',
  value,
  overlayClass = 'px-3 py-2 text-sm text-zinc-300',
  className = '',
  containerClass = '',
  containerStyle,
  style,
  ...props
}: HighlightedInputProps) {
  const strValue = String(value ?? '');
  const q = searchText.trim();
  const hasMatch = q && strValue.toLowerCase().includes(q.toLowerCase());

  if (!hasMatch) {
    return (
      <Input
        value={value}
        className={`${containerClass} ${className}`.trim()}
        style={{ ...containerStyle, ...style }}
        {...props}
      />
    );
  }

  return (
    <div className={`relative ${containerClass}`.trim()} style={containerStyle}>
      <div
        className={`absolute inset-0 flex items-center overflow-hidden pointer-events-none ${overlayClass}`}
        aria-hidden="true"
      >
        <span className="whitespace-pre truncate w-full">
          <HighlightText text={strValue} query={searchText} />
        </span>
      </div>
      <Input
        value={value}
        className={className}
        style={{ ...style, color: 'transparent', caretColor: '#d4d4d8' }}
        {...props}
      />
    </div>
  );
}
