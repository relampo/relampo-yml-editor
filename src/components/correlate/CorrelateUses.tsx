import { correlationRequestLabel, type CorrelateLocation } from '../../utils/correlateApi';
export function CorrelateUses({ targets, label }: { targets: CorrelateLocation[] | null; label: string }) {
  if (!targets?.length) return <span className="text-zinc-600">—</span>;
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={targets.length > 5 ? 0 : undefined}
      className="max-h-[200px] overflow-y-auto overscroll-contain"
    >
      {targets.map((target, i) => (
        <div
          key={i}
          className="flex h-10 shrink-0 flex-col justify-center"
          title={correlationRequestLabel(target) + ' · ' + target.Location + ' ' + target.Path}
        >
          <span className="block truncate">{correlationRequestLabel(target)}</span>
          <span className="block truncate font-mono text-[10px] text-zinc-500">
            {target.Location} {target.Path}
          </span>
        </div>
      ))}
    </div>
  );
}
