import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { appendProtocolSteps, createProtocolStep } from './protocolProject';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
describe('protocol starters', () => {
  it('adds an HTTPS request while preserving existing steps, variables and defaults', () => {
    const source =
      'test: {name: Existing}\nvariables: {token: keep}\ngrpc_defaults: {target: host:443}\nhttp_defaults: {base_url: https://original.test}\nscenarios:\n- name: Flow\n  load: {type: constant, users: 2}\n  steps: [{get: /existing}]\n';
    const step = createProtocolStep('https', {
      url: 'https://api.test/orders',
      method: 'POST',
      message: '{"item":"{{item}}"}',
      headers: '{"Authorization":"Bearer {{token}}"}',
    });
    const output = load(appendProtocolSteps(source, [step])) as any;
    expect(output.scenarios[0].steps).toEqual([
      { get: '/existing' },
      {
        request: {
          name: 'HTTPS request',
          method: 'POST',
          url: 'https://api.test/orders',
          timeout: '10s',
          headers: { Authorization: 'Bearer {{token}}' },
          body: '{"item":"{{item}}"}',
        },
      },
    ]);
    expect(output.grpc_defaults).toEqual({ target: 'host:443' });
    expect(output.http_defaults.base_url).toBe('https://original.test');
    expect(output.variables.token).toBe('keep');
    expect(output.scenarios[0].load.users).toBe(2);
  });
  it('creates an executable WebSocket conversation that survives the editor round trip', () => {
    const step = createProtocolStep('websocket', {
      url: 'wss://events.test/live',
      message: '{"action":"subscribe"}',
      receive: true,
      expected: 'ready',
    });
    const yaml = appendProtocolSteps('', [step]);
    const root = load(yaml) as any;
    expect(root.scenarios[0].steps[0].websocket.actions).toEqual([
      { send: { type: 'text', data: '{"action":"subscribe"}' } },
      { receive: { type: 'text', timeout: '10s', assertions: [{ type: 'contains', value: 'ready' }] } },
      { close: { code: 1000 } },
    ]);
    expect(load(treeToYAML(parseYAMLToTree(yaml)!))).toEqual(root);
  });
  it('rejects invalid addresses or headers before changing the document', () => {
    expect(() => createProtocolStep('websocket', { url: 'https://wrong.test' })).toThrow(/ws/);
    expect(() => createProtocolStep('https', { url: 'ftp://wrong.test' })).toThrow(/http/);
    expect(() => createProtocolStep('https', { url: 'https://api.test', headers: '{"Authorization":5}' })).toThrow(
      /header/i,
    );
    expect(() => appendProtocolSteps('scenarios: invalid', [])).toThrow(/scenario/i);
  });
});
