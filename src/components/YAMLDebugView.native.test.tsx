import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { dump } from 'js-yaml';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLDebugSession } from './YAMLDebugView';
import { parseYAMLToTree } from '../utils/yamlParser';
import { COMPONENT_FEATURES } from '../utils/componentConfiguration';
import type { EngineEvent } from '../utils/debugApi';
const api = vi.hoisted(() => ({
  handlers: [] as Array<{ onEvent: (event: EngineEvent) => void }>,
  start: vi.fn(async () => 'native-debug'),
}));
vi.mock('../utils/debugApi', async original => ({
  ...(await original<typeof import('../utils/debugApi')>()),
  startDebugRun: api.start,
  streamDebugRun: vi.fn((_: string, handler: { onEvent: (event: EngineEvent) => void }) => {
    api.handlers.push(handler);
    return vi.fn();
  }),
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  api.handlers.length = 0;
  api.start.mockClear();
});
const extractor = { type: 'jsonpath', var: 'captured', expression: '$.value' };
const cases = [
  {
    kind: 'request',
    method: 'POST',
    data: { url: 'http://example.test/check', method: 'POST', extractors: [extractor] },
  },
  { kind: 'grpc', method: 'GRPC', data: { method: '/demo/Call', extractors: [extractor] } },
  {
    kind: 'websocket',
    method: 'WS',
    data: { url: 'ws://example.test/ws', actions: [{ receive: { type: 'text', extractors: [extractor] } }] },
  },
  {
    kind: 'sql',
    method: 'SQL',
    data: { query: 'SELECT 7 AS value', extractors: [{ type: 'sql', column: 'value', var: 'captured' }] },
  },
  {
    kind: 'grpc stream',
    method: 'GRPC',
    data: {
      method: '/demo/Watch',
      stream: { type: 'server_streaming', receive: [{ index: 1, extractors: [extractor] }] },
    },
  },
];
it.each(cases)('shows real capture values and builtins in distinct tabs for $kind', async test => {
  const kind = test.kind === 'grpc stream' ? 'grpc' : test.kind;
  const yaml = dump({ scenarios: [{ steps: [{ [kind]: { ...test.data, name: 'Capture' } }] }] });
  render(
    <LanguageProvider>
      <YAMLDebugSession
        tree={parseYAMLToTree(yaml)}
        yamlCode={yaml}
        documentReady
        validationErrors={[]}
        componentCapabilities={{ version: 1, features: [...COMPONENT_FEATURES] }}
        onSelectNode={vi.fn()}
        onEditNode={vi.fn()}
      />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Run Debug' }));
  await waitFor(() => expect(api.handlers).toHaveLength(1));
  act(() =>
    api.handlers[0].onEvent({
      ts: '2026-11-12T13:00:00Z',
      name: 'Capture',
      method: test.method,
      path: '/runtime',
      step_path: 'scenarios[0].steps[0]',
      status: test.kind === 'request' ? 200 : 0,
      latency_ms: 1,
      concurrency: 1,
      variables: { captured: 'captured-7', unrelated: 'must-not-appear' },
      response_body: '{"value":"other-message"}',
      assertions: [],
      builtin_invocations: [
        { expression: '{{_randomInt(37,37)}}', value: 37, status: 'resolved', origin: 'Message.marker' },
      ],
    }),
  );
  fireEvent.click(await screen.findByRole('button', { name: /Capture|\/runtime/ }));
  fireEvent.click(screen.getByRole('button', { name: 'variables' }));
  expect(screen.getByText('captured (RES)')).toBeVisible();
  expect(screen.getByText('captured-7', { exact: true })).toBeVisible();
  expect(screen.queryByText('must-not-appear')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Built-ins' }));
  expect(screen.getByText('{{_randomInt(37,37)}}')).toBeVisible();
  expect(screen.getByText('37', { exact: true })).toBeVisible();
  expect(screen.getByText('Message.marker')).toBeVisible();
});
