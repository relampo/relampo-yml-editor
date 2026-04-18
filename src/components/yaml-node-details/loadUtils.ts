export type LoadType = 'constant' | 'ramp' | 'ramp_up_down' | 'throughput' | 'intent';

const intentTargetUnits = new Set(['rps', 'vus']);
const intentAggressivenessLevels = new Set(['low', 'medium', 'high']);

export interface IntentAutoConfig {
  warmup: string;
  duration: string;
  window: string;
  ramp_up: string;
  ramp_down: string;
  min_vus: string;
  max_vus: string;
  average_ms: string;
  p95_max_ms: string;
  error_rate_max_pct: string;
  error_4xx_max_pct: string;
  error_5xx_max_pct: string;
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
  if (rawLoadType === 'ramp') {
    return 'ramp';
  }
  if (rawLoadType === 'throughput') {
    return 'throughput';
  }
  if (rawLoadType === 'intent') {
    return 'intent';
  }
  return 'constant';
}

const loadTypeDefaults: Record<LoadType, Record<string, any>> = {
  constant: {
    users: '10',
    duration: '5m',
    iterations: '0',
    ramp_up: '0s',
  },
  ramp: {
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
    ramp_up: '1m',
    ramp_down: '1m',
  },
  intent: {
    target_unit: 'rps',
    target_value: '3',
    duration: '10m',
    warmup: '30s',
    window: '2s',
    ramp_up: '30s',
    ramp_down: '30s',
    p95_max_ms: '800',
    error_rate_max_pct: '1',
    aggressiveness: 'medium',
    min_vus: '1',
    max_vus: '80',
  },
};

const loadTypeAllowedKeys: Record<LoadType, string[]> = {
  constant: ['type', 'users', 'duration', 'iterations', 'ramp_up'],
  ramp: ['type', 'start_users', 'end_users', 'duration', 'iterations'],
  ramp_up_down: ['type', 'users', 'duration', 'iterations', 'ramp_up', 'ramp_down'],
  throughput: ['type', 'target_rps', 'duration', 'iterations', 'ramp_up', 'ramp_down'],
  intent: [
    'type',
    'target_unit',
    'target_value',
    'duration',
    'warmup',
    'window',
    'ramp_up',
    'ramp_down',
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
};

export const selectedLoadButtonStyle = {
  constant: {
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    color: '#93c5fd',
    borderColor: 'rgba(147, 197, 253, 0.55)',
    boxShadow: '0 10px 22px rgba(59, 130, 246, 0.22)',
  },
  ramp: {
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    color: '#d8b4fe',
    borderColor: 'rgba(216, 180, 254, 0.55)',
    boxShadow: '0 10px 22px rgba(168, 85, 247, 0.22)',
  },
  ramp_up_down: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    color: '#fcd34d',
    borderColor: 'rgba(252, 211, 77, 0.55)',
    boxShadow: '0 10px 22px rgba(245, 158, 11, 0.22)',
  },
  throughput: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    color: '#6ee7b7',
    borderColor: 'rgba(110, 231, 183, 0.55)',
    boxShadow: '0 10px 22px rgba(16, 185, 129, 0.22)',
  },
  intent: {
    backgroundColor: 'rgba(244, 63, 94, 0.22)',
    color: '#fda4af',
    borderColor: 'rgba(253, 164, 175, 0.55)',
    boxShadow: '0 10px 22px rgba(244, 63, 94, 0.22)',
  },
} as const;

export const loadColors = {
  constant: { stroke: '#60a5fa', fill: '#3b82f620' },
  ramp: { stroke: '#a78bfa', fill: '#a78bfa20' },
  ramp_up_down: { stroke: '#f59e0b', fill: '#f59e0b20' },
  throughput: { stroke: '#10b981', fill: '#10b98120' },
  intent: { stroke: '#fb7185', fill: '#fb718520' },
} as const;

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) {
    return 0;
  }
  const match = timeStr.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) {
    return 60;
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
      return 60;
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

export function getIntentAutoConfig(data: Record<string, any> = {}): IntentAutoConfig {
  const targetUnit = String(data.target_unit || 'rps').toLowerCase().trim() === 'vus' ? 'vus' : 'rps';
  const aggressiveness = intentAggressivenessLevels.has(String(data.aggressiveness || '').toLowerCase())
    ? String(data.aggressiveness).toLowerCase()
    : 'medium';
  const targetValue = Math.max(1, parseFloat(String(data.target_value || '0')) || 3);
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
  const rampUpSeconds = clamp(roundToStep(durationSeconds * 0.1, 5), 20, 120);
  const rampDownSeconds = clamp(roundToStep(durationSeconds * 0.1, 5), 20, 120);
  const minVus =
    targetUnit === 'vus'
      ? Math.max(1, Math.floor(targetValue * 0.6))
      : Math.max(1, Math.ceil(targetValue / 20));
  const maxVus =
    targetUnit === 'vus'
      ? Math.max(minVus + 1, Math.ceil(targetValue * 1.4))
      : Math.max(minVus + 2, Math.ceil(targetValue / 4));
  const latencySlack = Math.min(250, Math.floor(normalizedScale / 30) * 50);
  const averageMs = averageMsByAggressiveness[aggressiveness as keyof typeof averageMsByAggressiveness] + latencySlack;
  const p95MaxMs = p95MsByAggressiveness[aggressiveness as keyof typeof p95MsByAggressiveness] + latencySlack;
  const errorRateMaxPct = errorMaxByAggressiveness[aggressiveness as keyof typeof errorMaxByAggressiveness];
  const error4xxMaxPct = Math.max(errorRateMaxPct, errorRateMaxPct * 2);
  const error5xxMaxPct = Math.max(0.1, errorRateMaxPct / 2);

  return {
    warmup: formatSeconds(warmupSeconds),
    duration: formatSeconds(durationSeconds),
    window: formatSeconds(windowSecondsByAggressiveness[aggressiveness as keyof typeof windowSecondsByAggressiveness]),
    ramp_up: formatSeconds(rampUpSeconds),
    ramp_down: formatSeconds(rampDownSeconds),
    min_vus: String(minVus),
    max_vus: String(maxVus),
    average_ms: String(averageMs),
    p95_max_ms: String(p95MaxMs),
    error_rate_max_pct: formatPercent(errorRateMaxPct),
    error_4xx_max_pct: formatPercent(error4xxMaxPct),
    error_5xx_max_pct: formatPercent(error5xxMaxPct),
  };
}

export function limitedInputValue(value: string): string {
  return value.slice(0, 5);
}

interface LoadDataBuildOptions {
  coerceIntentEnums?: boolean;
  preserveExplicitEmpty?: boolean;
}

export function buildLoadDataForType(
  loadType: LoadType,
  currentData: Record<string, any> = {},
  options: LoadDataBuildOptions = {},
): Record<string, any> {
  const { coerceIntentEnums = true, preserveExplicitEmpty = false } = options;
  const defaults =
    loadType === 'intent'
      ? { ...loadTypeDefaults.intent, ...getIntentAutoConfig(currentData) }
      : loadTypeDefaults[loadType] || {};
  const allowed = new Set(loadTypeAllowedKeys[loadType] || ['type']);
  const source: Record<string, any> = { ...currentData };
  const normalized: Record<string, any> = { type: loadType };
  const explicitEmptyKeys = new Set<string>();

  if (loadType === 'intent') {
    const requestedTargetUnit = String(source.target_unit || defaults.target_unit || 'rps').toLowerCase().trim();
    if (coerceIntentEnums) {
      source.target_unit = intentTargetUnits.has(requestedTargetUnit) ? requestedTargetUnit : defaults.target_unit;
    } else if (source.target_unit !== undefined) {
      source.target_unit = String(source.target_unit).trim();
    }

    if ((source.target_value === undefined || source.target_value === '') && source.target_rps !== undefined) {
      source.target_value = source.target_rps;
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
    if (normalized[key] === undefined || normalized[key] === '') {
      normalized[key] = defaultValue;
    }
  }

  return normalized;
}

export function normalizeLoadDataForYaml(data: Record<string, any> = {}): Record<string, any> {
  const loadType = normalizeLoadType(data.type);

  if (loadType === 'intent') {
    const normalizedIntent = buildLoadDataForType(loadType, data, {
      coerceIntentEnums: false,
      preserveExplicitEmpty: true,
    });
    delete normalizedIntent.target_rps;
    delete normalizedIntent.iterations;
    return normalizedIntent;
  }

  const normalized: Record<string, any> = {
    ...data,
    type: loadType,
  };

  if (normalized.users === undefined && normalized.vusers !== undefined) {
    normalized.users = normalized.vusers;
  }

  delete normalized.vusers;
  return normalized;
}
