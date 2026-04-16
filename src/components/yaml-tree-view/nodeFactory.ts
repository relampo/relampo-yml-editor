import { buildLoadDataForType } from '../yaml-node-details/loadUtils';
import type { YAMLNode } from '../../types/yaml';

export function createNodeByType(type: string | 'root_plan'): YAMLNode {
  const id = createNodeId();

  if (type === 'root_plan') {
    const scenarioId = createNodeId();
    return {
      id: 'root',
      type: 'root',
      name: 'Test Plan',
      expanded: true,
      children: [
        {
          id: 'node_scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          expanded: true,
          children: [
            {
              id: scenarioId,
              type: 'scenario',
              name: 'New Scenario',
              expanded: true,
              data: { name: 'New Scenario' },
              children: createScenarioChildren(scenarioId, {
                users: 1,
                duration: '1m',
                ramp_up: '10s',
                iterations: 0,
              }),
            },
          ],
        },
      ],
    };
  }

  switch (type) {
    case 'request':
    case 'get':
      return {
        id,
        type: 'get',
        name: 'GET: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'sql':
      return {
        id,
        type: 'sql',
        name: 'POSTGRES: SELECT',
        data: {
          dialect: 'postgres',
          kind: 'query',
          query: 'SELECT 1',
          connection: {
            host: '{{db_host}}',
            port: 5432,
            database: 'app',
            user: '{{db_user}}',
            password: '{{db_password}}',
            validate_connectivity: true,
            max_open_conns: 5,
            max_idle_conns: 2,
          },
          params: [],
          allow_writes: false,
        },
        children: [],
      };
    case 'post':
      return {
        id,
        type: 'post',
        name: 'POST: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'put':
      return {
        id,
        type: 'put',
        name: 'PUT: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'delete':
      return {
        id,
        type: 'delete',
        name: 'DELETE: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'patch':
      return {
        id,
        type: 'patch',
        name: 'PATCH: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'head':
      return {
        id,
        type: 'head',
        name: 'HEAD: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'options':
      return {
        id,
        type: 'options',
        name: 'OPTIONS: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'group':
      return {
        id,
        type: 'group',
        name: 'Group',
        children: [],
        data: { name: 'Group' },
        expanded: true,
      };
    case 'transaction':
      return {
        id,
        type: 'transaction',
        name: 'Transaction',
        children: [],
        data: { name: 'Transaction' },
        expanded: true,
      };
    case 'if':
      return {
        id,
        type: 'if',
        name: 'If Controller',
        children: [],
        data: { condition: '{{variable}} == true' },
        expanded: true,
      };
    case 'loop':
      return {
        id,
        type: 'loop',
        name: 'Loop Controller',
        children: [],
        data: { count: 3 },
        expanded: true,
      };
    case 'retry':
      return {
        id,
        type: 'retry',
        name: 'Retry Controller',
        children: [],
        data: { attempts: 3, backoff: 'exponential' },
        expanded: true,
      };
    case 'one_time':
      return {
        id,
        type: 'one_time',
        name: 'One Time Controller',
        children: [
          {
            id: `${id}_request`,
            type: 'request',
            name: 'Initialization Request',
            data: { method: 'GET', url: '/initialize' },
            children: [],
          },
        ],
        data: { description: '' },
        expanded: true,
      };
    case 'on_error':
      return {
        id,
        type: 'on_error',
        name: 'On Error',
        children: [],
        data: { action: 'continue' },
        expanded: true,
      };
    case 'think_time':
      return {
        id,
        type: 'think_time',
        name: 'Think Time',
        data: { duration: '1s' },
      };
    case 'spark_before':
      return {
        id,
        type: 'spark_before',
        name: 'Spark Before',
        data: { script: '// Pre-request script\n' },
      };
    case 'spark_after':
      return {
        id,
        type: 'spark_after',
        name: 'Spark After',
        data: { script: '// Post-request script\n' },
      };
    case 'assertion':
      return {
        id,
        type: 'assertion',
        name: 'Assertion',
        data: {
          type: 'status',
          __allowTypeSelection: true,
        },
      };
    case 'extractor':
      return {
        id,
        type: 'extractor',
        name: 'Extractor',
        data: {
          type: 'regex',
          __allowTypeSelection: true,
          from: 'body',
          var: 'extracted_value',
          variable: 'extracted_value',
          pattern: 'token=([a-zA-Z0-9_-]+)',
          capture_mode: 'first',
          group: 1,
          default: '',
        },
      };
    case 'file':
      return {
        id,
        type: 'file',
        name: 'File Upload',
        data: {
          field: 'file',
          path: '',
          mime_type: 'application/octet-stream',
        },
      };
    case 'header':
      return {
        id,
        type: 'header',
        name: 'Header',
        data: {
          name: 'Authorization',
          value: '',
        },
      };
    case 'headers':
      return {
        id,
        type: 'headers',
        name: 'Headers',
        data: {
          'Content-Type': 'application/json',
        },
      };
    case 'scenarios':
      return {
        id,
        type: 'scenarios',
        name: 'Scenarios',
        expanded: true,
        children: [],
      };
    case 'scenario':
      return {
        id,
        type: 'scenario',
        name: 'New Scenario',
        children: createScenarioChildren(id, {
          users: 1,
          duration: '1m',
          ramp_up: '10s',
          iterations: 0,
        }),
        data: { name: 'New Scenario' },
        expanded: true,
      };
    case 'variables':
      return {
        id,
        type: 'variables',
        name: 'Variables',
        data: { newVariable: 'value' },
      };
    case 'data_source':
      return {
        id,
        type: 'data_source',
        name: 'Data Source',
        data: {
          type: 'csv',
          file: 'data.csv',
          mode: 'sequential',
        },
      };
    case 'http_defaults':
      return {
        id,
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: {
          base_url: 'https://api.example.com',
          timeout: '',
        },
      };
    case 'metrics':
      return {
        id,
        type: 'metrics',
        name: 'Metrics',
        data: { enabled: true },
      };
    case 'load':
      return {
        id,
        type: 'load',
        name: 'Load Config',
        data: buildLoadDataForType('constant', {
          users: 10,
          duration: '1m',
          iterations: 0,
        }),
      };
    case 'cookies':
      return {
        id,
        type: 'cookies',
        name: 'Cookies',
        data: {
          mode: 'auto',
          policy: 'standard',
          jar_scope: 'vu',
          persist_across_iterations: true,
          clear_each_iteration: false,
          cookies: [],
        },
      };
    case 'cache_manager':
      return {
        id,
        type: 'cache_manager',
        name: 'Cache Manager',
        data: {
          enabled: true,
          clear_each_iteration: true,
          max_elements: 1000,
        },
      };
    case 'error_policy':
      return {
        id,
        type: 'error_policy',
        name: 'Error Policy',
        data: {
          on_4xx: 'continue',
          on_5xx: 'stop',
          on_timeout: 'stop',
        },
      };
    default:
      return {
        id,
        type: 'step',
        name: 'Step',
        data: {},
      };
  }
}

function createScenarioChildren(scenarioId: string, loadData: Parameters<typeof buildLoadDataForType>[1]): YAMLNode[] {
  return [
    {
      id: `${scenarioId}_load`,
      type: 'load',
      name: 'Load Config',
      data: buildLoadDataForType('constant', loadData),
    },
    {
      id: `${scenarioId}_steps`,
      type: 'steps',
      name: 'Steps',
      children: [],
      expanded: true,
    },
  ];
}

function createNodeId() {
  return `node_${Math.random().toString(36).slice(2, 11)}`;
}
