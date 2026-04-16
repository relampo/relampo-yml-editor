import { loadColors, parseTimeToSeconds, type LoadType } from './loadUtils';

interface LoadVisualizationProps {
  data: Record<string, any>;
  loadType: LoadType;
}

export function LoadVisualization({ data, loadType }: LoadVisualizationProps) {
  const visualizationPoints = getVisualizationPoints(data, loadType);
  const intentTargetUnit = String(data.target_unit || 'rps').toLowerCase();
  const intentTargetValue = Math.max(0, parseFloat(String(data.target_value || '0')) || 0);
  const isIntent = loadType === 'intent';
  const isIntentVus = isIntent && intentTargetUnit === 'vus';
  const isIntentRps = isIntent && intentTargetUnit === 'rps';
  const intentMinVus = Math.max(0, parseFloat(String(data.min_vus || '0')) || 0);
  const intentMaxVus = Math.max(intentMinVus, parseFloat(String(data.max_vus || '0')) || intentMinVus);
  const showIntentVuBand = isIntentVus && intentMaxVus > intentMinVus;
  const intentRpsBandHalf = isIntentRps ? Math.max(0.3, intentTargetValue * 0.12) : 0;
  const intentRpsBandMin = Math.max(0, intentTargetValue - intentRpsBandHalf);
  const intentRpsBandMax = intentTargetValue + intentRpsBandHalf;
  const maxUsers = Math.max(
    ...visualizationPoints.map(point => point.users),
    showIntentVuBand ? intentMaxVus : 0,
    isIntentRps ? intentRpsBandMax : 0,
    10,
  );
  const maxTime = Math.max(...visualizationPoints.map(point => point.time), 60);
  const chartHeightPx = 184;
  const yAxisLabel =
    loadType === 'throughput' || (loadType === 'intent' && intentTargetUnit === 'rps') ? 'RPS' : 'Users';
  const vizColor = loadColors[loadType];
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;
  const intentTargetPerMinute = (parseFloat(String(data.target_value || '0')) || 0) * 60;

  const timeAxisTicks = [0, 1, 2, 3, 4].map(index => ({
    x: 40 + index * 85,
    label: formatTimeLabel(Math.round((maxTime / 4) * index)),
  }));

  const timeRanges = getTimeRanges(data, loadType, maxTime);
  const transitionMarkers = getTransitionMarkers(data, loadType, maxTime);
  const horizontalRanges = timeRanges.filter(range => range.label === 'Steady' || range.label === 'Target');
  const verticalRanges = timeRanges.filter(range => range.label !== 'Steady' && range.label !== 'Target');
  const chartPoints = visualizationPoints.map(point => ({
    ...point,
    x: 40 + (point.time / maxTime) * 340,
    y: 170 - (point.users / maxUsers) * 160,
  }));
  const firstChartPoint = chartPoints[0] ?? { x: 40, y: 170 };
  const secondChartPoint = chartPoints[1] ?? firstChartPoint;
  const linePoints = chartPoints.map(point => `${point.x},${point.y}`).join(' ');
  const areaPoints = [
    '40,170',
    ...chartPoints.map(point => `${point.x},${point.y}`),
    `${chartPoints[chartPoints.length - 1]?.x || 40},170`,
  ].join(' ');
  const horizontalRangeLabels = horizontalRanges.map(range => {
    const startX = 40 + (range.start / maxTime) * 340;
    const endX = 40 + (range.end / maxTime) * 340;
    const plateauY = chartPoints[1]?.y ?? chartPoints[0]?.y ?? 90;
    return {
      ...range,
      centerX: (startX + endX) / 2,
      y: Math.max(20, plateauY - 14),
    };
  });
  const angledRangeLabels = verticalRanges.map(range => {
    let from = firstChartPoint;
    let to = secondChartPoint;
    if (range.label === 'Ramp Down' && chartPoints.length >= 4) {
      from = chartPoints[2];
      to = chartPoints[3];
    } else if (range.label === 'Ramp Down' && chartPoints.length >= 2) {
      from = chartPoints[chartPoints.length - 2];
      to = chartPoints[chartPoints.length - 1];
    } else if (range.label === 'Ramp' && chartPoints.length >= 2) {
      from = chartPoints[0];
      to = chartPoints[1];
    }
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
    const isDescending = to.y - from.y > 0;
    return {
      ...range,
      x: (from.x + to.x) / 2 + (isDescending ? 10 : -10),
      y: (from.y + to.y) / 2 - 8,
      angle,
    };
  });
  const intentBandY = {
    min: 170 - (intentMinVus / maxUsers) * 160,
    max: 170 - (intentMaxVus / maxUsers) * 160,
  };
  const intentBandHeight = Math.max(0, intentBandY.min - intentBandY.max);
  const intentTargetY = 170 - (intentTargetValue / maxUsers) * 160;
  const intentRpsBandY = {
    min: 170 - (intentRpsBandMin / maxUsers) * 160,
    max: 170 - (intentRpsBandMax / maxUsers) * 160,
  };
  const intentRpsBandHeight = Math.max(0, intentRpsBandY.min - intentRpsBandY.max);
  const intentWarmupSec = Math.max(0, parseTimeToSeconds(String(data.warmup || '0s')));
  const intentWarmupX = 40 + (340 * Math.min(intentWarmupSec, maxTime)) / maxTime;
  const intentMinY = 170 - (intentMinVus / maxUsers) * 160;
  const intentWarmupIdleLine =
    showIntentVuBand && intentWarmupSec > 0 ? `40,${intentMinY} ${intentWarmupX},${intentMinY}` : '';
  const intentVuVariationLine = buildIntentVariationLine({
    enabled: showIntentVuBand,
    startX: intentWarmupSec > 0 ? Math.min(intentWarmupX, 380) : 40,
    minValue: intentMinVus,
    maxValue: intentMaxVus,
    center: intentTargetValue || (intentMinVus + intentMaxVus) / 2,
    maxUsers,
  });
  const intentRpsWarmupLine =
    isIntentRps && intentWarmupSec > 0 ? `40,${intentTargetY} ${intentWarmupX},${intentTargetY}` : '';
  const intentRpsVariationLine = buildIntentVariationLine({
    enabled: isIntentRps,
    startX: intentWarmupSec > 0 ? Math.min(intentWarmupX, 380) : 40,
    minValue: intentRpsBandMin,
    maxValue: intentRpsBandMax,
    center: intentTargetValue,
    amplitude: Math.max(0.2, intentRpsBandHalf * 0.75),
    maxUsers,
  });
  const intentWarmupPct = (maxTime > 0 ? Math.max(0, Math.min(1, intentWarmupSec / maxTime)) : 0) * 100;
  const intentControlPct = Math.max(0, 100 - intentWarmupPct);
  const intentBehaviorHint = isIntentVus
    ? `After warmup, VUs are adjusted around target=${intentTargetValue.toFixed(0)} within ${intentMinVus.toFixed(0)}..${intentMaxVus.toFixed(0)} to keep SLOs.`
    : `After warmup, RPS is adjusted around target=${intentTargetValue.toFixed(2)} while respecting SLOs and VU guardrails ${intentMinVus.toFixed(0)}..${intentMaxVus.toFixed(0)}.`;

  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
        Load Pattern Visualization
      </label>
      <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Visual preview</span>
          <span className="font-mono">
            Peak {yAxisLabel}: {maxUsers.toFixed(0)} | Total:{' '}
            {maxTime >= 60 ? `${Math.round(maxTime / 60)}m` : `${maxTime}s`}
          </span>
        </div>
        <div className="mb-2 text-[11px] text-zinc-400">
          Time ranges are shown for reference based on the current load configuration.
        </div>
        {loadType === 'throughput' && (
          <div className="mb-2 text-[11px] text-zinc-400">
            Target throughput: {throughputPerMinute.toFixed(0)} req/min.
          </div>
        )}
        {showIntentVuBand && (
          <div className="mb-2 text-[11px] text-amber-300/90">
            Intent control band: warmup is prep-only (cyan). Ajustes comienzan en el marcador amarillo, justo al
            terminar warmup.
          </div>
        )}
        {isIntentRps && (
          <div className="mb-2 text-[11px] text-emerald-300/90">
            Intent RPS band: warmup is prep-only, then controlled RPS variability. VU guardrails:{' '}
            {intentMinVus.toFixed(0)}..
            {intentMaxVus.toFixed(0)}.
          </div>
        )}
        {isIntent && (
          <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400">
              <span>Execution Phases</span>
              <span className="font-mono text-[10px] normal-case">{intentBehaviorHint}</span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2 py-0.5 text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                warmup
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/40 bg-rose-400/15 px-2 py-0.5 text-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                violating
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                recovering
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                stable
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-zinc-800/80 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-cyan-400/70"
                style={{ width: `${intentWarmupPct}%` }}
              />
              <div
                className={`absolute inset-y-0 ${isIntentVus ? 'bg-amber-400/70' : 'bg-emerald-400/70'}`}
                style={{
                  left: `${intentWarmupPct}%`,
                  width: `${intentControlPct}%`,
                }}
              />
              <div
                className="absolute top-[-2px] h-[14px] w-[2px] bg-cyan-200/90"
                style={{ left: `calc(${intentWarmupPct}% - 1px)` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 text-[10px] text-zinc-400">
              <div className="text-left">0s</div>
              <div className="text-center font-mono">warmup {Math.round(intentWarmupSec)}s</div>
              <div className="text-right font-mono">duration {Math.round(maxTime)}s</div>
            </div>
            {isIntentRps && (
              <div className="mt-2 text-[10px] text-zinc-400">{intentTargetPerMinute.toFixed(0)} req/min target</div>
            )}
          </div>
        )}
        <svg
          viewBox="0 0 400 200"
          className="w-full"
          style={{ height: `${chartHeightPx}px` }}
        >
          <defs>
            <linearGradient
              id="loadAreaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={vizColor.stroke}
                stopOpacity="0.32"
              />
              <stop
                offset="100%"
                stopColor={vizColor.stroke}
                stopOpacity="0.04"
              />
            </linearGradient>
          </defs>

          <line
            x1="40"
            y1="10"
            x2="40"
            y2="170"
            stroke="#3f3f46"
            strokeWidth="2"
          />
          <line
            x1="40"
            y1="170"
            x2="380"
            y2="170"
            stroke="#3f3f46"
            strokeWidth="2"
          />

          {[0, 1, 2, 3, 4].map(index => (
            <line
              key={`h-${index}`}
              x1="40"
              y1={10 + index * 40}
              x2="380"
              y2={10 + index * 40}
              stroke="#27272a"
              strokeWidth="1"
              strokeDasharray={index === 4 ? '0' : '3 5'}
            />
          ))}

          {[0, 1, 2, 3, 4].map(index => (
            <text
              key={`y-${index}`}
              x="35"
              y={14 + index * 40}
              fill="#71717a"
              fontSize="10"
              textAnchor="end"
              fontFamily="monospace"
            >
              {Math.round((maxUsers / 4) * (4 - index))}
            </text>
          ))}

          {timeAxisTicks.map((tick, index) => (
            <text
              key={`x-${index}`}
              x={tick.x}
              y="185"
              fill="#71717a"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          ))}

          {transitionMarkers.map(marker => {
            const x = 40 + (marker.time / maxTime) * 340;
            return (
              <g key={marker.key}>
                <line
                  x1={x}
                  y1="18"
                  x2={x}
                  y2="170"
                  stroke={vizColor.stroke}
                  strokeOpacity="0.5"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y="184"
                  fill={vizColor.stroke}
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight="700"
                  fontFamily="monospace"
                  paintOrder="stroke"
                  stroke="#09090b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}

          {horizontalRangeLabels.map((range, index) => (
            <g key={`range-${index}`}>
              <text
                x={range.centerX}
                y={range.y}
                fill="#e4e4e7"
                fontSize="9"
                textAnchor="middle"
                fontWeight="700"
                paintOrder="stroke"
                stroke="#09090b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {range.label}
              </text>
            </g>
          ))}

          {angledRangeLabels.map((range, index) => (
            <g key={`vertical-range-${index}`}>
              <text
                x={range.x}
                y={range.y}
                fill="#a1a1aa"
                fontSize="9"
                textAnchor="middle"
                fontWeight="600"
                paintOrder="stroke"
                stroke="#09090b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform={`rotate(${range.angle} ${range.x} ${range.y})`}
              >
                {range.label}
              </text>
            </g>
          ))}

          {showIntentVuBand && (
            <g>
              <rect
                x="40"
                y={intentBandY.max}
                width="340"
                height={intentBandHeight}
                fill="#f59e0b18"
                stroke="#f59e0b55"
                strokeDasharray="4 4"
              />
              <line
                x1="40"
                y1={intentTargetY}
                x2="380"
                y2={intentTargetY}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
              {intentWarmupIdleLine && (
                <polyline
                  points={intentWarmupIdleLine}
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              {intentVuVariationLine && (
                <polyline
                  points={intentVuVariationLine}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              )}
            </g>
          )}

          {isIntentRps && (
            <g>
              <rect
                x="40"
                y={intentRpsBandY.max}
                width="340"
                height={intentRpsBandHeight}
                fill="#10b98118"
                stroke="#10b98150"
                strokeDasharray="4 4"
              />
              <line
                x1="40"
                y1={intentTargetY}
                x2="380"
                y2={intentTargetY}
                stroke="#34d399"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
              {intentRpsWarmupLine && (
                <polyline
                  points={intentRpsWarmupLine}
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              {intentRpsVariationLine && (
                <polyline
                  points={intentRpsVariationLine}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
              )}
            </g>
          )}

          <polygon
            points={areaPoints}
            fill="url(#loadAreaGradient)"
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke={vizColor.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text
            x="200"
            y="198"
            fill="#a1a1aa"
            fontSize="11"
            textAnchor="middle"
            fontWeight="600"
          >
            Time
          </text>
          <text
            x="15"
            y="100"
            fill="#a1a1aa"
            fontSize="11"
            textAnchor="middle"
            fontWeight="600"
            transform="rotate(-90 15 100)"
          >
            {yAxisLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}

function getVisualizationPoints(data: Record<string, any>, loadType: LoadType) {
  const points: { time: number; users: number }[] = [];

  if (loadType === 'constant') {
    const users = parseInt(data.users, 10) || 10;
    const rampUp = parseTimeToSeconds(data.ramp_up || '0s');
    const duration = parseTimeToSeconds(data.duration || '60s');
    if (rampUp > 0) {
      points.push({ time: 0, users: 0 }, { time: rampUp, users }, { time: duration, users });
    } else {
      points.push({ time: 0, users }, { time: duration, users });
    }
  } else if (loadType === 'ramp') {
    points.push(
      { time: 0, users: parseInt(data.start_users, 10) || 1 },
      {
        time: parseTimeToSeconds(data.duration || '60s'),
        users: parseInt(data.end_users, 10) || 100,
      },
    );
  } else if (loadType === 'ramp_up_down') {
    const users = parseInt(data.users, 10) || 10;
    const duration = parseTimeToSeconds(data.duration || '60s');
    const rampUp = parseTimeToSeconds(data.ramp_up || '10s');
    const rampDown = parseTimeToSeconds(data.ramp_down || '10s');
    const holdStart = Math.min(rampUp, duration);
    const holdEnd = Math.max(holdStart, duration - rampDown);
    points.push(
      { time: 0, users: 0 },
      { time: holdStart, users },
      { time: holdEnd, users },
      { time: duration, users: 0 },
    );
  } else if (loadType === 'throughput') {
    const targetRps = parseFloat(String(data.target_rps || '0')) || 10;
    const duration = parseTimeToSeconds(data.duration || '60s');
    const rampUp = parseTimeToSeconds(data.ramp_up || '0s');
    const rampDown = parseTimeToSeconds(data.ramp_down || '0s');
    const holdStart = Math.min(rampUp, duration);
    const holdEnd = Math.max(holdStart, duration - rampDown);
    points.push(
      { time: 0, users: 0 },
      { time: holdStart, users: targetRps },
      { time: holdEnd, users: targetRps },
      { time: duration, users: 0 },
    );
  } else if (loadType === 'intent') {
    const duration = Math.max(1, parseTimeToSeconds(String(data.duration || '60s')));
    const warmup = Math.max(0, Math.min(duration, parseTimeToSeconds(String(data.warmup || '0s'))));
    const targetUnit = String(data.target_unit || 'rps').toLowerCase();
    const baselineUsers =
      targetUnit === 'vus'
        ? Math.max(1, parseFloat(String(data.target_value || data.min_vus || '1')) || 1)
        : Math.max(1, parseFloat(String(data.target_value || '1')) || 1);
    const guardrailFloor = Math.max(0, parseFloat(String(data.min_vus || '0')) || 0);
    const steadyValue = targetUnit === 'vus' ? Math.max(baselineUsers, guardrailFloor) : baselineUsers;

    if (warmup > 0) {
      points.push({ time: 0, users: guardrailFloor }, { time: warmup, users: steadyValue });
    } else {
      points.push({ time: 0, users: steadyValue });
    }

    points.push({ time: duration, users: steadyValue });
  }

  return points;
}

function getTimeRanges(data: Record<string, any>, loadType: LoadType, maxTime: number) {
  if (loadType === 'constant') {
    const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
    return rampUp > 0
      ? [
          { label: 'Ramp Up', start: 0, end: Math.min(rampUp, maxTime) },
          { label: 'Steady', start: Math.min(rampUp, maxTime), end: maxTime },
        ]
      : [{ label: 'Steady', start: 0, end: maxTime }];
  }
  if (loadType === 'ramp') {
    return [{ label: 'Ramp', start: 0, end: maxTime }];
  }
  const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
  const rampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
  const steadyStart = Math.min(rampUp, maxTime);
  const steadyEnd = Math.max(steadyStart, maxTime - rampDown);
  return [
    { label: 'Ramp Up', start: 0, end: steadyStart },
    {
      label: loadType === 'throughput' ? 'Target' : 'Steady',
      start: steadyStart,
      end: steadyEnd,
    },
    { label: 'Ramp Down', start: steadyEnd, end: maxTime },
  ].filter(range => range.end > range.start);
}

function getTransitionMarkers(data: Record<string, any>, loadType: LoadType, maxTime: number) {
  if (loadType === 'constant') {
    const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
    return rampUp > 0 && rampUp < maxTime ? [{ key: 'ramp-up', time: rampUp, label: formatTimeLabel(rampUp) }] : [];
  }
  if (loadType === 'ramp') {
    return [];
  }
  const rampUp = Math.max(0, parseTimeToSeconds(String(data.ramp_up || '0s')));
  const rampDown = Math.max(0, parseTimeToSeconds(String(data.ramp_down || '0s')));
  const steadyStart = Math.min(rampUp, maxTime);
  const steadyEnd = Math.max(steadyStart, maxTime - rampDown);
  return [
    steadyStart > 0 && steadyStart < maxTime
      ? {
          key: 'ramp-up',
          time: steadyStart,
          label: formatTimeLabel(steadyStart),
        }
      : null,
    steadyEnd > 0 && steadyEnd < maxTime
      ? { key: 'ramp-down', time: steadyEnd, label: formatTimeLabel(steadyEnd) }
      : null,
  ].filter(Boolean) as Array<{ key: string; time: number; label: string }>;
}

function formatTimeLabel(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return rounded >= 60 ? `${Math.round(rounded / 60)}m` : `${rounded}s`;
}

function buildIntentVariationLine({
  enabled,
  startX,
  minValue,
  maxValue,
  center,
  maxUsers,
  amplitude,
}: {
  enabled: boolean;
  startX: number;
  minValue: number;
  maxValue: number;
  center: number;
  maxUsers: number;
  amplitude?: number;
}) {
  if (!enabled) {
    return '';
  }
  const width = Math.max(0, 380 - startX);
  if (width <= 0) {
    return '';
  }
  const segments = 12;
  const waveAmplitude = amplitude ?? Math.max(0.8, Math.min((maxValue - minValue) / 2, 12) * 0.7);
  return Array.from({ length: segments + 1 })
    .map((_, index) => {
      const ratio = index / segments;
      const x = startX + width * ratio;
      const wave = Math.sin(ratio * Math.PI * 4);
      const bounded = Math.max(minValue, Math.min(maxValue, center + wave * waveAmplitude));
      const y = 170 - (bounded / maxUsers) * 160;
      return `${x},${y}`;
    })
    .join(' ');
}
