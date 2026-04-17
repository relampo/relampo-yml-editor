import type { AuthConfig } from '../types/yaml';

type PlainRecord = Record<string, unknown>;
type OverrideState = 'inherit' | 'enabled' | 'disabled';

type AssertionLike = PlainRecord & {
  type?: string;
  name?: string;
  __lockedType?: string;
  __allowTypeSelection?: boolean;
};

type ExtractorLike = PlainRecord & {
  type?: string;
  name?: string;
  var?: string;
  variable?: string;
  from?: string;
  capture_mode?: string;
  capture_index?: string;
  match_no?: number;
  group?: number | string | null;
  template?: string;
  pattern?: string;
  expression?: string;
  __lockedType?: string;
  __allowTypeSelection?: boolean;
};

type SQLConnectionLike = PlainRecord & {
  database?: string;
  ssl_mode?: string;
  sslmode?: string;
  validate_connectivity?: boolean;
  validate_connection?: boolean;
  max_open_conns?: number;
  max_idle_conns?: number;
  conn_max_lifetime?: string;
  conn_max_idle_time?: string;
};

type SQLLike = PlainRecord & {
  name?: string;
  query?: string;
  dialect?: string;
  kind?: string;
  driver?: string;
  timeout?: string;
  allow_writes?: boolean;
  allow_write?: boolean;
  on_error?: string;
  error_policy?: { on_error?: string } | PlainRecord;
  connection?: SQLConnectionLike;
  validate_connectivity?: boolean;
  validate_connection?: boolean;
  params?: unknown[] | PlainRecord | string | number | boolean;
};

type RequestThroughputLike = PlainRecord & {
  enabled?: boolean;
  target_rps?: unknown;
};

type RequestLike = PlainRecord & {
  timeout?: string;
  cookie_override?: OverrideState;
  cache_override?: OverrideState;
  throughput?: RequestThroughputLike;
  retrieve_embedded_resources?: boolean;
  redirect_automatically?: boolean;
  follow_redirects?: boolean;
};

type NormalizedRequestLike = RequestLike & {
  timeout: string;
  cookie_override: OverrideState;
  cache_override: OverrideState;
  throughput: {
    enabled: boolean;
    target_rps?: number;
  };
  retrieve_embedded_resources: boolean;
  redirect_automatically: boolean;
  follow_redirects: boolean;
};

function isPlainObject(value: unknown): value is PlainRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseGroupFromTemplate(template: unknown): number | undefined {
  if (typeof template !== 'string') return undefined;

  const match = template.match(/\$(\d+)\$/);
  if (!match) return undefined;

  const num = parseInt(match[1], 10);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeExtractorGroup(group: unknown): number | undefined {
  if (typeof group === 'number' && Number.isFinite(group) && group >= 1) {
    return Math.floor(group);
  }

  if (typeof group === 'string') {
    const trimmed = group.trim();
    if (trimmed === '') {
      return undefined;
    }

    const parsed = parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeSQLConnection(
  connectionInput: unknown,
  sql: SQLLike,
  options: { preserveEmpty: boolean },
): SQLConnectionLike | undefined {
  const connection: SQLConnectionLike | undefined = isPlainObject(connectionInput)
    ? { ...connectionInput }
    : options.preserveEmpty
      ? {}
      : undefined;
  if (!connection) {
    return undefined;
  }

  if (connection.ssl_mode === undefined && connection.sslmode !== undefined) {
    connection.ssl_mode = connection.sslmode;
  }
  delete connection.sslmode;

  const validateConnectivity =
    sql.validate_connectivity !== undefined ? sql.validate_connectivity : sql.validate_connection;
  if (connection.validate_connectivity === undefined && validateConnectivity !== undefined) {
    connection.validate_connectivity = validateConnectivity === true;
  }

  if (connection.max_open_conns === undefined && typeof sql.max_open_conns === 'number') {
    connection.max_open_conns = sql.max_open_conns;
  }
  if (connection.max_idle_conns === undefined && typeof sql.max_idle_conns === 'number') {
    connection.max_idle_conns = sql.max_idle_conns;
  }
  if (
    connection.conn_max_lifetime === undefined &&
    typeof sql.conn_max_lifetime === 'string' &&
    sql.conn_max_lifetime.trim() !== ''
  ) {
    connection.conn_max_lifetime = sql.conn_max_lifetime;
  }
  if (
    connection.conn_max_idle_time === undefined &&
    typeof sql.conn_max_idle_time === 'string' &&
    sql.conn_max_idle_time.trim() !== ''
  ) {
    connection.conn_max_idle_time = sql.conn_max_idle_time;
  }

  if (options.preserveEmpty) {
    return connection;
  }

  Object.keys(connection).forEach(key => {
    const value = connection[key];
    if (value === '' || value === undefined || value === null) {
      delete connection[key];
    } else if (isPlainObject(value) && Object.keys(value).length === 0) {
      delete connection[key];
    }
  });

  return Object.keys(connection).length > 0 ? connection : undefined;
}

export function normalizeAssertionForEditor(assertion: Partial<AssertionLike> | undefined): AssertionLike {
  const next: AssertionLike = { ...(assertion || {}) };
  delete next.__allowTypeSelection;
  if (next.type === 'jsonpath') next.type = 'json';
  if (!next.type && typeof next.name === 'string' && next.name.trim() !== '') next.type = next.name.trim();
  if (!next.type) next.type = 'status';
  if (next.type && !next.__lockedType) next.__lockedType = next.type;
  return next;
}

export function normalizeAssertionForEngine(assertion: Partial<AssertionLike> | undefined): AssertionLike {
  const next: AssertionLike = { ...(assertion || {}) };
  if (next.type === 'jsonpath') next.type = 'json';
  if (!next.type && typeof next.name === 'string' && next.name.trim() !== '') next.type = next.name.trim();
  if (!next.type) next.type = 'status';
  delete next.__lockedType;
  delete next.__allowTypeSelection;
  return next;
}

export function normalizeExtractorForEditor(extractor: Partial<ExtractorLike> | undefined): ExtractorLike {
  const next: ExtractorLike = { ...(extractor || {}) };
  delete next.__allowTypeSelection;
  if (next.type === 'json') next.type = 'jsonpath';
  if (!next.type) next.type = 'regex';
  if (next.type && !next.__lockedType) next.__lockedType = next.type;
  if (!next.from) next.from = 'body';
  if (next.var === undefined && next.variable !== undefined) next.var = next.variable;
  if (next.variable === undefined && next.var !== undefined) next.variable = next.var;

  if (!next.capture_mode) {
    const matchNo = next.match_no;
    if (matchNo === 0) next.capture_mode = 'all';
    else if (matchNo === -1) next.capture_mode = 'random';
    else if (typeof matchNo === 'number' && matchNo > 1) {
      next.capture_mode = 'index';
      next.capture_index = String(matchNo);
    } else {
      next.capture_mode = 'first';
    }
  }

  const normalizedGroup = normalizeExtractorGroup(next.group);
  if (normalizedGroup !== undefined) {
    next.group = normalizedGroup;
  } else if (next.template) {
    const parsedGroup = parseGroupFromTemplate(next.template);
    if (parsedGroup !== undefined) next.group = parsedGroup;
  }

  if (next.group === undefined || next.group === null) {
    next.group = 1;
  }

  if (next.type === 'regex' && !next.pattern && next.expression) {
    next.pattern = next.expression;
  }
  if ((next.type === 'jsonpath' || next.type === 'xpath') && !next.expression && next.pattern) {
    next.expression = next.pattern;
  }

  return next;
}

export function normalizeExtractorForEngine(extractor: Partial<ExtractorLike> | undefined): ExtractorLike {
  const next: ExtractorLike = { ...(extractor || {}) };
  if (!next.type) next.type = 'regex';
  if (next.var === undefined && next.variable !== undefined) next.var = next.variable;
  if (next.variable === undefined && next.var !== undefined) next.variable = next.var;
  delete next.__lockedType;
  delete next.__allowTypeSelection;

  if (next.type === 'regex') {
    const mode = String(next.capture_mode || '').toLowerCase();
    if (mode === 'all') next.match_no = 0;
    else if (mode === 'random') next.match_no = -1;
    else if (mode === 'index') next.match_no = Math.max(1, parseInt(String(next.capture_index || '1'), 10) || 1);
    else next.match_no = 1;

    const group = Math.max(1, parseInt(String(next.group || '1'), 10) || 1);
    next.template = `$${group}$`;
    if (!next.pattern && next.expression) next.pattern = next.expression;
  } else if (next.type === 'jsonpath' || next.type === 'xpath') {
    if (!next.expression && next.pattern) next.expression = next.pattern;
  }

  return next;
}

export function buildSQLStepName(sql: SQLLike): string {
  const query = typeof sql?.query === 'string' ? sql.query.trim() : '';
  const firstKeyword = query.split(/\s+/).find(Boolean)?.toUpperCase();
  const dialect =
    typeof sql?.dialect === 'string' && sql.dialect.trim() !== '' ? sql.dialect.trim().toUpperCase() : 'SQL';
  const database =
    typeof sql?.connection?.database === 'string' && sql.connection.database.trim() !== ''
      ? ` (${sql.connection.database.trim()})`
      : '';

  if (typeof sql?.name === 'string' && sql.name.trim() !== '') {
    return sql.name.trim();
  }

  if (firstKeyword) {
    return `${dialect}: ${firstKeyword}${database}`;
  }

  return `${dialect}: Query${database}`;
}

function inferSQLKind(sql: SQLLike): 'query' | 'exec' {
  if (typeof sql?.kind === 'string') {
    const normalized = sql.kind.trim().toLowerCase();
    if (normalized === 'query' || normalized === 'exec') {
      return normalized as 'query' | 'exec';
    }
  }

  if (sql?.allow_writes === true || sql?.allow_write === true) {
    return 'exec';
  }

  const query = typeof sql?.query === 'string' ? sql.query.trim().toUpperCase() : '';
  if (/^(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/.test(query)) {
    return 'query';
  }

  if (query) {
    return 'exec';
  }

  return 'query';
}

export function normalizeSQLForEditor(step: Partial<SQLLike> | undefined): SQLLike {
  const sql: SQLLike = { ...(step || {}) };
  const connection = normalizeSQLConnection(sql.connection, sql, { preserveEmpty: true }) || {};

  return {
    ...sql,
    dialect: typeof sql.dialect === 'string' && sql.dialect.trim() !== '' ? sql.dialect : 'postgres',
    kind: inferSQLKind(sql),
    driver: typeof sql.driver === 'string' ? sql.driver : '',
    query: typeof sql.query === 'string' ? sql.query : '',
    timeout: typeof sql.timeout === 'string' ? sql.timeout : '',
    allow_writes: sql.allow_writes === true || sql.allow_write === true,
    on_error:
      typeof sql.on_error === 'string'
        ? sql.on_error
        : typeof sql.error_policy?.on_error === 'string'
          ? sql.error_policy.on_error
          : 'stop',
    connection,
    params: Array.isArray(sql.params) || isPlainObject(sql.params) ? sql.params : (sql.params ?? []),
  };
}

export function normalizeSQLForYaml(step: Partial<SQLLike> | undefined): SQLLike {
  const sql: SQLLike = { ...(step || {}) };
  const connection = normalizeSQLConnection(sql.connection, sql, { preserveEmpty: false });

  const normalized: SQLLike = {
    ...sql,
    kind: inferSQLKind(sql),
    allow_writes: sql.allow_writes === true || sql.allow_write === true,
    on_error:
      typeof sql.on_error === 'string'
        ? sql.on_error
        : typeof sql.error_policy?.on_error === 'string'
          ? sql.error_policy.on_error
          : undefined,
    connection: connection && Object.keys(connection).length > 0 ? connection : undefined,
  };

  delete normalized.allow_write;
  delete normalized.validate_connection;
  delete normalized.validate_connectivity;
  delete normalized.max_open_conns;
  delete normalized.max_idle_conns;
  delete normalized.conn_max_lifetime;
  delete normalized.conn_max_idle_time;
  delete normalized.error_policy;

  Object.keys(normalized).forEach(key => {
    const value = normalized[key];
    if (value === '' || value === undefined || value === null) {
      delete normalized[key];
      return;
    }
    if (Array.isArray(value) && value.length === 0) {
      delete normalized[key];
      return;
    }
    if (isPlainObject(value) && Object.keys(value).length === 0) {
      delete normalized[key];
    }
  });

  return normalized;
}

export function normalizeRequestForEditor(request: Partial<RequestLike> | undefined): NormalizedRequestLike {
  const normalizeOverride = (value: unknown): OverrideState => {
    if (value === 'enabled' || value === 'disabled' || value === 'inherit') return value;
    return 'inherit';
  };

  const normalizeThroughput = (value: unknown): NormalizedRequestLike['throughput'] => {
    if (!value || typeof value !== 'object') return { enabled: false };
    const next = value as RequestThroughputLike;
    const enabled = next.enabled === true;
    return enabled
      ? {
          enabled: true,
          target_rps: Number(next.target_rps) > 0 ? Number(next.target_rps) : 1,
        }
      : { enabled: false };
  };

  return {
    ...(request || {}),
    timeout: typeof request?.timeout === 'string' && request.timeout.trim() !== '30s' ? request.timeout : '',
    cookie_override: normalizeOverride(request?.cookie_override),
    cache_override: normalizeOverride(request?.cache_override),
    throughput: normalizeThroughput(request?.throughput),
    retrieve_embedded_resources: request?.retrieve_embedded_resources === true,
    redirect_automatically: request?.redirect_automatically === true,
    follow_redirects: request?.follow_redirects !== false,
  };
}

export function normalizeAuthForEditor(auth: unknown): AuthConfig | undefined {
  if (!isPlainObject(auth)) return undefined;

  const type = typeof auth.type === 'string' ? auth.type.trim().toLowerCase() : '';
  if (type !== 'bearer' && type !== 'api_key' && type !== 'basic') return undefined;

  const normalized: AuthConfig = { type };

  if (typeof auth.token === 'string') normalized.token = auth.token;
  if (typeof auth.name === 'string') normalized.name = auth.name;
  if (typeof auth.value === 'string') normalized.value = auth.value;
  if (typeof auth.username === 'string') normalized.username = auth.username;
  if (typeof auth.password === 'string') normalized.password = auth.password;
  if (typeof auth.in === 'string') {
    const location = auth.in.trim().toLowerCase();
    if (location === 'header' || location === 'query') {
      normalized.in = location;
    }
  }

  return normalized;
}

export function normalizeAuthForYaml(auth: unknown): AuthConfig | undefined {
  const normalized = normalizeAuthForEditor(auth);
  if (!normalized?.type) return undefined;

  if (normalized.type === 'bearer') {
    if (!normalized.token) return { type: 'bearer' };
    return { type: 'bearer', token: normalized.token };
  }

  if (normalized.type === 'api_key') {
    return {
      type: 'api_key',
      name: normalized.name || '',
      value: normalized.value || '',
      in: normalized.in || 'header',
    };
  }

  return {
    type: 'basic',
    username: normalized.username || '',
    password: normalized.password || '',
  };
}
