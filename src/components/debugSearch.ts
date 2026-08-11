export type SearchMode = 'text' | 'regex';

export type MatchRange = { start: number; end: number };

export type NormalizedRelampoRegex = { pattern: string; flags: string };

const RELAMPO_INLINE_FLAGS = /^(\(\?([ims]+)\))/;

// RE2 understands POSIX bracket expressions; JavaScript does not. Left alone,
// `[^"'<>[:space:]]` still *compiles* in JS — as the class `[^"'<>[:space:`
// plus a literal `]` — so a generated extractor silently matches nothing
// instead of being reported as invalid. Expanding each class keeps those
// patterns working in Studio. RLP-670.
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

/**
 * Translate the leading inline flags and POSIX bracket expressions emitted by
 * Relampo's Go/RE2 regexes into their JavaScript equivalents, keeping the rest
 * of the pattern unchanged.
 */
export function normalizeRelampoRegexForJavaScript(pattern: string, baseFlags = 'g'): NormalizedRelampoRegex {
  const inlineFlags = pattern.match(RELAMPO_INLINE_FLAGS);
  const normalizedPattern = expandPosixClasses(inlineFlags ? pattern.slice(inlineFlags[1].length) : pattern);
  const flags = Array.from(new Set(`g${baseFlags}${inlineFlags?.[2] ?? ''}`)).join('');
  return { pattern: normalizedPattern, flags };
}

export function buildRelampoRegex(pattern: string, baseFlags = 'g'): RegExp | null {
  const normalized = normalizeRelampoRegexForJavaScript(pattern, baseFlags);
  // A flags-only pattern (`(?i)`, and every prefix typed on the way to a real
  // one) strips down to '', and `new RegExp('')` is *valid* — it matches the
  // empty string at every position. Without this guard an incomplete pattern
  // silently reports zero-length matches everywhere instead of being reported
  // as invalid the way it was before inline flags were understood.
  if (pattern && !normalized.pattern) return null;
  try {
    return new RegExp(normalized.pattern, normalized.flags);
  } catch {
    return null;
  }
}

// A bound on pattern size, not a backtracking mitigation: a pathological
// pattern can be very short (`(a+)+$`), so no length cap prevents a slow match
// over a large body. It only stops absurd input from reaching the compiler, and
// anything longer is reported the same way an invalid pattern is.
// The previous 200 was below the patterns Relampo actually generates —
// correlation extractors with several URL alternatives run 200-400 characters —
// so generated regexes were rejected before they could be tested in Studio.
// 1024 clears the observed range with headroom. RLP-670.
const MAX_SEARCH_PATTERN_LENGTH = 1024;

export function buildSearchRegex(pattern: string): RegExp | null {
  if (pattern.length > MAX_SEARCH_PATTERN_LENGTH) return null;
  // The `d` flag exposes per-group match indices so a pattern with capturing
  // groups can highlight only the captured value, not the whole match. RLP-582.
  return buildRelampoRegex(pattern, 'gid');
}

// When a regex pattern has capturing groups, the user is asking for the captured
// value, not the literal expression: `jsessionid=(.+?)"` should highlight the
// session id, mirroring how a regex extractor surfaces `$1`. Returns one range
// per non-empty capturing group; an empty list means "no groups, use the full
// match". RLP-582.
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
