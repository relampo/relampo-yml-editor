import { describe, expect, it } from 'vitest';
import { buildLoadDataForType, deriveSegmentDuration, getIntentAutoConfig, isValidDuration, normalizeLoadDataForYaml, parseTimeToSeconds } from './loadUtils';

describe('derived segment durations', () => {
  it.each(['constant', 'linear', 'ramp_up_down', 'throughput', 'intent'])(
    'replaces the previous %s duration when switching to segments', type => {
      const data = buildLoadDataForType('segments', { type, duration: '5m' });
      expect(data.duration).toBe('3600s');
    },
  );

  it('derives a finite duration when switching from manual stop', () => {
    const data = buildLoadDataForType('segments', { type: 'constant', run_until_stopped: true, duration: '' });
    expect(data.duration).toBe('3600s');
    expect(data).not.toHaveProperty('run_until_stopped');
  });

  it.each(['0.000000001s', '0.0000000001s', '1234567s'])(
    'preserves %s without exponent notation or digit grouping', duration => {
      const derived = deriveSegmentDuration([{ duration }]);
      expect(derived).toBe(duration);
      expect(isValidDuration(derived)).toBe(true);
      expect(parseTimeToSeconds(derived)).toBe(parseTimeToSeconds(duration));
    },
  );

  it('leaves incomplete segments without a derived duration', () => {
    expect(deriveSegmentDuration([{ duration: '1m' }, {}])).toBe('');
    expect(deriveSegmentDuration([])).toBe('');
  });

  it('preserves imported mismatched durations for validation', () => {
    const data = { type: 'segments', duration: '5m', segments: [{ duration: '1h' }] };
    expect(normalizeLoadDataForYaml(data)).toEqual(data);
  });
});

describe('parseTimeToSeconds', () => {
  it('returns zero for malformed durations', () => {
    expect(parseTimeToSeconds('not-a-duration')).toBe(0);
  });

  it('rejects durations that overflow the numeric representation', () => {
    expect(isValidDuration(`${'9'.repeat(309)}h`)).toBe(false);
  });
});

describe('normalizeLoadDataForYaml manual-stop contract', () => {
  it('drops the cleared duration/iterations the manual-stop checkbox produces', () => {
    // Shape the ManualStopControl checkbox commits: it clears the finite
    // fields to '' (not delete), so serialization must strip them.
    const normalized = normalizeLoadDataForYaml({
      type: 'constant',
      users: 3,
      duration: '',
      iterations: '',
      run_until_stopped: true,
    });

    expect(normalized.run_until_stopped).toBe(true);
    expect('duration' in normalized).toBe(false);
    expect('iterations' in normalized).toBe(false);
    expect(normalized).toMatchObject({ type: 'constant', users: 3 });
  });

  it('keeps finite limits when run_until_stopped is not set', () => {
    const normalized = normalizeLoadDataForYaml({
      type: 'constant',
      users: 3,
      duration: '1m',
      iterations: '10',
    });

    expect(normalized.duration).toBe('1m');
    expect(normalized.iterations).toBe('10');
    expect('run_until_stopped' in normalized).toBe(false);
  });
});

describe('normalizeLoadDataForYaml unsupported structures', () => {
  it('preserves intent stages so semantic validation can block execution', () => {
    const stages = [{ duration: '30s', target: 10 }];
    const normalized = normalizeLoadDataForYaml({ type: 'intent', stages }) as Record<string, unknown>;

    expect(normalized.stages).toEqual(stages);
  });
});

describe('normalizeLoadDataForYaml segments contract', () => {
  it('does not inject a default profile when segments are missing', () => {
    expect(normalizeLoadDataForYaml({ type: 'segments' })).toEqual({ type: 'segments' });
  });

  it('preserves segments load definitions when saving YAML', () => {
    const segments = [
      { name: 'baseline', target_rps: '5', max_vus: '20' },
      { name: 'fixed_users', target_vus: '50' },
    ];

    const normalized = normalizeLoadDataForYaml({
      type: 'segments',
      duration: '1h',
      iterations: '10',
      segments,
      users: '20',
    }) as Record<string, unknown>;

    expect(normalized).toEqual({
      type: 'segments',
      duration: '1h',
      iterations: '10',
      segments,
    });
  });
});

describe('getIntentAutoConfig', () => {
  it('locks intent max VUs to the target when the target unit is VUs', () => {
    const autoConfig = getIntentAutoConfig({
      type: 'intent',
      target: { type: 'vus', value: '10' },
      aggressiveness: 'medium',
    });

    expect(autoConfig.max_vus).toBe('10');
    expect(autoConfig.ramp_down).toBe(autoConfig.ramp_up);
  });

  it('keeps the documented flat intent fields during normalization', () => {
    const normalized = normalizeLoadDataForYaml({
      type: 'intent',
      target_unit: 'rps',
      target_value: '10',
      p95_max_ms: '500',
      error_rate_max_pct: '2',
      ramp_down: '20s',
    });

    expect(normalized).toMatchObject({
      type: 'intent',
      target_unit: 'rps',
      target_value: '10',
      p95_max_ms: '500',
      error_rate_max_pct: '2',
      ramp_down: '20s',
    });
  });

  it('uses edited legacy nested Intent values when flat and nested fields coexist', () => {
    const normalized = normalizeLoadDataForYaml({
      type: 'intent',
      target_unit: 'rps',
      target_value: '10',
      p95_max_ms: '800',
      error_rate_max_pct: '1',
      window: '2s',
      latency: { metric: 'p95', max_ms: '450' },
      error_rate: { max_pct: '0.5' },
      control_window: '5s',
    });

    expect(normalized).toMatchObject({
      p95_max_ms: '450',
      error_rate_max_pct: '0.5',
      window: '5s',
    });
  });

  it('returns zero for invalid time values', () => {
    expect(parseTimeToSeconds('not-a-duration')).toBe(0);
  });
});
