import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

const sqlE2EScenarioYAML = readFileSync(
  new URL('../../../relampo-backend/examples/sql-e2e-scenario.yaml', import.meta.url),
  'utf8'
);

// ─── parseYAMLToTree ───────────────────────────────────────────────────────

describe('parseYAMLToTree', () => {
  it('returns null for empty string', () => {
    expect(parseYAMLToTree('')).toBeNull();
    expect(parseYAMLToTree('   ')).toBeNull();
  });

  it('throws on invalid YAML', () => {
    expect(() => parseYAMLToTree('{')).toThrow();
  });

  it('parses test metadata', () => {
    const yaml = `
test:
  name: My Test
  description: Hello
  version: "1.0"
`;
    const tree = parseYAMLToTree(yaml)!;
    expect(tree.type).toBe('test');
    expect(tree.name).toBe('My Test');
    expect(tree.data.description).toBe('Hello');
  });

  it('uses default name when test.name is absent', () => {
    const tree = parseYAMLToTree('test:\n  description: x')!;
    expect(tree.name).toBe('Relampo Test');
  });

  it('parses variables node', () => {
    const yaml = `
test:
  name: t
variables:
  BASE_URL: https://example.com
  TOKEN: abc
`;
    const tree = parseYAMLToTree(yaml)!;
    const vars = tree.children!.find((c) => c.type === 'variables');
    expect(vars).toBeDefined();
    expect(vars!.data.BASE_URL).toBe('https://example.com');
  });

  it('parses http_defaults with bearer auth', () => {
    const yaml = `
test:
  name: t
http_defaults:
  base_url: https://api.example.com
  auth:
    type: bearer
    token: my-token
`;
    const tree = parseYAMLToTree(yaml)!;
    const defaults = tree.children!.find((c) => c.type === 'http_defaults');
    expect(defaults).toBeDefined();
    expect(defaults!.data.base_url).toBe('https://api.example.com');
    expect(defaults!.data.auth?.type).toBe('bearer');
    expect(defaults!.data.auth?.token).toBe('my-token');
  });

  it('ignores unknown auth type in http_defaults', () => {
    const yaml = `
test:
  name: t
http_defaults:
  auth:
    type: oauth2
    token: x
`;
    const tree = parseYAMLToTree(yaml)!;
    const defaults = tree.children!.find((c) => c.type === 'http_defaults');
    expect(defaults!.data.auth).toBeUndefined();
  });

  it('parses scenarios and steps', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: Smoke
    steps:
      - get: https://example.com/api
`;
    const tree = parseYAMLToTree(yaml)!;
    const scenariosNode = tree.children!.find((c) => c.type === 'scenarios');
    expect(scenariosNode).toBeDefined();
    const scenario = scenariosNode!.children![0];
    expect(scenario.type).toBe('scenario');
    expect(scenario.name).toBe('Smoke');

    const stepsNode = scenario.children!.find((c) => c.type === 'steps');
    expect(stepsNode).toBeDefined();
    const step = stepsNode!.children![0];
    expect(step.type).toBe('get');
    expect(step.data.url).toBe('https://example.com/api');
  });

  it('parses request (long form)', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - request:
          method: POST
          url: https://example.com/login
          body:
            user: admin
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree
      .children!.find((c) => c.type === 'scenarios')!
      .children![0]
      .children!.find((c) => c.type === 'steps')!
      .children![0];
    expect(step.type).toBe('request');
    expect(step.data.url).toBe('https://example.com/login');
    expect(step.data.method).toBe('POST');
  });


  it('parses sql steps', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - sql:
          dialect: postgres
          kind: query
          connection:
            host: "{{db_host}}"
            port: 5432
            database: app
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 6
          query: |
            SELECT id
            FROM users
            WHERE status = $1
          params:
            - active
          allow_writes: false
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree
      .children!.find((c) => c.type === 'scenarios')!
      .children![0]
      .children!.find((c) => c.type === 'steps')!
      .children![0];
    expect(step.type).toBe('sql');
    expect(step.data.dialect).toBe('postgres');
    expect(step.data.kind).toBe('query');
    expect(step.data.connection.database).toBe('app');
    expect(step.data.connection.ssl_mode).toBe('disable');
    expect(step.data.connection.validate_connectivity).toBe(true);
    expect(step.data.connection.max_open_conns).toBe(6);
    expect(step.data.params).toEqual(['active']);
  });

  it('parses the backend sql e2e example with both dialects and extractor-rich query steps', () => {
    const tree = parseYAMLToTree(sqlE2EScenarioYAML)!;
    const scenariosNode = tree.children!.find((c) => c.type === 'scenarios');

    expect(tree.name).toBe('SQL Database Operations E2E Test');
    expect(tree.children!.find((c) => c.type === 'variables')?.data.db_host).toBe('localhost');
    expect(scenariosNode?.children).toHaveLength(2);

    const scenarios = scenariosNode!.children!;
    const allSqlSteps = scenarios.flatMap((scenario) =>
      scenario.children!
        .find((c) => c.type === 'steps')!
        .children!
        .filter((c) => c.type === 'sql')
    );

    expect(allSqlSteps).toHaveLength(7);

    const postgresCreate = allSqlSteps[0];
    const postgresLookup = allSqlSteps[2];
    const mysqlCreate = allSqlSteps[3];
    const mysqlCount = allSqlSteps[6];

    expect(postgresCreate.data.kind).toBe('exec');
    expect(postgresCreate.data.allow_writes).toBe(true);
    expect(postgresCreate.data.connection.validate_connectivity).toBe(true);
    expect(postgresCreate.data.connection.max_open_conns).toBe(5);
    expect(postgresCreate.data.on_error).toBe('continue');

    expect(postgresLookup.data.kind).toBe('query');
    expect(postgresLookup.data.params).toEqual(['{{test_email}}']);
    expect(postgresLookup.data.extract).toEqual({
      user_id: "jsonpath('$[0].id')",
      found_email: "jsonpath('$[0].email')",
    });

    expect(mysqlCreate.data.dialect).toBe('mysql');
    expect(mysqlCreate.data.connection.port).toBe('{{mysql_port}}');
    expect(mysqlCreate.data.connection.validate_connectivity).toBe(true);
    expect(mysqlCount.data.extract).toEqual({
      user_count: "jsonpath('$[0].count')",
    });
  });

  it('parses scenario load node', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    load:
      type: constant
      users: 10
      duration: 1m
    steps: []
`;
    const tree = parseYAMLToTree(yaml)!;
    const scenario = tree.children!.find((c) => c.type === 'scenarios')!.children![0];
    const load = scenario.children!.find((c) => c.type === 'load');
    expect(load).toBeDefined();
    expect(load!.data.users).toBe(10);
  });

  it('parses data_source node', () => {
    const yaml = `
test:
  name: t
data_source:
  file: users.csv
  type: csv
`;
    const tree = parseYAMLToTree(yaml)!;
    const ds = tree.children!.find((c) => c.type === 'data_source');
    expect(ds).toBeDefined();
    expect(ds!.data.file).toBe('users.csv');
  });

  it('parses metrics node', () => {
    const yaml = `
test:
  name: t
metrics:
  enabled: true
  percentiles: [50, 95, 99]
`;
    const tree = parseYAMLToTree(yaml)!;
    const metrics = tree.children!.find((c) => c.type === 'metrics');
    expect(metrics).toBeDefined();
    expect(metrics!.data.enabled).toBe(true);
    expect(metrics!.data.percentiles).toEqual([50, 95, 99]);
  });
});

// ─── treeToYAML ───────────────────────────────────────────────────────────

describe('treeToYAML', () => {
  it('serializes a tree with scenarios to valid, re-parseable YAML', () => {
    const yaml = `
test:
  name: My Test
scenarios:
  - name: s
    steps:
      - get: https://example.com
`;
    const tree = parseYAMLToTree(yaml)!;
    const output = treeToYAML(tree);
    expect(() => parseYAMLToTree(output)).not.toThrow();
    expect(output).toContain('https://example.com');
    expect(output).toContain('scenarios');
  });

  it('round-trips variables', () => {
    const input = `
test:
  name: t
variables:
  KEY: value123
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    expect(output).toContain('KEY: value123');
  });

  it('round-trips a GET step', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - get: https://example.com
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    expect(output).toContain('https://example.com');
    expect(output).toContain('scenarios');
  });

  it('round-trips http_defaults with api_key auth', () => {
    const input = `
test:
  name: t
http_defaults:
  base_url: https://api.example.com
  auth:
    type: api_key
    name: X-API-Key
    value: secret
    in: header
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const defaults = reparsed.children!.find((c) => c.type === 'http_defaults');
    expect(defaults!.data.auth?.type).toBe('api_key');
    expect(defaults!.data.auth?.name).toBe('X-API-Key');
  });

  it('round-trips basic auth', () => {
    const input = `
test:
  name: t
http_defaults:
  auth:
    type: basic
    username: admin
    password: pass
`;
    const tree = parseYAMLToTree(input)!;
    const reparsed = parseYAMLToTree(treeToYAML(tree))!;
    const defaults = reparsed.children!.find((c) => c.type === 'http_defaults');
    expect(defaults!.data.auth?.type).toBe('basic');
    expect(defaults!.data.auth?.username).toBe('admin');
  });

  it('preserves scenario name through round-trip', () => {
    const input = `
test:
  name: t
scenarios:
  - name: Login Flow
    steps:
      - post: https://example.com/login
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    expect(output).toContain('Login Flow');
  });


  it('round-trips sql steps', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - sql:
          dialect: mysql
          kind: query
          connection:
            host: db.internal
            port: 3306
            database: analytics
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: require
            validate_connectivity: true
            max_open_conns: 4
          query: SELECT count(*) FROM runs WHERE status = ?
          params:
            - success
          allow_writes: false
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const step = reparsed
      .children!.find((c) => c.type === 'scenarios')!
      .children![0]
      .children!.find((c) => c.type === 'steps')!
      .children![0];
    expect(output).toContain('sql:');
    expect(output).toContain('kind: query');
    expect(output).toContain('allow_writes: false');
    expect(output).toContain('ssl_mode: require');
    expect(step.type).toBe('sql');
    expect(step.data.dialect).toBe('mysql');
    expect(step.data.kind).toBe('query');
    expect(step.data.connection.max_open_conns).toBe(4);
    expect(step.data.params).toEqual(['success']);
  });

  it('normalizes legacy sql aliases to spec field names on round-trip', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - sql:
          dialect: postgres
          connection:
            host: db.internal
            sslmode: disable
          query: UPDATE users SET active = false WHERE id = $1
          params:
            - 42
          validate_connection: true
          allow_write: true
          max_open_conns: 3
`;
    const output = treeToYAML(parseYAMLToTree(input)!);
    expect(output).toContain('kind: exec');
    expect(output).toContain('allow_writes: true');
    expect(output).toContain('validate_connectivity: true');
    expect(output).toContain('ssl_mode: disable');
    expect(output).toContain('max_open_conns: 3');
    expect(output).not.toContain('allow_write:');
    expect(output).not.toContain('validate_connection:');
    expect(output).not.toContain('sslmode:');
  });

  it('round-trips the backend sql e2e example without losing canonical sql fields', () => {
    const output = treeToYAML(parseYAMLToTree(sqlE2EScenarioYAML)!);
    const reparsed = parseYAMLToTree(output)!;
    const scenarios = reparsed.children!.find((c) => c.type === 'scenarios')!.children!;

    expect(output).toContain('allow_writes: true');
    expect(output).toContain('validate_connectivity: true');
    expect(output).toContain('ssl_mode: disable');
    expect(output).toContain("user_count: jsonpath('$[0].count')");
    expect(output).not.toContain('allow_write:');
    expect(output).not.toContain('validate_connection:');
    expect(output).not.toContain('sslmode:');

    const sqlSteps = scenarios.flatMap((scenario) =>
      scenario.children!
        .find((c) => c.type === 'steps')!
        .children!
        .filter((c) => c.type === 'sql')
    );

    expect(sqlSteps).toHaveLength(7);
    expect(sqlSteps.filter((step) => step.data.kind === 'exec')).toHaveLength(4);
    expect(sqlSteps.filter((step) => step.data.kind === 'query')).toHaveLength(3);
    expect(sqlSteps.filter((step) => step.data.allow_writes === true)).toHaveLength(4);
  });
});

// ─── parse → serialize → re-parse consistency ────────────────────────────

describe('parse/serialize consistency', () => {
  const fullyFeaturedYAML = `
test:
  name: Full Test
  description: Integration test
  version: "2.0"
variables:
  HOST: https://api.example.com
  TOKEN: my-secret
http_defaults:
  base_url: https://api.example.com
  auth:
    type: bearer
    token: my-secret
scenarios:
  - name: Scenario A
    load:
      type: ramp
      start_users: 1
      end_users: 10
      ramp_up: 30s
      duration: 2m
    steps:
      - get: https://api.example.com/health
      - request:
          method: POST
          url: https://api.example.com/login
          body:
            username: user
            password: pass
metrics:
  enabled: true
  percentiles: [50, 95, 99]
`;

  it('preserves key fields after double round-trip', () => {
    const tree1 = parseYAMLToTree(fullyFeaturedYAML)!;

    // Test.name is preserved in the first-generation parsed tree
    expect(tree1.name).toBe('Full Test');

    const yaml1 = treeToYAML(tree1);
    const tree2 = parseYAMLToTree(yaml1)!;
    const yaml2 = treeToYAML(tree2);

    // Variables survive the round-trip
    const vars = tree2.children!.find((c) => c.type === 'variables');
    expect(vars!.data.HOST).toBe('https://api.example.com');

    // Scenarios survive the round-trip
    const scenarios = tree2.children!.find((c) => c.type === 'scenarios');
    expect(scenarios!.children![0].name).toBe('Scenario A');

    // YAML output is stable (no runaway growth)
    expect(yaml2.length).toBeLessThan(yaml1.length * 1.5);
  });

  it('all node ids are unique within a parsed tree', () => {
    const tree = parseYAMLToTree(fullyFeaturedYAML)!;
    const ids: string[] = [];
    const collect = (node: typeof tree) => {
      ids.push(node.id);
      node.children?.forEach(collect);
    };
    collect(tree);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── Extractor normalization ──────────────────────────────────────────────

describe('extractor normalization (via request step)', () => {
  // Pulse format uses `extractors:` (array) → produces children of type 'extractor'
  it('normalizes regex extractor with match_no=0 → capture_mode=all', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - request:
          method: GET
          url: https://example.com
          extractors:
            - type: regex
              var: token
              pattern: "token=(\\\\w+)"
              match_no: 0
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree
      .children!.find((c) => c.type === 'scenarios')!
      .children![0]
      .children!.find((c) => c.type === 'steps')!
      .children![0];

    const extractor = step.children?.find((c) => c.type === 'extractor');
    expect(extractor?.data?.capture_mode).toBe('all');
  });

  it('normalizes regex extractor with match_no=-1 → capture_mode=random', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - request:
          method: GET
          url: https://example.com
          extractors:
            - type: regex
              var: token
              pattern: "x=(\\\\w+)"
              match_no: -1
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree
      .children!.find((c) => c.type === 'scenarios')!
      .children![0]
      .children!.find((c) => c.type === 'steps')!
      .children![0];
    const extractor = step.children?.find((c) => c.type === 'extractor');
    expect(extractor?.data?.capture_mode).toBe('random');
  });
});
