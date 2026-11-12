import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { protocolData, withProtocolChildren } from './protocolChildren';
import { applyNodeUpdateToTree } from './nodeUpdate';
import { getAddableItems } from '../components/yaml-tree-view/addableItems';
import { canAddNodeToTarget } from '../components/yaml-tree-view/treeViewHelpers';
import { addNodeToTree, removeNodeFromTree, refreshTreePaths } from '../components/yaml-tree-view/treeOperations';
import { splitWebSocketConversation } from './websocketConversation';
const t = (key: string) => key;
const find = (node: YAMLNode, type: string): YAMLNode | undefined =>
  node.type === type ? node : node.children?.map(child => find(child, type)).find(Boolean);
const source = `test: {name: Protocol children}
scenarios:
 - name: flow
   steps:
    - grpc:
        method: /service/Call
        metadata: {x-values: [one, two], authorization: token}
        extractors: [{type: jsonpath, var: id, expression: $.id, future: retained}]
        assertions: [{type: status, value: 0}]
        error_policy: {on_error: continue}
    - websocket:
        url: wss://example.com/ws
        headers: {X-Token: token}
        actions:
         - receive:
             type: text
             extractors: [{type: jsonpath, var: first, expression: $.id}]
         - send: {data: next}
         - receive:
             type: text
             extractors: [{type: jsonpath, var: second, expression: $.id}]
             assertions: [{type: contains, value: ready}]
    - sql:
        kind: query
        query: SELECT id FROM events
        extractors: [{column: id, var: id}]
        error_policy: {on_error: stop}
`;
const saved = (tree: YAMLNode) => load(treeToYAML(tree)) as { scenarios: { steps: Record<string, any>[] }[] };
describe('native request context menus', () => {
  it.each(['sql', 'grpc', 'websocket'] as const)(
    'shows every HTTP option in order for %s, with explicit unsupported reasons',
    type => {
      const items = getAddableItems(type, t, {
        data: type === 'websocket' ? { actions: [{ receive: { type: 'text' } }] } : {},
      });
      expect(items.map(i => i.type)).toEqual(getAddableItems('request', t).map(i => i.type));
      for (const item of items)
        expect(
          canAddNodeToTarget(
            { id: 'p', name: '', type, data: type === 'websocket' ? { actions: [{ receive: { type: 'text' } }] } : {} },
            item.type,
          ),
        ).toBe(!item.disabledReason);
      if (type === 'sql') expect(items.find(i => i.type === 'file')?.disabledReason).toContain('sqlUnsupported');
      else expect(items.find(i => i.type === 'file')?.disabledReason).toBeUndefined();
    },
  );
  it('round-trips native processors losslessly and keeps repeated metadata', () => {
    const tree = parseYAMLToTree(source)!;
    expect(load(treeToYAML(tree))).toEqual(load(source));
    expect(find(tree, 'grpc')?.children?.map(child => child.type)).toEqual([
      'headers',
      'error_policy',
      'extractor',
      'assertion',
    ]);
  });
  it('writes edited gRPC children into metadata, extractors, assertions, and policy without duplicate fields', () => {
    let tree = parseYAMLToTree(source)!;
    const grpc = find(tree, 'grpc')!;
    const extractor = grpc.children!.find(c => c.type === 'extractor')!;
    tree = applyNodeUpdateToTree(tree, extractor.id, { ...extractor.data, expression: '$.new_id' });
    const assertion = grpc.children!.find(c => c.type === 'assertion')!;
    tree = applyNodeUpdateToTree(tree, assertion.id, { type: 'status', value: 7 });
    const data = saved(tree).scenarios[0].steps[0].grpc;
    expect(data.metadata['x-values']).toEqual(['one', 'two']);
    expect(data.extractors[0]).toMatchObject({
      type: 'jsonpath',
      var: 'id',
      expression: '$.new_id',
      future: 'retained',
    });
    expect(data.assertions).toEqual([{ type: 'status', value: 7 }]);
    expect(data).not.toHaveProperty('headers');
    expect(data).not.toHaveProperty('protocolChildrenManaged');
  });
  it('deletes native children without resurrecting the original arrays or maps', () => {
    let tree = parseYAMLToTree(source)!;
    const grpc = find(tree, 'grpc')!;
    for (const child of grpc.children!) tree = removeNodeFromTree(tree, child.id);
    const data = saved(tree).scenarios[0].steps[0].grpc;
    expect(data.extractors).toEqual([]);
    expect(data.assertions).toEqual([]);
    expect(data).not.toHaveProperty('metadata');
    expect(data).not.toHaveProperty('error_policy');
  });
  it('keeps native form edits synchronized with prior tree processor edits', () => {
    let tree = parseYAMLToTree(source)!;
    let grpc = find(tree, 'grpc')!;
    const ext = grpc.children!.find(c => c.type === 'extractor')!;
    tree = applyNodeUpdateToTree(tree, ext.id, { ...ext.data, expression: '$.edited' });
    grpc = find(tree, 'grpc')!;
    tree = applyNodeUpdateToTree(tree, grpc.id, { ...protocolData(grpc), target: 'localhost:1234' });
    grpc = find(tree, 'grpc')!;
    expect(grpc.children!.find(c => c.type === 'extractor')?.id).toBe(ext.id);
    expect(protocolData(grpc).extractors).toEqual([expect.objectContaining({ expression: '$.edited' })]);
    tree = applyNodeUpdateToTree(tree, grpc.id, { ...protocolData(grpc), extractors: [] });
    expect(find(tree, 'grpc')!.children!.some(c => c.type === 'extractor')).toBe(false);
    expect(saved(tree).scenarios[0].steps[0].grpc.extractors).toEqual([]);
  });
  it('attaches WebSocket additions to the last text receive without moving prior receive processors', () => {
    let tree = parseYAMLToTree(source)!;
    const ws = find(tree, 'websocket')!;
    tree = addNodeToTree(tree, ws.id, {
      id: 'new',
      type: 'extractor',
      name: 'Extractor',
      data: { type: 'jsonpath', var: 'third', expression: '$.value' },
    });
    const data = saved(tree).scenarios[0].steps[1].websocket;
    expect(data.actions[0].receive.extractors).toHaveLength(1);
    expect(data.actions[2].receive.extractors.map((v: any) => v.var)).toEqual(['third', 'second']);
    expect(data).not.toHaveProperty('extractors');
    const refreshed = find(refreshTreePaths(tree), 'websocket')!;
    expect(refreshed.children?.find(c => c.id === 'new')?.path).toEqual([
      ...ws.path!,
      'websocket',
      'actions',
      2,
      'receive',
      'extractors',
      0,
    ]);
  });
  it('rejects incompatible additions from non-menu paths too', () => {
    const tree = parseYAMLToTree(source)!;
    for (const type of ['sql']) {
      const parent = find(tree, type)!;
      expect(
        treeToYAML(addNodeToTree(tree, parent.id, { id: 'bad', type: 'file', name: 'File', data: { path: 'x' } })),
      ).toBe(treeToYAML(tree));
    }
    const parent: YAMLNode = {
      id: 'receive',
      type: 'websocket',
      name: 'Receive',
      data: { action: 'receive', receive: { type: 'binary' } } as YAMLNode['data'],
    };
    expect(canAddNodeToTarget(parent, 'extractor')).toBe(false);
    expect(canAddNodeToTarget(parent, 'headers')).toBe(false);
  });
  it('preserves authored SQL component assertions and scalar timers without enabling a new configuration version', () => {
    const input = source.replace(
      '        query: SELECT id FROM events',
      '        query: SELECT id FROM events\n        assertions: [{type: rows_returned, min: 1}]\n        think_time: 1s',
    );
    const tree = parseYAMLToTree(input)!;
    expect(load(treeToYAML(tree))).toEqual(load(input));
    expect(tree.unknownData?.component_configuration_version).toBeUndefined();
  });
  it('preserves edited receive processors when splitting a conversation', () => {
    let tree = parseYAMLToTree(source)!;
    const ws = find(tree, 'websocket')!;
    const ext = ws.children!.find(c => c.type === 'extractor')!;
    tree = applyNodeUpdateToTree(tree, ext.id, { ...ext.data, expression: '$.edited' });
    tree = splitWebSocketConversation(tree, ws.id);
    const steps = saved(tree).scenarios[0].steps;
    const receives = steps.filter(s => s.websocket?.action === 'receive');
    expect(receives[0].websocket.receive.extractors[0].expression).toBe('$.edited');
    expect(steps.find(s => s.websocket?.action === 'connect')?.websocket).not.toHaveProperty('extractors');
  });
  it('rebuilds no-op empty metadata maps without losing removal intent', () => {
    const node = withProtocolChildren({
      id: 'grpc',
      name: 'gRPC',
      type: 'grpc',
      data: { metadata: {} } as YAMLNode['data'],
    });
    expect(protocolData(node)).toEqual({ metadata: {} });
    expect(protocolData({ ...node, children: [] })).toEqual({});
  });
});

it('normalizes regex capture settings exactly as HTTP while preserving untouched native input', () => {
  const node = withProtocolChildren({
    id: 'g',
    type: 'grpc',
    name: 'Call',
    data: { extractors: [{ type: 'regex', var: 'values', pattern: '(a)', match_no: 1 }] },
  });
  expect(protocolData(node).extractors).toEqual([{ type: 'regex', var: 'values', pattern: '(a)', match_no: 1 }]);
  node.children![0].data = { ...node.children![0].data, capture_mode: 'all', group: 2 };
  expect(protocolData(node).extractors).toEqual([expect.objectContaining({ match_no: 0, template: '$2$' })]);
});

it('keeps SQL extractor edits when editing the query or the component policy', () => {
  let tree = parseYAMLToTree(source)!;
  let sql = find(tree, 'sql')!;
  const child = sql.children!.find(node => node.type === 'extractor')!;
  tree = applyNodeUpdateToTree(tree, child.id, { ...child.data, column: 'edited' });
  sql = find(tree, 'sql')!;
  tree = applyNodeUpdateToTree(tree, sql.id, { ...protocolData(sql), query: 'SELECT edited FROM events' });
  tree = applyNodeUpdateToTree(tree, sql.id, { __componentFields: { error_policy: { on_error: 'continue' } } });
  expect(saved(tree).scenarios[0].steps[2].sql.extractors[0].column).toBe('edited');
});

it.each(['sql', 'grpc', 'websocket'] as const)('adds and round-trips every shared processor on %s', type => {
  let node: YAMLNode = {
    id: 'native',
    type,
    name: 'Native',
    data:
      type === 'websocket'
        ? { actions: [{ receive: { type: 'text' } }] }
        : type === 'sql'
          ? { kind: 'query', query: 'SELECT 1' }
          : { method: '/demo/Call' },
    children: [],
  };
  const additions: YAMLNode[] = [
    { id: 'before', type: 'spark_before', name: 'Before', data: { script: 'vars.set("id",1)' } },
    { id: 'after', type: 'spark_after', name: 'After', data: { script: 'vars.set("ready",true)' } },
    { id: 'timer', type: 'think_time', name: 'Think Time', data: { duration: '10ms' } },
    {
      id: 'source',
      type: 'data_source',
      name: 'Data Source',
      data: { type: 'csv', file: 'data.csv', bind: { id: 'id' } },
    },
    {
      id: 'assertion',
      type: 'assertion',
      name: 'Assertion',
      data: type === 'sql' ? { type: 'rows_returned', value: { min: 1 } } : { type: 'contains', value: 'ok' },
    },
  ];
  for (const child of additions) {
    expect(canAddNodeToTarget(node, child.type as any)).toBe(true);
    node = addNodeToTree(node, node.id, child);
  }
  const data = protocolData(node) as any;
  expect(data.spark.map((s: any) => s.when)).toEqual(['after', 'before']);
  expect(data.data_source.file).toBe('data.csv');
  expect(data.think_time.duration).toBe('10ms');
  const assertions = type === 'websocket' ? data.actions[0].receive.assertions : data.assertions;
  expect(assertions).toHaveLength(1);
  const reopened = withProtocolChildren({ ...node, data, children: [] });
  expect(reopened.children!.filter(child => child.type === 'spark_before')).toHaveLength(1);
  expect(protocolData(reopened)).toEqual(data);
  expect(canAddNodeToTarget(reopened, 'think_time')).toBe(false);
});
it.each(['grpc', 'websocket'] as const)('serializes native file children on %s', type => {
  const node: YAMLNode = {
    id: 'n',
    type,
    name: 'Native',
    data: type === 'websocket' ? { actions: [] } : { method: '/demo/Call' },
    children: [
      {
        id: 'file',
        type: 'file',
        name: 'File',
        data: { path: 'payload.bin', field: 'payload', mime_type: 'application/octet-stream' },
      },
    ],
  };
  expect((protocolData(node).files as any[])[0]).toEqual({
    path: 'payload.bin',
    field: 'payload',
    mime: 'application/octet-stream',
  });
});
