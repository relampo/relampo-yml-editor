export type NodeType =
  | 'test-plan'
  | 'scenario'
  | 'profile'
  | 'controller-simple'
  | 'controller-if'
  | 'controller-loop'
  | 'controller-group'
  | 'controller-retry'
  | 'controller-transaction'
  | 'http-request'
  | 'cookie-manager'
  | 'cache-manager'
  | 'header-manager'
  | 'timer'
  | 'assertion'
  | 'extractor'
  | 'variables'
  | 'data-source'
  | 'http-defaults'
  | 'metrics'
  | 'load';

export interface ScriptNode {
  id: string;
  type: NodeType;
  name: string;
  children?: ScriptNode[];
  data?: any;
  expanded?: boolean;
}

export interface HttpRequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    contentType: string;
    size: number;
    duration: number;
  };
}

export interface CookieData {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: string;
  }>;
}

export interface CacheData {
  cache: Array<{
    key: string;
    value: string;
    expires?: string;
  }>;
}

export interface HeaderData {
  headers: Array<{
    name: string;
    value: string;
    enabled: boolean;
  }>;
}

export interface ExtractorData {
  extractorType: 'json' | 'regex' | 'xpath';
  variableName: string;
  expression: string;
  matchNo?: number;
  defaultValue?: string;
  preview?: string;
}

export interface AssertionData {
  assertionType: 'response-code' | 'response-text' | 'json-path';
  condition: string;
  expected: string;
  actual?: string;
  passed?: boolean;
}

export interface VariablesData {
  variables: Array<{
    name: string;
    value: string;
  }>;
}

export interface DataSourceData {
  type: 'csv' | 'json' | 'xml';
  path: string;
  variables: Array<{
    name: string;
    value: string;
  }>;
}

export interface HttpDefaultsData {
  protocol: string;
  domain: string;
  port: number;
  path: string;
  connectTimeout: number;
  responseTimeout: number;
  followRedirects: boolean;
  useKeepAlive: boolean;
  doMultipartPost: boolean;
  embeddedUrlRecode: boolean;
  useCookies: boolean;
  implementation: string;
}

export interface MetricsData {
  metrics: Array<{
    name: string;
    value: string;
  }>;
}