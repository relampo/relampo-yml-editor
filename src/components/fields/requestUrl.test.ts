import { describe, expect, it } from 'vitest';
import { buildRequestUrl, parseRequestUrl } from './requestUrl';

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
