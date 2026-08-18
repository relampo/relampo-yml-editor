import { describe, expect, expectTypeOf, it } from 'vitest';
import { yamlMapData, yamlMapValue, type YAMLNodeData } from './yaml';

describe('YAML node data type contract', () => {
  it('accepts supported core fields and explicit map-node data', () => {
    const request = {
      method: 'POST',
      url: '/users',
      enabled: true,
      headers: { Accept: 'application/json' },
    } satisfies YAMLNodeData;
    const variables = yamlMapData({ BASE_URL: 'https://example.com' });

    expectTypeOf(request).toMatchTypeOf<YAMLNodeData>();
    expect(yamlMapValue(variables, 'BASE_URL')).toBe('https://example.com');
  });

  it('rejects invented fields and invalid supported shapes at compile time', () => {
    // @ts-expect-error invented fields belong in unknownData, not typed core data
    const invented: YAMLNodeData = { invented_by_agent: true };
    // @ts-expect-error headers are string maps
    const invalidHeaders: YAMLNodeData = { headers: { Accept: 200 } };

    expect(invented).toBeDefined();
    expect(invalidHeaders).toBeDefined();
  });
});
