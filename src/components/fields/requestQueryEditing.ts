import { encodeQueryComponentPreservingVars } from './requestUrl';

export interface EditableRequestQueryParam {
  key: string;
  value: string;
  // Identity in the authored query, not a decoded key: duplicates are separate rows.
  sourceIndex?: number;
}

function splitQuery(url: string) {
  const hash = url.indexOf('#');
  const fragment = hash < 0 ? '' : url.slice(hash);
  const beforeFragment = hash < 0 ? url : url.slice(0, hash);
  const question = beforeFragment.indexOf('?');
  return {
    fragment,
    hasQuery: question >= 0,
    query: question < 0 ? '' : beforeFragment.slice(question + 1),
  };
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    // Keep malformed authored input visible; validation belongs to the runtime.
    return value;
  }
}

function splitField(raw: string) {
  const equals = raw.indexOf('=');
  const key = equals < 0 ? raw : raw.slice(0, equals);
  const value = equals < 0 ? '' : raw.slice(equals + 1);
  return { key, value, hasEquals: equals >= 0 };
}

export function parseEditableRequestQuery(url: string): EditableRequestQueryParam[] {
  const { hasQuery, query } = splitQuery(url);
  if (!hasQuery || !query) return [];
  return query.split('&').flatMap((raw, sourceIndex) => {
    if (!raw) return [];
    const { key, value } = splitField(raw);
    return [{ key: decode(key), value: decode(value), sourceIndex }];
  });
}

/** Preserve untouched fields byte for byte, including spelling, flags and separators. */
export function buildEditedRequestQuery(
  sourceUrl: string,
  baseUrl: string,
  params: EditableRequestQueryParam[],
): string {
  const source = splitQuery(sourceUrl);
  const rows = new Map(params.filter(row => row.sourceIndex !== undefined).map(row => [row.sourceIndex, row]));
  const fields = source.hasQuery && source.query !== '' ? source.query.split('&') : [];
  const kept = fields.flatMap((raw, index) => {
    if (!raw) return [''];
    const row = rows.get(index);
    if (!row) return [];
    const original = splitField(raw);
    const originalKey = decode(original.key);
    if (!row.key.trim() && row.key !== originalKey) return [];
    const key = row.key === originalKey ? original.key : encodeQueryComponentPreservingVars(row.key);
    const value = row.value === decode(original.value) ? original.value : encodeQueryComponentPreservingVars(row.value);
    return [key + (original.hasEquals || row.value !== '' ? '=' + value : '')];
  });
  let query = kept.join('&');
  const added = params
    .filter(row => row.sourceIndex === undefined && row.key.trim())
    .map(row => `${encodeQueryComponentPreservingVars(row.key)}=${encodeQueryComponentPreservingVars(row.value)}`);
  if (added.length) query += (query && !query.endsWith('&') ? '&' : '') + added.join('&');
  const question = query !== '' || (source.hasQuery && source.query === '') ? '?' : '';
  return baseUrl + question + query + source.fragment;
}
