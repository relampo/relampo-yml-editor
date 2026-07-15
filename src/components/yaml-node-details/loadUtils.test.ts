import { describe, expect, it } from 'vitest';
import { normalizeLoadDataForYaml } from './loadUtils';

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
