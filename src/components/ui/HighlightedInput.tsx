import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { BaseInput } from './input-base';

export function HighlightText({ text, query, activeIndex }: { text: string; query: string; activeIndex?: number }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = [];
  let offset = 0;
  let matchIndex = 0;
  let index: number;
  while ((index = text.toLowerCase().indexOf(q.toLowerCase(), offset)) !== -1) {
    parts.push(text.slice(offset, index));
    parts.push(
      <mark
        key={index}
        data-active-match={activeIndex === matchIndex ? 'true' : undefined}
        className={
          activeIndex === matchIndex
            ? 'bg-green-300 text-black rounded-sm not-italic ring-1 ring-green-300'
            : 'bg-yellow-400/35 text-yellow-200 rounded-sm not-italic'
        }
      >
        {text.slice(index, index + q.length)}
      </mark>,
    );
    offset = index + q.length;
    matchIndex++;
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
}

interface HighlightedInputProps extends ComponentProps<typeof BaseInput> {
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
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const q = searchText.trim();
  const hasMatch = Boolean(q && strValue.toLowerCase().includes(q.toLowerCase()));
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMatch || !overlayRef.current) return;
    const container = overlayRef.current;
    const input = container.parentElement?.querySelector('input');
    if (!input) return;
    const computed = getComputedStyle(input);
    for (const property of [
      'font',
      'letter-spacing',
      'padding-left',
      'padding-right',
      'border-left-width',
      'border-right-width',
      'border-style',
      'text-indent',
    ]) {
      container.style.setProperty(property, computed.getPropertyValue(property));
    }
    container.style.borderColor = 'transparent';
    container.scrollLeft = input.scrollLeft;
  }, [hasMatch, strValue, q, activeIndex]);

  useEffect(() => {
    const input = overlayRef.current?.parentElement?.querySelector('input');
    if (!input) return;
    const update = () => setActiveIndex(input.getAttribute('data-search-active') === 'true' ? Number(input.getAttribute('data-search-active-index') ?? 0) : undefined);
    update();
    const observer = new MutationObserver(update);
    observer.observe(input, { attributes: true, attributeFilter: ['data-search-active', 'data-search-active-index'] });
    return () => observer.disconnect();
  }, [hasMatch, strValue]);

  if (!hasMatch) {
    return (
      <BaseInput
        value={value}
        className={`${containerClass} ${className}`.trim()}
        style={{ ...containerStyle, ...style }}
        {...props}
      />
    );
  }

  return (
    <div
      className={`relative ${containerClass}`.trim()}
      style={containerStyle}
    >
      <div
        ref={overlayRef}
        className={`absolute inset-0 flex items-center overflow-hidden pointer-events-none ${overlayClass}`}
        aria-hidden="true"
      >
        <span className="whitespace-pre">
          <HighlightText
            text={strValue}
            query={searchText}
            activeIndex={activeIndex}
          />
        </span>
      </div>
      <style>{`input[data-search-highlighted]::selection { color: transparent !important; background: transparent !important; }`}</style>
      <BaseInput
        data-search-highlighted="true"
        value={value}
        className={className}
        style={{ ...style, color: 'transparent', caretColor: '#d4d4d8' }}
        {...props}
        onScroll={event => {
          if (overlayRef.current) overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
          props.onScroll?.(event);
        }}
        onFocus={event => {
          props.onFocus?.(event);
        }}
        onBlur={event => {
          props.onBlur?.(event);
        }}
      />
    </div>
  );
}
