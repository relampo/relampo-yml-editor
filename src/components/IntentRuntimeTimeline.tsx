import { useLanguage } from '../contexts/LanguageContext';
import type { RunIntentTick, RunSummary } from '../utils/runApi';

function formatRps(value: number): string {
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1);
}
function formatMs(value: number): string {
  if (!value) return '0ms';
  return value < 10 ? `${value.toFixed(1)}ms` : `${Math.round(value)}ms`;
}
function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

const INTENT_STATE_STYLE: Record<string, { stroke: string; text: string }> = {
  warmup: { stroke: '#22d3ee', text: 'text-cyan-200' },
  rampup: { stroke: '#38bdf8', text: 'text-sky-200' },
  probing: { stroke: '#fde047', text: 'text-yellow-200' },
  sustain: { stroke: '#a78bfa', text: 'text-violet-200' },
  stable: { stroke: '#34d399', text: 'text-emerald-200' },
  violation: { stroke: '#fb7185', text: 'text-rose-200' },
  recovery: { stroke: '#f59e0b', text: 'text-amber-200' },
};

function intentStateStyle(state: string) {
  return INTENT_STATE_STYLE[state.toLowerCase()] ?? { stroke: '#a1a1aa', text: 'text-zinc-300' };
}

function intentStateLabel(state: string, t: (key: string) => string): string {
  const normalized = state.toLowerCase();
  return t(
    `yamlEditor.intent.runtime.states.${Object.hasOwn(INTENT_STATE_STYLE, normalized) ? normalized : 'unknown'}`,
  );
}

function firstPositiveFiniteNumber(values: Array<number | string | undefined>, fallback = 0): number {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return fallback;
}

function intentRuntimeTarget(summary: RunSummary | null, ticks: RunIntentTick[]) {
  const metadata = summary?.metadata ?? {};
  const tickWithTarget = ticks.find(tick => tick.target_unit || tick.target_value);
  const unit = String(
    tickWithTarget?.target_unit ?? metadata.intent_target_unit ?? metadata.target_unit ?? 'vus',
  ).toLowerCase();
  const value = firstPositiveFiniteNumber(
    [
      tickWithTarget?.target_value,
      metadata.intent_target_value,
      metadata.target_value,
      unit === 'rps' ? metadata.target_rps : metadata.target_vus,
    ],
    0,
  );
  return {
    unit: unit === 'rps' ? 'rps' : 'vus',
    value,
  };
}

function intentRuntimeThresholds(summary: RunSummary | null, t: (key: string) => string) {
  const metadata = summary?.metadata ?? {};
  const p95Max = firstPositiveFiniteNumber(
    [metadata.intent_p95_max_ms, metadata.latency_max_ms, metadata.p95_max_ms],
    0,
  );
  const errorMax = firstPositiveFiniteNumber([metadata.intent_error_rate_max_pct, metadata.error_rate_max_pct], 0);
  const parts: string[] = [];
  if (p95Max > 0)
    parts.push(formatRuntimeText(t, 'yamlEditor.intent.runtime.thresholdP95', { value: formatMs(p95Max) }));
  if (errorMax > 0) parts.push(formatRuntimeText(t, 'yamlEditor.intent.runtime.thresholdErrors', { value: errorMax }));
  return parts.join(' · ');
}

function formatRuntimeText(t: (key: string) => string, key: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [token, value]) => text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(value)),
    t(key),
  );
}

export function IntentRuntimeTimeline({ ticks, summary }: { ticks: RunIntentTick[]; summary: RunSummary | null }) {
  const { t } = useLanguage();
  const width = 400;
  const height = 200;
  const left = 42;
  const right = 382;
  const top = 14;
  const bottom = 172;
  const durationMs = Math.max(summary ? summary.duration / 1e6 : 0, ...ticks.map(tick => tick.elapsed_ms ?? 0), 1000);
  const target = intentRuntimeTarget(summary, ticks);
  const isRpsTarget = target.unit === 'rps';
  const metricLabel = isRpsTarget ? t('yamlEditor.intent.runtime.rps') : t('yamlEditor.intent.runtime.vus');
  const subtitle = isRpsTarget
    ? t('yamlEditor.intent.runtime.subtitleRps')
    : t('yamlEditor.intent.runtime.subtitleVus');
  const thresholdSummary = intentRuntimeThresholds(summary, t);
  const metricValue = (tick: RunIntentTick) =>
    isRpsTarget ? Math.max(0, tick.rps ?? 0) : Math.max(0, tick.next_vus ?? tick.current_vus);
  const violationValue = (tick: RunIntentTick) =>
    isRpsTarget ? Math.max(0, tick.rps ?? 0) : Math.max(0, tick.current_vus);
  const maxMetric = Math.max(1, target.value * 1.2, ...ticks.map(metricValue), ...ticks.map(violationValue));
  const valueToY = (value: number) => bottom - (Math.max(0, value) / maxMetric) * (bottom - top);
  const targetY = target.value > 0 ? valueToY(target.value) : null;
  const points = ticks.map(tick => {
    const elapsed = Math.max(0, tick.elapsed_ms ?? tick.tick * 1000);
    const x = left + (Math.min(elapsed, durationMs) / durationMs) * (right - left);
    return { tick, x, y: valueToY(metricValue(tick)), violationY: valueToY(violationValue(tick)) };
  });
  const violations = points.filter(point => !point.tick.slo_ok);
  const recentTicks = ticks.slice().reverse();

  return (
    <div className="border border-white/10 bg-[#111111] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            {t('yamlEditor.intent.runtime.title')}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {t('yamlEditor.intent.runtime.target')}{' '}
            {target.value > 0 ? `${formatRps(target.value)} ${metricLabel}` : metricLabel}
            {thresholdSummary ? ` · ${thresholdSummary}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {Object.entries(INTENT_STATE_STYLE).map(([state, style]) => (
            <span
              key={state}
              className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/3 px-2 py-0.5 ${style.text}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: style.stroke }}
              />
              {intentStateLabel(state, t)}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
      >
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={bottom}
          stroke="#3f3f46"
          strokeWidth="2"
        />
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke="#3f3f46"
          strokeWidth="2"
        />
        {[0, 1, 2, 3, 4].map(index => {
          const y = top + index * ((bottom - top) / 4);
          const value = maxMetric - (maxMetric / 4) * index;
          return (
            <g key={`intent-grid-${index}`}>
              <line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
                strokeDasharray={index === 4 ? '0' : '3 5'}
              />
              <text
                x={left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-500 text-[9px]"
              >
                {isRpsTarget ? formatRps(value) : Math.round(value)}
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4].map(index => {
          const x = left + index * ((right - left) / 4);
          const seconds = Math.round((durationMs / 1000 / 4) * index);
          return (
            <g key={`intent-time-${index}`}>
              <line
                x1={x}
                y1={top}
                x2={x}
                y2={bottom}
                stroke="#27272a"
                strokeWidth="1"
              />
              <text
                x={x}
                y={bottom + 14}
                textAnchor="middle"
                className="fill-zinc-500 text-[9px]"
              >
                {formatDurationSeconds(seconds)}
              </text>
            </g>
          );
        })}

        {isRpsTarget && targetY !== null && (
          <g>
            <line
              x1={left}
              y1={targetY}
              x2={right}
              y2={targetY}
              stroke="#facc15"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={right - 4}
              y={targetY - 5}
              textAnchor="end"
              className="fill-yellow-200 text-[9px]"
            >
              {t('yamlEditor.intent.runtime.target').toLowerCase()} {formatRps(target.value)}
            </text>
          </g>
        )}
        {points.slice(1).map((point, index) => {
          const previous = points[index];
          const style = intentStateStyle(point.tick.state);
          return (
            <line
              key={`intent-line-${point.tick.tick}-${index}`}
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke={style.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {points.length === 1 && (
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r="3"
            fill={intentStateStyle(points[0].tick.state).stroke}
          />
        )}
        {points.map(point => (
          <circle
            key={`intent-dot-${point.tick.tick}-${point.x}`}
            cx={point.x}
            cy={point.y}
            r="2.2"
            fill={intentStateStyle(point.tick.state).stroke}
          >
            <title>{intentTickTitle(point.tick, t)}</title>
          </circle>
        ))}
        {violations.map(point => (
          <g
            key={`intent-violation-${point.tick.tick}`}
            transform={`translate(${point.x} ${point.violationY})`}
          >
            <line
              x1="-4"
              y1="-4"
              x2="4"
              y2="4"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="-4"
              x2="-4"
              y2="4"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <title>{intentTickTitle(point.tick, t)}</title>
          </g>
        ))}
        <text
          x="12"
          y="96"
          transform="rotate(-90 12 96)"
          textAnchor="middle"
          className="fill-zinc-500 text-[10px]"
        >
          {metricLabel}
        </text>
        <text
          x="212"
          y="196"
          textAnchor="middle"
          className="fill-zinc-500 text-[10px]"
        >
          {t('yamlEditor.intent.runtime.time')}
        </text>
      </svg>

      <div className="mt-3 max-h-[13.75rem] overflow-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#111111]">
            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.time')}</th>
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.state')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.vus')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.rps')}</th>
              <th className="px-3 py-2 text-right">{t('yamlEditor.intent.runtime.p95')}</th>
              <th className="px-3 py-2">{t('yamlEditor.intent.runtime.action')}</th>
            </tr>
          </thead>
          <tbody>
            {recentTicks.map(tick => {
              const style = intentStateStyle(tick.state);
              return (
                <tr
                  key={`intent-row-${tick.tick}-${tick.elapsed_ms ?? ''}`}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td className="px-3 py-2 font-mono text-zinc-400">
                    {formatDurationSeconds(Math.round((tick.elapsed_ms ?? 0) / 1000))}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${style.text}`}>{intentStateLabel(tick.state, t)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">
                    {tick.current_vus} {'->'} {tick.next_vus}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatRps(tick.rps ?? 0)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{formatMs(tick.p95_ms ?? 0)}</td>
                  <td className="max-w-80 px-3 py-2 text-zinc-300">
                    <span className="font-mono text-zinc-100">
                      {tick.action || t('yamlEditor.intent.runtime.hold')}
                    </span>
                    {tick.reason ? <span className="ml-2 text-zinc-500">{tick.reason}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function intentTickTitle(tick: RunIntentTick, t: (key: string) => string): string {
  const elapsed = formatDurationSeconds(Math.round((tick.elapsed_ms ?? 0) / 1000));
  return [
    `${t('yamlEditor.intent.runtime.time')}: ${elapsed}`,
    `${t('yamlEditor.intent.runtime.state')}: ${tick.state}`,
    `${t('yamlEditor.intent.runtime.vus')}: ${tick.current_vus} -> ${tick.next_vus}`,
    `${t('yamlEditor.intent.runtime.rps')}: ${formatRps(tick.rps ?? 0)}`,
    `${t('yamlEditor.intent.runtime.p95')}: ${formatMs(tick.p95_ms ?? 0)}`,
    `${t('yamlEditor.intent.runtime.error')}: ${(tick.error_rate_pct ?? 0).toFixed(2)}%`,
    tick.reason ? `${t('yamlEditor.intent.runtime.reason')}: ${tick.reason}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
