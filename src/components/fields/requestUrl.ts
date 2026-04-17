const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

interface ParsedRequestUrl {
  protocol: 'http' | 'https';
  baseUrl: string;
  path: string;
  query: string;
  isAbsolute: boolean;
}

interface RequestQueryParam {
  key: string;
  value: string;
}

/**
 * Split a URL into the path and query-string pieces.
 *
 * @param url - Raw URL string.
 * @returns An object containing the substring before `?` and the query including `?`.
 */
function splitRequestQuery(url: string): { withoutQuery: string; query: string } {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) {
    return { withoutQuery: url, query: '' };
  }

  return {
    withoutQuery: url.slice(0, queryIndex),
    query: url.slice(queryIndex),
  };
}

/**
 * Parse a request URL into normalized parts.
 *
 * The return object always uses a normalized protocol (`http` or `https`),
 * a normalized path (always non-empty), and query text including the leading `?`.
 * Relative URLs are parsed against a local placeholder host and return `isAbsolute: false`.
 *
 * @param fullUrl - Input URL (absolute or relative).
 * @returns Parsed request components.
 */
export function parseRequestUrl(fullUrl: string): ParsedRequestUrl {
  const trimmed = String(fullUrl || '').trim();
  if (!trimmed) {
    return {
      protocol: 'https',
      baseUrl: '',
      path: '/',
      query: '',
      isAbsolute: false,
    };
  }

  const { withoutQuery } = splitRequestQuery(trimmed);

  try {
    if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
      const parsed = new URL(trimmed);
      return {
        protocol: parsed.protocol.replace(':', '').toLowerCase() === 'http' ? 'http' : 'https',
        baseUrl: parsed.host || '',
        path: parsed.pathname || '/',
        query: parsed.search || '',
        isAbsolute: true,
      };
    }

    const parsed = new URL(trimmed, 'http://placeholder.local');
    return {
      protocol: 'https',
      baseUrl: '',
      path: parsed.pathname || withoutQuery || '/',
      query: parsed.search || '',
      isAbsolute: false,
    };
  } catch {
    return {
      protocol: 'https',
      baseUrl: '',
      path: withoutQuery || '/',
      query: trimmed.includes('?') ? trimmed.slice(trimmed.indexOf('?')) : '',
      isAbsolute: false,
    };
  }
}

/**
 * Build a URL from existing context and optional overrides.
 *
 * - Uses `current.protocol`, `current.baseUrl`, and `current.path` as defaults.
 * - Force-normalizes protocol to `http` or `https`.
 * - Always ensures the path starts with `/`.
 * - Preserves the current query string from `currentUrl`.
 *
 * @param currentUrl - Source URL used for defaults and query retention.
 * @param next - Optional overrides to apply.
 * @returns A URL string. Relative output is returned when `next.baseUrl` is empty.
 */
export function buildRequestUrl(
  currentUrl: string,
  next: { protocol?: string; baseUrl?: string; path?: string },
): string {
  const current = parseRequestUrl(currentUrl);
  const protocol = (next.protocol ?? current.protocol ?? 'https').toLowerCase() === 'http' ? 'http' : 'https';
  const baseUrl = (next.baseUrl ?? current.baseUrl ?? '').trim();
  let path = (next.path ?? current.path ?? '/').trim();
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  const base = baseUrl ? `${protocol}://${baseUrl}` : '';
  return `${base}${path}${current.query}`;
}

/**
 * Append URL-encoded query parameters to a base URL.
 *
 * Empty keys are ignored. Parameters are encoded with
 * `encodeURIComponent` and joined using `&`.
 *
 * @param baseUrl - Base URL string to append query params to.
 * @param params - Array of key/value pairs.
 * @returns URL with query string appended, or the base URL unchanged when no params are enabled.
 */
export function buildRequestUrlWithQuery(baseUrl: string, params: RequestQueryParam[]): string {
  const enabledParams = params.filter(param => param.key.trim() !== '');
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  const queryString = enabledParams
    .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
    .join('&');

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
}

/**
 * Parse query string parameters from a URL into an ordered list.
 *
 * Supports absolute URLs and relative paths.
 * For relative input, parsing is performed against a placeholder host.
 *
 * @param url - Raw URL containing query parameters.
 * @returns Parsed query params in insertion order, or an empty array if parsing fails.
 */
export function parseRequestQueryParams(url: string): RequestQueryParam[] {
  const parts = parseRequestUrl(url);
  const candidate = parts.isAbsolute
    ? url.trim()
    : `http://placeholder.local${parts.path}${parts.query}`;

  try {
    const parsed = new URL(candidate);
    const params: RequestQueryParam[] = [];
    parsed.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    return params;
  } catch {
    return [];
  }
}
