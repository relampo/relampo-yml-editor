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
  data?: any;
  expanded?: boolean;
  path?: string[]; // Path in the YAML tree for synchronization
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
}

export interface TestMetadata {
  name: string;
  description?: string;
  version?: string | number;
}

export interface Variable {
  key: string;
  value: string;
}

export interface DataSource {
  type: 'csv' | 'json' | 'inline';
  file?: string;
  inline?: any;
  mode?: 'per_vu' | 'shared';
  strategy?: 'sequential' | 'random' | 'unique';
  bind: Record<string, string>;
  on_exhausted?: 'stop' | 'recycle' | 'fail_test';
}

export interface AuthConfig {
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
  headers?: Record<string, string>;
  auth?: AuthConfig;
  timeout?: string;
  follow_redirects?: boolean;
  retry_policy?: {
    enabled: boolean;
    max_attempts: number;
    backoff: 'exponential' | 'linear' | 'fixed';
  };
}

export interface Load {
  type: 'constant' | 'ramp' | 'ramp_up_down' | 'throughput' | 'intent';
  users?: number;
  duration?: string;
  ramp_up?: string;
  ramp_down?: string;
  iterations?: number;
  start_users?: number;
  end_users?: number;
  target_rps?: number;
  target_unit?: 'rps' | 'vus';
  target_value?: number;
  p95_max_ms?: number;
  error_rate_max_pct?: number;
  warmup?: string;
  min_vus?: number;
  max_vus?: number;
  aggressiveness?: 'low' | 'medium' | 'high';
}

export interface RequestStep {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: any;
  timeout?: string;
  cookie_override?: 'inherit' | 'enabled' | 'disabled';
  cache_override?: 'inherit' | 'enabled' | 'disabled';
  retrieve_embedded_resources?: boolean;
  redirect_automatically?: boolean;
  follow_redirects?: boolean;
  extract?: Record<string, string>;
  assert?: AssertConfig;
  retry?: RetryConfig;
  error_policy?: {
    on_error?: 'continue' | 'stop';
  };
  throughput?: {
    enabled?: boolean;
    target_rps?: number;
  };
  on_error?: 'continue' | 'stop' | 'fail_iteration';
  data_source?: DataSource;
}

export interface SQLConnection {
  host?: string;
  port?: number | string;
  database?: string;
  user?: string;
  password?: string;
  dsn?: string;
  ssl_mode?: string;
  charset?: string;
  options?: Record<string, string>;
  validate_connectivity?: boolean;
  max_open_conns?: number;
  max_idle_conns?: number;
  conn_max_lifetime?: string;
  conn_max_idle_time?: string;
  [key: string]: any;
}

export interface SQLStep {
  name?: string;
  dialect?: 'postgres' | 'mysql' | string;
  kind?: 'query' | 'exec' | string;
  driver?: string;
  connection?: SQLConnection;
  query?: string;
  params?: any[] | Record<string, any> | string | number | boolean;
  allow_writes?: boolean;
  timeout?: string;
  on_error?: 'continue' | 'stop' | 'fail_iteration';
  enabled?: boolean;
  [key: string]: any;
}

export interface AssertConfig {
  status?: number;
  status_in?: number[];
  status_not_in?: number[];
  response_time_ms?: string;
  response_time_ms_max?: number;
  response_time_ms_min?: number;
  response_time_ms_between?: [number, number];
  body_contains?: string;
  body_not_contains?: string;
  body_matches?: string;
  json_path?: Record<string, string>;
  xpath?: Record<string, string>;
  header_exists?: string;
  header_contains?: Record<string, string>;
  body_size_bytes?: string;
  custom?: string;
}

export interface RetryConfig {
  attempts: number;
  on?: number[];
  backoff: 'exponential' | 'linear' | 'fixed';
  initial_delay?: string;
  max_delay?: string;
  multiplier?: number;
}

export interface ThinkTimeStep {
  duration?: string;
  min?: string;
  max?: string;
  mean?: string;
  std_dev?: string;
  distribution?: 'uniform' | 'normal' | 'poisson';
}

export interface GroupStep {
  name?: string;
  auth?: AuthConfig;
  steps: any[];
}

export interface LoopStep {
  count?: number;
  break_on?: string;
  steps: any[];
}

export interface IfStep {
  condition: string;
  steps: any[];
}

export interface OneTimeStep {
  name?: string;
  description?: string;
  steps: any[];
}

export interface Metrics {
  enabled?: boolean;
  percentiles?: number[];
  collect_interval?: string;
  aggregate_by?: string[];
  export?: Array<{
    type: string;
    file?: string;
    [key: string]: any;
  }>;
  custom_metrics?: Array<{
    name: string;
    type: string;
    labels?: string[];
  }>;
}
