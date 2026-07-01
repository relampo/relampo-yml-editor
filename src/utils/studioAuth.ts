// Studio session-token forwarding (RLP-507 security hardening).
//
// `relampo studio` starts a local API that executes caller-supplied YAML, so it
// generates a per-process session token and rejects every /api/* call that does
// not present it. The token is handed to this SPA exactly once, via the launch
// URL query string (`http://127.0.0.1:<port>/?token=<token>`). We read it here
// and attach it to every studio request:
//   - fetch calls send it as the `X-Relampo-Studio-Token` header.
//   - SSE (EventSource) and report links send it as the `?token=` query param,
//     because EventSource cannot set request headers. The studio server accepts
//     either form.
//
// Standalone deployments and `vite dev` without a token simply get no token, so
// every helper here is a no-op in that case and leaves requests unchanged.

const STUDIO_TOKEN_HEADER = 'X-Relampo-Studio-Token';

// Read fresh on each call rather than memoizing: the token lives in the page URL
// for the whole session and parsing it is cheap, so there is no cache to
// invalidate (and tests can vary the URL without module-load ordering games).
export function studioToken(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  try {
    return new URLSearchParams(window.location.search).get('token') ?? '';
  } catch {
    return '';
  }
}

// Merges the studio token header into any existing fetch headers. Returns a
// Headers object either way; when there is no token it adds nothing.
export function studioAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = studioToken();
  if (token) headers.set(STUDIO_TOKEN_HEADER, token);
  return headers;
}

// Appends `token=<token>` to a URL used where headers cannot be sent
// (EventSource streams, report links opened in a new tab). No-op without a
// token.
export function withStudioToken(url: string): string {
  const token = studioToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}
