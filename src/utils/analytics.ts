import { StatsigClient, type StatsigUser } from '@statsig/js-client';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';

const VISITOR_ID_STORAGE_KEY = 'relampo_yml_editor_visitor_id';
const APP_NAME = 'relampo-yml-editor';

let statsigClient: StatsigClient | null = null;
let isInitializing = false;
let hasLifecycleFlushHandlers = false;

function getClientKey(): string {
  return import.meta.env.VITE_STATSIG_CLIENT_KEY?.trim() ?? '';
}

function getEnvironmentTier(): string {
  return import.meta.env.VITE_STATSIG_ENVIRONMENT?.trim() || (import.meta.env.DEV ? 'development' : 'production');
}

function getOrCreateVisitorId(): string {
  const existingId = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (existingId) return existingId;

  const nextId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, nextId);
  return nextId;
}

function registerLifecycleFlushHandlers(client: StatsigClient) {
  if (hasLifecycleFlushHandlers) return;
  hasLifecycleFlushHandlers = true;

  const flush = () => {
    void client.flush().catch(() => undefined);
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function initializeAnalytics(): StatsigClient | null {
  if (typeof window === 'undefined') return null;

  const clientKey = getClientKey();
  if (!clientKey) return null;
  if (statsigClient) return statsigClient;

  const user: StatsigUser = {
    userID: getOrCreateVisitorId(),
    custom: {
      app: APP_NAME,
    },
  };

  statsigClient = new StatsigClient(clientKey, user, {
    environment: { tier: getEnvironmentTier() },
    plugins: [new StatsigAutoCapturePlugin()],
  });

  registerLifecycleFlushHandlers(statsigClient);

  if (!isInitializing) {
    isInitializing = true;
    void statsigClient.initializeAsync().finally(() => {
      isInitializing = false;
    });
  }

  return statsigClient;
}
