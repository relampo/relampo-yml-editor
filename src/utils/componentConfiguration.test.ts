import { afterEach, describe, expect, it, vi } from 'vitest';
import { dump, load } from 'js-yaml';
import type { YAMLNode } from '../types/yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { applyNodeUpdateToTree } from './nodeUpdate';
import { authoredNodeData } from './yamlAuthoredData';
import {
  COMPONENT_FEATURES,
  componentCapabilityError,
  effectiveComponentValues,
  inspectComponentConfiguration,
  parseComponentCapabilities,
  type ComponentCapabilities,
} from './componentConfiguration';
import { collectUnknownFieldPaths } from './unknownYamlFields';
import { validateYAMLSemantics } from './yamlSemanticValidation';
import { startLoadRun } from './runApi';
import { startDebugRun } from './debugApi';
vi.mock('./analytics', () => ({
  trackStudioRunStarted: vi.fn(),
  setAnalyticsVersion: vi.fn(),
  initializeAnalytics: vi.fn(),
}));
const capabilities: ComponentCapabilities = { version: 1, features: [...COMPONENT_FEATURES] };
const request = {
  method: 'GET',
  url: '/ok',
  timeout: '30s',
  follow_redirects: false,
  retrieve_embedded_resources: false,
  auth: { type: 'none' },
  assertions: [],
  think_time: { duration: '2s', enabled: false },
  future: { empty: [], flag: false, nothing: null },
};
const script = () => ({
  component_configuration_version: 1,
  test: { name: 'scopes' },
  defaults: {
    http: {
      timeout: '5s',
      headers: { 'X-Global': 'a', 'X-Override': 'root' },
      retrieve_embedded_resources: true,
      assertions: [{ type: 'status', value: 200 }],
      auth: { type: 'bearer', token: 'root' },
    },
  },
  scenarios: [
    {
      name: 'S',
      defaults: { http: { headers: { 'x-override': 'scenario' } } },
      steps: [
        {
          group: {
            name: 'G',
            defaults: { http: { follow_redirects: true, headers: { 'X-Group': 'b' } } },
            steps: [{ request }],
          },
        },
      ],
    },
  ],
});
function find(tree: YAMLNode, type: string): YAMLNode {
  if (tree.type === type) return tree;
  for (const child of tree.children || []) {
    try {
      return find(child, type);
    } catch {
      /* try sibling */
    }
  }
  throw Error(type);
}
function roundtrip(value: unknown): any {
  return load(treeToYAML(parseYAMLToTree(dump(value))!));
}
afterEach(() => vi.unstubAllGlobals());

describe('RLP-689 authored presence and flow preservation', () => {
  it('preserves 30s, false, none, [], disabled timer and nested future data with a new ancestor', () => {
    const output = roundtrip(script());
    expect(output.component_configuration_version).toBe(1);
    expect(output.defaults).toEqual(script().defaults);
    expect(output.scenarios[0].steps[0].group.steps[0].request).toEqual(request);
  });
  it('keeps implicit display fields absent after another request field changes', () => {
    const input = {
      test: { name: 'legacy' },
      scenarios: [{ steps: [{ request: { method: 'GET', url: '/before' } }] }],
    };
    const tree = parseYAMLToTree(dump(input))!;
    const node = find(tree, 'request');
    const updated = applyNodeUpdateToTree(tree, node.id, { ...node.data, url: '/after' });
    const output = roundtrip(load(treeToYAML(updated)));
    expect(output.scenarios[0].steps[0].request).toEqual({ method: 'GET', url: '/after' });
  });
  it('keeps authored query_params when another request field changes', () => {
    const request = { method: 'GET', url: '/ok', query_params: { page: 1, empty: '' } };
    const tree = parseYAMLToTree(dump({ scenarios: [{ steps: [{ request }] }] }))!;
    const node = find(tree, 'request');
    const updated = applyNodeUpdateToTree(tree, node.id, { ...node.data, timeout: '5s' });
    const output = load(treeToYAML(updated)) as any;
    expect(output.scenarios[0].steps[0].request).toEqual({ ...request, timeout: '5s' });
  });
  it('replaces authored query_params when the URL control changes the query', () => {
    const request = { method: 'GET', url: '/ok', query_params: { page: 1 } };
    const tree = parseYAMLToTree(dump({ scenarios: [{ steps: [{ request }] }] }))!;
    const node = find(tree, 'request');
    expect(node.data?.url).toBe('/ok?page=1');
    const updated = applyNodeUpdateToTree(tree, node.id, { ...node.data, url: '/ok?page=2' });
    const output = load(treeToYAML(updated)) as any;
    expect(output.scenarios[0].steps[0].request).toEqual({ method: 'GET', url: '/ok?page=2' });
  });
  it('preserves false with legacy root true and absent legacy root', () => {
    for (const global of [undefined, { follow_redirects: true }]) {
      const input = { ...script(), ...(global ? { http_defaults: global } : {}) };
      expect(roundtrip(input).scenarios[0].steps[0].group.steps[0].request.follow_redirects).toBe(false);
    }
  });
  it('keeps group assertions as unknown data without dropping its children', () => {
    const input = {
      test: { name: 'legacy' },
      scenarios: [
        { steps: [{ group: { name: 'G', assertions: [{ type: 'status', value: 200 }], steps: [{ get: '/ok' }] } }] },
      ],
    };
    const output = roundtrip(input);
    expect(output.scenarios[0].steps[0].group.assertions).toEqual(input.scenarios[0].steps[0].group.assertions);
    expect(output.scenarios[0].steps[0].group.steps).toHaveLength(1);
  });
  it('keeps standalone assertion wrappers distinct from groups', () => {
    const assertions = [
      { type: 'status', value: 200 },
      { type: 'duration', max_ms: 500 },
    ];
    expect(roundtrip({ scenarios: [{ steps: [{ assertions }] }] }).scenarios[0].steps[0].assertions).toEqual(
      assertions,
    );
  });
  it('preserves controller payloads and their defaults', () => {
    const input = {
      component_configuration_version: 1,
      scenarios: [
        { steps: [{ controller: { name: 'C', defaults: { http: { timeout: '4s' } }, steps: [{ get: '/ok' }] } }] },
      ],
    };
    expect(roundtrip(input).scenarios[0].steps[0].controller.defaults).toEqual(
      input.scenarios[0].steps[0].controller.defaults,
    );
  });
  it('keeps absent SQL on_error, explicit policy, [] and unknown empty values', () => {
    const sql = {
      kind: 'query',
      query: 'SELECT 1',
      assertions: [],
      error_policy: { on_error: 'continue', future: { empty: [], nothing: null } },
      future_null: null,
      future_empty: {},
    };
    const output = roundtrip({ scenarios: [{ steps: [{ sql }] }] }).scenarios[0].steps[0].sql;
    expect(output).not.toHaveProperty('on_error');
    expect(output.error_policy).toEqual(sql.error_policy);
    expect(output.assertions).toEqual([]);
    expect(output.future_null).toBeNull();
    expect(output.future_empty).toEqual({});
  });
  it('preserves SQL nested extension empties and does not write an implicit write authorization', () => {
    const sql = {
      kind: 'query',
      query: 'SELECT 1',
      connection: { host: 'db.test', future: {}, future_null: null, future_list: [] },
    };
    const output = roundtrip({ scenarios: [{ steps: [{ sql }] }] }).scenarios[0].steps[0].sql;
    expect(output.connection).toEqual(sql.connection);
    expect(output).not.toHaveProperty('allow_writes');
    expect(output).not.toHaveProperty('on_error');
    expect(output).not.toHaveProperty('name');
    const tree = parseYAMLToTree(dump({ scenarios: [{ steps: [{ sql }] }] }))!;
    expect(collectUnknownFieldPaths(tree)).toContain('scenarios[0].steps[0].sql.connection.future');
  });
  it('keeps removed local timer and policy children removed in authored and effective views', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { think_time: '1s', http: { error_policy: { on_timeout: 'stop_user' } } },
      scenarios: [
        {
          steps: [
            {
              request: {
                method: 'GET',
                url: '/ok',
                think_time: { enabled: false },
                error_policy: { on_timeout: 'continue' },
              },
            },
          ],
        },
      ],
    };
    const tree = parseYAMLToTree(dump(input))!,
      node = find(tree, 'request');
    node.children = node.children!.filter(child => !['think_time', 'error_policy'].includes(child.type));
    const output = load(treeToYAML(tree)) as any;
    expect(output.scenarios[0].steps[0].request).not.toHaveProperty('think_time');
    expect(output.scenarios[0].steps[0].request).not.toHaveProperty('error_policy');
    const effective = effectiveComponentValues(tree, node, 'http');
    expect(effective.think_time.value).toBe('1s');
    expect(effective.error_policy.value).toEqual({ on_timeout: 'stop_user' });
  });
  it('writes explicit sampler renames and preserves unknown auth empties', () => {
    const input = {
      scenarios: [
        {
          steps: [
            {
              request: {
                method: 'GET',
                url: '/ok',
                auth: { type: 'BEARER', token: 'token', future: {}, unused: null },
              },
            },
          ],
        },
      ],
    };
    const tree = parseYAMLToTree(dump(input))!,
      node = find(tree, 'request');
    const updated = applyNodeUpdateToTree(tree, node.id, { ...node.data, __name: 'Renamed' });
    const output = load(treeToYAML(updated)) as any;
    expect(output.scenarios[0].steps[0].request.name).toBe('Renamed');
    expect(output.scenarios[0].steps[0].request.auth).toEqual({
      ...input.scenarios[0].steps[0].request.auth,
      type: 'bearer',
    });
  });
  it('uses explicit controls to disable or inherit without retaining stale children', () => {
    const tree = parseYAMLToTree(dump(script()))!;
    const node = find(tree, 'request');
    const disabled = applyNodeUpdateToTree(tree, node.id, {
      __componentFields: { assertions: [], auth: { type: 'none' }, think_time: { enabled: false } },
    });
    const output = roundtrip(load(treeToYAML(disabled))).scenarios[0].steps[0].group.steps[0].request;
    expect(output.assertions).toEqual([]);
    expect(output.think_time).toEqual({ enabled: false });
    const inherited = applyNodeUpdateToTree(disabled, node.id, {
      __componentFields: { assertions: undefined, auth: undefined, think_time: undefined },
    });
    const local = authoredNodeData(find(inherited, 'request'));
    expect(local).not.toHaveProperty('auth');
    expect(local).not.toHaveProperty('assertions');
    expect(local).not.toHaveProperty('think_time');
  });
});

describe('RLP-689 scopes, origin and validation', () => {
  it('shows effective values without mutating authored data', () => {
    const tree = parseYAMLToTree(dump(script()))!;
    const before = treeToYAML(tree),
      node = find(tree, 'request');
    const values = effectiveComponentValues(tree, node, 'http');
    expect(values.timeout.value).toBe('30s');
    expect(values.timeout.origin).toContain('GET: /ok');
    expect(values.follow_redirects.value).toBe(false);
    expect(values.assertions.value).toEqual([]);
    expect(values.headers.value).toEqual({ 'X-Global': 'a', 'x-override': 'scenario', 'X-Group': 'b' });
    expect(values.headers.origins?.['X-Global']).toContain('scopes');
    expect(values.headers.origins?.['x-override']).toContain('S');
    expect(treeToYAML(tree)).toBe(before);
  });
  it.each(['group', 'controller', 'transaction', 'one_time', 'parallel', 'balanced', 'if', 'loop', 'retry'])(
    'supports %s defaults without converting them into executable steps',
    kind => {
      const input = {
        component_configuration_version: 1,
        scenarios: [{ steps: [{ [kind]: { defaults: { http: { timeout: '7s' } }, steps: [{ get: '/ok' }] } }] }],
      };
      expect(inspectComponentConfiguration(input).errors).toEqual([]);
      const tree = parseYAMLToTree(dump(input))!;
      const child = find(tree, 'get');
      expect(effectiveComponentValues(tree, child, 'http').timeout.value).toBe('7s');
      const updated = applyNodeUpdateToTree(tree, child.id, { ...child.data, url: '/edited' });
      const output = load(treeToYAML(updated)) as any;
      expect(output.scenarios[0].steps[0][kind].defaults.http.timeout).toBe('7s');
      expect(output.scenarios[0].steps[0][kind].steps[0].get).toBe('/edited');
    },
  );
  it('requires adoption and validates even disabled branches', () => {
    const input = { scenarios: [{ steps: [{ group: { enabled: false, defaults: { http: { timeout: false } } } }] }] };
    const errors = inspectComponentConfiguration(input).errors.map(item => item.message);
    expect(errors.some(error => error.includes('require component_configuration_version'))).toBe(true);
    expect(errors.some(error => error.includes('duration string'))).toBe(true);
  });
  it('rejects same-scope aliases, normalized header duplicates and misplaced known settings', () => {
    const input = {
      component_configuration_version: 1,
      http_defaults: { timeout: '5s' },
      defaults: { http: { timeout: '9s', headers: { 'X-A': 'a', 'x-a': 'b' }, base_url: '/' }, sql: { params: [] } },
    };
    const errors = inspectComponentConfiguration(input).errors.map(item => item.message);
    expect(errors.some(error => error.includes('Conflicts'))).toBe(true);
    expect(errors.some(error => error.includes('unique without case'))).toBe(true);
    expect(errors.filter(error => error.includes('not supported at this location'))).toHaveLength(2);
  });
  it('checks modeled nested fields while leaving free-form objects untouched', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { http: { auth: { type: 'none', future: { data_source: null } } } },
      variables: { defaults: { http: { timeout: false } } },
      scenarios: [{ steps: [{ request: { url: '/', body: { defaults: { sql: { timeout: false } } } } }] }],
    };
    const result = inspectComponentConfiguration(input);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map(item => item.path)).toEqual(['defaults.http.auth.future']);
    const tree = parseYAMLToTree(dump(input))!;
    expect(collectUnknownFieldPaths(tree)).toContain('defaults.http.auth.future');
    expect(collectUnknownFieldPaths(tree)).not.toContain('component_configuration_version');
    expect(collectUnknownFieldPaths(tree)).not.toContain('defaults');
  });
  it('forbids experimental defaults and preserves nested HTTP child flows', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { http: { headers: { 'X-A': 'a' } } },
      scenarios: [
        {
          steps: [
            {
              webrtc: {
                defaults: { http: { timeout: '2s' } },
                steps: [{ request: { method: 'GET', url: '/signal' } }],
              },
            },
          ],
        },
      ],
    };
    expect(inspectComponentConfiguration(input).errors[0].path).toContain('webrtc.defaults');
    expect(roundtrip(input).scenarios[0].steps[0].webrtc.steps).toEqual(input.scenarios[0].steps[0].webrtc.steps);
  });
  it('rejects HTTP SQL criteria and incompatible local SQL row criteria', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { http: { assertions: [{ type: 'rows_returned', value: 1 }] } },
      scenarios: [
        {
          steps: [{ sql: { kind: 'exec', query: 'DELETE FROM t', assertions: [{ type: 'rows_returned', value: 1 }] } }],
        },
      ],
    };
    expect(inspectComponentConfiguration(input).errors).toHaveLength(2);
  });
  it('checks effective SQL criterion/kind pairs and local [] disables the inherited list', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { sql: { assertions: [{ type: 'rows_returned', value: { min: 1, future_bound: null } }] } },
      scenarios: [{ steps: [{ if: 'true', steps: [{ sql: { kind: 'exec', query: 'UPDATE t SET a=1' } }] }] }],
    };
    expect(inspectComponentConfiguration(input).errors[0].message).toContain('Effective criterion');
    input.scenarios[0].steps[0].steps[0].sql = { ...input.scenarios[0].steps[0].steps[0].sql, assertions: [] } as any;
    const result = inspectComponentConfiguration(input);
    expect(result.errors).toEqual([]);
    expect(result.warnings[0].path).toBe('defaults.sql.assertions[0].value.future_bound');
  });
  it('preserves legacy scalar If and Loop while exposing their child requests', () => {
    for (const [kind, value] of [
      ['if', '{{enabled}}'],
      ['loop', '{{count}}'],
    ]) {
      const input = { scenarios: [{ steps: [{ [kind]: value, steps: [{ get: '/ok' }] }] }] };
      const tree = parseYAMLToTree(dump(input))!;
      const child = find(tree, 'get');
      const output = load(treeToYAML(applyNodeUpdateToTree(tree, child.id, { ...child.data, url: '/new' }))) as any;
      expect(output.scenarios[0].steps[0][kind]).toBe(value);
      expect(output.scenarios[0].steps[0].steps[0].get).toBe('/new');
    }
  });
  it('uses stable ancestor HTTP settings inside WebRTC without changing legacy auth', () => {
    const input = {
      component_configuration_version: 1,
      http_defaults: { auth: { type: 'bearer', token: 'legacy' } },
      scenarios: [
        {
          steps: [
            {
              group: {
                defaults: { http: { auth: { type: 'bearer', token: 'new-http' }, timeout: '2s' } },
                steps: [
                  {
                    webrtc: {
                      auth: { type: 'basic', username: 'signal', password: 'secret' },
                      steps: [{ request: { method: 'GET', url: '/signal' } }],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const tree = parseYAMLToTree(dump(input))!;
    const node = find(tree, 'request');
    expect(effectiveComponentValues(tree, node, 'http').auth.value).toEqual({ type: 'bearer', token: 'new-http' });
    const output = load(
      treeToYAML(applyNodeUpdateToTree(tree, node.id, { __componentFields: { timeout: '3s' } })),
    ) as any;
    expect(output.http_defaults.auth.token).toBe('legacy');
    expect(output.scenarios[0].steps[0].group.steps[0].webrtc.auth).toEqual(
      input.scenarios[0].steps[0].group.steps[0].webrtc.auth,
    );
    expect(output.scenarios[0].steps[0].group.steps[0].webrtc.steps[0].request.timeout).toBe('3s');
  });
  it('preserves per-key defaults policies and existing local request fallback with origins', () => {
    const input = {
      component_configuration_version: 1,
      defaults: { http: { error_policy: { on_timeout: 'stop_user', on_4xx: 'stop_user' } } },
      scenarios: [
        {
          steps: [
            {
              group: {
                defaults: { http: { error_policy: { on_error: 'continue' } } },
                steps: [{ request: { method: 'GET', url: '/ok' } }],
              },
            },
          ],
        },
      ],
    };
    const tree = parseYAMLToTree(dump(input))!,
      node = find(tree, 'request');
    const effective = effectiveComponentValues(tree, node, 'http').error_policy;
    expect(effective.value).toEqual({
      on_timeout: 'stop_user',
      on_4xx: 'stop_user',
      on_error: 'continue',
      on_5xx: 'continue',
    });
    expect(effective.origins?.on_timeout).toContain('defaults.http.error_policy');
    const updated = applyNodeUpdateToTree(tree, node.id, {
      __componentFields: { error_policy: { on_error: 'continue' } },
    });
    expect((effectiveComponentValues(updated, find(updated, 'request'), 'http').error_policy.value as any).on_4xx).toBe(
      'continue',
    );
  });
  it('rejects known illegal scopes after YAML aliases and merges are expanded', () => {
    const yaml = `component_configuration_version: 1
variables:
  declaration: &illegal
    auth: {type: none}
scenarios:
- steps:
  - sql:
      <<: *illegal
      query: SELECT 1
  - loop:
      defaults: {http: {connection_scope: scenario}}
      steps: []
`;
    expect(componentCapabilityError(yaml, capabilities)).toContain('cannot apply to local SQL');
    expect(inspectComponentConfiguration(load(yaml)).errors).toHaveLength(2);
  });
  it('checks timer, datasource, auth and SQL policy types without accessing files', () => {
    const input = {
      component_configuration_version: 1,
      defaults: {
        data_source: { type: 'csv', file: 'missing.csv', bind: { one: '__vu', two: '__vu' } },
        think_time: { min: '5s', max: '1s' },
        http: { timeout: '{{timeout}}', auth: { type: 'bearer' } },
        sql: { error_policy: { on_4xx: 'continue' } },
      },
    };
    const errors = inspectComponentConfiguration(input).errors.map(issue => issue.message);
    expect(errors.some(message => message.includes('reserved runtime'))).toBe(true);
    expect(errors.some(message => message.includes('minimum cannot exceed'))).toBe(true);
    expect(errors.some(message => message.includes('positive literal duration'))).toBe(true);
    expect(errors.some(message => message.includes('auth value is missing'))).toBe(true);
    expect(errors.some(message => message.includes('HTTP status policy'))).toBe(true);
    expect(
      inspectComponentConfiguration({
        component_configuration_version: 1,
        defaults: { data_source: { enabled: false }, think_time: { enabled: false } },
      }).errors,
    ).toEqual([]);
    expect(
      inspectComponentConfiguration({
        component_configuration_version: 1,
        defaults: {
          http: { timeout: '1m30.5s' },
          sql: { assertions: [{ type: 'duration', value: { min: '1', max: '{{limit}}' } }] },
        },
      }).errors,
    ).toEqual([]);
  });
  it('keeps ignored root policy visible as a legacy warning and forbids its adoption', () => {
    const input = { error_policy: { on_error: 'stop' }, scenarios: [{ steps: [{ get: '/' }] }] };
    const tree = parseYAMLToTree(dump(input))!;
    expect(collectUnknownFieldPaths(tree)).toContain('error_policy');
    expect(roundtrip(input).error_policy).toEqual(input.error_policy);
    const adopted = parseYAMLToTree(dump({ ...input, component_configuration_version: 1 }))!;
    expect(inspectComponentConfiguration({ ...input, component_configuration_version: 1 }).errors[0].path).toBe(
      'error_policy',
    );
    expect(effectiveComponentValues(adopted, find(adopted, 'get'), 'http')).not.toHaveProperty('error_policy');
  });
  it('adds structural scope errors to normal editor validation', () => {
    const tree = parseYAMLToTree(dump({ component_configuration_version: 2, scenarios: [] }))!;
    expect(validateYAMLSemantics(tree)[0].message).toContain('Only integer version 1');
  });
});

describe('RLP-689 capabilities before dispatch', () => {
  it('requires HTTP capability for marker-only adoption and keeps legacy runs available', () => {
    expect(componentCapabilityError('component_configuration_version: 1')).toContain('does not support component');
    expect(componentCapabilityError('component_configuration_version: 1', { version: 1, features: [] })).toContain(
      'http_defaults',
    );
    expect(componentCapabilityError('test: {name: legacy}')).toBeNull();
    expect(componentCapabilityError(dump(script()), capabilities)).toBeNull();
  });
  it('requires every authored feature, including disabled declarations and SQL locals', () => {
    const input = {
      component_configuration_version: 1,
      defaults: {
        data_source: { enabled: false },
        think_time: { enabled: false },
        http: { assertions: [], cookies: false, cache: false },
        sql: { error_policy: { on_error: 'continue' } },
      },
      scenarios: [{ steps: [{ sql: { kind: 'query', query: 'SELECT 1', assertions: [] } }] }],
    };
    expect(inspectComponentConfiguration(input).required).toEqual([...COMPONENT_FEATURES].sort());
    for (const feature of COMPONENT_FEATURES)
      expect(
        componentCapabilityError(dump(input), {
          version: 1,
          features: COMPONENT_FEATURES.filter(item => item !== feature),
        }),
      ).toContain(feature);
  });
  it('normalizes advertised features without accepting an unsupported version', () => {
    expect(parseComponentCapabilities({ version: 1, features: ['http_defaults', 'future_feature'] })).toEqual({
      version: 1,
      features: ['http_defaults'],
    });
    expect(parseComponentCapabilities({ version: 2, features: ['http_defaults'] })).toBeUndefined();
  });
  it('blocks unsupported Run and Debug before a request is sent', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(startLoadRun(dump(script()))).rejects.toThrow('does not support component');
    await expect(startDebugRun(dump(script()))).rejects.toThrow('does not support component');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('checks disabled authored features in a partial backend', () => {
    const input = {
      component_configuration_version: 1,
      scenarios: [{ steps: [{ group: { enabled: false, defaults: { data_source: { enabled: false } } } }] }],
    };
    expect(componentCapabilityError(dump(input), { version: 1, features: ['http_defaults'] })).toContain(
      'scoped_data_source',
    );
  });
});
