import type { ComponentProps } from 'react';

/** Shared body surface for HTTP requests and WebSocket messages. */
export function BodyTextarea({ className = '', style, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      style={{ height: 300, minHeight: 300, ...style }}
      className={`w-full bg-white/5 border border-white/10 rounded text-zinc-300 text-sm font-mono h-75 resize-none overflow-y-auto overflow-x-auto outline-none p-3 disabled:opacity-60 ${className}`}
    />
  );
}
