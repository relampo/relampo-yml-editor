import type { AuthConfig } from '../types/yaml';

export function isPlainObject(value: any): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseGroupFromTemplate(template: any): number | undefined {
  if (typeof template !== 'string') return undefined;
  const match = template.match(/\$(\d+)\$/);
  if (!match) return undefined;
  const num = parseInt(match[1], 10);
  return Number.isFinite(num) ? num : undefined;
}

export function normalizeAssertionForEditor(assertion: any): any {
  const next = { ...(assertion || {}) };
  delete next.__allowTypeSelection;
  if (next.type === 'jsonpath') next.type = 'json';
  if (!next.type && typeof next.name === 'string' && next.name.trim() !== '') next.type = next.name.trim();
  if (!next.type) next.type = 'status';
  if (next.type && !next.__lockedType) next.__lockedType = next.type;
  return next;
}

export function normalizeAssertionForEngine(assertion: any): any {
  const next = { ...(assertion || {}) };
  if (next.type === 'jsonpath') next.type = 'json';
  if (!next.type && typeof next.name === 'string' && next.name.trim() !== '') next.type = next.name.trim();
  if (!next.type) next.type = 'status';
  delete next.__lockedType;
  delete next.__allowTypeSelection;
  return next;
}

export function normalizeExtractorForEditor(extractor: any): any {
  const next = { ...(extractor || {}) };
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

  if ((next.group === undefined || next.group === null || next.group === '') && next.template) {
    const parsedGroup = parseGroupFromTemplate(next.template);
    if (parsedGroup !== undefined) next.group = parsedGroup;
  }
  if (next.group === undefined || next.group === null || next.group === '') {
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

export function normalizeExtractorForEngine(extractor: any): any {
  const next = { ...(extractor || {}) };
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

export function buildSQLStepName(sql: any): string {
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

export function inferSQLKind(sql: any): 'query' | 'exec' {
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

export function normalizeSQLForEditor(step: any): any {
  const sql = { ...(step || {}) };
  const connection = isPlainObject(sql.connection) ? { ...sql.connection } : {};
  if (connection.ssl_mode === undefined && connection.sslmode !== undefined) {
    connection.ssl_mode = connection.sslmode;
  }
  delete connection.sslmode;

  const validateConnectivity =
    sql.validate_connectivity !== undefined ? sql.validate_connectivity : sql.validate_connection;
  if (connection.validate_connectivity === undefined && validateConnectivity !== undefined) {
    connection.validate_connectivity = validateConnectivity === true;
  }

  const poolFields = ['max_open_conns', 'max_idle_conns', 'conn_max_lifetime', 'conn_max_idle_time'] as const;
  for (const field of poolFields) {
    if (connection[field] === undefined && sql[field] !== undefined) {
      connection[field] = sql[field];
    }
  }

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

export function normalizeSQLForYaml(step: any): any {
  const sql = { ...(step || {}) };
  const connection = isPlainObject(sql.connection) ? { ...sql.connection } : undefined;

  if (connection) {
    if (connection.ssl_mode === undefined && connection.sslmode !== undefined) {
      connection.ssl_mode = connection.sslmode;
    }
    delete connection.sslmode;

    if (connection.validate_connectivity === undefined) {
      if (sql.validate_connectivity !== undefined) {
        connection.validate_connectivity = sql.validate_connectivity;
      } else if (sql.validate_connection !== undefined) {
        connection.validate_connectivity = sql.validate_connection;
      }
    }

    const poolFields = ['max_open_conns', 'max_idle_conns', 'conn_max_lifetime', 'conn_max_idle_time'] as const;
    for (const field of poolFields) {
      if (connection[field] === undefined && sql[field] !== undefined) {
        connection[field] = sql[field];
      }
    }
    Object.keys(connection).forEach(key => {
      const value = connection[key];
      if (value === '' || value === undefined || value === null) {
        delete connection[key];
      } else if (isPlainObject(value) && Object.keys(value).length === 0) {
        delete connection[key];
      }
    });
  }

  const normalized: Record<string, any> = {
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

export function normalizeRequestForEditor(request: any): any {
  const req = { ...(request || {}) };

  const normalizeOverride = (value: any): 'inherit' | 'enabled' | 'disabled' => {
    if (value === 'enabled' || value === 'disabled' || value === 'inherit') return value;
    return 'inherit';
  };

  const normalizeThroughput = (value: any) => {
    if (!value || typeof value !== 'object') return { enabled: false };
    const enabled = value.enabled === true;
    return enabled
      ? { enabled: true, target_rps: Number(value.target_rps) > 0 ? Number(value.target_rps) : 1 }
      : { enabled: false };
  };

  return {
    ...req,
    timeout: typeof req.timeout === 'string' && req.timeout.trim() !== '30s' ? req.timeout : '',
    cookie_override: normalizeOverride(req.cookie_override),
    cache_override: normalizeOverride(req.cache_override),
    throughput: normalizeThroughput(req.throughput),
    retrieve_embedded_resources: req.retrieve_embedded_resources === true,
    redirect_automatically: req.redirect_automatically === true,
    follow_redirects: req.follow_redirects !== false,
  };
}

export function normalizeAuthForEditor(auth: any): AuthConfig | undefined {
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) return undefined;

  const type = typeof auth.type === 'string' ? auth.type.trim().toLowerCase() : '';
  if (type !== 'bearer' && type !== 'api_key' && type !== 'basic') return undefined;

  const normalized: AuthConfig = { type: type as AuthConfig['type'] };

  if (typeof auth.token === 'string') normalized.token = auth.token;
  if (typeof auth.name === 'string') normalized.name = auth.name;
  if (typeof auth.value === 'string') normalized.value = auth.value;
  if (typeof auth.username === 'string') normalized.username = auth.username;
  if (typeof auth.password === 'string') normalized.password = auth.password;
  if (typeof auth.in === 'string') {
    const location = auth.in.trim().toLowerCase();
    if (location === 'header' || location === 'query') {
      normalized.in = location as AuthConfig['in'];
    }
  }

  return normalized;
}

export function normalizeAuthForYaml(auth: any): AuthConfig | undefined {
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
