import type { StringMap } from './shared';

type YAMLScalar = string | number | boolean | null;
export type YAMLValue = YAMLScalar | YAMLValue[] | { [key: string]: YAMLValue | undefined } | undefined;

type YAMLInputValue = string | number;

export interface YAMLResponseData {
  [key: string]: YAMLValue;
  status?: YAMLInputValue;
  headers?: StringMap;
  body?: YAMLValue;
}

export interface YAMLNodeData {
  __allowTypeSelection?: boolean;
  __balancedPercentage?: YAMLInputValue;
  __lockedType?: string;
  __name?: string;
  __scalarLoop?: boolean;
  __scalarRetry?: boolean;
  action?: string;
  active_rules?: string[];
  aggressiveness?: string;
  allow_write?: boolean;
  allow_writes?: boolean;
  assert?: YAMLNodeData[] | YAMLNodeData;
  assertion?: string;
  assertions?: YAMLNodeData[];
  attempts?: YAMLInputValue;
  backoff?: string;
  auth?: AuthConfig;
  authorization?: string;
  base_url?: string;
  bind?: StringMap;
  body?: YAMLValue;
  body_raw?: string;
  break_on?: string;
  cache_override?: string;
  capture_index?: string;
  capture_mode?: string;
  chain_id?: string;
  chain_role?: string;
  clear_each_iteration?: boolean;
  collect_interval?: YAMLInputValue;
  comments?: string;
  condition?: string;
  connection?: YAMLNodeData;
  cookies?: unknown;
  cookie_override?: string;
  count?: YAMLInputValue;
  csv?: unknown;
  db_host?: string;
  database?: string;
  default?: string;
  description?: string;
  dialect?: string;
  data_source?: YAMLNodeData;
  distribution?: string;
  driver?: string;
  duration?: YAMLInputValue;
  enabled?: boolean;
  end_users?: YAMLInputValue;
  error_4xx_max_pct?: YAMLInputValue;
  error_5xx_max_pct?: YAMLInputValue;
  error_policy?: YAMLNodeData;
  error_rate_max_pct?: YAMLInputValue;
  expression?: string;
  extract?: YAMLNodeData[] | YAMLNodeData | StringMap;
  extractors?: YAMLNodeData[];
  file?: string;
  field?: string;
  files?: YAMLNodeData[];
  follow_redirects?: boolean;
  from?: string;
  group?: YAMLInputValue;
  headers?: StringMap;
  host?: string;
  id?: string;
  ignore_case?: boolean;
  iterations?: YAMLInputValue;
  jar_scope?: string;
  kind?: string;
  left_boundary?: string;
  length?: YAMLInputValue;
  match_no?: YAMLInputValue;
  max?: YAMLInputValue;
  max_elements?: YAMLInputValue;
  max_idle_conns?: YAMLInputValue;
  max_ms?: YAMLInputValue;
  max_size_mb?: YAMLInputValue;
  max_vus?: YAMLInputValue;
  mean?: YAMLInputValue;
  method?: string;
  mime?: string;
  mime_type?: string;
  min?: YAMLInputValue;
  min_vus?: YAMLInputValue;
  mode?: string;
  name?: string;
  namespace?: string;
  on_4xx?: string;
  on_5xx?: string;
  on_timeout?: string;
  on_error?: string;
  options?: StringMap;
  p95_max_ms?: YAMLInputValue;
  params?: unknown;
  password?: string;
  path?: string;
  pattern?: string;
  percentiles?: YAMLInputValue[];
  persist_across_iterations?: boolean;
  policy?: string;
  port?: YAMLInputValue;
  query?: string;
  ramp_down?: YAMLInputValue;
  ramp_up?: YAMLInputValue;
  redirect_automatically?: boolean;
  request_id?: number;
  retrieve_embedded_resources?: boolean;
  response?: YAMLResponseData;
  right_boundary?: string;
  run_until_stopped?: boolean;
  script?: string;
  ssl_mode?: string;
  spark?: YAMLNodeData[];
  stages?: YAMLNodeData[];
  steps?: YAMLNodeData[];
  size?: YAMLInputValue;
  start_users?: YAMLInputValue;
  std_dev?: YAMLInputValue;
  target_rps?: YAMLInputValue;
  target?: YAMLInputValue;
  target_unit?: string;
  target_value?: YAMLInputValue;
  think_time?: YAMLInputValue | YAMLNodeData;
  throughput?: YAMLNodeData;
  timeout?: string;
  type?: string;
  url?: string;
  users?: YAMLInputValue;
  user?: string;
  value?: YAMLValue;
  validate_connectivity?: boolean;
  var?: string;
  variable?: string;
  variable_names?: string;
  variables?: StringMap | Array<{ name: string; value: string }>;
  version?: string;
  warmup?: YAMLInputValue;
  when?: string;
  window?: YAMLInputValue;
  max_open_conns?: YAMLInputValue;
  request?: YAMLNodeData;
}

/** Wrap a trusted header or variable map at the generic tree-node boundary. */
export function yamlMapData(values: StringMap): YAMLNodeData {
  return values as unknown as YAMLNodeData;
}

export function yamlMapValue(data: YAMLNodeData | undefined, key: string): YAMLValue {
  return (data as unknown as Record<string, YAMLValue> | undefined)?.[key];
}

export type YAMLNodeType =
  | 'root'
  | 'test'
  | 'variables'
  | 'data_source'
  | 'http_defaults'
  | 'scenarios'
  | 'scenario'
  | 'metrics'
  | 'load'
  | 'steps'
  | 'step'
  | 'request'
  | 'sql'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options'
  | 'simple'
  | 'group'
  | 'transaction'
  | 'parallel'
  | 'balanced'
  | 'if'
  | 'loop'
  | 'retry'
  | 'one_time'
  | 'think_time'
  | 'assertion'
  | 'extract'
  | 'assert'
  | 'extractor'
  | 'cookies'
  | 'cache_manager'
  | 'error_policy'
  | 'spark'
  | 'spark_before'
  | 'spark_after'
  | 'on_error'
  | 'file'
  | 'header'
  | 'headers';

export interface YAMLNode {
  id: string;
  type: YAMLNodeType;
  name: string;
  children?: YAMLNode[];
  data?: YAMLNodeData;
  /** Semantic fields that the editor does not model, kept for lossless saves. */
  unknownData?: Record<string, YAMLValue>;
  expanded?: boolean;
  path?: Array<string | number>; // Path in the YAML tree for synchronization
}

export interface RedirectedRequestInfo {
  sourceNodeId: string;
  sourceRequestLabel: string;
  matchedLocation: string;
}

export interface RedirectSourceInfo {
  targetNodeId: string;
  targetRequestLabel: string;
  matchedLocation: string;
  /**
   * True when the recorded follow-up (redirect target) request is disabled
   * (`enabled: false`). The redirect linkage no longer applies, so the source
   * request's "Follow Redirects" option becomes editable again.
   */
  targetDisabled: boolean;
}

export interface DataSource {
  type: 'csv' | 'json' | 'inline';
  file?: string;
  inline?: YAMLValue;
  mode?: 'per_vu' | 'shared';
  strategy?: 'sequential' | 'random' | 'unique';
  bind: StringMap;
  on_exhausted?: 'stop' | 'recycle' | 'fail_test';
}

export interface AuthConfig {
  [key: string]: YAMLValue;
  type?: 'bearer' | 'api_key' | 'basic' | 'none';
  token?: string;
  name?: string;
  value?: string;
  in?: 'header' | 'query';
  username?: string;
  password?: string;
}

export interface HttpDefaults {
  base_url?: string;
  headers?: StringMap;
  auth?: AuthConfig;
  timeout?: string;
  follow_redirects?: boolean;
  retry_policy?: {
    enabled: boolean;
    max_attempts: number;
    backoff: 'exponential' | 'linear' | 'fixed';
  };
}
