import { expect, it } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { collectRequests } from '../components/debugRequests';
import {
  addNodeToTree,
  duplicateNodeInTree,
  insertNodesAfterTarget,
  moveNodeInTree,
  refreshTreePaths,
  replaceTextInEnabledRequests,
} from '../components/yaml-tree-view/treeOperations';
import { splitWebSocketConversation } from './websocketConversation';
import { getAddableItems } from '../components/yaml-tree-view/addableItems';
import { canAddNodeToTarget } from '../components/yaml-tree-view/treeViewHelpers';
import type { YAMLNode } from '../types/yaml';
const source = `test: {name: Headers}
scenarios:
 - name: Buyer
   steps:
    - websocket:
        url: wss://example.com/ws
        headers: {Authorization: 'Bearer {{token}}'}
        actions: [{send: {data: hello, delay_before: 21.809s}}, {receive: {response: {data: hello}}}]
    - websocket: {action: send, connection: feed, send: {data: hello}}
`;
const savedWS = (tree: YAMLNode) =>
  (
    load(treeToYAML(tree)) as { scenarios: { steps: { websocket: Record<string, unknown> }[] }[] }
  ).scenarios[0].steps.map(s => s.websocket);
it('keeps headers with connect when splitting a conversation and preserves timing', () => {
  const tree = parseYAMLToTree(source)!;
  const [ws] = collectRequests(tree);
  const steps = savedWS(splitWebSocketConversation(tree, ws.id));
  expect(steps[0].headers).toEqual({ Authorization: 'Bearer {{token}}' });
  expect(steps[1]).not.toHaveProperty('headers');
  expect(steps[1].send).toEqual({ data: 'hello', delay_before: '21.809s' });
});
it('searches and replaces handshake header values once without modifying evidence', () => {
  const tree = parseYAMLToTree(source)!;
  const result = replaceTextInEnabledRequests(tree, 'token', 'new_token');
  expect(result.replacements).toBe(1);
  expect(savedWS(result.tree)[0].headers).toEqual({ Authorization: 'Bearer {{new_token}}' });
});
it('prevents duplicate headers and headers on a send-only step during add, paste, duplicate and move', () => {
  const tree = parseYAMLToTree(source)!;
  const [ws, send] = collectRequests(tree);
  const headers = ws.children![0];
  const extra = { ...headers, id: 'extra' };
  const unchanged = treeToYAML(tree);
  for (const result of [
    addNodeToTree(tree, ws.id, extra),
    duplicateNodeInTree(tree, headers.id, 'Copy'),
    insertNodesAfterTarget(tree, headers.id, [extra]),
    moveNodeInTree(tree, headers.id, send.id, 'inside'),
  ])
    expect(treeToYAML(result)).toBe(unchanged);
  expect(canAddNodeToTarget(send, 'headers')).toBe(false);
  expect(getAddableItems('websocket', k => k, send)).toEqual([]);
  expect(getAddableItems('websocket', k => k, ws)).toEqual([]);
  const empty: YAMLNode = { ...ws, children: [] };
  expect(canAddNodeToTarget(empty, 'headers')).toBe(true);
  expect(getAddableItems('websocket', k => k, empty).map(i => i.type)).toEqual(['headers']);
  const refreshed = refreshTreePaths(tree);
  const refreshedWS = collectRequests(refreshed)[0];
  expect(refreshedWS.children![0].path).toEqual([...refreshedWS.path!, 'websocket', 'headers']);
});
