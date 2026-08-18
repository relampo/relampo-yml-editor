import jsyaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { treeToYAML } from '../utils/yamlParser';
import { handleParseWorkerRequest } from './yamlParserWorkerProtocol';

describe('YAML parser Worker protocol', () => {
  it('returns the request id and a correct tree for a 2M character, 50K line document', () => {
    const comments = Array.from({ length: 50_000 }, (_, index) => `# ${String(index).padStart(5, '0')} ${'x'.repeat(34)}`).join('\n');
    const yaml = `${comments}\ntest:\n  name: large-worker-document\n  future_test:\n    flags: [first, second]\nfuture_root:\n  ordered: [alpha, beta, gamma]\nscenarios:\n  - name: smoke\n    future_scenario: keep\n    steps:\n      - request:\n          method: GET\n          url: /health\n          future_request:\n            values: [one, two]\n`;
    expect(yaml.length).toBeGreaterThanOrEqual(2_000_000);
    expect(yaml.split('\n').length).toBeGreaterThanOrEqual(50_000);

    const response = handleParseWorkerRequest({ id: 41, yaml });

    expect(response).toMatchObject({ id: 41, ok: true });
    expect(response.ok && response.tree?.name).toBe('large-worker-document');
    const output = jsyaml.load(treeToYAML(response.ok ? response.tree! : null!)) as Record<string, any>;
    expect(output.future_root.ordered).toEqual(['alpha', 'beta', 'gamma']);
    expect(output.test.future_test.flags).toEqual(['first', 'second']);
    expect(output.scenarios[0].future_scenario).toBe('keep');
    expect(output.scenarios[0].steps[0].request.future_request.values).toEqual(['one', 'two']);
  });

  it('returns a correlated parse failure without throwing', () => {
    const response = handleParseWorkerRequest({ id: 42, yaml: 'test: [' });
    expect(response).toMatchObject({ id: 42, ok: false });
    expect(!response.ok && response.error).toContain('Error parsing YAML');
  });
});
