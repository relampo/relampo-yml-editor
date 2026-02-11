import type { ScriptNode } from '../types/script';

export const mockScriptTree: ScriptNode = {
  id: 'test-plan-1',
  type: 'test-plan',
  name: 'E-Commerce Performance Test',
  expanded: true,
  children: [
    {
      id: 'variables-1',
      type: 'variables',
      name: 'Variables',
      expanded: false,
      data: {
        variables: [
          { name: 'base_url', value: 'https://api.example.com' },
          { name: 'api_key', value: 'sk_test_123456' },
          { name: 'user_count', value: '100' },
        ],
      },
    },
    {
      id: 'data-source-1',
      type: 'data-source',
      name: 'Data Source - users.csv',
      expanded: false,
      data: {
        type: 'csv',
        path: './data/users.csv',
        variables: [
          { name: 'username', value: 'john.doe' },
          { name: 'email', value: 'john@example.com' },
          { name: 'password', value: 'test123' },
        ],
      },
    },
    {
      id: 'http-defaults-1',
      type: 'http-defaults',
      name: 'HTTP Defaults',
      expanded: false,
      data: {
        protocol: 'https',
        domain: 'api.example.com',
        port: 443,
        path: '',
        connectTimeout: 5000,
        responseTimeout: 30000,
        followRedirects: true,
        useKeepAlive: true,
        doMultipartPost: false,
        embeddedUrlRecode: false,
        useCookies: true,
        implementation: 'HttpClient4',
      },
    },
    {
      id: 'scenario-1',
      type: 'scenario',
      name: 'Scenario: User Journey - Login',
      expanded: true,
      children: [
        {
          id: 'data-source-2',
          type: 'data-source',
          name: 'Data Source - credentials.json',
          expanded: false,
          data: {
            type: 'json',
            path: './data/credentials.json',
            variables: [
              { name: 'user_email', value: 'admin@example.com' },
              { name: 'user_password', value: 'secure_pass_123' },
            ],
          },
        },
        {
          id: 'cookie-mgr-1',
          type: 'cookie-manager',
          name: 'Cookie Manager',
          data: {
            cookies: [
              { name: 'session_id', value: 'abc123xyz', domain: '.example.com', path: '/' },
              { name: 'user_pref', value: 'dark_mode', domain: '.example.com', path: '/' },
            ],
          },
        },
        {
          id: 'cache-mgr-1',
          type: 'cache-manager',
          name: 'Cache Manager',
          data: {
            cache: [
              { key: 'user_session', value: 'session_abc123', expires: '2024-12-31' },
              { key: 'api_response', value: 'cached_data', expires: '2024-12-31' },
            ],
          },
        },
        {
          id: 'load-1',
          type: 'load',
          name: 'Load',
          data: {
            virtualUsers: 100,
            duration: 300,
            rampUp: 60,
            iterationCount: 1,
            schedule: 'ramp-up',
          },
        },
        {
          id: 'http-1',
          type: 'http-request',
          name: 'GET /api/users',
          expanded: true,
          data: {
            method: 'GET',
            url: 'https://api.example.com/api/users',
            headers: {
              'Accept': 'application/json',
              'Authorization': 'Bearer ${access_token}',
            },
            response: {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
              body: JSON.stringify({
                users: [
                  { id: 1, name: 'John Doe', email: 'john@example.com' },
                  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
                ],
              }, null, 2),
              contentType: 'application/json',
              size: 512,
              duration: 145,
            },
          },
          children: [
            {
              id: 'timer-1',
              type: 'timer',
              name: 'Think Time (1s)',
              data: {
                duration: 1000,
                variance: 200,
              },
            },
            {
              id: 'extractor-1',
              type: 'extractor',
              name: 'Extract: userId',
              data: {
                extractorType: 'json',
                variableName: 'user_id',
                expression: '$.users[0].id',
                preview: '1',
              },
            },
            {
              id: 'assertion-1',
              type: 'assertion',
              name: 'Assert: status == 200',
              data: {
                assertionType: 'response-code',
                condition: 'equals',
                expected: '200',
                actual: '200',
                passed: true,
              },
            },
          ],
        },
        {
          id: 'group-1',
          type: 'controller-group',
          name: 'Login Flow',
          expanded: true,
          children: [
            {
              id: 'http-2',
              type: 'http-request',
              name: 'POST /api/auth/login',
              data: {
                method: 'POST',
                url: 'https://api.example.com/api/auth/login',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  email: 'user@example.com',
                  password: '[REDACTED]',
                }, null, 2),
                response: {
                  status: 201,
                  statusText: 'Created',
                  headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': '[REDACTED]',
                  },
                  body: JSON.stringify({
                    token: '[REDACTED]',
                    user: { id: 1, name: 'John Doe' },
                  }, null, 2),
                  contentType: 'application/json',
                  size: 156,
                  duration: 234,
                },
              },
              children: [
                {
                  id: 'extractor-2',
                  type: 'extractor',
                  name: 'Extract: authToken',
                  data: {
                    extractorType: 'json',
                    variableName: 'auth_token',
                    expression: '$.token',
                    preview: '[REDACTED]',
                  },
                },
              ],
            },
            {
              id: 'http-3',
              type: 'http-request',
              name: 'GET /dashboard',
              data: {
                method: 'GET',
                url: 'https://api.example.com/dashboard',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ${auth_token}',
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    widgets: ['analytics', 'tasks', 'notifications'],
                  }, null, 2),
                  contentType: 'application/json',
                  size: 324,
                  duration: 89,
                },
              },
            },
          ],
        },
        {
          id: 'if-1',
          type: 'controller-if',
          name: 'If: user.role == admin',
          expanded: false,
          data: {
            condition: '${user_role} == "admin"',
          },
          children: [
            {
              id: 'http-4',
              type: 'http-request',
              name: 'GET /admin/settings',
              data: {
                method: 'GET',
                url: 'https://api.example.com/admin/settings',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ${auth_token}',
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    settings: { theme: 'dark', notifications: true },
                  }, null, 2),
                  contentType: 'application/json',
                  size: 128,
                  duration: 67,
                },
              },
            },
          ],
        },
        {
          id: 'loop-1',
          type: 'controller-loop',
          name: 'Loop: 5 iterations',
          expanded: false,
          data: {
            loopCount: 5,
          },
          children: [
            {
              id: 'http-5',
              type: 'http-request',
              name: 'GET /api/products',
              data: {
                method: 'GET',
                url: 'https://api.example.com/api/products',
                headers: {
                  'Accept': 'application/json',
                },
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    products: [
                      { id: 101, name: 'Product A', price: 29.99 },
                      { id: 102, name: 'Product B', price: 49.99 },
                    ],
                  }, null, 2),
                  contentType: 'application/json',
                  size: 256,
                  duration: 112,
                },
              },
            },
          ],
        },
        {
          id: 'retry-1',
          type: 'controller-retry',
          name: 'Retry: max 3 times',
          expanded: false,
          data: {
            maxRetries: 3,
            retryDelay: 1000,
          },
          children: [
            {
              id: 'http-6',
              type: 'http-request',
              name: 'POST /api/checkout',
              data: {
                method: 'POST',
                url: 'https://api.example.com/api/checkout',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ${auth_token}',
                },
                body: JSON.stringify({
                  cart_id: 'cart_789',
                  payment_method: 'credit_card',
                }, null, 2),
                response: {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    order_id: 'order_456',
                    status: 'confirmed',
                  }, null, 2),
                  contentType: 'application/json',
                  size: 98,
                  duration: 523,
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'metrics-1',
      type: 'metrics',
      name: 'Metrics',
      expanded: false,
      data: {
        enabled: true,
        percentiles: [50, 90, 95, 99],
        exportFormat: 'csv',
      },
    },
  ],
};