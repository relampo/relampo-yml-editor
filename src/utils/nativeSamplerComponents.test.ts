import { describe, expect, it } from 'vitest';
import { dump } from 'js-yaml';
import { componentCapabilityError, inspectComponentConfiguration } from './componentConfiguration';
describe('native sampler component admission', () => {
  it.each(['sql', 'grpc', 'websocket'])('requires an updated backend for %s processors', kind => {
    const script = {
      scenarios: [
        {
          steps: [
            {
              [kind]: {
                query: 'SELECT 1',
                spark: [{ when: 'before', script: 'vars.set("id",1)' }],
                think_time: '1ms',
                data_source: { type: 'csv', file: 'names.csv', bind: { name: 'name' } },
              },
            },
          ],
        },
      ],
    };
    expect(inspectComponentConfiguration(script).errors).toEqual([]);
    expect(inspectComponentConfiguration(script).required).toContain('native_sampler_components');
    expect(componentCapabilityError(dump(script), { version: 1, features: [] })).toContain('native sampler');
    expect(componentCapabilityError(dump(script), { version: 1, features: ['native_sampler_components'] })).toBeNull();
  });
  it('allows local SQL assertions without opting the whole script into inherited defaults', () => {
    const script = {
      scenarios: [
        {
          steps: [
            { sql: { kind: 'query', query: 'SELECT 1', assertions: [{ type: 'rows_returned', value: { min: 1 } }] } },
          ],
        },
      ],
    };
    expect(inspectComponentConfiguration(script).errors).toEqual([]);
    expect(componentCapabilityError(dump(script), { version: 1, features: ['native_sampler_components'] })).toBeNull();
  });
});
