import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Monitor } from 'lucide-react';

// Capacity is a UI plan setting. The CLI independently checks the actual signed
// execution entitlement during preflight and before dispatching workers.
export function DistributedNodes({
  selected,
  onChange,
  capacity,
  maxSelected,
  disabled,
  es,
}: {
  selected: number[];
  onChange: (nodes: number[]) => void;
  capacity: number;
  maxSelected: number;
  disabled: boolean;
  es: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = (spanish: string, english: string) => (es ? spanish : english);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div
      ref={container}
      className="relative"
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t('Nodos', 'Nodes')}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(value => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
      >
        <Monitor
          size={15}
          className="text-yellow-400"
          aria-hidden="true"
        />
        {t('Nodos', 'Nodes')}{' '}
        <span
          aria-live="polite"
          className="min-w-5 rounded bg-yellow-400/10 px-1.5 py-0.5 text-center font-semibold tabular-nums text-yellow-400"
        >
          {selected.length}
        </span>
        <ChevronDown
          size={12}
          className="ml-1 text-zinc-500"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('Seleccionar nodos', 'Select nodes')}
          className="absolute left-0 z-30 mt-2 w-[17rem] rounded-xl border border-white/15 bg-[#171717] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-200">{t('Seleccionar nodos', 'Select nodes')}</span>
            <span className="font-mono text-yellow-400">
              {selected.length}/{maxSelected}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: capacity }, (_, index) => {
              const number = index + 1;
              const checked = selected.includes(number);
              return (
                <button
                  key={number}
                  type="button"
                  aria-label={`${t('Nodo', 'Node')} ${number}`}
                  aria-pressed={checked}
                  disabled={disabled || (!checked && selected.length >= maxSelected)}
                  title={`${t('Nodo', 'Node')} ${number}`}
                  onClick={() =>
                    onChange(
                      checked ? selected.filter(node => node !== number) : [...selected, number].sort((a, b) => a - b),
                    )
                  }
                  className={`relative flex h-8 flex-col items-center justify-center rounded border transition-colors focus-visible:outline-2 focus-visible:outline-yellow-400 disabled:cursor-not-allowed disabled:opacity-25 ${checked ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-400' : 'border-white/5 text-yellow-400/45 hover:border-yellow-400/40 hover:bg-yellow-400/5 hover:text-yellow-400'}`}
                >
                  <Monitor
                    size={14}
                    aria-hidden="true"
                  />
                  <span className="text-[8px] leading-2.5 tabular-nums">{number}</span>
                  {checked && (
                    <Check
                      size={8}
                      aria-hidden="true"
                      className="absolute right-0.5 top-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-zinc-400">
            {capacity} {t('disponibles', 'available')} · {t('Hasta', 'Up to')} {maxSelected}{' '}
            {t('por prueba', 'per test')}
          </p>
        </div>
      )}
    </div>
  );
}
