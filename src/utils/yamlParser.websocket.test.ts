import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { collectRequests } from '../components/debugRequests';
import { canContain } from './yamlDragDropRules';
import { createNodeByType } from '../components/yaml-tree-view/nodeFactory';
const source = `test: {name: Live auctions}
scenarios:
 - name: Buyer
   steps:
    - websocket:
        name: Recorded conversation
        url: wss://example.com/ws
        future_field: preserve
        actions:
         - send: {type: text, data: '{"action":"subscribe"}'}
         - receive:
             type: text
             response: {data: '{"type":"subscribed"}', size_bytes: 21, time_ms: 5}
    - websocket: {action: connect, connection: feed, url: wss://example.com/ws}
    - websocket:
        action: receive
        connection: feed
        receive: {match: {jsonpath: $.type, equals: subscribed}, unmatched: keep}
`;
describe('WebSocket conversation authoring', () => {
  it('imports native conversations and persistent actions without losing recording evidence', () => {
    const tree = parseYAMLToTree(source)!;
    const requests = collectRequests(tree);
    expect(requests.map(n => n.type)).toEqual(['websocket', 'websocket', 'websocket']);
    expect((requests[0].data as Record<string, unknown>)?.future_field).toBe('preserve');
    expect(load(treeToYAML(tree))).toEqual(load(source));
  });
  it('creates a conversation and allows it in a multiprotocol flow', () => {
    expect(createNodeByType('websocket').type).toBe('websocket');
    expect(canContain('steps', 'websocket')).toBe(true);
  });
});

it('persists a WebSocket rename made in the scenario tree', () => {
  const tree = parseYAMLToTree(source)!;
  const node = collectRequests(tree)[0];
  node.name = 'Renamed conversation';
  expect(treeToYAML(tree)).toContain('name: Renamed conversation');
});

it('edits and removes handshake headers through a child without changing messages or evidence', () => {
  const input = source.replace('        future_field: preserve', '        future_field: preserve\n        headers: {Authorization: "Bearer {{token}}", Origin: "https://example.com"}');
  const tree = parseYAMLToTree(input)!;
  const ws = collectRequests(tree)[0];
  const headers = ws.children?.find(child => child.type === 'headers');
  expect(headers).toBeDefined();
  expect(headers?.path).toEqual([...ws.path!, 'websocket', 'headers']);
  expect(load(treeToYAML(tree))).toEqual(load(input));
  headers!.data = { Authorization: 'Bearer {{new_token}}' };
  const saved = load(treeToYAML(tree)) as { scenarios: { steps: { websocket: Record<string, unknown> }[] }[] };
  expect(saved.scenarios[0].steps[0].websocket.headers).toEqual({ Authorization: 'Bearer {{new_token}}' });
  expect(saved.scenarios[0].steps[0].websocket.actions).toEqual(ws.data?.actions);
  ws.children = [];
  const removed = load(treeToYAML(tree)) as typeof saved;
  expect(removed.scenarios[0].steps[0].websocket).not.toHaveProperty('headers');
});
