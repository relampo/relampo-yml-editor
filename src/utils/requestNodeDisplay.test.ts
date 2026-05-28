import { describe, expect, it } from 'vitest';
import { buildRequestNodeLabel, getRequestNodeHost, getUpdatedRequestNodePresentation } from './requestNodeDisplay';

describe('getRequestNodeHost', () => {
  it('returns the host for absolute URLs (secondary hosts)', () => {
    expect(getRequestNodeHost('https://host2.example.com/api/login')).toBe('host2.example.com');
    expect(getRequestNodeHost('http://api.example.org:8080/v1')).toBe('api.example.org:8080');
  });

  it('returns empty string for relative URLs (base host)', () => {
    expect(getRequestNodeHost('/home')).toBe('');
    expect(getRequestNodeHost('assets/player/intro.mp4')).toBe('');
    expect(getRequestNodeHost('')).toBe('');
    expect(getRequestNodeHost(undefined)).toBe('');
  });
});

describe('buildRequestNodeLabel', () => {
  it('strips the host so absolute and relative URLs share the same compact label', () => {
    expect(buildRequestNodeLabel('get', { url: 'https://host2.example.com/api/login?x=1' })).toBe('GET: /api/login?x=1');
    expect(buildRequestNodeLabel('request', { method: 'POST', url: '/cart' })).toBe('POST: /cart');
  });
});

describe('getUpdatedRequestNodePresentation', () => {
  it('keeps the original short-form HTTP verb when method is omitted', () => {
    const updated = getUpdatedRequestNodePresentation({
      nodeType: 'post',
      currentName: 'POST: /login',
      currentData: { url: '/login' },
      updatedData: { url: '/login?source=editor' },
    });

    expect(updated.type).toBe('post');
    expect(updated.name).toBe('POST: /login?source=editor');
  });
});
