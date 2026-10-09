import { load } from 'js-yaml';
import type { YAMLNode } from '../types/yaml';
import { authoredNodeData } from './yamlAuthoredData';
import { requestNodeToObject, treeToObject } from './yamlTreeSerializer';

export const COMPONENT_FEATURES = [
  'http_defaults',
  'error_policy',
  'scoped_data_source',
  'think_time',
  'http_assertions',
  'sql_assertions',
  'http_state_usage',
] as const;
export type ComponentFeature = (typeof COMPONENT_FEATURES)[number];
export interface ComponentCapabilities {
  version: number;
  features: ComponentFeature[];
}
export interface ConfigurationIssue {
  path: string;
  message: string;
}
export interface EffectiveComponentValue {
  value: unknown;
  origin: string;
  origins?: Record<string, string>;
}
export const STABLE_CONTAINERS = new Set([
  'group',
  'controller',
  'transaction',
  'one_time',
  'parallel',
  'balanced',
  'if',
  'loop',
  'retry',
]);
export const HTTP_COMPONENT_FIELDS = [
  'headers',
  'auth',
  'timeout',
  'follow_redirects',
  'redirect_automatically',
  'retrieve_embedded_resources',
  'error_policy',
  'assertions',
  'cookies',
  'cache',
] as const;
export const SQL_COMPONENT_FIELDS = ['error_policy', 'assertions'] as const;
const COMMON_FIELDS = ['data_source', 'think_time'];
const HTTP_TYPES = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const EXPERIMENTAL = new Set([
  'grpc',
  'websocket',
  'webrtc',
  'webrtc_offer',
  'webrtc_connect',
  'webrtc_send',
  'webrtc_receive',
  'webrtc_wait_state',
]);
const ILLEGAL_PROTOCOL_FIELDS = new Set([
  'base_url',
  'query_params',
  'body',
  'query',
  'params',
  'connection',
  'allow_writes',
  'extract',
  'assert',
  'extractors',
  'spark',
  'retry',
  'steps',
  'cookie_override',
  'cache_override',
  'cache_manager',
  'embedded_resource_types',
  'embedded_resource_blacklist',
  'connection_scope',
  'disable_http2',
  'max_idle_conns',
  'max_idle_conns_per_host',
  'max_conns_per_host',
  'dial_timeout',
  'tls_handshake_timeout',
  'response_header_timeout',
]);
const AUTH_FIELDS = new Set(['type', 'token', 'name', 'value', 'in', 'username', 'password']);
const DATA_FIELDS = new Set([
  'type',
  'file',
  'path',
  'mode',
  'strategy',
  'on_exhausted',
  'variable_names',
  'bind',
  'enabled',
]);
const TIMER_FIELDS = new Set(['duration', 'min', 'max', 'mean', 'std_dev', 'distribution', 'enabled']);
const POLICY_FIELDS = new Set(['on_error', 'on_timeout', 'on_4xx', 'on_5xx', 'enabled']);
const ASSERTION_FIELDS = new Set(['type', 'value', 'name', 'path', 'max_ms', 'size']);
const HTTP_ASSERTION_TYPES = new Set([
  'jsonpath',
  'json',
  'status',
  'contains',
  'body_contains',
  'not_contains',
  'body_not_contains',
  'regex',
  'body_matches',
  'response_time_max',
  'response_time',
  'response_time_ms',
  'response_size',
  'header',
]);
const LEGACY_AUTH_CONTAINERS = new Set(['group', 'controller', 'simple', 'transaction', 'parallel', 'one_time']);
export function configurationRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function formatConfigurationPath(parts: Array<string | number>): string {
  return parts.reduce<string>(
    (path, key) => (typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key),
    '',
  );
}
export function parseComponentCapabilities(value: unknown): ComponentCapabilities | undefined {
  if (!configurationRecord(value) || value.version !== 1 || !Array.isArray(value.features)) return undefined;
  return {
    version: 1,
    features: COMPONENT_FEATURES.filter(feature => value.features instanceof Array && value.features.includes(feature)),
  };
}
// Go duration syntax is used by HTTP timeout and inherited timers.
function durationMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const text = value.startsWith('+') ? value.slice(1) : value;
  if (text === '0') return 0;
  const factors: Record<string, number> = {
    ns: 0.000001,
    us: 0.001,
    µs: 0.001,
    μs: 0.001,
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
  };
  let position = 0,
    total = 0;
  for (const match of text.matchAll(/(\d+(?:\.\d*)?|\.\d+)(ns|us|µs|μs|ms|s|m|h)/g)) {
    if (match.index !== position) return null;
    position += match[0].length;
    total += Number(match[1]) * factors[match[2]];
  }
  return position === text.length && position > 0 && Number.isFinite(total) && total <= 9223372036854.775
    ? total
    : null;
}
function numericCriterion(value: unknown): boolean {
  if (typeof value === 'string' && /\{\{|\$\{/.test(value)) return true;
  return (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
}
function featureFor(protocol: string, field: string): ComponentFeature {
  if (field === 'data_source') return 'scoped_data_source';
  if (field === 'think_time') return 'think_time';
  if (field === 'error_policy') return 'error_policy';
  if (field === 'assertions') return protocol === 'sql' ? 'sql_assertions' : 'http_assertions';
  if (field === 'cookies' || field === 'cache') return 'http_state_usage';
  return 'http_defaults';
}

/** Traverse only modeled configuration and child flows, never bodies, headers or variables. */
export function inspectComponentConfiguration(script: unknown): {
  errors: ConfigurationIssue[];
  warnings: ConfigurationIssue[];
  required: ComponentFeature[];
} {
  const errors: ConfigurationIssue[] = [],
    warnings: ConfigurationIssue[] = [];
  const required = new Set<ComponentFeature>();
  if (!configurationRecord(script)) return { errors, warnings, required: [] };
  const adopted = script.component_configuration_version === 1;
  if (adopted) required.add('http_defaults');
  const error = (path: string, message: string) => errors.push({ path, message: `${path}: ${message}` });
  const unknown = (record: Record<string, unknown>, fields: ReadonlySet<string>, path: string) => {
    for (const key of Object.keys(record))
      if (!fields.has(key))
        warnings.push({ path: `${path}.${key}`, message: 'Unknown field is preserved and ignored.' });
  };
  if ('component_configuration_version' in script && !adopted)
    error('component_configuration_version', 'Only integer version 1 is supported.');

  const knownPlacement = (record: Record<string, unknown>, path: string, allowed: ReadonlySet<string>) => {
    if (!adopted) return;
    for (const field of Object.keys(record))
      if (
        (ILLEGAL_PROTOCOL_FIELDS.has(field) ||
          HTTP_COMPONENT_FIELDS.includes(field as never) ||
          COMMON_FIELDS.includes(field)) &&
        !allowed.has(field)
      )
        error(path ? `${path}.${field}` : field, 'Known configuration is unsupported at this scope.');
  };
  const validateValue = (field: string, value: unknown, path: string, protocol: string) => {
    if (
      ['follow_redirects', 'redirect_automatically', 'retrieve_embedded_resources', 'cookies', 'cache'].includes(
        field,
      ) &&
      typeof value !== 'boolean'
    )
      error(path, 'Expected an explicit boolean.');
    if (field === 'timeout' && !(typeof value === 'string' && (durationMilliseconds(value) ?? 0) > 0))
      error(path, 'Expected a positive literal duration string.');
    if (field === 'headers') {
      if (!configurationRecord(value)) {
        error(path, 'Expected a header map.');
        return;
      }
      const names = new Set<string>();
      for (const [name, header] of Object.entries(value)) {
        const normalized = name.trim().toLowerCase();
        if (!normalized || names.has(normalized)) error(`${path}.${name}`, 'Header names must be unique without case.');
        names.add(normalized);
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || (typeof header === 'string' && /[\r\n]/.test(header)))
          error(`${path}.${name}`, 'Invalid HTTP header name or value.');
        if (typeof header !== 'string')
          error(`${path}.${name}`, 'Expected a string; empty strings remain explicit values.');
      }
    }
    if (field === 'auth') {
      if (!configurationRecord(value)) {
        error(path, 'Expected an auth block.');
        return;
      }
      unknown(value, AUTH_FIELDS, path);
      const type = String(value.type).trim().toLowerCase();
      if (!['none', 'bearer', 'api_key', 'apikey', 'api-key', 'basic'].includes(type))
        error(`${path}.type`, 'Expected none, bearer, api_key or basic.');
      for (const key of AUTH_FIELDS)
        if (key in value && typeof value[key] !== 'string') error(`${path}.${key}`, 'Expected a string.');
      const requiredFields =
        type === 'bearer'
          ? ['token']
          : type === 'basic'
            ? ['username', 'password']
            : ['api_key', 'apikey', 'api-key'].includes(type)
              ? ['name', 'value']
              : [];
      for (const key of requiredFields)
        if (typeof value[key] !== 'string' || !value[key].trim())
          error(`${path}.${key}`, 'Required auth value is missing.');
      if (
        value.in !== undefined &&
        !['', 'header', 'query', 'query_param', 'query-param', 'queryparam'].includes(
          String(value.in).trim().toLowerCase(),
        )
      )
        error(`${path}.in`, 'Expected header or query.');
    }
    if (field === 'data_source') {
      if (!configurationRecord(value)) {
        error(path, 'Expected a datasource block.');
        return;
      }
      unknown(value, DATA_FIELDS, path);
      if (value.enabled !== undefined && typeof value.enabled !== 'boolean')
        error(`${path}.enabled`, 'Expected a boolean.');
      if (
        (value.enabled !== false || value.type !== undefined) &&
        !['csv', 'txt'].includes(String(value.type).trim().toLowerCase())
      )
        error(`${path}.type`, 'Expected csv or txt.');
      for (const key of ['type', 'file', 'path', 'mode', 'strategy', 'on_exhausted'])
        if (key in value && typeof value[key] !== 'string') error(`${path}.${key}`, 'Expected a string.');
      if (
        value.enabled !== false &&
        !(typeof (value.file ?? value.path) === 'string' && String(value.file ?? value.path).trim())
      )
        error(`${path}.file`, 'Expected an input file.');
      const mode = String(value.mode ?? '')
          .trim()
          .toLowerCase(),
        strategy = String(value.strategy ?? '')
          .trim()
          .toLowerCase();
      if (
        mode &&
        !['per_vu', 'shared', 'per_worker', ...(!strategy ? ['sequential', 'random', 'unique'] : [])].includes(mode)
      )
        error(`${path}.mode`, 'Unsupported datasource mode.');
      if (strategy && !['sequential', 'random', 'unique'].includes(strategy))
        error(`${path}.strategy`, 'Unsupported datasource strategy.');
      if (
        value.on_exhausted !== undefined &&
        !['', 'stop', 'recycle'].includes(String(value.on_exhausted).trim().toLowerCase())
      )
        error(`${path}.on_exhausted`, 'Expected stop or recycle.');
      let targets: unknown[] = [];
      if (value.variable_names !== undefined) {
        if (typeof value.variable_names === 'string')
          targets = value.variable_names
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        else if (Array.isArray(value.variable_names)) targets = value.variable_names;
        else error(`${path}.variable_names`, 'Expected a list or comma-separated string.');
      }
      if (value.bind !== undefined) {
        if (!configurationRecord(value.bind)) error(`${path}.bind`, 'Expected a column mapping.');
        else {
          if (targets.length && Object.keys(value.bind).length) error(path, 'variable_names and bind conflict.');
          for (const column of Object.keys(value.bind))
            if (!column.trim()) error(`${path}.bind`, 'Source column cannot be empty.');
          targets = [...targets, ...Object.values(value.bind)];
        }
      }
      if (value.enabled !== false && !targets.length) error(path, 'variable_names or bind is required.');
      const seen = new Set<string>();
      for (const target of targets) {
        const name = typeof target === 'string' ? target.trim() : '';
        if (
          !name ||
          seen.has(name) ||
          ['__vu', '__iter', '__vu_idx', '__vu_total', '__iteration_idx', '__iteration_total'].includes(name) ||
          /^__(?:relampo_|RELAMPO_)/.test(name)
        )
          error(path, 'Datasource target names must be unique and cannot use reserved runtime names.');
        seen.add(name);
      }
    }
    if (field === 'think_time') {
      if (typeof value === 'string') {
        if (durationMilliseconds(value) === null) error(path, 'Expected a literal timer duration.');
        return;
      }
      if (!configurationRecord(value)) {
        error(path, 'Expected a duration or timer block.');
        return;
      }
      unknown(value, TIMER_FIELDS, path);
      if (value.enabled !== undefined && typeof value.enabled !== 'boolean')
        error(`${path}.enabled`, 'Expected a boolean.');
      if (value.enabled === false) return;
      if (!['duration', 'min', 'max', 'mean'].some(key => typeof value[key] === 'string' && value[key] !== ''))
        error(path, 'Timer duration or distribution parameters are required.');
      for (const key of ['duration', 'min', 'max', 'mean', 'std_dev'])
        if (key in value && durationMilliseconds(value[key]) === null)
          error(`${path}.${key}`, 'Expected a literal timer duration.');
      if (
        typeof value.min === 'string' &&
        typeof value.max === 'string' &&
        Number(durationMilliseconds(value.min)) > Number(durationMilliseconds(value.max))
      )
        error(path, 'Timer minimum cannot exceed maximum.');
      if (value.distribution !== undefined && !['', 'uniform', 'normal'].includes(String(value.distribution)))
        error(`${path}.distribution`, 'Expected uniform or normal.');
    }
    if (field === 'error_policy') {
      if (!configurationRecord(value)) {
        error(path, 'Expected an error policy block.');
        return;
      }
      unknown(value, POLICY_FIELDS, path);
      if ('enabled' in value && typeof value.enabled !== 'boolean') error(`${path}.enabled`, 'Expected a boolean.');
      for (const [key, action] of Object.entries(value)) {
        if (protocol === 'sql' && ['on_4xx', 'on_5xx'].includes(key))
          error(`${path}.${key}`, 'HTTP status policy cannot apply to SQL.');
        if (
          POLICY_FIELDS.has(key) &&
          key !== 'enabled' &&
          !['continue', 'stop', ...(protocol === 'sql' ? [] : ['stop_user', 'next_iteration'])].includes(
            String(action).trim().toLowerCase(),
          )
        )
          error(`${path}.${key}`, 'Unsupported error action for this protocol.');
      }
    }
    if (field === 'assertions') {
      if (!Array.isArray(value)) {
        error(path, 'Expected a list; [] disables inherited assertions.');
        return;
      }
      value.forEach((assertion, index) => {
        if (!configurationRecord(assertion)) {
          error(`${path}[${index}]`, 'Expected an assertion block.');
          return;
        }
        unknown(assertion, ASSERTION_FIELDS, `${path}[${index}]`);
        const criterion = String(assertion.type).trim().toLowerCase();
        if (protocol === 'sql' && !['rows_returned', 'rows_affected', 'duration'].includes(criterion))
          error(`${path}[${index}].type`, 'SQL supports rows_returned, rows_affected and duration only.');
        if (protocol === 'sql') {
          if (assertion.value !== undefined) {
            if (configurationRecord(assertion.value)) {
              unknown(assertion.value, new Set(['min', 'max']), `${path}[${index}].value`);
              if (
                (assertion.value.min === undefined && assertion.value.max === undefined) ||
                Object.entries(assertion.value).some(
                  ([key, item]) => ['min', 'max'].includes(key) && !numericCriterion(item),
                )
              )
                error(`${path}[${index}].value`, 'Expected non-negative numeric min/max bounds.');
              if (
                typeof assertion.value.min === 'number' &&
                typeof assertion.value.max === 'number' &&
                assertion.value.min > assertion.value.max
              )
                error(`${path}[${index}].value`, 'Minimum cannot exceed maximum.');
            } else if (!numericCriterion(assertion.value))
              error(`${path}[${index}].value`, 'Expected a non-negative numeric equality value.');
          } else if (criterion !== 'duration' || typeof assertion.max_ms !== 'number')
            error(`${path}[${index}].value`, 'Expected a numeric value or min/max bounds.');
          if (assertion.max_ms !== undefined && typeof assertion.max_ms !== 'number')
            error(`${path}[${index}].max_ms`, 'Duration uses milliseconds as a number.');
        }
        if (protocol === 'http') {
          if (!HTTP_ASSERTION_TYPES.has(criterion))
            error(`${path}[${index}].type`, 'Unsupported HTTP assertion criterion.');
          if (assertion.value == null && assertion.max_ms == null && assertion.size == null)
            error(`${path}[${index}]`, 'Assertion value is required.');
          if (['json', 'jsonpath'].includes(criterion) && !assertion.path)
            error(`${path}[${index}].path`, 'JSON assertion path is required.');
          if (criterion === 'header' && !assertion.name && !assertion.path)
            error(`${path}[${index}].name`, 'Header name is required.');
        }
      });
    }
  };
  const owner = (record: Record<string, unknown>, path: string, allowed: boolean, protocol?: string) => {
    if (path && 'component_configuration_version' in record)
      error(`${path}.component_configuration_version`, 'Adoption belongs at script root.');
    if (!('defaults' in record)) return;
    const defaultsPath = path ? `${path}.defaults` : 'defaults';
    if (!allowed) {
      error(defaultsPath, 'Defaults belong at script, scenario or stable container scope.');
      return;
    }
    if (!adopted) error(defaultsPath, 'New defaults require component_configuration_version: 1.');
    if (!configurationRecord(record.defaults)) {
      error(defaultsPath, 'Expected a defaults block.');
      return;
    }
    const defaults = record.defaults;
    for (const [key, value] of Object.entries(defaults)) {
      if (COMMON_FIELDS.includes(key)) {
        required.add(featureFor('', key));
        validateValue(key, value, `${defaultsPath}.${key}`, '');
        if (key in record) error(`${defaultsPath}.${key}`, `Conflicts with ${path ? path + '.' : ''}${key}.`);
      } else if (key === 'http' || key === 'sql') {
        if (!configurationRecord(value)) {
          error(`${defaultsPath}.${key}`, 'Expected a protocol defaults block.');
          continue;
        }
        const supported = new Set<string>(key === 'http' ? HTTP_COMPONENT_FIELDS : SQL_COMPONENT_FIELDS);
        const legacy = !path ? (configurationRecord(script.http_defaults) ? script.http_defaults : {}) : record;
        for (const [field, setting] of Object.entries(value)) {
          const fieldPath = `${defaultsPath}.${key}.${field}`;
          if (supported.has(field)) {
            required.add(featureFor(key, field));
            validateValue(field, setting, fieldPath, key);
            const legacyKey = field === 'cache' ? 'cache_manager' : field;
            if (field === 'error_policy') {
              const oldPolicy = record.error_policy;
              if (configurationRecord(oldPolicy) && configurationRecord(setting))
                for (const policyKey of POLICY_FIELDS)
                  if (policyKey in oldPolicy && policyKey in setting)
                    error(`${fieldPath}.${policyKey}`, 'Conflicts with the legacy policy key at this scope.');
            } else if (legacyKey in legacy)
              error(fieldPath, `Conflicts with the legacy ${legacyKey} declaration at this scope.`);
          } else if (
            ILLEGAL_PROTOCOL_FIELDS.has(field) ||
            HTTP_COMPONENT_FIELDS.includes(field as never) ||
            COMMON_FIELDS.includes(field)
          )
            error(fieldPath, 'Known property is not supported at this location.');
          else warnings.push({ path: fieldPath, message: 'Unknown field is preserved and ignored.' });
        }
      } else if (ILLEGAL_PROTOCOL_FIELDS.has(key) || HTTP_COMPONENT_FIELDS.includes(key as never))
        error(`${defaultsPath}.${key}`, 'Known protocol property requires its http or sql namespace.');
      else warnings.push({ path: `${defaultsPath}.${key}`, message: 'Unknown field is preserved and ignored.' });
    }
    if (protocol) error(defaultsPath, 'Samplers cannot own defaults.');
  };
  const inheritedSQLAssertions = (record: Record<string, unknown>, previous: unknown): unknown =>
    configurationRecord(record.defaults) &&
    configurationRecord(record.defaults.sql) &&
    'assertions' in record.defaults.sql
      ? record.defaults.sql.assertions
      : previous;
  const walkSteps = (steps: unknown, path: string, inheritedSQL: unknown) => {
    if (!Array.isArray(steps)) return;
    steps.forEach((step, index) => {
      if (!configurationRecord(step)) return;
      const stepPath = `${path}[${index}]`;
      owner(step, stepPath, false);
      for (const [kind, payload] of Object.entries(step)) {
        const payloadPath = `${stepPath}.${kind}`;
        if (STABLE_CONTAINERS.has(kind)) {
          if (configurationRecord(payload)) {
            owner(payload, payloadPath, true);
            if (adopted) {
              for (const field of [
                'headers',
                'timeout',
                'assertions',
                'data_source',
                'think_time',
                'error_policy',
                'follow_redirects',
                'redirect_automatically',
                'retrieve_embedded_resources',
                ...(!LEGACY_AUTH_CONTAINERS.has(kind) ? ['auth'] : []),
              ])
                if (field in payload)
                  error(`${payloadPath}.${field}`, 'Known configuration at this scope requires defaults.');
            }
            walkSteps(
              payload.steps ?? step.steps,
              `${payloadPath}.steps`,
              inheritedSQLAssertions(payload, inheritedSQL),
            );
          } else walkSteps(step.steps, `${stepPath}.steps`, inheritedSQL);
          continue;
        }
        if (!configurationRecord(payload)) continue;
        if (HTTP_TYPES.has(kind) || kind === 'sql') {
          owner(payload, payloadPath, false, kind === 'sql' ? 'sql' : 'http');
          if (adopted && HTTP_TYPES.has(kind))
            knownPlacement(
              payload,
              payloadPath,
              new Set([
                'headers',
                'auth',
                'timeout',
                'follow_redirects',
                'redirect_automatically',
                'retrieve_embedded_resources',
                'error_policy',
                'assertions',
                'data_source',
                'think_time',
                'body',
                'query_params',
                'retry',
                'assert',
                'extract',
                'extractors',
                'spark',
                'cookie_override',
                'cache_override',
              ]),
            );
          if (adopted && HTTP_TYPES.has(kind))
            for (const field of ['auth', 'headers', 'assertions'])
              if (field in payload) validateValue(field, payload[field], `${payloadPath}.${field}`, 'http');
          if (kind === 'sql') {
            if (!adopted && ('assertions' in payload || 'think_time' in payload))
              error(payloadPath, 'SQL assertions and think_time require component_configuration_version: 1.');
            if (adopted) {
              for (const field of [
                'auth',
                'headers',
                'body',
                'query_params',
                'follow_redirects',
                'redirect_automatically',
                'retrieve_embedded_resources',
                'cookies',
                'cache',
                'cookie_override',
                'cache_override',
                'data_source',
              ])
                if (field in payload)
                  error(`${payloadPath}.${field}`, 'HTTP or scoped configuration cannot apply to local SQL.');
              if ('think_time' in payload) {
                required.add('think_time');
                validateValue('think_time', payload.think_time, `${payloadPath}.think_time`, 'sql');
              }
              if ('assertions' in payload) {
                required.add('sql_assertions');
                validateValue('assertions', payload.assertions, `${payloadPath}.assertions`, 'sql');
              }
              const assertions = 'assertions' in payload ? payload.assertions : inheritedSQL;
              if (Array.isArray(assertions))
                assertions.forEach((assertion, aIndex) => {
                  if (!configurationRecord(assertion)) return;
                  const criterion = String(assertion.type).trim().toLowerCase(),
                    kind = String(payload.kind ?? 'query')
                      .trim()
                      .toLowerCase();
                  if (
                    (criterion === 'rows_returned' && kind !== 'query') ||
                    (criterion === 'rows_affected' && kind !== 'exec')
                  )
                    error(`${payloadPath}.assertions[${aIndex}].type`, 'Effective criterion does not match SQL kind.');
                });
            }
          }
        } else if (EXPERIMENTAL.has(kind) || ['think_time', 'data_source', 'assertions', 'assertion'].includes(kind)) {
          owner(payload, payloadPath, false);
          walkSteps(payload.steps, `${payloadPath}.steps`, inheritedSQL);
        }
      }
    });
  };
  knownPlacement(script, '', new Set(['data_source']));
  owner(script, '', true);
  const rootSQL = inheritedSQLAssertions(script, undefined);
  if (Array.isArray(script.scenarios))
    script.scenarios.forEach((scenario, index) => {
      if (!configurationRecord(scenario)) return;
      const path = `scenarios[${index}]`;
      knownPlacement(scenario, path, new Set(['data_source', 'cookies', 'cache_manager', 'error_policy', 'steps']));
      owner(scenario, path, true);
      if (adopted && Array.isArray(scenario.requests))
        scenario.requests.forEach((request, index) => {
          if (!configurationRecord(request)) return;
          owner(request, `${path}.requests[${index}]`, false);
          for (const field of ['auth', 'headers', 'assertions'])
            if (field in request) validateValue(field, request[field], `${path}.requests[${index}].${field}`, 'http');
        });
      walkSteps(scenario.steps, `${path}.steps`, inheritedSQLAssertions(scenario, rootSQL));
    });
  return { errors, warnings, required: [...required].sort() };
}

export function componentCapabilityError(yaml: string, capabilities?: ComponentCapabilities): string | null {
  let script: unknown;
  try {
    script = load(yaml);
  } catch {
    return null;
  }
  const inspection = inspectComponentConfiguration(script);
  if (inspection.errors.length) return inspection.errors[0].message;
  if (!configurationRecord(script) || script.component_configuration_version !== 1) return null;
  if (capabilities?.version !== 1)
    return 'This backend does not support component configuration version 1. Update Relampo before running.';
  const missing = inspection.required.filter(feature => !capabilities.features.includes(feature));
  return missing.length ? `This backend does not support required component features: ${missing.join(', ')}.` : null;
}

export function componentNodeChain(tree: YAMLNode, id: string): YAMLNode[] {
  if (tree.id === id) return [tree];
  for (const child of tree.children || []) {
    const found = componentNodeChain(child, id);
    if (found.length) return [tree, ...found];
  }
  return [];
}
export function nodeDefaults(tree: YAMLNode, node: YAMLNode): Record<string, unknown> {
  const value = node.id === tree.id ? tree.unknownData?.defaults : node.data?.defaults;
  return configurationRecord(value) ? value : {};
}
export function effectiveComponentValues(
  tree: YAMLNode,
  node: YAMLNode,
  protocol: 'http' | 'sql',
): Record<string, EffectiveComponentValue> {
  const effective: Record<string, EffectiveComponentValue> = {};
  if (tree.unknownData?.component_configuration_version !== 1) return effective;
  const assign = (field: string, value: unknown, origin: string) => {
    if ((field === 'headers' || field === 'error_policy') && configurationRecord(value)) {
      const previous = configurationRecord(effective[field]?.value) ? effective[field].value : {};
      if (field === 'error_policy' && value.enabled === false) return;
      let next = { ...previous };
      let origins = { ...effective[field]?.origins };
      for (const [key, item] of Object.entries(value)) {
        if (field === 'error_policy' && (!POLICY_FIELDS.has(key) || key === 'enabled')) continue;
        if (field === 'headers')
          for (const existing of Object.keys(next))
            if (existing.trim().toLowerCase() === key.trim().toLowerCase()) {
              delete next[existing];
              delete origins[existing];
            }
        next = { ...next, [key]: item };
        origins = { ...origins, [key]: origin };
      }
      effective[field] = { value: next, origin, origins };
    } else effective[field] = { value, origin };
  };
  const assignLegacyPolicy = (value: unknown, origin: string, legacy?: unknown, legacyOrigin = origin) => {
    const policy = configurationRecord(value) && value.enabled !== false ? value : {};
    const fallback =
      typeof legacy === 'string' && legacy ? legacy : typeof policy.on_error === 'string' ? policy.on_error : undefined;
    if (fallback !== undefined)
      assign(
        'error_policy',
        Object.fromEntries(
          ['on_error', 'on_timeout', ...(protocol === 'http' ? ['on_4xx', 'on_5xx'] : [])].map(key => [key, fallback]),
        ),
        typeof legacy === 'string' && legacy ? legacyOrigin : origin,
      );
    assign('error_policy', policy, origin);
  };
  const legacy = tree.children?.find(child => child.type === 'http_defaults')?.data;
  if (protocol === 'http' && legacy)
    for (const field of HTTP_COMPONENT_FIELDS)
      if (field in legacy) assign(field, legacy[field as keyof typeof legacy], `http_defaults.${field}`);
  for (const ancestor of componentNodeChain(tree, node.id)) {
    if (
      ancestor.id !== tree.id &&
      ancestor.type !== 'scenario' &&
      !STABLE_CONTAINERS.has(ancestor.type) &&
      ancestor.type !== 'simple'
    )
      continue;
    const legacyData = ancestor.data;
    if (protocol === 'http' && LEGACY_AUTH_CONTAINERS.has(ancestor.type) && legacyData?.auth !== undefined)
      assign('auth', legacyData.auth, `${ancestor.name}: auth`);
    const legacyPolicy =
      ancestor.children?.find(child => child.type === 'error_policy')?.data ?? legacyData?.error_policy;
    if (ancestor.type === 'scenario' && legacyPolicy !== undefined)
      assign('error_policy', legacyPolicy, `${ancestor.name}: error_policy`);
    const defaults = nodeDefaults(tree, ancestor);
    for (const field of COMMON_FIELDS)
      if (field in defaults) assign(field, defaults[field], `${ancestor.name}: defaults.${field}`);
    const block = defaults[protocol];
    if (configurationRecord(block))
      for (const [field, value] of Object.entries(block))
        if ((protocol === 'http' ? HTTP_COMPONENT_FIELDS : SQL_COMPONENT_FIELDS).includes(field as never))
          assign(field, value, `${ancestor.name}: defaults.${protocol}.${field}`);
  }
  if (HTTP_TYPES.has(node.type) || node.type === 'sql') {
    const local = authoredComponentData(node);
    const parentPolicy = effective.error_policy;
    if (configurationRecord(parentPolicy?.value) && typeof parentPolicy.value.on_error === 'string') {
      const fallback = parentPolicy.value.on_error;
      for (const key of ['on_timeout', ...(protocol === 'http' ? ['on_4xx', 'on_5xx'] : [])])
        if (!(key in parentPolicy.value))
          assign('error_policy', { [key]: fallback }, parentPolicy.origins?.on_error || parentPolicy.origin);
    }
    for (const field of [...(protocol === 'http' ? HTTP_COMPONENT_FIELDS : SQL_COMPONENT_FIELDS), 'think_time'])
      if (field !== 'error_policy' && field in local) assign(field, local[field], `${node.name}: ${field}`);
    if ('error_policy' in local || 'on_error' in local) {
      assignLegacyPolicy(
        local.error_policy,
        `${node.name}: error_policy`,
        protocol === 'http' ? local.on_error : undefined,
        `${node.name}: on_error`,
      );
      if (
        protocol === 'sql' &&
        typeof local.on_error === 'string' &&
        !(
          configurationRecord(local.error_policy) &&
          local.error_policy.enabled !== false &&
          local.error_policy.on_error
        )
      )
        assign('error_policy', { on_error: local.on_error }, `${node.name}: on_error`);
    }
    if (protocol === 'http')
      for (const [field, override] of [
        ['cookies', 'cookie_override'],
        ['cache', 'cache_override'],
      ])
        if (local[override] === 'enabled' || local[override] === 'disabled')
          assign(field, local[override] === 'enabled', `${node.name}: ${override}`);
  }
  return effective;
}
export function inspectTreeComponentConfiguration(tree: YAMLNode) {
  return inspectComponentConfiguration(treeToObject(tree));
}

/** Reuse serialization so authored controls and saved child edits agree. */
export function authoredComponentData(node: YAMLNode): Record<string, unknown> {
  return HTTP_TYPES.has(node.type) ? requestNodeToObject(node).request : authoredNodeData(node);
}
