const loadTypes = ['constant', 'linear', 'ramp_up_down', 'throughput', 'intent', 'segments'] as const;

export type LoadType = (typeof loadTypes)[number];
export type LoadSegmentData = {
  name?: string;
  duration?: string | number;
  target_rps?: string | number;
  target_vus?: string | number;
  min_vus?: string | number;
  max_vus?: string | number;
};
export type IntentTargetData = {
  type?: string;
  value?: string | number;
};
export type IntentLatencyData = {
  metric?: string;
  max_ms?: string | number;
};
export type IntentErrorRateData = {
  max_pct?: string | number;
};
export type LoadDataValue =
  | string
  | number
  | boolean
  | LoadSegmentData[]
  | IntentTargetData
  | IntentLatencyData
  | IntentErrorRateData
  | undefined;
export type LoadData = Record<string, LoadDataValue>;

export function toLoadData(value: Record<string, unknown> | undefined): LoadData {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, fieldValue]) => {
      if (typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
        return true;
      }
      // Keep the documented but unsupported load stages visible so semantic
      // validation can block execution instead of silently dropping them.
      return (
        ((key === 'stages' || key === 'segments') && Array.isArray(fieldValue)) ||
        (['target', 'latency', 'error_rate'].includes(key) && typeof fieldValue === 'object' && fieldValue !== null)
      );
    }),
  ) as LoadData;
}

const intentTargetUnits = new Set(['rps', 'vus']);
const intentAggressivenessLevels = new Set(['low', 'medium', 'high']);
const intentLatencyMetrics = new Set(['avg', 'p50', 'p75', 'p90', 'p95', 'p99']);

export interface IntentAutoConfig {
  warmup: string;
  ramp_up: string;
  ramp_down: string;
  duration: string;
  window: string;
  min_vus: string;
  max_vus: string;
  average_ms: string;
  p95_max_ms: string;
  error_rate_max_pct: string;
  error_4xx_max_pct: string;
  error_5xx_max_pct: string;
}

const loadTypeLabels: Record<LoadType, string> = {
  constant: 'Constant',
  linear: 'Linear',
  ramp_up_down: 'Ramp',
  throughput: 'Throughput',
  intent: 'Intent',
  segments: 'Segments',
};

export function getLoadTypeLabel(loadType: LoadType | string): string {
  const normalized = normalizeLoadType(loadType);
  return loadTypeLabels[normalized] || normalized;
}

// The editor uses `linear` internally for the straight ramp load shape, but the
// Relampo/Pulse YAML schema spells this load type `ramp`. Map the internal type
// back when serializing so saved YAML stays within the documented format.
const yamlLoadTypeAliases: Partial<Record<LoadType, string>> = {
  linear: 'ramp',
};

function getYamlLoadType(loadType: LoadType): string {
  return yamlLoadTypeAliases[loadType] ?? loadType;
}

export function normalizeLoadType(rawType: unknown): LoadType {
  const rawLoadType = String(rawType || 'constant')
    .toLowerCase()
    .trim();

  if (
    rawLoadType === 'rampupdown' ||
    rawLoadType === 'ramp_updown' ||
    rawLoadType === 'rampup_down' ||
    rawLoadType === 'ramp-up-down' ||
    rawLoadType === 'ramp_up_down'
  ) {
    return 'ramp_up_down';
  }
  if (rawLoadType === 'ramp' || rawLoadType === 'linear') {
    return 'linear';
  }
  if (rawLoadType === 'throughput') {
    return 'throughput';
  }
  if (rawLoadType === 'intent') {
    return 'intent';
  }
  if (rawLoadType === 'segments' || rawLoadType === 'segment') {
    return 'segments';
  }
  return 'constant';
}

const loadTypeDefaults: Record<LoadType, LoadData> = {
  constant: {
    users: '10',
    duration: '5m',
    iterations: '0',
    ramp_up: '0s',
  },
  linear: {
    start_users: '1',
    end_users: '100',
    duration: '10m',
    iterations: '0',
  },
  ramp_up_down: {
    users: '50',
    duration: '10m',
    iterations: '0',
    ramp_up: '1m',
    ramp_down: '1m',
  },
  throughput: {
    target_rps: '20',
    duration: '10m',
    iterations: '0',
    min_vus: '1',
    max_vus: '80',
    ramp_up: '1m',
    ramp_down: '1m',
  },
  intent: {
    target_unit: 'rps',
    target_value: '3',
    duration: '10m',
    warmup: '30s',
    ramp_up: '30s',
    ramp_down: '30s',
    window: '2s',
    p95_max_ms: '800',
    error_rate_max_pct: '1',
    aggressiveness: 'medium',
    min_vus: '1',
    max_vus: '80',
  },
  segments: {},
};

const loadTypeAllowedKeys: Record<LoadType, string[]> = {
  constant: ['type', 'users', 'duration', 'iterations', 'ramp_up', 'run_until_stopped'],
  linear: ['type', 'start_users', 'end_users', 'duration', 'iterations', 'run_until_stopped'],
  ramp_up_down: ['type', 'users', 'duration', 'iterations', 'ramp_up', 'ramp_down', 'run_until_stopped'],
  throughput: [
    'type',
    'target_rps',
    'duration',
    'iterations',
    'ramp_up',
    'ramp_down',
    'min_vus',
    'max_vus',
    'run_until_stopped',
  ],
  intent: [
    'type',
    'target_unit',
    'target_value',
    'duration',
    'warmup',
    'ramp_up',
    'ramp_down',
    'window',
    'p50_max_ms',
    'p75_max_ms',
    'p95_max_ms',
    'p99_max_ms',
    'p999_max_ms',
    'error_rate_max_pct',
    'error_4xx_max_pct',
    'error_5xx_max_pct',
    'aggressiveness',
    'min_vus',
    'max_vus',
  ],
  segments: ['type', 'duration', 'iterations', 'segments'],
};

function mapLoadTypes<T>(value: T): Record<LoadType, T> {
  return Object.fromEntries(loadTypes.map(loadType => [loadType, value])) as Record<LoadType, T>;
}

export const selectedLoadButtonStyle = mapLoadTypes({
  backgroundColor: 'rgba(250, 204, 21, 0.10)',
  color: '#facc15',
  borderColor: 'rgba(250, 204, 21, 0.35)',
  boxShadow: '0 10px 22px rgba(250, 204, 21, 0.15)',
});

export const loadColors = mapLoadTypes({ stroke: '#f59e0b', fill: '#f59e0b20' });

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) {
    return 0;
  }
  const match = timeStr.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (!match) {
    return 0;
  }
  const [, value, unit] = match;
  const num = parseFloat(value);

  switch (unit) {
    case 'ms':
      return num / 1000;
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    default:
      return num;
  }
}

function formatSeconds(seconds: number): string {
  if (seconds < 1) {
    return `${Math.max(100, Math.round(seconds * 1000))}ms`;
  }
  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getIntentAutoConfig(data: LoadData = {}): IntentAutoConfig {
  const target = getIntentTargetData(data);
  const targetUnit = target.type === 'vus' ? 'vus' : 'rps';
  const aggressiveness = intentAggressivenessLevels.has(String(data.aggressiveness || '').toLowerCase())
    ? String(data.aggressiveness).toLowerCase()
    : 'medium';
  const targetValue = Math.max(1, parseFloat(String(target.value || '0')) || 3);
  const normalizedScale = targetUnit === 'vus' ? targetValue : targetValue / 8;

  const durationMinutesByAggressiveness = {
    low: 6,
    medium: 10,
    high: 14,
  } as const;
  const windowSecondsByAggressiveness = {
    low: 5,
    medium: 2,
    high: 1,
  } as const;
  const averageMsByAggressiveness = {
    low: 350,
    medium: 250,
    high: 180,
  } as const;
  const p95MsByAggressiveness = {
    low: 900,
    medium: 800,
    high: 550,
  } as const;
  const errorMaxByAggressiveness = {
    low: 2,
    medium: 1,
    high: 0.5,
  } as const;

  const durationMinutes = clamp(
    durationMinutesByAggressiveness[aggressiveness as keyof typeof durationMinutesByAggressiveness] +
      Math.floor(normalizedScale / 40) * 2,
    4,
    20,
  );
  const durationSeconds = durationMinutes * 60;
  const warmupSeconds = clamp(roundToStep(durationSeconds * 0.05, 5), 15, 60);
  const rampUpSeconds = clamp(roundToStep(durationSeconds * 0.1, 5), 15, 90);
  const minVus =
    targetUnit === 'vus' ? Math.max(1, Math.floor(targetValue * 0.6)) : Math.max(1, Math.ceil(targetValue / 20));
  const maxVus = targetUnit === 'vus' ? Math.ceil(targetValue) : Math.max(minVus + 2, Math.ceil(targetValue / 4));
  const latencySlack = Math.min(250, Math.floor(normalizedScale / 30) * 50);
  const averageMs = averageMsByAggressiveness[aggressiveness as keyof typeof averageMsByAggressiveness] + latencySlack;
  const p95MaxMs = p95MsByAggressiveness[aggressiveness as keyof typeof p95MsByAggressiveness] + latencySlack;
  const errorRateMaxPct = errorMaxByAggressiveness[aggressiveness as keyof typeof errorMaxByAggressiveness];
  const error4xxMaxPct = Math.max(errorRateMaxPct, errorRateMaxPct * 2);
  const error5xxMaxPct = Math.max(0.1, errorRateMaxPct / 2);

  return {
    warmup: formatSeconds(warmupSeconds),
    ramp_up: formatSeconds(rampUpSeconds),
    ramp_down: formatSeconds(rampUpSeconds),
    duration: formatSeconds(durationSeconds),
    window: formatSeconds(windowSecondsByAggressiveness[aggressiveness as keyof typeof windowSecondsByAggressiveness]),
    min_vus: String(minVus),
    max_vus: String(maxVus),
    average_ms: String(averageMs),
    p95_max_ms: String(p95MaxMs),
    error_rate_max_pct: formatPercent(errorRateMaxPct),
    error_4xx_max_pct: formatPercent(error4xxMaxPct),
    error_5xx_max_pct: formatPercent(error5xxMaxPct),
  };
}

export function getIntentTargetData(data: LoadData = {}, options: { coerce?: boolean } = {}): IntentTargetData {
  const { coerce = true } = options;
  const rawTarget = isLoadObject(data.target) ? (data.target as IntentTargetData) : undefined;
  const type = String(rawTarget?.type || data.target_unit || 'rps')
    .toLowerCase()
    .trim();
  const value =
    scalarLoadValue(rawTarget?.value) ??
    scalarLoadValue(data.target_value) ??
    scalarLoadValue(data.target_rps) ??
    scalarLoadValue(data.target) ??
    '';
  return {
    type: coerce && !intentTargetUnits.has(type) ? 'rps' : type || 'rps',
    value,
  };
}

export function getIntentLatencyData(data: LoadData = {}): IntentLatencyData {
  const rawLatency = isLoadObject(data.latency) ? (data.latency as IntentLatencyData) : undefined;
  const metric = String(rawLatency?.metric || 'p95')
    .toLowerCase()
    .trim();
  return {
    metric: intentLatencyMetrics.has(metric) ? metric : 'p95',
    max_ms: scalarLoadValue(rawLatency?.max_ms) ?? scalarLoadValue(data.p95_max_ms) ?? '',
  };
}

export function getIntentErrorRateData(data: LoadData = {}): IntentErrorRateData {
  const rawErrorRate = isLoadObject(data.error_rate) ? (data.error_rate as IntentErrorRateData) : undefined;
  return {
    max_pct: scalarLoadValue(rawErrorRate?.max_pct) ?? scalarLoadValue(data.error_rate_max_pct) ?? '',
  };
}

function isLoadObject(value: LoadDataValue): value is IntentTargetData | IntentLatencyData | IntentErrorRateData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scalarLoadValue(value: LoadDataValue): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

export function limitedInputValue(value: string): string {
  return value.slice(0, 16);
}

interface LoadDataBuildOptions {
  coerceIntentEnums?: boolean;
  preserveExplicitEmpty?: boolean;
}

export function buildLoadDataForType(
  loadType: LoadType,
  currentData: LoadData = {},
  options: LoadDataBuildOptions = {},
): LoadData {
  const { coerceIntentEnums = true, preserveExplicitEmpty = false } = options;
  const defaults =
    loadType === 'intent'
      ? { ...loadTypeDefaults.intent, ...getIntentAutoConfig(currentData) }
      : loadTypeDefaults[loadType] || {};
  const allowed = new Set(loadTypeAllowedKeys[loadType] || ['type']);
  const source: LoadData = { ...currentData };
  const normalized: LoadData = { type: loadType };
  const explicitEmptyKeys = new Set<string>();
  const runsUntilStopped = source.run_until_stopped === true;

  if (loadType === 'intent') {
    const currentTarget = getIntentTargetData(source, { coerce: coerceIntentEnums });
    const requestedTargetUnit = String(currentTarget.type || 'rps')
      .toLowerCase()
      .trim();
    if (coerceIntentEnums) {
      source.target_unit = intentTargetUnits.has(requestedTargetUnit) ? requestedTargetUnit : 'rps';
      source.target_value = currentTarget.value || '3';
    } else if (source.target !== undefined || source.target_unit !== undefined || source.target_value !== undefined) {
      source.target_unit = currentTarget.type;
      source.target_value = currentTarget.value;
    }

    const latency = getIntentLatencyData(source);
    if (source.latency !== undefined) {
      source.p95_max_ms = latency.max_ms;
    } else if (source.p95_max_ms === undefined && latency.max_ms !== '') {
      source.p95_max_ms = latency.max_ms;
    }
    const errorRate = getIntentErrorRateData(source);
    if (source.error_rate !== undefined) {
      source.error_rate_max_pct = errorRate.max_pct;
    } else if (source.error_rate_max_pct === undefined && errorRate.max_pct !== '') {
      source.error_rate_max_pct = errorRate.max_pct;
    }
    if (source.control_window !== undefined) {
      source.window = source.control_window;
    }

    const requestedAggressiveness = String(source.aggressiveness || defaults.aggressiveness || 'medium')
      .toLowerCase()
      .trim();
    if (coerceIntentEnums) {
      source.aggressiveness = intentAggressivenessLevels.has(requestedAggressiveness)
        ? requestedAggressiveness
        : defaults.aggressiveness;
    } else if (source.aggressiveness !== undefined) {
      source.aggressiveness = String(source.aggressiveness).trim();
    }
  } else if (source.users === undefined && source.vusers !== undefined) {
    source.users = source.vusers;
  }

  for (const key of allowed) {
    if (key === 'type') {
      continue;
    }
    if (source[key] === '') {
      if (preserveExplicitEmpty) {
        explicitEmptyKeys.add(key);
      }
      continue;
    }
    if (source[key] !== undefined) {
      normalized[key] = source[key];
    }
  }

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (key === 'type' || !allowed.has(key)) {
      continue;
    }
    if (explicitEmptyKeys.has(key)) {
      continue;
    }
    if (runsUntilStopped && (key === 'duration' || key === 'iterations')) {
      continue;
    }
    if (normalized[key] === undefined || normalized[key] === '') {
      normalized[key] = defaultValue;
    }
  }

  return normalized;
}

export function normalizeLoadDataForYaml(data: LoadData | Record<string, unknown> = {}): LoadData {
  const rawData = data as Record<string, unknown>;
  const scalarData = toLoadData(rawData);
  const loadType = normalizeLoadType(rawData.type);

  if (loadType === 'intent') {
    const normalizedIntent = buildLoadDataForType(loadType, scalarData, {
      coerceIntentEnums: false,
      preserveExplicitEmpty: true,
    });
    const target = getIntentTargetData(normalizedIntent, { coerce: false });
    if (normalizedIntent.target_unit === undefined && target.type) {
      normalizedIntent.target_unit = target.type;
    }
    if (normalizedIntent.target_value === undefined && target.value !== '') {
      normalizedIntent.target_value = target.value;
    }
    const latency = getIntentLatencyData(normalizedIntent);
    if (normalizedIntent.p95_max_ms === undefined && latency.max_ms !== '') {
      normalizedIntent.p95_max_ms = latency.max_ms;
    }
    const errorRate = getIntentErrorRateData(normalizedIntent);
    if (normalizedIntent.error_rate_max_pct === undefined && errorRate.max_pct !== '') {
      normalizedIntent.error_rate_max_pct = errorRate.max_pct;
    }
    if (Array.isArray(rawData.stages)) {
      (normalizedIntent as Record<string, unknown>).stages = rawData.stages;
    }
    return normalizedIntent;
  }

  if (loadType === 'segments') {
    return { ...rawData, type: rawData.type || 'segments' } as LoadData;
  }

  const normalized = {
    ...rawData,
    type: getYamlLoadType(loadType),
  } as LoadData;
  if (Array.isArray(rawData.stages)) {
    (normalized as Record<string, unknown>).stages = rawData.stages;
  }
  if (Array.isArray(rawData.segments)) {
    (normalized as Record<string, unknown>).segments = rawData.segments;
  }

  if (normalized.users === undefined && normalized.vusers !== undefined) {
    normalized.users = normalized.vusers;
  }

  delete normalized.vusers;

  // A manual-stop run has no finite limit: drop duration/iterations so the
  // editor never emits contradictory empty-string keys alongside
  // run_until_stopped (the checkbox clears them to '' rather than deleting).
  if (normalized.run_until_stopped === true) {
    delete normalized.duration;
    delete normalized.iterations;
  }

  return normalized;
}
