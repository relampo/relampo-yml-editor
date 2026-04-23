import { describe, expect, it } from 'vitest';
import { getDocumentMetrics, LARGE_FILE_CHAR_THRESHOLD, LARGE_FILE_LINE_THRESHOLD } from './yamlDocumentLimits';

describe('getDocumentMetrics', () => {
  it('counts characters and lines', () => {
    expect(getDocumentMetrics('one\ntwo\nthree')).toEqual({
      chars: 13,
      lines: 3,
      large: false,
    });
  });

  it('marks documents as large by character count', () => {
    const metrics = getDocumentMetrics('x'.repeat(LARGE_FILE_CHAR_THRESHOLD));
    expect(metrics.large).toBe(true);
  });

  it('marks documents as large by line count', () => {
    const metrics = getDocumentMetrics('\n'.repeat(LARGE_FILE_LINE_THRESHOLD - 1));
    expect(metrics.lines).toBe(LARGE_FILE_LINE_THRESHOLD);
    expect(metrics.large).toBe(true);
  });
  it('keeps large-file detection informational instead of defining an upload rejection', () => {
    const metrics = getDocumentMetrics('x'.repeat(LARGE_FILE_CHAR_THRESHOLD + 1));

    expect(metrics.large).toBe(true);
    expect(metrics.chars).toBeGreaterThan(LARGE_FILE_CHAR_THRESHOLD);
  });
});
