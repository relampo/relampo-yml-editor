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

function normalizeRelativeRequestPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function decodeEncodedVariablePlaceholders(value: string): string {
  return value
    .replace(/%7B%7B/gi, '{{')
    .replace(/%7D%7D/gi, '}}');
}

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

  const { withoutQuery, query } = splitRequestQuery(trimmed);

  try {
    if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
      const parsed = new URL(trimmed);
      const authority = withoutQuery.match(/^https?:\/\/[^/?#]*/i)?.[0] ?? '';
      const rawPath = authority ? withoutQuery.slice(authority.length).split('#', 1)[0] : parsed.pathname;
      return {
        protocol: parsed.protocol.replace(':', '').toLowerCase() === 'http' ? 'http' : 'https',
        baseUrl: parsed.host || '',
        path: normalizeRelativeRequestPath(decodeEncodedVariablePlaceholders(rawPath || '/')),
        query: decodeEncodedVariablePlaceholders(query),
        isAbsolute: true,
      };
    }

    return {
      protocol: 'https',
      baseUrl: '',
      path: normalizeRelativeRequestPath(withoutQuery),
      query,
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

const VARIABLE_PLACEHOLDER = /\{\{.*?\}\}|\$\{.*?\}/g;

function encodeQueryComponentPreservingVars(component: string): string {
  let encoded = '';
  let lastIndex = 0;
  for (const match of component.matchAll(VARIABLE_PLACEHOLDER)) {
    const start = match.index ?? 0;
    encoded += encodeURIComponent(component.slice(lastIndex, start)) + match[0];
    lastIndex = start + match[0].length;
  }
  return encoded + encodeURIComponent(component.slice(lastIndex));
}

export function buildRequestUrlWithQuery(baseUrl: string, params: RequestQueryParam[]): string {
  const enabledParams = params.filter(param => param.key.trim() !== '');
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  const queryString = enabledParams
    .map(param => `${encodeQueryComponentPreservingVars(param.key)}=${encodeQueryComponentPreservingVars(param.value)}`)
    .join('&');

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
}

function parseQueryStringManually(queryString: string): RequestQueryParam[] {
  if (!queryString) return [];
  const qs = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (!qs) return [];
  return qs.split('&').reduce<RequestQueryParam[]>((acc, pair) => {
    const eqIndex = pair.indexOf('=');
    if (eqIndex < 0) {
      if (pair.trim()) acc.push({ key: decodeURIComponent(pair.trim()), value: '' });
    } else {
      const key = decodeURIComponent(pair.slice(0, eqIndex));
      const value = pair.slice(eqIndex + 1);
      try {
        acc.push({ key, value: decodeURIComponent(value) });
      } catch {
        acc.push({ key, value });
      }
    }
    return acc;
  }, []);
}

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
    return parseQueryStringManually(parts.query);
  }
}
