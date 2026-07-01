import { afterEach, describe, expect, it } from 'vitest';
import { studioAuthHeaders, studioToken, withStudioToken } from './studioAuth';

// jsdom lets us vary the page URL (and thus ?token=) via history.replaceState.
function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

afterEach(() => {
  setUrl('/');
});

describe('studioToken', () => {
  it('returns the token from the launch URL query string', () => {
    setUrl('/?token=abc123');
    expect(studioToken()).toBe('abc123');
  });

  it('returns empty string when no token is present', () => {
    setUrl('/');
    expect(studioToken()).toBe('');
  });
});

describe('studioAuthHeaders', () => {
  it('adds the studio token header when a token is present', () => {
    setUrl('/?token=secret');
    expect(studioAuthHeaders().get('X-Relampo-Studio-Token')).toBe('secret');
  });

  it('adds no token header without a token, preserving existing headers', () => {
    setUrl('/');
    const headers = studioAuthHeaders({ 'Content-Type': 'application/json' });
    expect(headers.get('X-Relampo-Studio-Token')).toBeNull();
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('keeps existing headers alongside the token', () => {
    setUrl('/?token=secret');
    const headers = studioAuthHeaders({ 'Content-Type': 'application/json' });
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Relampo-Studio-Token')).toBe('secret');
  });
});

describe('withStudioToken', () => {
  it('appends the token with ? when the URL has no query', () => {
    setUrl('/?token=secret');
    expect(withStudioToken('/api/run/1/events')).toBe('/api/run/1/events?token=secret');
  });

  it('appends the token with & when the URL already has a query', () => {
    setUrl('/?token=secret');
    expect(withStudioToken('/api/x?path=%2Ftmp')).toBe('/api/x?path=%2Ftmp&token=secret');
  });

  it('url-encodes the token', () => {
    setUrl('/?token=a%2Bb%2Fc');
    expect(withStudioToken('/api/run/1/report')).toBe('/api/run/1/report?token=a%2Bb%2Fc');
  });

  it('returns the URL unchanged when there is no token', () => {
    setUrl('/');
    expect(withStudioToken('/api/run/1/events')).toBe('/api/run/1/events');
  });
});
