import { expect, it } from 'vitest';
import { buildEditedRequestQuery, parseEditableRequestQuery } from './requestQueryEditing';

it.each([
  '/p?{{token}},gx-no-cache={{_timestamp()}}',
  '/p?1,,0',
  '/p?encrypted-value,0,01',
  '/p?state=a;b',
  '/p?%69d=old&z=a%2cb%20c&plus=a+b&literal=a%2Bb&x=1&x=2&&#anchor',
  '/p?',
  '/p?&&',
  '/p?=value&flag&x=%ZZ',
  '/p?%20=value&+=value&flag',
])('preserves the full authored query on a round trip: %s', url => {
  const fragment = url.split('?')[0];
  expect(buildEditedRequestQuery(url, fragment, parseEditableRequestQuery(url))).toBe(url);
});

it('keeps duplicate rows separate and changes only the selected value', () => {
  const source = '/p?%69d=one&id=two&z=a%2cb%20c&&flag#part';
  const rows = parseEditableRequestQuery(source);
  rows[1].value = 'A&B {{token}}';
  expect(buildEditedRequestQuery(source, '/p', rows)).toBe('/p?%69d=one&id=A%26B%20{{token}}&z=a%2cb%20c&&flag#part');
});

it('removes only one duplicate and preserves flags and separators', () => {
  const source = '/p?x=1&flag&x=2&&';
  const rows = parseEditableRequestQuery(source).filter(row => row.sourceIndex !== 2);
  expect(buildEditedRequestQuery(source, '/p', rows)).toBe('/p?x=1&flag&&');
});

it('adds a new field without decoding existing escapes or normalizing existing keys', () => {
  const source = '/p?{{token}},gx-no-cache=123&z=a%2Cb%20c&';
  const rows = [...parseEditableRequestQuery(source), { key: 'new', value: 'a b&c' }];
  expect(buildEditedRequestQuery(source, '/p', rows)).toBe('/p?{{token}},gx-no-cache=123&z=a%2Cb%20c&new=a%20b%26c');
});

it('replaces the base URL without rewriting the query or losing its fragment', () => {
  const source = '/p?flag&value=a%2cb%20c#part';
  expect(buildEditedRequestQuery(source, 'https://other.test/new', parseEditableRequestQuery(source))).toBe(
    'https://other.test/new?flag&value=a%2cb%20c#part',
  );
});
