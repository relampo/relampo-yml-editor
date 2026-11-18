import { useMemo, useState, type PointerEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DistributedPoint } from '../../utils/distributedApi';

type Metric = 'rps' | 'active_vus' | 'avg_ms' | 'p95_ms' | 'errors';
const series: { key: Metric; label: string; color: string; axis: string; unit: string }[] = [
  { key: 'rps', label: 'RPS', color: '#facc15', axis: 'rps', unit: 'req/s' },
  { key: 'active_vus', label: 'VUs', color: '#60a5fa', axis: 'vus', unit: 'VUs' },
  { key: 'avg_ms', label: 'AVG', color: '#34d399', axis: 'ms', unit: 'ms' },
  { key: 'p95_ms', label: 'P95', color: '#f472b6', axis: 'ms', unit: 'ms' },
  { key: 'errors', label: 'Errors', color: '#f87171', axis: 'errors', unit: '' },
];
const W = 1000,
  H = 320,
  L = 110,
  R = 120,
  T = 28,
  B = 36;
const plotWidth = W - L - R,
  plotHeight = H - T - B;
const elapsed = (ms: number) =>
  `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor(Math.max(0, ms) / 1000) % 60).padStart(2, '0')}`;
const number = (value: number | null) =>
  value == null || !Number.isFinite(value) ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(1);

export function DistributedTimeline({
  points,
  startedAt,
  durationSeconds,
  configuredUsers,
}: {
  points: DistributedPoint[];
  startedAt?: string;
  durationSeconds?: number;
  configuredUsers?: number;
}) {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (a: string, b: string) => (es ? a : b);
  const [hidden, setHidden] = useState<Set<Metric>>(new Set(['avg_ms', 'p95_ms']));
  const [hover, setHover] = useState<number | null>(null);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const samples = useMemo(
    () =>
      points
        .map((point, index) => ({
          ...point,
          time: Date.parse(point.at),
          errors: Math.max(0, point.failures - (points[index - 1]?.failures ?? 0)),
        }))
        .filter(point => Number.isFinite(point.time)),
    [points],
  );
  const authoredStart = Date.parse(startedAt ?? '');
  const firstTime = samples[0]?.time ?? 0;
  const origin = Number.isFinite(authoredStart) && authoredStart <= firstTime ? authoredStart : firstTime;
  const lastTime = samples.at(-1)?.time ?? origin;
  const range: [number, number] = zoom ?? [
    origin,
    Math.max(origin + 1000, lastTime, origin + (durationSeconds ?? 0) * 1000),
  ];
  const visible = samples.filter(point => point.time >= range[0] && point.time <= range[1]);
  const axisMax = (keys: Metric[], minimum = 1) =>
    Math.max(
      minimum,
      ...samples.flatMap(p => keys.map(key => p[key]).filter((v): v is number => v != null && Number.isFinite(v))),
    );
  const axes = [
    { key: 'ms', max: axisMax(['avg_ms', 'p95_ms']), color: '#34d399', x: L - 10, anchor: 'end' as const, title: 'ms' },
    { key: 'rps', max: axisMax(['rps']), color: '#facc15', x: L - 64, anchor: 'end' as const, title: 'RPS' },
    {
      key: 'vus',
      max: axisMax(['active_vus'], Number.isFinite(configuredUsers) ? Math.max(1, configuredUsers ?? 1) : 1),
      color: '#60a5fa',
      x: W - R + 10,
      anchor: 'start' as const,
      title: 'VUs',
    },
    {
      key: 'errors',
      max: axisMax(['errors'], 5),
      color: '#f87171',
      x: W - R + 68,
      anchor: 'start' as const,
      title: t('Errores', 'Errors'),
    },
  ];
  const x = (at: number) => L + ((at - range[0]) / Math.max(1, range[1] - range[0])) * plotWidth;
  const y = (value: number, axis: string) =>
    T + plotHeight - (value / axes.find(a => a.key === axis)!.max) * plotHeight;
  const inspected =
    hover == null
      ? visible.at(-1)
      : visible.reduce<(typeof visible)[number] | undefined>(
          (nearest, point) =>
            !nearest || Math.abs(point.time - hover) < Math.abs(nearest.time - hover) ? point : nearest,
          undefined,
        );
  const pointerTime = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = Math.max(L, Math.min(W - R, ((event.clientX - box.left) / Math.max(1, box.width)) * W));
    return range[0] + ((px - L) / plotWidth) * (range[1] - range[0]);
  };
  return (
    <section
      aria-label={t('Línea de tiempo en vivo', 'Live timeline')}
      className="border border-white/10 bg-[#111111] p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{t('Línea de tiempo', 'Timeline')}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            {t(
              'Métricas medidas sobre un mismo eje de tiempo; cada métrica conserva su escala.',
              'Measured metrics on one time axis; each metric keeps its own scale.',
            )}
          </p>
        </div>
        {zoom && (
          <button
            className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5"
            onClick={() => {
              setZoom(null);
              setHover(null);
            }}
          >
            {t('Restablecer', 'Reset')}
          </button>
        )}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map(metric => (
          <button
            key={metric.key}
            aria-pressed={!hidden.has(metric.key)}
            onClick={() =>
              setHidden(current => {
                const next = new Set(current);
                if (next.has(metric.key)) next.delete(metric.key);
                else next.add(metric.key);
                return next;
              })
            }
            className={`inline-flex items-center gap-2 rounded border border-white/10 px-2 py-1 text-xs ${hidden.has(metric.key) ? 'opacity-40' : ''}`}
          >
            <span
              aria-hidden="true"
              className="h-0.5 w-4"
              style={{ backgroundColor: metric.color }}
            />
            {metric.key === 'errors' ? t('Errores', 'Errors') : metric.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[640px]">
          <svg
            role="img"
            aria-label={t(
              'Línea de tiempo de RPS, VUs, latencia y errores',
              'Timeline of RPS, VUs, latency and errors',
            )}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[640px] touch-none"
            tabIndex={0}
            onPointerDown={event => {
              if (event.button !== 0) return;
              const at = pointerTime(event);
              setDrag([at, at]);
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={event => {
              const at = pointerTime(event);
              setHover(at);
              if (drag) setDrag([drag[0], at]);
            }}
            onPointerUp={event => {
              if (drag) {
                const to = pointerTime(event);
                const from = Math.min(drag[0], to),
                  end = Math.max(drag[0], to);
                if (end - from >= 1000 && samples.filter(p => p.time >= from && p.time <= end).length >= 2)
                  setZoom([from, end]);
              }
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
            onPointerLeave={() => {
              if (!drag) setHover(null);
            }}
            onDoubleClick={() => {
              setZoom(null);
              setHover(null);
            }}
            onKeyDown={event => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              const index = inspected ? visible.indexOf(inspected) : visible.length - 1;
              const next =
                visible[Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))];
              if (next) setHover(next.time);
            }}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <line
                key={`grid-${i}`}
                x1={L}
                x2={W - R}
                y1={T + (plotHeight * i) / 5}
                y2={T + (plotHeight * i) / 5}
                stroke="#ffffff"
                strokeOpacity={i === 5 ? 0.2 : 0.07}
              />
            ))}
            {axes
              .filter(axis => series.some(metric => metric.axis === axis.key && !hidden.has(metric.key)))
              .map(axis => (
                <g
                  key={axis.key}
                  fill={axis.color}
                  fontSize="11"
                  textAnchor={axis.anchor}
                >
                  <text
                    x={axis.x}
                    y={T - 14}
                    fontWeight="700"
                  >
                    {axis.title}
                  </text>
                  {Array.from({ length: 6 }, (_, i) => (
                    <text
                      key={i}
                      x={axis.x}
                      y={T + (plotHeight * i) / 5}
                      dominantBaseline="middle"
                    >
                      {number(
                        axis.key === 'vus' || axis.key === 'errors'
                          ? Math.round(axis.max * (1 - i / 5))
                          : axis.max * (1 - i / 5),
                      )}
                    </text>
                  ))}
                </g>
              ))}
            {Array.from({ length: 7 }, (_, i) => {
              const at = range[0] + ((range[1] - range[0]) * i) / 6;
              return (
                <text
                  key={`time-${i}`}
                  x={x(at)}
                  y={H - 12}
                  textAnchor="middle"
                  fill="#a1a1aa"
                  fontSize="11"
                >
                  {elapsed(at - origin)}
                </text>
              );
            })}
            {series
              .filter(metric => !hidden.has(metric.key))
              .map(metric => {
                let path = '',
                  connected = false;
                for (const point of visible) {
                  const value = point[metric.key];
                  if (value == null || !Number.isFinite(value)) {
                    connected = false;
                    continue;
                  }
                  path += `${connected ? 'L' : 'M'}${x(point.time).toFixed(1)},${y(value, metric.axis).toFixed(1)} `;
                  connected = true;
                }
                return (
                  <path
                    key={metric.key}
                    data-metric={metric.key}
                    d={path}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth={metric.key === 'active_vus' ? 2.5 : 1.8}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            {inspected && (
              <line
                x1={x(inspected.time)}
                x2={x(inspected.time)}
                y1={T}
                y2={T + plotHeight}
                stroke="#facc15"
                strokeDasharray="3 3"
                strokeOpacity="0.6"
              />
            )}
            {drag && (
              <rect
                x={x(Math.min(...drag))}
                y={T}
                width={Math.abs(x(drag[1]) - x(drag[0]))}
                height={plotHeight}
                fill="#facc15"
                fillOpacity="0.12"
                stroke="#facc15"
                pointerEvents="none"
              />
            )}
            {!samples.length && (
              <text
                x={W / 2}
                y={H / 2}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="14"
              >
                {t('Esperando muestras confirmadas…', 'Waiting for confirmed measurements…')}
              </text>
            )}
          </svg>
          {hover != null && inspected && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-white/15 bg-[#181818] px-3 py-2 text-xs shadow-xl"
              style={{
                left: `${Math.min(98, Math.max(2, (x(inspected.time) / W) * 100))}%`,
                transform: x(inspected.time) > W / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              }}
            >
              <div className="mb-2 border-b border-white/10 pb-1 font-medium tabular-nums text-zinc-200">
                {elapsed(inspected.time - origin)}
              </div>
              {series
                .filter(metric => !hidden.has(metric.key))
                .map(metric => (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between gap-6 py-0.5"
                  >
                    <span className="inline-flex items-center gap-2 text-zinc-300">
                      <span
                        className="h-0.5 w-3"
                        style={{ backgroundColor: metric.color }}
                      />
                      {metric.key === 'errors' ? t('Errores', 'Errors') : metric.label}
                    </span>
                    <strong className="font-medium tabular-nums text-zinc-100">
                      {number(inspected[metric.key] ?? null)} {metric.unit}
                    </strong>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      <div
        role="group"
        className="mt-2 flex min-h-6 flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums text-zinc-300"
        aria-label={t('Valores del timeline', 'Timeline values')}
      >
        <span>{inspected ? elapsed(inspected.time - origin) : '—'}</span>
        {series
          .filter(metric => !hidden.has(metric.key))
          .map(metric => (
            <span
              key={metric.key}
              style={{ color: metric.color }}
            >
              {metric.key === 'errors' ? t('Errores', 'Errors') : metric.label}:{' '}
              {number(inspected?.[metric.key] ?? null)} {metric.unit}
            </span>
          ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        {t(
          'Selecciona métricas para mostrarlas u ocultarlas. Arrastra para ampliar; doble clic para restablecer.',
          'Select metrics to show or hide them. Drag to zoom; double-click to reset.',
        )}
      </p>
    </section>
  );
}
