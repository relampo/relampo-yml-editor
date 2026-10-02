import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { getReplaceableMatchNodeIds, replaceTextInEnabledRequestsAtMatch } from './treeOperations';

const yaml = `test:
  name: '{{token}} test'
variables:
  token: '{{token}}'
scenarios:
  - name: '{{token}} scenario'
    steps:
      - group:
          name: '{{token}} group'
          steps:
            - request:
                name: '{{token}} request'
                method: GET
                url: /{{token}}
                enabled: false
                headers:
                  Authorization: '{{token}}'
                response:
                  body: '{{token}} recorded'
`;

describe('whole document replacement', () => {
  it('updates variables and component names, counts saved values once, and preserves responses', () => {
    const tree = parseYAMLToTree(yaml)!;
    expect(getReplaceableMatchNodeIds(tree, '{{token}}', true)).toHaveLength(7);
    const result = replaceTextInEnabledRequestsAtMatch(tree, '{{token}}', '{{authToken}}', undefined, true).result;
    expect(result.replacements).toBe(7);
    expect(getReplaceableMatchNodeIds(result.tree, '{{authToken}}', true)).toHaveLength(7);
    const saved = treeToYAML(result.tree);
    expect(saved.match(/\{\{authToken\}\}/g)).toHaveLength(7);
    expect(saved).toContain('{{token}} recorded');
    expect(saved).toContain('enabled: false');
  });
  it('replaces a selected variable occurrence without changing the other matches', () => {
    const tree = parseYAMLToTree(yaml)!;
    const result = replaceTextInEnabledRequestsAtMatch(tree, '{{token}}', '{{authToken}}', 1, true).result;
    expect(result.replacements).toBe(1);
    expect(result.tree.children?.find(node => node.type === 'variables')?.data).toEqual({ token: '{{authToken}}' });
    expect(getReplaceableMatchNodeIds(result.tree, '{{token}}', true)).toHaveLength(6);
  });
});
