export type SearchMode = 'text' | 'regex';

export type MatchRange = { start: number; end: number };

export type NormalizedRelampoRegex = { pattern: string; flags: string };

const RELAMPO_INLINE_FLAGS = /^(\(\?([ims]+)\))/;

/**
 * Translate the leading inline flags emitted by Relampo's Go/RE2 regexes into
 * JavaScript flags while keeping the rest of the pattern unchanged.
 */
export function normalizeRelampoRegexForJavaScript(pattern: string, baseFlags = 'g'): NormalizedRelampoRegex {
  const inlineFlags = pattern.match(RELAMPO_INLINE_FLAGS);
  const normalizedPattern = inlineFlags ? pattern.slice(inlineFlags[1].length) : pattern;
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

// Compiling a user-supplied pattern is the point of regex search mode, so the
// pattern is trusted input by design — but a pathological one (nested
// quantifiers over a large response body) can pin the tab's main thread with no
// way to cancel. A length cap is the cheap half of the mitigation: it doesn't
// make catastrophic backtracking impossible, it just keeps the patterns that
// produce it from being typed by accident. Anything longer is reported the same
// way an invalid pattern is.
// Generated Relampo patterns can include several URL alternatives and exceed
// the old 200-character limit. Keep a bounded limit while allowing generated
// extractors from real recordings to be tested in Studio.
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
