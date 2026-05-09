import { describe, expect, it } from 'vitest';
import { treeToYAML } from '../../utils/yamlParser';
import { createNodeByType } from './nodeFactory';

describe('createNodeByType', () => {
  it('uses placeholders instead of persisted sample values for new HTTP and extractor nodes', () => {
    const request = createNodeByType('get');
    const extractor = createNodeByType('extractor');

    expect(request.data?.url).toBe('');
    expect(request.name).toBe('GET: /');
    expect(extractor.data?.pattern).toBe('');
  });

  it('exports an empty HTTP request path as the minimal slash path', () => {
    const tree = {
      id: 'root',
      type: 'root',
      name: 'Test Plan',
      children: [
        {
          id: 'scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          children: [
            {
              id: 'scenario',
              type: 'scenario',
              name: 'New Scenario',
              data: { name: 'New Scenario' },
              children: [
                {
                  id: 'steps',
                  type: 'steps',
                  name: 'Steps',
                  children: [createNodeByType('get')],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    expect(treeToYAML(tree)).toContain('- get: /');
  });
});
