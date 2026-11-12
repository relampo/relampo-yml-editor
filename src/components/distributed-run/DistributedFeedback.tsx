import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DistributedPoint } from '../../utils/distributedApi';
export function DistributedNotice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <div
      role={alert ? 'alert' : 'status'}
      className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200"
    >
      <AlertTriangle
        className="mt-0.5 shrink-0"
        size={16}
      />
      <span>{children}</span>
    </div>
  );
}
export function DistributedMetric({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#111] p-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value ?? '—'}</div>
    </div>
  );
}
export function DistributedChart({
  label,
  points,
  field,
  color,
}: {
  label: string;
  points: DistributedPoint[];
  field: 'rps' | 'p95_ms' | 'active_vus';
  color: string;
}) {
  const values = points.map(point => point[field]);
  const max = Math.max(1, ...values.filter((value): value is number => value !== null));
  let path = '';
  let connected = false;
  values.forEach((value, index) => {
    if (value === null) {
      connected = false;
      return;
    }
    path += `${connected ? 'L' : 'M'}${(index / Math.max(1, values.length - 1)) * 300},${88 - (value / max) * 80} `;
    connected = true;
  });
  return (
    <div className="rounded-lg border border-white/10 bg-[#111] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</span>
        <span className="font-mono text-sm text-zinc-200">
          {values.length && values[values.length - 1] != null
            ? values[values.length - 1]!.toFixed(field === 'active_vus' ? 0 : 1)
            : '—'}
          <span className="ml-1 text-[10px] text-zinc-500">
            {field === 'rps' ? 'req/s' : field === 'p95_ms' ? 'ms' : 'VUs'}
          </span>
        </span>
      </div>
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 300 95"
        className="w-full"
      >
        <path
          d="M0 88H300"
          stroke="#333"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
