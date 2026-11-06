import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { buildScopedSearch } from './search';
import { replaceTextInEnabledRequestsAtMatch } from './treeOperations';

const source = `test:
  name: Scoped search
variables:
  value: needle
scenarios:
  - name: Main
    steps:
      - request:
          name: editable-needle
          method: GET
          url: /needle/needle
          headers:
            X-Test: needle
          response:
            status: 200
            body: response-only needle
          response_preview:
            content: preview-only
      - request:
          name: Response result
          method: GET
          url: /health
          response:
            body: response-only
`;

describe('scoped tree search', () => {
  it('requires a scope and ignores empty searches', () => {
    const tree = parseYAMLToTree(source)!;
    expect(buildScopedSearch(tree, 'needle', null).matchNodeIds).toEqual([]);
    expect(buildScopedSearch(tree, '  ', 'responses').matchNodeIds).toEqual([]);
  });

  it('counts canonical editable occurrences once and preserves recorded responses', () => {
    const tree = parseYAMLToTree(source)!;
    const before = buildScopedSearch(tree, 'needle', 'requests');
    expect(before.matchNodeIds).toHaveLength(5);
    expect(new Set(before.matchNodeIds).size).toBe(3);
    const replaced = replaceTextInEnabledRequestsAtMatch(tree, 'needle', 'changed', undefined, true).result;
    expect(replaced.replacements).toBe(before.matchNodeIds.length);
    const reopened = parseYAMLToTree(treeToYAML(replaced.tree))!;
    expect(buildScopedSearch(reopened, 'needle', 'requests').matchNodeIds).toHaveLength(0);
    expect(buildScopedSearch(reopened, 'changed', 'requests').matchNodeIds).toHaveLength(5);
    expect(buildScopedSearch(reopened, 'needle', 'responses').matchNodeIds).toHaveLength(1);
  });

  it('isolates response and preview results from request names, paths and variables', () => {
    const tree = parseYAMLToTree(source)!;
    expect(buildScopedSearch(tree, 'response-only', 'requests').matchNodeIds).toHaveLength(0);
    const responses = buildScopedSearch(tree, 'response-only', 'responses');
    expect(responses.matchNodeIds).toHaveLength(2);
    expect([...responses.index.values()].filter(state => state.directMatch)).toHaveLength(2);
    expect(buildScopedSearch(tree, 'editable-needle', 'responses').matchNodeIds).toHaveLength(0);
    expect(buildScopedSearch(tree, 'preview-only', 'responses').matchNodeIds).toHaveLength(1);
  });
});
