import { dump, load } from 'js-yaml';
export type StudioProtocol = 'grpc' | 'websocket' | 'https';
export type StarterProtocol = Exclude<StudioProtocol, 'grpc'>;
interface ProtocolDraft {
  url: string;
  name?: string;
  method?: string;
  message?: string;
  headers?: string;
  receive?: boolean;
  expected?: string;
}
function object(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function createProtocolStep(protocol: StarterProtocol, draft: ProtocolDraft): Record<string, unknown> {
  const url = draft.url.trim();
  const validScheme = protocol === 'websocket' ? /^wss?:\/\//i : /^https?:\/\//i;
  if (!validScheme.test(url))
    throw Error(protocol === 'websocket' ? 'Use a ws:// or wss:// URL.' : 'Use an http:// or https:// URL.');
  try {
    new URL(url.replace(/\{\{[^}]+\}\}|\$\{[^}]+\}/g, 'variable'));
  } catch {
    throw Error('Enter a valid URL.');
  }
  let headers: Record<string, string> | undefined;
  if (draft.headers?.trim()) {
    const value: unknown = JSON.parse(draft.headers);
    if (!object(value) || Object.values(value).some(item => typeof item !== 'string'))
      throw Error('Headers must be a JSON object with text values.');
    headers = value;
  }
  if (protocol === 'https') {
    const method = draft.method || 'GET';
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method))
      throw Error('Select an HTTP method.');
    return {
      request: {
        name: draft.name?.trim() || 'HTTPS request',
        method,
        url,
        timeout: '10s',
        ...(headers ? { headers } : {}),
        ...(draft.message ? { body: draft.message } : {}),
      },
    };
  }
  const actions: unknown[] = [];
  if (draft.message) actions.push({ send: { type: 'text', data: draft.message } });
  if (draft.receive !== false)
    actions.push({
      receive: {
        type: 'text',
        timeout: '10s',
        ...(draft.expected ? { assertions: [{ type: 'contains', value: draft.expected }] } : {}),
      },
    });
  actions.push({ close: { code: 1000 } });
  return {
    websocket: {
      name: draft.name?.trim() || 'WebSocket session',
      url,
      timeout: '30s',
      ...(headers ? { headers } : {}),
      actions,
    },
  };
}
// Add explicit-address operations without changing transport defaults or load.
export function appendProtocolSteps(current: string, steps: Record<string, unknown>[]): string {
  const parsed: unknown = current.trim()
    ? load(current)
    : {
        test: { name: 'Protocol scenario', version: '1.0' },
        scenarios: [
          { name: 'Scenario', load: { type: 'constant', users: 1, duration: '1m', iterations: 1 }, steps: [] },
        ],
      };
  if (!object(parsed)) throw Error('Open a valid scenario before adding an operation.');
  if (parsed.scenarios !== undefined && !Array.isArray(parsed.scenarios)) throw Error('Scenarios must be a list.');
  if (!parsed.scenarios?.length)
    parsed.scenarios = [
      { name: 'Scenario', load: { type: 'constant', users: 1, duration: '1m', iterations: 1 }, steps: [] },
    ];
  const scenario: unknown = parsed.scenarios[0];
  if (!object(scenario) || (scenario.steps !== undefined && !Array.isArray(scenario.steps)))
    throw Error('Scenario steps must be a list.');
  scenario.steps = [...(scenario.steps || []), ...steps];
  return dump(parsed, { lineWidth: 110, noRefs: true });
}
