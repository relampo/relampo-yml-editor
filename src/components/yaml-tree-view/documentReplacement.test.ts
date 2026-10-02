import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
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
  it('replaces reserved-name values only outside recorded request metadata', () => {
    const source = `test:
  name: Reserved field values
variables:
  response: '{{token}} variable'
  response_preview: '{{token}} preview variable'
  method: '{{token}} method variable'
  enabled: '{{token}} enabled variable'
  nested:
    response: '{{token}} nested variable'
scenarios:
  - name: request values
    steps:
      - request:
          method: POST
          url: /test
          headers:
            response: '{{token}} header'
            method: '{{token}} method header'
            enabled: '{{token}} enabled header'
          body:
            response: '{{token}} body'
            nested:
              response_preview: '{{token}} nested body'
          response:
            body: '{{token}} recorded'
          response_preview:
            body: '{{token}} recorded preview'
`;
    const tree = parseYAMLToTree(source)!;
    expect(getReplaceableMatchNodeIds(tree, '{{token}}', true)).toHaveLength(10);
    const result = replaceTextInEnabledRequestsAtMatch(tree, '{{token}}', '{{authToken}}', undefined, true).result;
    expect(result.replacements).toBe(10);
    const saved = treeToYAML(result.tree);
    const restored = load(saved) as {
      variables: Record<string, unknown>;
      scenarios: { steps: { request: {
        method: string;
        body: { response: string; nested: { response_preview: string } };
        response: { body: string };
        response_preview: { body: string };
      } }[] }[];
    };
    expect(saved.match(/\{\{authToken\}\}/g)).toHaveLength(10);
    expect(restored.variables.response).toBe('{{authToken}} variable');
    expect(restored.variables.method).toBe('{{authToken}} method variable');
    expect(restored.variables.enabled).toBe('{{authToken}} enabled variable');
    const request = restored.scenarios[0].steps[0].request;
    expect(request.method).toBe('POST');
    expect(request.body.response).toBe('{{authToken}} body');
    expect(request.body.nested.response_preview).toBe('{{authToken}} nested body');
    expect(request.response.body).toBe('{{token}} recorded');
    expect(request.response_preview.body).toBe('{{token}} recorded preview');
    expect(getReplaceableMatchNodeIds(parseYAMLToTree(saved)!, '{{authToken}}', true)).toHaveLength(10);
    expect(getReplaceableMatchNodeIds(tree, '{{token}}')).toHaveLength(5);
  });

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
