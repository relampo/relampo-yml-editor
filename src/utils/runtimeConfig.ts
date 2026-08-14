export interface RuntimeConfig {
  mode: 'web' | 'studio';
  apiBaseUrl: string;
  statsigClientKey: string;
  statsigEnvironment: string;
}

function buildDefaults(): RuntimeConfig {
  return {
    mode: 'web',
    apiBaseUrl: import.meta.env.VITE_DEBUG_API_URL?.trim() ?? '',
    statsigClientKey: import.meta.env.VITE_STATSIG_CLIENT_KEY?.trim() ?? '',
    statsigEnvironment:
      import.meta.env.VITE_STATSIG_ENVIRONMENT?.trim() || (import.meta.env.DEV ? 'development' : 'production'),
  };
}

let runtimeConfig = buildDefaults();

function publicString(value: unknown, maxLength = 256): string {
  return typeof value === 'string' && value.length <= maxLength ? value.trim() : '';
}

function safeAPIBaseURL(value: unknown): string {
  const candidate = publicString(value, 2048);
  if (!candidate || typeof window === 'undefined') return '';
  try {
    const url = new URL(candidate, window.location.origin);
    return url.origin === window.location.origin ? candidate.replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

export async function loadRuntimeConfig(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/runtime-config.json', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return;
    const raw = body as Record<string, unknown>;
    runtimeConfig = {
      mode: raw.mode === 'studio' ? 'studio' : 'web',
      apiBaseUrl: safeAPIBaseURL(raw.apiBaseUrl),
      statsigClientKey: publicString(raw.statsigClientKey),
      statsigEnvironment: publicString(raw.statsigEnvironment, 64) || runtimeConfig.statsigEnvironment,
    };
  } catch {
    // Web deployments do not need this endpoint. Build defaults stay active.
  }
}

export function getRuntimeConfig(): Readonly<RuntimeConfig> {
  return runtimeConfig;
}

export function resetRuntimeConfigForTests(): void {
  runtimeConfig = buildDefaults();
}
