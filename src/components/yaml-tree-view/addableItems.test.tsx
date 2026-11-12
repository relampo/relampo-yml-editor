import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import { translations } from '../../i18n/translations';
import type { YAMLNode } from '../../types/yaml';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { canContain } from '../../utils/yamlDragDropRules';
import { getAddableItems } from './addableItems';
import { createNodeByType } from './nodeFactory';
import { canAddNodeToTarget } from './treeViewHelpers';
import { getNodeDisplayName } from './nodeDisplayName';
import { addNodeToTree } from './treeOperations';
const t = (key: string) =>
  String(
    key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], translations.es) ?? key,
  );
describe('organized add menu', () => {
  it('keeps protocol requests first, controllers next and assertions before the remaining elements', () => {
    const items = getAddableItems('steps', t);
    expect(items.map(item => item.type)).toEqual([
      'request',
      'grpc',
      'websocket',
      'sql',
      'transaction',
      'group',
      'parallel',
      'balanced',
      'if',
      'loop',
      'retry',
      'one_time',
      'assertion',
      'think_time',
      'data_source',
    ]);
    expect(items.slice(0, 4).every(item => item.section === 'requests')).toBe(true);
    expect(items.find(item => item.type === 'assertion')?.description).toBe('Valida la última respuesta HTTP recibida');
  });
  it('places translated HTTP/gRPC defaults together and removes Metrics from Add', () => {
    const items = getAddableItems('test', t);
    const index = items.findIndex(item => item.type === 'http_defaults');
    expect(items[index + 1]).toMatchObject({ type: 'grpc_defaults', label: 'Valores gRPC por defecto' });
    expect(items.some(item => item.type === 'metrics')).toBe(false);
    const defaults = createNodeByType('grpc_defaults');
    expect(getNodeDisplayName(defaults, t)).toBe('Valores gRPC por defecto');
    expect(getAddableItems('test', t, { children: [defaults] }).some(item => item.type === 'grpc_defaults')).toBe(
      false,
    );
  });
  it('adds, exports and reopens a standalone assertion in the engine array format', () => {
    const tree = parseYAMLToTree('test: {name: Menu}\nscenarios:\n- name: Flow\n  steps:\n  - get: /health\n')!;
    const steps = tree
      .children!.find(item => item.type === 'scenarios')!
      .children![0].children!.find(item => item.type === 'steps')!;
    const assertion = createNodeByType('assertion');
    assertion.data = { type: 'status', value: 200 };
    expect(canContain('steps', 'assertion')).toBe(true);
    expect(canContain('balanced', 'assertion')).toBe(false);
    const updated = addNodeToTree(tree, steps.id, assertion);
    const yaml = treeToYAML(updated);
    const output = load(yaml) as { scenarios: { steps: unknown[] }[] };
    expect(output.scenarios[0].steps[1]).toEqual({ assertions: [{ type: 'status', value: 200 }] });
    const reopened = parseYAMLToTree(yaml)!;
    const find = (node: YAMLNode): YAMLNode | undefined =>
      node.type === 'assertion' ? node : node.children?.map(find).find(Boolean);
    expect(find(reopened)?.data).toMatchObject({ type: 'status', value: 200 });
    expect(load(treeToYAML(reopened))).toEqual(output);
  });
});

it.each(['http_defaults', 'grpc_defaults'] as const)(
  'inserts %s beside its protocol counterpart in the tree',
  added => {
    const existing = added === 'http_defaults' ? 'grpc_defaults' : 'http_defaults';
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [createNodeByType('variables'), createNodeByType(existing), createNodeByType('data_source')],
    };
    const result = addNodeToTree(tree, 'root', createNodeByType(added));
    expect(result.children?.map(node => node.type)).toEqual([
      'variables',
      'http_defaults',
      'grpc_defaults',
      'data_source',
    ]);
  },
);

it.each(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'sql', 'grpc', 'websocket'] as const)(
  'does not offer gRPC requests or defaults from a %s request menu',
  type => {
    const target: YAMLNode = { id: 'request', type, name: 'Request' };
    const options = getAddableItems(type, t);
    expect(options.some(item => item.type === 'grpc' || item.type === 'grpc_defaults')).toBe(false);
    expect(canAddNodeToTarget(target, 'grpc')).toBe(false);
    expect(canAddNodeToTarget(target, 'grpc_defaults')).toBe(false);
  },
);

it('offers an extractor inside an SQL query, but not inside SQL exec', () => {
  expect(getAddableItems('sql', t).map((item) => item.type)).toEqual(['extractor']);
  expect(getAddableItems('sql', t, { data: { kind: 'exec' } })).toEqual([]);
});
