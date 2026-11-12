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
      <div className="mb-3 text-xs uppercase text-zinc-400">{label}</div>
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
