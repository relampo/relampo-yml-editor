export const LARGE_FILE_CHAR_THRESHOLD = 2_000_000;
export const LARGE_FILE_LINE_THRESHOLD = 50_000;

type DocumentMetrics = {
  chars: number;
  lines: number;
  large: boolean;
};

export function getDocumentMetrics(text: string): DocumentMetrics {
  const chars = text.length;
  if (chars === 0) return { chars: 0, lines: 0, large: false };

  let lines = 1;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) lines += 1;
  }

  const large = chars >= LARGE_FILE_CHAR_THRESHOLD || lines >= LARGE_FILE_LINE_THRESHOLD;
  return { chars, lines, large };
}
