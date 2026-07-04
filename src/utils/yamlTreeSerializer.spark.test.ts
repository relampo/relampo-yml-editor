import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { treeToObject } from './yamlTreeSerializer';

// RLP-606: a Spark node's before/after timing lives in its node type. The detail
// panel only edits `script`, so node.data has no `when`, and the runtime treats a
// missing `when` as `after` — making a "Spark Before" run after the request, so
// variables it sets never reach that request's url/body/query/form. The
// serializer must emit `when` explicitly from the node type.

function treeWithRequestSparks(sparkChildren: YAMLNode[]): YAMLNode {
  return {
    id: 'root',
    type: 'test',
    name: 'Test',
    data: {},
    children: [
      {
        id: 'scenarios',
        type: 'scenarios',
        name: 'Scenarios',
        data: {},
        children: [
          {
            id: 's1',
            type: 'scenario',
            name: 'S1',
            data: {},
            children: [
              {
                id: 'steps',
                type: 'steps',
                name: 'Steps',
                data: {},
                children: [
                  {
                    id: 'req',
                    type: 'request',
                    name: 'R',
                    data: { method: 'POST', url: '/pay/start/{{token}}' },
                    children: sparkChildren,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as YAMLNode;
}

describe('spark when serialization (RLP-606)', () => {
  it('emits when: before for a Spark Before node that has no when in its data', () => {
    const tree = treeWithRequestSparks([
      { id: 'sb', type: 'spark_before', name: 'Spark Before', data: { script: 'vars.set("token","abc")' } } as YAMLNode,
    ]);
    const obj = treeToObject(tree);
    const spark = obj.scenarios[0].steps[0].request.spark;
    expect(spark).toHaveLength(1);
    expect(spark[0].when).toBe('before');
    expect(spark[0].script).toBe('vars.set("token","abc")');
  });

  it('emits when: after for a Spark After node', () => {
    const tree = treeWithRequestSparks([
      { id: 'sa', type: 'spark_after', name: 'Spark After', data: { script: 'log(response.status)' } } as YAMLNode,
    ]);
    const obj = treeToObject(tree);
    const spark = obj.scenarios[0].steps[0].request.spark;
    expect(spark[0].when).toBe('after');
  });

  it('preserves order and timing when both before and after sparks are present', () => {
    const tree = treeWithRequestSparks([
      { id: 'sb', type: 'spark_before', name: 'Spark Before', data: { script: 'a' } } as YAMLNode,
      { id: 'sa', type: 'spark_after', name: 'Spark After', data: { script: 'b' } } as YAMLNode,
    ]);
    const obj = treeToObject(tree);
    const spark = obj.scenarios[0].steps[0].request.spark;
    expect(spark.map((s: { when: string }) => s.when)).toEqual(['before', 'after']);
  });

  it('serializes a standalone spark_before step with when: before', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      data: {},
      children: [
        {
          id: 'scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          data: {},
          children: [
            {
              id: 's1',
              type: 'scenario',
              name: 'S1',
              data: {},
              children: [
                {
                  id: 'steps',
                  type: 'steps',
                  name: 'Steps',
                  data: {},
                  children: [
                    { id: 'sb', type: 'spark_before', name: 'Spark Before', data: { script: 'x' } } as YAMLNode,
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as YAMLNode;
    const obj = treeToObject(tree);
    expect(obj.scenarios[0].steps[0].spark.when).toBe('before');
  });
});
