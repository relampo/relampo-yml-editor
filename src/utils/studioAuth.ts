
const STUDIO_TOKEN_HEADER = 'X-Relampo-Studio-Token';
let sessionToken: string | null = null;

export function initializeStudioSession(): void {
  if (typeof window === 'undefined' || !window.location || sessionToken !== null) return;

  const url = new URL(window.location.href);
  sessionToken = url.searchParams.get('token') ?? '';
  if (!url.searchParams.has('token')) return;

  url.searchParams.delete('token');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function studioToken(): string {
  if (sessionToken !== null) return sessionToken;
  if (typeof window === 'undefined' || !window.location) return '';
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

export function resetStudioSessionForTests(): void {
  sessionToken = null;
}

export function studioAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = studioToken();
  if (token) headers.set(STUDIO_TOKEN_HEADER, token);
  return headers;
}

export function withStudioToken(url: string): string {
  const token = studioToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}
