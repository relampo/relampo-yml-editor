export type SearchMode = 'text' | 'regex';

export type MatchRange = { start: number; end: number };

export function buildSearchRegex(query: string): RegExp | null {
  try {
    return new RegExp(query, 'gi');
  } catch {
    return null;
  }
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
    const start = match.index ?? -1;
    const value = match[0] ?? '';
    if (start < 0 || value.length === 0) continue;
    ranges.push({ start, end: start + value.length });
  }
  return ranges;
}
