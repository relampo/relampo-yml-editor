import { describe, expect, it } from 'vitest';
import { buildRelampoRegex, buildSearchRegex, findMatchRanges, normalizeRelampoRegexForJavaScript } from './debugSearch';

describe('Relampo regex normalization', () => {
  it.each([
    ['(?i)token', 'token', 'gi'],
    ['(?s)a.b', 'a.b', 'gs'],
    ['(?m)^token$', '^token$', 'gm'],
    ['(?is)version=(.+?)', 'version=(.+?)', 'gis'],
  ])('translates %s to JavaScript syntax', (pattern, expectedPattern, expectedFlags) => {
    expect(normalizeRelampoRegexForJavaScript(pattern)).toEqual({
      pattern: expectedPattern,
      flags: expectedFlags,
    });
  });

  it('keeps ordinary JavaScript patterns unchanged and always adds global matching', () => {
    expect(normalizeRelampoRegexForJavaScript('version=(.+?)', 'i')).toEqual({
      pattern: 'version=(.+?)',
      flags: 'gi',
    });
  });

  it('rejects unsupported inline flags instead of silently matching nothing', () => {
    expect(buildRelampoRegex('(?x)token', 'gi')).toBeNull();
  });

  it('matches a Relampo-generated inline-flag pattern and preserves capture highlighting', () => {
    const text = '{\n  "VERSION": "2024.11.0"\n}';
    const pattern = '(?is)"version"\\s*:\\s*"(.+?)"';
    expect(buildSearchRegex(pattern)).not.toBeNull();
    const ranges = findMatchRanges(text, pattern, 'regex');
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['2024.11.0']);
  });

  it('accepts the generated HTML JSON-attribute extractor pattern', () => {
    const text = `<div data-cf-beacon='{"version":"2024.11.0","token":"abc123"}'></div>`;
    const pattern = String.raw`(?is)\bdata-cf-beacon\s*=\s*(?:'[^']*?|"(?:\\.|[^"])*?)(?:&#34;|&quot;|\\?")token(?:&#34;|&quot;|\\?")\s*:\s*(?:&#34;|&quot;|\\?")([^"'<>&\\]+)(?:&#34;|&quot;|\\?")`;
    const ranges = findMatchRanges(text, pattern, 'regex');
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['abc123']);
  });

  it('accepts a generated Relampo pattern longer than the legacy 200-character limit', () => {
    const text = '<script src="/app?url=https://example.com/app.js"></script>';
    const pattern = String.raw`(?is)(?:.*?\b(?:href|src|data-action|data-endpoint|data-href|data-src|data-url)\s*=\s*["']?[^"'>\s]*\?[^"'>\s]*["']?){0,1}.*?\bsrc\s*=\s*["']?[^"'>\s]*?(?:[?&]|&amp;)(?:u|%75)(?:r|%72)(?:l|%6C)=([^&"'>\s]+)`;

    expect(pattern.length).toBeGreaterThan(200);
    expect(buildSearchRegex(pattern)).not.toBeNull();
    const ranges = findMatchRanges(text, pattern, 'regex');
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['https://example.com/app.js']);
  });

  it('accepts the generated jsessionid extractor that uses a POSIX class', () => {
    const text = `<a href="/app;jsessionid=ABC123?x=1">go</a>`;
    const pattern = String.raw`(?is)\bhref\s*=\s*["']?[^"'>\s]*?;jsessionid=([^;/?#"'<>[:space:]]+)`;

    expect(buildSearchRegex(pattern)).not.toBeNull();
    const ranges = findMatchRanges(text, pattern, 'regex');
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['ABC123']);
  });

  it.each([
    ['[[:digit:]]+', '42', '42'],
    ['[[:alpha:]]+', 'ab1', 'ab'],
    ['[^[:space:]]+', ' xy ', 'xy'],
  ])('expands the POSIX class in %s', (pattern, text, expected) => {
    const ranges = findMatchRanges(text, pattern, 'regex');
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual([expected]);
  });

  it('leaves an unknown POSIX-looking class untouched', () => {
    expect(normalizeRelampoRegexForJavaScript('[[:nope:]]').pattern).toBe('[[:nope:]]');
  });

  it('rejects a pattern past the length cap', () => {
    expect(buildSearchRegex('a'.repeat(1024))).not.toBeNull();
    expect(buildSearchRegex('a'.repeat(1025))).toBeNull();
  });
});

describe('findMatchRanges — text mode', () => {
  it('finds every case-insensitive literal occurrence', () => {
    expect(findMatchRanges('aXaXa', 'x', 'text')).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
    ]);
  });

  it('returns nothing for an empty query or empty text', () => {
    expect(findMatchRanges('abc', '', 'text')).toEqual([]);
    expect(findMatchRanges('', 'abc', 'text')).toEqual([]);
  });
});

describe('findMatchRanges — regex mode', () => {
  it('highlights only the capture group value, not the whole expression', () => {
    // RLP-582: searching `jsessionid=(.+?)"` must surface just the session id,
    // mirroring a regex extractor's $1, instead of marking the literal text.
    const text = 'Set-Cookie: jsessionid=ABC123" path=/';
    const ranges = findMatchRanges(text, 'jsessionid=(.+?)"', 'regex');
    expect(ranges).toEqual([{ start: 23, end: 29 }]);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('ABC123');
  });

  it('highlights each capture group when the pattern has several', () => {
    const text = 'a=1;b=22';
    const ranges = findMatchRanges(text, '(\\d+);b=(\\d+)', 'regex');
    expect(ranges.map(r => text.slice(r.start, r.end))).toEqual(['1', '22']);
  });

  it('falls back to the full match when the pattern has no groups', () => {
    const text = 'token=xyz token=abc';
    const ranges = findMatchRanges(text, 'token=\\w+', 'regex');
    expect(ranges.map(r => text.slice(r.start, r.end))).toEqual(['token=xyz', 'token=abc']);
  });

  it('ignores empty capture groups instead of emitting zero-length highlights', () => {
    const text = 'value: 42';
    const ranges = findMatchRanges(text, 'value:(x?) (\\d+)', 'regex');
    // group 1 matched empty, group 2 matched "42" — only the non-empty one shows.
    expect(ranges.map(r => text.slice(r.start, r.end))).toEqual(['42']);
  });

  it('returns nothing for an invalid regex', () => {
    expect(buildSearchRegex('(')).toBeNull();
    expect(findMatchRanges('anything', '(', 'regex')).toEqual([]);
  });
});

describe('flags-only patterns', () => {
  // Stripping the inline-flag group can leave an empty pattern, and
  // `new RegExp('')` is valid — it matches the empty string everywhere. Every
  // prefix typed on the way to `(?is)token` passes through this state, so
  // without an explicit reject the search box reports "1 of 1" on an empty
  // highlight instead of "invalid regex". RLP-670.
  it.each(['(?i)', '(?s)', '(?m)', '(?is)'])('rejects the flags-only pattern %s', pattern => {
    expect(buildRelampoRegex(pattern)).toBeNull();
    expect(buildSearchRegex(pattern)).toBeNull();
    expect(findMatchRanges('anything at all', pattern, 'regex')).toEqual([]);
  });

  it('still accepts an inline-flag pattern that has a body', () => {
    expect(buildSearchRegex('(?i)token')).not.toBeNull();
    expect(findMatchRanges('TOKEN=1', '(?i)token', 'regex')).toEqual([{ start: 0, end: 5 }]);
  });

  it('keeps an empty pattern falsy rather than treating it as invalid input', () => {
    // '' is "no search", handled by the callers' `!query` guards — not a regex error.
    expect(findMatchRanges('abc', '', 'regex')).toEqual([]);
  });
});
