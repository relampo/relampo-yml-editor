import { StatsigClient, LogEventCompressionMode } from '@statsig/js-client';
import { getRuntimeConfig } from './runtimeConfig';

const CONSENT_KEY = 'relampo_studio_usage_consent';
const VISITOR_KEY = 'relampo_yml_editor_visitor_id';
const EVENTS = new Set([
  'studio_session_started',
  'studio_document_opened',
  'studio_validation_completed',
  'studio_debug_started',
  'studio_debug_completed',
  'studio_load_started',
  'studio_load_completed',
  'studio_document_exported',
]);
const OUTCOMES = new Set(['success', 'failure', 'completed', 'stopped', 'errored']);
const DURATIONS = new Set(['under_1s', '1_to_10s', '10_to_60s', '1_to_5m', 'over_5m']);
let statsigClient: StatsigClient | null = null;
let consentOverride: boolean | null = null;
let editorVersion = 'unknown';
let lifecycleRegistered = false;
const startedRuns = new Map<string, { kind: 'debug' | 'load'; startedAt: number }>();

type EventMetadata = Record<string, string | number | boolean | null | undefined>;

export function getAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (consentOverride !== null) return consentOverride;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function setAnalyticsVersion(version: unknown): void {
  editorVersion =
    typeof version === 'string' && version.length <= 64 && /^(v?\d+\.\d+\.\d+([-+][A-Za-z0-9.-]+)?|dev)$/.test(version) ? version : 'unknown';
}

export function setAnalyticsConsent(enabled: boolean): void {
  consentOverride = false;
  try {
    window.localStorage.setItem(CONSENT_KEY, enabled ? 'yes' : 'no');
    consentOverride = enabled;
  } catch {
    // Opt-out remains effective in memory even if browser storage is blocked.
    if (enabled) return;
  }
  if (enabled) {
    initializeAnalytics();
    return;
  }
  startedRuns.clear();
  const previous = statsigClient;
  statsigClient = null;
  if (previous) {
    // Disable logging before shutdown: opt-out must discard queued events.
    previous.updateRuntimeOptions({ loggingEnabled: 'disabled' });
    void previous.shutdown().catch(() => undefined);
  }
  try {
    window.localStorage.removeItem(VISITOR_KEY);
  } catch {
    /* Consent remains off. */
  }
}

export function initializeAnalytics(): StatsigClient | null {
  const config = getRuntimeConfig();
  if (!getAnalyticsConsent() || config.mode !== 'studio' || !config.statsigClientKey) return null;
  if (statsigClient) return statsigClient;
  let visitorId: string;
  try {
    const stored = window.localStorage.getItem(VISITOR_KEY);
    visitorId =
      stored && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(stored) ? stored : window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, visitorId);
  } catch {
    return null;
  }
  const client = new StatsigClient(
    config.statsigClientKey,
    { userID: visitorId },
    {
      environment: { tier: config.statsigEnvironment },
      disableStorage: true,
      disableStableID: true,
      includeCurrentPageUrlWithEvents: false,
      logEventCompressionMode: LogEventCompressionMode.Disabled,
      networkConfig: {
        networkOverrideFunc: async (url, args) => {
          const ignored = () => new Response('{"success":true}', { status: 200 });
          if (!getAnalyticsConsent()) return ignored();
          const path = new URL(url).pathname;
          if (path.endsWith('/sdk_exception')) return ignored();
          if (path.endsWith('/rgstr') || path.endsWith('/log_event')) {
            if (typeof args.body !== 'string') return ignored();
            const batch = JSON.parse(args.body) as { events?: Array<{ eventName?: string }> };
            batch.events = batch.events
              ?.filter(event => typeof event.eventName === 'string' && EVENTS.has(event.eventName))
              .map(event => ({ ...event, user: { userID: visitorId } }));
            if (!batch.events?.length) return ignored();
            return fetch(url, { ...args, body: JSON.stringify(batch) });
          }
          return fetch(url, args);
        },
      },
    },
  );
  statsigClient = client;
  void client.initializeAsync().catch(() => undefined);
  if (!lifecycleRegistered) {
    lifecycleRegistered = true;
    const flush = () => {
      if (getAnalyticsConsent()) void statsigClient?.flush().catch(() => undefined);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  logStatsigEvent('studio_session_started');
  return client;
}

/** Only fixed product event names and bounded labels can reach the provider. */
export function logStatsigEvent(eventName: string, metadata: EventMetadata = {}): void {
  if (!EVENTS.has(eventName) || !getAnalyticsConsent()) return;
  const client = statsigClient ?? initializeAnalytics();
  if (!client) return;
  const safe: Record<string, string> = { mode: 'studio', version: editorVersion };
  if (typeof metadata.outcome === 'string' && OUTCOMES.has(metadata.outcome)) safe.outcome = metadata.outcome;
  if (typeof metadata.duration_bucket === 'string' && DURATIONS.has(metadata.duration_bucket))
    safe.duration_bucket = metadata.duration_bucket;
  client.logEvent(eventName, undefined, safe);
}

export function trackStudioRunStarted(runId: string, kind: 'debug' | 'load'): void {
  if (!getAnalyticsConsent()) return;
  startedRuns.set(runId, { kind, startedAt: performance.now() });
  logStatsigEvent(`studio_${kind}_started`);
}

export function trackStudioRunCompleted(runId: string, outcome: string): void {
  const run = startedRuns.get(runId);
  if (!run) return;
  startedRuns.delete(runId);
  const elapsed = performance.now() - run.startedAt;
  const duration_bucket =
    elapsed < 1000
      ? 'under_1s'
      : elapsed < 10_000
        ? '1_to_10s'
        : elapsed < 60_000
          ? '10_to_60s'
          : elapsed < 300_000
            ? '1_to_5m'
            : 'over_5m';
  logStatsigEvent(`studio_${run.kind}_completed`, { outcome, duration_bucket });
}
