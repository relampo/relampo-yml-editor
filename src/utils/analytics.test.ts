import { beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  logEvent: vi.fn(),
  initializeAsync: vi.fn(async () => undefined),
  flush: vi.fn(async () => undefined),
  shutdown: vi.fn(async () => undefined),
  updateRuntimeOptions: vi.fn(),
  options: {} as Record<string, unknown>,
  users: [] as unknown[],
}));
vi.mock('@statsig/js-client', () => ({
  LogEventCompressionMode: { Disabled: 'd' },
  StatsigClient: class {
    logEvent = sdk.logEvent;
    initializeAsync = sdk.initializeAsync;
    flush = sdk.flush;
    shutdown = sdk.shutdown;
    updateRuntimeOptions = sdk.updateRuntimeOptions;
    constructor(_key: string, user: unknown, options: Record<string, unknown>) {
      sdk.options = options;
      sdk.users.push(user);
    }
  },
}));
vi.mock('./runtimeConfig', () => ({
  getRuntimeConfig: () => ({ mode: 'studio', statsigClientKey: 'client-public-test', statsigEnvironment: 'test' }),
}));
import {
  getAnalyticsConsent,
  initializeAnalytics,
  logStatsigEvent,
  setAnalyticsConsent,
  setAnalyticsVersion,
  trackStudioRunStarted,
  trackStudioRunCompleted,
} from './analytics';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  setAnalyticsConsent(false);
  vi.clearAllMocks();
  sdk.users = [];
});
describe('explicit Studio usage metrics', () => {
  it('does not create SDK or visitor identity without explicit consent', () => {
    expect(getAnalyticsConsent()).toBe(false);
    expect(initializeAnalytics()).toBeNull();
    logStatsigEvent('studio_document_opened');
    expect(sdk.initializeAsync).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('relampo_yml_editor_visitor_id')).toBeNull();
  });
  it('sends only allowed event names and bounded metadata', () => {
    setAnalyticsConsent(true);
    setAnalyticsVersion('2.9.4');
    logStatsigEvent('studio_document_opened', {
      outcome: 'success',
      url: 'https://secret',
      yaml: 'private',
      file_name: 'private.yaml',
      variable: 'secret',
      duration_bucket: 'over_5m',
    });
    logStatsigEvent('arbitrary-private-name', { outcome: 'success' });
    expect(sdk.logEvent).toHaveBeenLastCalledWith('studio_document_opened', undefined, {
      mode: 'studio',
      version: '2.9.4',
      outcome: 'success',
      duration_bucket: 'over_5m',
    });
    expect(sdk.options).toMatchObject({
      disableStorage: true,
      disableStableID: true,
      includeCurrentPageUrlWithEvents: false,
    });
    expect(sdk.options).not.toHaveProperty('plugins');
    expect(sdk.users[0]).toEqual({ userID: expect.any(String) });
  });
  it('stops logging before SDK shutdown and drops unfinished runs on opt-out', () => {
    setAnalyticsConsent(true);
    trackStudioRunStarted('private-run-id', 'debug');
    setAnalyticsConsent(false);
    expect(sdk.updateRuntimeOptions).toHaveBeenCalledWith({ loggingEnabled: 'disabled' });
    expect(sdk.updateRuntimeOptions.mock.invocationCallOrder[0]).toBeLessThan(sdk.shutdown.mock.invocationCallOrder[0]);
    const count = sdk.logEvent.mock.calls.length;
    trackStudioRunCompleted('private-run-id', 'success');
    logStatsigEvent('studio_document_exported');
    expect(sdk.logEvent).toHaveBeenCalledTimes(count);
    expect(window.localStorage.getItem('relampo_yml_editor_visitor_id')).toBeNull();
  });
  it('counts one completion for a run without exposing its ID or exact duration', () => {
    setAnalyticsConsent(true);
    trackStudioRunStarted('secret-run', 'load');
    trackStudioRunCompleted('secret-run', 'completed');
    trackStudioRunCompleted('secret-run', 'completed');
    expect(sdk.logEvent.mock.calls.filter(call => call[0] === 'studio_load_completed')).toHaveLength(1);
    expect(sdk.logEvent).toHaveBeenLastCalledWith('studio_load_completed', undefined, {
      mode: 'studio',
      version: expect.any(String),
      outcome: 'completed',
      duration_bucket: 'under_1s',
    });
  });
  it('filters SDK diagnostics and exceptions before the network boundary', async () => {
    setAnalyticsConsent(true);
    const network = sdk.options.networkConfig as {
      networkOverrideFunc: (url: string, args: RequestInit) => Promise<Response>;
    };
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"success":true}'));
    await network.networkOverrideFunc('https://metrics.example/sdk_exception', { body: 'private error stack' });
    expect(send).not.toHaveBeenCalled();
    await network.networkOverrideFunc('https://metrics.example/rgstr', {
      body: JSON.stringify({
        events: [
          { eventName: 'statsig::diagnostics', metadata: { error: 'private' } },
          { eventName: 'studio_document_opened', metadata: { mode: 'studio' } },
        ],
      }),
    });
    expect(JSON.parse(String(send.mock.calls[0][1]?.body)).events).toEqual([
      { eventName: 'studio_document_opened', metadata: { mode: 'studio' }, user: { userID: expect.any(String) } },
    ]);
    setAnalyticsConsent(false);
    await network.networkOverrideFunc('https://metrics.example/rgstr', {
      body: JSON.stringify({ events: [{ eventName: 'studio_session_started' }] }),
    });
    expect(send).toHaveBeenCalledTimes(1);
    send.mockRestore();
  });
  it('turns off immediately when browser storage cannot save the preference', () => {
    setAnalyticsConsent(true);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setAnalyticsConsent(false);
    expect(getAnalyticsConsent()).toBe(false);
    expect(sdk.shutdown).toHaveBeenCalled();
  });
  it('drops unbounded outcome, duration, and version strings', () => {
    setAnalyticsConsent(true);
    setAnalyticsVersion('secret path');
    logStatsigEvent('studio_validation_completed', { outcome: 'secret error', duration_bucket: '12345' });
    expect(sdk.logEvent).toHaveBeenLastCalledWith('studio_validation_completed', undefined, {
      mode: 'studio',
      version: 'unknown',
    });
  });
});
