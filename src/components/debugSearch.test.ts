import { describe, expect, it } from 'vitest';
import { buildSearchRegex, findMatchRanges } from './debugSearch';

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
