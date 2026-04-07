export type LoadType = 'constant' | 'ramp' | 'ramp_up_down' | 'throughput' | 'intent';

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

export const loadTypeDefaults: Record<LoadType, Record<string, any>> = {
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
    ramp_up: '30s',
    ramp_down: '30s',
    p95_max_ms: '800',
    error_rate_max_pct: '1',
    aggressiveness: 'medium',
    min_vus: '1',
    max_vus: '80',
  },
};

export const loadTypeAllowedKeys: Record<LoadType, string[]> = {
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
    'ramp_up',
    'ramp_down',
    'p95_max_ms',
    'error_rate_max_pct',
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
  const match = timeStr.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    return 60;
  }
  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
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

export function limitedInputValue(value: string): string {
  return value.slice(0, 5);
}
