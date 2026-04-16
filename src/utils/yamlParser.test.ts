import { describe, it, expect } from 'vitest';
import { parseYAMLToTree, treeToYAML } from './yamlParser';

const sqlE2EScenarioYAML = `
test:
  name: SQL Database Operations E2E Test
variables:
  db_host: localhost
  db_user: app_user
  db_password: secret
  mysql_port: "3306"
  test_email: qa@example.com
scenarios:
  - name: Postgres Flow
    steps:
      - sql:
          dialect: postgres
          kind: exec
          connection:
            host: "{{db_host}}"
            port: 5432
            database: app
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 5
          query: CREATE TABLE IF NOT EXISTS users(id serial primary key, email text)
          allow_writes: true
          on_error: continue
      - sql:
          dialect: postgres
          kind: exec
          connection:
            host: "{{db_host}}"
            port: 5432
            database: app
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 5
          query: INSERT INTO users(email) VALUES ($1)
          params:
            - "{{test_email}}"
          allow_writes: true
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
            max_open_conns: 5
          query: SELECT id, email FROM users WHERE email = $1
          params:
            - "{{test_email}}"
          extract:
            user_id: "jsonpath('$[0].id')"
            found_email: "jsonpath('$[0].email')"
  - name: MySQL Flow
    steps:
      - sql:
          dialect: mysql
          kind: exec
          connection:
            host: "{{db_host}}"
            port: "{{mysql_port}}"
            database: analytics
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 4
          query: CREATE TABLE IF NOT EXISTS runs(id int primary key auto_increment, status varchar(32))
          allow_writes: true
      - sql:
          dialect: mysql
          kind: exec
          connection:
            host: "{{db_host}}"
            port: "{{mysql_port}}"
            database: analytics
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 4
          query: INSERT INTO runs(status) VALUES (?)
          params:
            - success
          allow_writes: true
      - sql:
          dialect: mysql
          kind: query
          connection:
            host: "{{db_host}}"
            port: "{{mysql_port}}"
            database: analytics
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 4
          query: SELECT id, status FROM runs WHERE status = ?
          params:
            - success
          extract:
            run_id: "jsonpath('$[0].id')"
      - sql:
          dialect: mysql
          kind: query
          connection:
            host: "{{db_host}}"
            port: "{{mysql_port}}"
            database: analytics
            user: "{{db_user}}"
            password: "{{db_password}}"
            ssl_mode: disable
            validate_connectivity: true
            max_open_conns: 4
          query: SELECT count(*) AS count FROM runs
          extract:
            user_count: "jsonpath('$[0].count')"
`;

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
    const vars = tree.children!.find(c => c.type === 'variables');
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
    const defaults = tree.children!.find(c => c.type === 'http_defaults');
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
    const defaults = tree.children!.find(c => c.type === 'http_defaults');
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
    const scenariosNode = tree.children!.find(c => c.type === 'scenarios');
    expect(scenariosNode).toBeDefined();
    const scenario = scenariosNode!.children![0];
    expect(scenario.type).toBe('scenario');
    expect(scenario.name).toBe('Smoke');

    const stepsNode = scenario.children!.find(c => c.type === 'steps');
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
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];
    expect(step.type).toBe('request');
    expect(step.data.url).toBe('https://example.com/login');
    expect(step.data.method).toBe('POST');
  });

  it('parses one_time controllers with nested steps', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: bootstrap
    steps:
      - one_time:
          name: Shared bootstrap
          description: Prepare shared runtime state
        steps:
          - post: https://example.com/bootstrap
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];

    expect(step.type).toBe('one_time');
    expect(step.name).toBe('Shared bootstrap');
    expect(step.data.description).toBe('Prepare shared runtime state');
    expect(step.children?.[0].type).toBe('post');
  });

  it('preserves enabled state for disabled one_time controllers', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: bootstrap
    steps:
      - one_time:
          name: Shared bootstrap
        enabled: false
        steps:
          - post: https://example.com/bootstrap
`;
    const tree = parseYAMLToTree(yaml)!;
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];

    expect(step.type).toBe('one_time');
    expect(step.data.enabled).toBe(false);
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
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
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

  it('parses balanced controllers with per-child percentages', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Traffic Mix
          type: total
          mode: iteraciones
        steps:
          - get: https://example.com/a
            percentage: 60
          - transaction:
              name: Checkout
              steps:
                - post: https://example.com/checkout
            percentage: 40
`;
    const tree = parseYAMLToTree(yaml)!;
    const balanced = tree.children!
      .find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(balanced.type).toBe('balanced');
    expect(balanced.data.mode).toBe('iteraciones');
    expect(balanced.children).toHaveLength(2);
    expect(balanced.children?.[0].data.__balancedPercentage).toBe(60);
    expect(balanced.children?.[1].type).toBe('transaction');
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(40);
  });

  it('parses partial balanced controllers without forcing total 100', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Partial Mix
          type: parcial
          mode: usuarios_virtuales
        steps:
          - get: https://example.com/a
            percentage: 20
          - get: https://example.com/b
            percentage: 10
`;
    const tree = parseYAMLToTree(yaml)!;
    const balanced = tree.children!
      .find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(balanced.type).toBe('balanced');
    expect(balanced.data.type).toBe('parcial');
    expect(balanced.data.mode).toBe('usuarios_virtuales');
    expect(balanced.children?.[0].data.__balancedPercentage).toBe(20);
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(10);
  });

  it('preserves disabled balanced controllers during parsing', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Disabled Mix
          type: total
        enabled: false
        steps:
          - get: https://example.com/a
            percentage: 100
`;
    const tree = parseYAMLToTree(yaml)!;
    const balanced = tree.children!
      .find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(balanced.type).toBe('balanced');
    expect(balanced.data.enabled).toBe(false);
  });

  it('parses the backend sql e2e example with both dialects and extractor-rich query steps', () => {
    const tree = parseYAMLToTree(sqlE2EScenarioYAML)!;
    const scenariosNode = tree.children!.find(c => c.type === 'scenarios');

    expect(tree.name).toBe('SQL Database Operations E2E Test');
    expect(tree.children!.find(c => c.type === 'variables')?.data.db_host).toBe('localhost');
    expect(scenariosNode?.children).toHaveLength(2);

    const scenarios = scenariosNode!.children!;
    const allSqlSteps = scenarios.flatMap(scenario =>
      scenario.children!.find(c => c.type === 'steps')!.children!.filter(c => c.type === 'sql'),
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
    const scenario = tree.children!.find(c => c.type === 'scenarios')!.children![0];
    const load = scenario.children!.find(c => c.type === 'load');
    expect(load).toBeDefined();
    expect(load!.data.users).toBe(10);
  });

  it('normalizes intent load nodes to the backend contract shape', () => {
    const yaml = `
test:
  name: t
scenarios:
  - name: s
    load:
      type: intent
      target_unit: rps
      target_rps: 25
      duration: 3s
      warmup: 400ms
    steps: []
`;
    const tree = parseYAMLToTree(yaml)!;
    const scenario = tree.children!.find(c => c.type === 'scenarios')!.children![0];
    const load = scenario.children!.find(c => c.type === 'load');
    expect(load).toBeDefined();
    expect(load!.data.target_value).toBe(25);
    expect(load!.data.window).toBe('2s');
    expect(load!.data.p95_max_ms).toBe('800');
    expect(load!.data.error_rate_max_pct).toBe('1');
    expect(load!.data.target_rps).toBeUndefined();
    expect(load!.data.iterations).toBeUndefined();
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
    const ds = tree.children!.find(c => c.type === 'data_source');
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
    const metrics = tree.children!.find(c => c.type === 'metrics');
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
    const defaults = reparsed.children!.find(c => c.type === 'http_defaults');
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
    const defaults = reparsed.children!.find(c => c.type === 'http_defaults');
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

  it('upgrades legacy intent YAML to the backend-ready intent contract on save', () => {
    const input = `
test:
  name: t
scenarios:
  - name: intent
    load:
      type: intent
      target_unit: rps
      target_rps: 25
      duration: 3s
      warmup: 400ms
      iterations: 1
    steps: []
`;
    const output = treeToYAML(parseYAMLToTree(input)!);
    const reparsed = parseYAMLToTree(output)!;
    const load = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'load');

    expect(output).toContain('type: intent');
    expect(output).toContain('target_value: 25');
    expect(output).toContain('window: 2s');
    expect(output).not.toContain('target_rps:');
    expect(output).not.toContain('iterations:');
    expect(load!.data.target_value).toBe(25);
    expect(load!.data.window).toBe('2s');
    expect(load!.data.p95_max_ms).toBe('800');
  });

  it('preserves invalid intent target_unit values for validation on round-trip', () => {
    const input = `
test:
  name: t
scenarios:
  - name: invalid-intent
    load:
      type: intent
      target_unit: rpm
      target_value: 10
      min_vus: 1
      max_vus: 5
      window: 1s
      p95_max_ms: 100
    steps: []
`;
    const tree = parseYAMLToTree(input)!;
    const load = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'load');
    expect(load!.data.target_unit).toBe('rpm');

    const output = treeToYAML(tree);
    expect(output).toContain('target_unit: rpm');
  });

  it('does not restore cleared optional intent bounds on save', () => {
    const input = `
test:
  name: t
scenarios:
  - name: intent
    load:
      type: intent
      target_unit: rps
      target_value: 10
      min_vus: 1
      max_vus: 5
      window: 1s
      error_rate_max_pct: 2
    steps: []
`;
    const tree = parseYAMLToTree(input)!;
    const load = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'load')!;
    load.data.p95_max_ms = '';

    const output = treeToYAML(tree);
    expect(output).toContain('error_rate_max_pct: 2');
    expect(output).not.toContain('p95_max_ms');
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
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];
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


  it('round-trips balanced controllers', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Traffic Mix
          type: total
          mode: usuarios_virtuales
        steps:
          - get: https://example.com/a
            percentage: 55
          - request:
              method: POST
              url: https://example.com/b
            percentage: 45
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const balanced = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).toContain('balanced:');
    expect(output).toContain('mode: usuarios_virtuales');
    expect(output).toContain('percentage: 55');
    expect(output).toContain('percentage: 45');
    expect(balanced.type).toBe('balanced');
    expect(balanced.children?.[0].data.__balancedPercentage).toBe(55);
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(45);
  });

  it('serializes draft total balanced controllers without throwing while percentages are incomplete', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Traffic Mix
          type: total
          mode: iteraciones
        steps:
          - get: https://example.com/a
            percentage: 70
          - get: https://example.com/b
            percentage: 20
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    expect(output).toContain('type: total');
    expect(output).toContain('percentage: 70');
    expect(output).toContain('percentage: 20');
  });

  it('serializes empty balanced controllers as editable drafts', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Empty Mix
          type: total
          mode: iteraciones
        steps: []
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    expect(output).toContain('balanced:');
    expect(output).toContain('name: Empty Mix');
    expect(output).toContain('steps: []');
  });

  it('round-trips partial balanced controllers without requiring 100 total', () => {
    const input = `
test:
  name: t
scenarios:
  - name: s
    steps:
      - balanced:
          name: Partial Mix
          type: parcial
          mode: iteraciones
        steps:
          - get: https://example.com/a
            percentage: 20
          - request:
              method: POST
              url: https://example.com/b
            percentage: 35
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const balanced = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).toContain('type: parcial');
    expect(output).toContain('percentage: 20');
    expect(output).toContain('percentage: 35');
    expect(balanced.data.type).toBe('parcial');
    expect(balanced.children?.[0].data.__balancedPercentage).toBe(20);
    expect(balanced.children?.[1].data.__balancedPercentage).toBe(35);
  });

  it('round-trips one_time controllers', () => {
    const input = `
test:
  name: t
scenarios:
  - name: shared init
    steps:
      - one_time:
          name: Shared bootstrap
          description: Prepare common identifiers
        steps:
          - request:
              method: POST
              url: https://example.com/bootstrap
`;
    const tree = parseYAMLToTree(input)!;
    const output = treeToYAML(tree);
    const reparsed = parseYAMLToTree(output)!;
    const step = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(output).toContain('one_time:');
    expect(output).toContain('Shared bootstrap');
    expect(step.type).toBe('one_time');
    expect(step.children?.[0].type).toBe('request');
    expect(step.data.description).toBe('Prepare common identifiers');
  });

  it('round-trips disabled one_time controllers', () => {
    const input = `
test:
  name: t
scenarios:
  - name: shared init
    steps:
      - one_time:
          name: Shared bootstrap
        enabled: false
        steps:
          - request:
              method: POST
              url: https://example.com/bootstrap
`;
    const reparsed = parseYAMLToTree(treeToYAML(parseYAMLToTree(input)!))!;
    const step = reparsed
      .children!.find(c => c.type === 'scenarios')!
      .children![0].children!.find(c => c.type === 'steps')!.children![0];

    expect(step.type).toBe('one_time');
    expect(step.data.enabled).toBe(false);
  });

  it('serializes one_time with current node name even when renamed back to default label', () => {
    const input = `
test:
  name: t
scenarios:
  - name: shared init
    steps:
      - one_time:
          name: Custom bootstrap
        steps:
          - request:
              method: POST
              url: https://example.com/bootstrap
`;
    const tree = parseYAMLToTree(input)!;
    const scenarios = tree.children!.find(c => c.type === 'scenarios')!.children!;
    const step = scenarios[0].children!.find(c => c.type === 'steps')!.children![0];

    step.name = 'One Time Controller';

    const output = treeToYAML(tree);
    expect(output).toContain('name: One Time Controller');
    expect(output).not.toContain('name: Custom bootstrap');
  });

  it('does not embed enabled inside one_time payload when serializing disabled controller', () => {
    const input = `
test:
  name: t
scenarios:
  - name: shared init
    steps:
      - one_time:
          name: Shared bootstrap
        enabled: false
        steps:
          - request:
              method: POST
              url: https://example.com/bootstrap
`;
    const output = treeToYAML(parseYAMLToTree(input)!);

    expect(output).toContain('enabled: false');
    expect(output).toContain('one_time:');
    expect(output).not.toContain('one_time:\n        enabled: false');
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
    const scenarios = reparsed.children!.find(c => c.type === 'scenarios')!.children!;

    expect(output).toContain('allow_writes: true');
    expect(output).toContain('validate_connectivity: true');
    expect(output).toContain('ssl_mode: disable');
    expect(output).toContain("user_count: jsonpath('$[0].count')");
    expect(output).not.toContain('allow_write:');
    expect(output).not.toContain('validate_connection:');
    expect(output).not.toContain('sslmode:');

    const sqlSteps = scenarios.flatMap(scenario =>
      scenario.children!.find(c => c.type === 'steps')!.children!.filter(c => c.type === 'sql'),
    );

    expect(sqlSteps).toHaveLength(7);
    expect(sqlSteps.filter(step => step.data.kind === 'exec')).toHaveLength(4);
    expect(sqlSteps.filter(step => step.data.kind === 'query')).toHaveLength(3);
    expect(sqlSteps.filter(step => step.data.allow_writes === true)).toHaveLength(4);
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
    const vars = tree2.children!.find(c => c.type === 'variables');
    expect(vars!.data.HOST).toBe('https://api.example.com');

    // Scenarios survive the round-trip
    const scenarios = tree2.children!.find(c => c.type === 'scenarios');
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
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];

    const extractor = step.children?.find(c => c.type === 'extractor');
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
    const step = tree.children!.find(c => c.type === 'scenarios')!.children![0].children!.find(c => c.type === 'steps')!
      .children![0];
    const extractor = step.children?.find(c => c.type === 'extractor');
    expect(extractor?.data?.capture_mode).toBe('random');
  });
});
