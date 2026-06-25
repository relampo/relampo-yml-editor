export type SearchMode = 'text' | 'regex';

export type MatchRange = { start: number; end: number };

export function buildSearchRegex(query: string): RegExp | null {
  try {
    // The `d` flag exposes per-group match indices so a pattern with capturing
    // groups can highlight only the captured value, not the whole match. RLP-582.
    return new RegExp(query, 'gid');
  } catch {
    return null;
  }
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
