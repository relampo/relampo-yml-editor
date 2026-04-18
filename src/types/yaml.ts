import type { StringMap } from './shared';

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
  data?: any;
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
}

export interface DataSource {
  type: 'csv' | 'json' | 'inline';
  file?: string;
  inline?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  mode?: 'per_vu' | 'shared';
  strategy?: 'sequential' | 'random' | 'unique';
  bind: StringMap;
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
