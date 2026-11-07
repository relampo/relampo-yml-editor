import {describe,it,expect} from 'vitest';
import {load} from 'js-yaml';
import {parseYAMLToTree,treeToYAML} from './yamlParser';
import {splitWebSocketConversation} from './websocketConversation';
import {collectRequests} from '../components/debugRequests';
it('splits a recorded conversation visually into reusable named actions without losing evidence',()=>{
 const tree=parseYAMLToTree(`test: {name: split}
scenarios:
 - name: feed
   steps:
    - websocket:
        url: wss://example.com/ws
        future_field: preserve
        timeout: 5s
        actions:
         - send: {type: text, data: hello}
         - receive: {response: {data: hello}, match: {equals: hello}}
`)!;
 const node=collectRequests(tree)[0];const updated=splitWebSocketConversation(tree,node.id);const saved=load(treeToYAML(updated)) as {scenarios:{steps:{websocket:Record<string,unknown>}[]}[]};
 const steps=saved.scenarios[0].steps.map(s=>s.websocket);expect(steps.map(s=>s.action)).toEqual(['connect','send','receive','close']);expect(new Set(steps.map(s=>s.connection)).size).toBe(1);expect(steps[0].future_field).toBe('preserve');expect(steps[2].receive).toEqual({response:{data:'hello'},match:{equals:'hello'}});
});
