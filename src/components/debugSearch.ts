export type SearchMode = 'text' | 'regex';

export type MatchRange = { start: number; end: number };

export type NormalizedRelampoRegex = { pattern: string; flags: string };

const RELAMPO_INLINE_FLAGS = /^(\(\?([ims]+)\))/;

const POSIX_CLASS_RANGES: Record<string, string> = {
  alnum: 'A-Za-z0-9',
  alpha: 'A-Za-z',
  ascii: '\\x00-\\x7F',
  blank: ' \\t',
  cntrl: '\\x00-\\x1F\\x7F',
  digit: '0-9',
  graph: '\\x21-\\x7E',
  lower: 'a-z',
  print: '\\x20-\\x7E',
  punct: '!-\\/:-@\\[-`{-~',
  space: '\\t\\n\\v\\f\\r ',
  upper: 'A-Z',
  word: 'A-Za-z0-9_',
  xdigit: '0-9A-Fa-f',
};

const POSIX_CLASS = /\[:([a-z]+):\]/g;

function expandPosixClasses(pattern: string): string {
  return pattern.replace(POSIX_CLASS, (whole, name: string) => POSIX_CLASS_RANGES[name] ?? whole);
}

export function normalizeRelampoRegexForJavaScript(pattern: string, baseFlags = 'g'): NormalizedRelampoRegex {
  const inlineFlags = pattern.match(RELAMPO_INLINE_FLAGS);
  const normalizedPattern = expandPosixClasses(inlineFlags ? pattern.slice(inlineFlags[1].length) : pattern);
  const flags = Array.from(new Set(`g${baseFlags}${inlineFlags?.[2] ?? ''}`)).join('');
  return { pattern: normalizedPattern, flags };
}

export function buildRelampoRegex(pattern: string, baseFlags = 'g'): RegExp | null {
  const normalized = normalizeRelampoRegexForJavaScript(pattern, baseFlags);
  if (pattern && !normalized.pattern) return null;
  try {
    return new RegExp(normalized.pattern, normalized.flags);
  } catch {
    return null;
  }
}

const MAX_SEARCH_PATTERN_LENGTH = 1024;

export function buildSearchRegex(pattern: string): RegExp | null {
  if (pattern.length > MAX_SEARCH_PATTERN_LENGTH) return null;
  return buildRelampoRegex(pattern, 'gid');
}

function captureGroupRanges(match: RegExpMatchArray): MatchRange[] {
  const indices = (match as RegExpMatchArray & { indices?: Array<[number, number] | undefined> }).indices;
  if (!indices || indices.length <= 1) return [];
  const ranges: MatchRange[] = [];
  for (let group = 1; group < indices.length; group += 1) {
    const span = indices[group];
    if (!span) continue;
    const [start, end] = span;
    if (end > start) ranges.push({ start, end });
  }
  return ranges;
}

export function findMatchRanges(text: string, query: string, mode: SearchMode): MatchRange[] {
  if (!text || !query) return [];
  const ranges: MatchRange[] = [];
  if (mode === 'text') {
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    let position = 0;
    while (position <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, position);
      if (index === -1) break;
      ranges.push({ start: index, end: index + needle.length });
      position = index + Math.max(needle.length, 1);
    }
    return ranges;
  }
  const regex = buildSearchRegex(query);
  if (!regex) return [];
  for (const match of text.matchAll(regex)) {
    const groupRanges = captureGroupRanges(match);
    if (groupRanges.length > 0) {
      ranges.push(...groupRanges);
      continue;
    }
    const start = match.index ?? -1;
    const value = match[0] ?? '';
    if (start < 0 || value.length === 0) continue;
    ranges.push({ start, end: start + value.length });
  }
  return ranges;
}
