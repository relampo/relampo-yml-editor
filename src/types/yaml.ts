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
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options'
  | 'simple'
  | 'group'
  | 'if'
  | 'loop'
  | 'retry'
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
  | 'spark_after';

export interface YAMLNode {
  id: string;
  type: YAMLNodeType;
  name: string;
  children?: YAMLNode[];
  data?: any;
  expanded?: boolean;
  path?: string[]; // Path in the YAML tree for synchronization
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

export interface HttpDefaults {
  base_url?: string;
  headers?: Record<string, string>;
  timeout?: string;
  follow_redirects?: boolean;
  retry_policy?: {
    enabled: boolean;
    max_attempts: number;
    backoff: 'exponential' | 'linear' | 'fixed';
  };
}

export interface Load {
  type: 'constant' | 'ramp' | 'spike' | 'step';
  users?: number;
  duration?: string;
  ramp_up?: string;
  iterations?: number;
  start_users?: number;
  end_users?: number;
  spike_users?: number;
  spike_duration?: string;
  spike_at?: string;
  steps?: Array<{
    users: number;
    duration: string;
  }>;
}

export interface RequestStep {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: any;
  timeout?: string;
  extract?: Record<string, string>;
  assert?: AssertConfig;
  retry?: RetryConfig;
  on_error?: 'continue' | 'stop' | 'fail_iteration';
  data_source?: DataSource;
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