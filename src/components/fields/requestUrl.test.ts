import { describe, expect, it } from 'vitest';
import { buildRequestUrl, buildRequestUrlWithQuery, parseRequestQueryParams, parseRequestUrl } from './requestUrl';

describe('requestUrl helpers', () => {
  it('preserves template placeholders when parsing relative request URLs', () => {
    expect(parseRequestUrl('/users/{{user_id}}?expand={{expand}}')).toEqual({
      protocol: 'https',
      baseUrl: '',
      path: '/users/{{user_id}}',
      query: '?expand={{expand}}',
      isAbsolute: false,
    });
  });

  it('preserves template placeholders when rebuilding relative request URLs', () => {
    expect(
      buildRequestUrl('/users/{{user_id}}?expand={{expand}}', {
        baseUrl: 'api.example.com',
      }),
    ).toBe('https://api.example.com/users/{{user_id}}?expand={{expand}}');
  });

  it('normalizes relative paths without encoding template placeholders', () => {
    expect(parseRequestUrl('users/{{user_id}}')).toEqual({
      protocol: 'https',
      baseUrl: '',
      path: '/users/{{user_id}}',
      query: '',
      isAbsolute: false,
    });
  });
});

describe('buildRequestUrlWithQuery', () => {
  // RLP-606: a query-param value set to a variable must reach the runtime as a
  // literal `{{var}}`/`${var}`, not percent-encoded, so it gets interpolated.
  it('keeps {{ }} variable placeholders unencoded in query values', () => {
    expect(buildRequestUrlWithQuery('/products', [{ key: 'product_id', value: '{{product_id}}' }])).toBe(
      '/products?product_id={{product_id}}',
    );
  });

  it('keeps ${ } variable placeholders unencoded in query values', () => {
    expect(buildRequestUrlWithQuery('/products', [{ key: 'product_id', value: '${product_id}' }])).toBe(
      '/products?product_id=${product_id}',
    );
  });

  it('still encodes the literal parts around a placeholder', () => {
    expect(buildRequestUrlWithQuery('/search', [{ key: 'q', value: 'a b {{term}}' }])).toBe(
      '/search?q=a%20b%20{{term}}',
    );
  });

  it('encodes ordinary values that contain no placeholders', () => {
    expect(buildRequestUrlWithQuery('/search', [{ key: 'q', value: 'a b&c' }])).toBe('/search?q=a%20b%26c');
  });

  it('appends with & when the base URL already has a query', () => {
    expect(buildRequestUrlWithQuery('/p?page=1', [{ key: 'id', value: '{{id}}' }])).toBe('/p?page=1&id={{id}}');
  });

  // The editor reads params back for display; a placeholder value must survive
  // the write -> read round trip so it is not double-encoded on the next edit.
  it('round-trips a placeholder value through parseRequestQueryParams', () => {
    const url = buildRequestUrlWithQuery('/products', [{ key: 'product_id', value: '{{product_id}}' }]);
    expect(parseRequestQueryParams(url)).toEqual([{ key: 'product_id', value: '{{product_id}}' }]);
  });
});
