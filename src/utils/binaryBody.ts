// One consistent representation for a non-text response body, so the Editor's
// recorded Response view and its live Debug view show the SAME short notice
// instead of two incomparable dumps: a byte-indexed `{"0":48,"1":130,...}`
// object (recorded) vs. mojibake text (live). RLP-555.

const NUL = String.fromCharCode(0);
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd); // U+FFFD, Go's marker for invalid UTF-8

// Read a header case-insensitively from whatever shape `headers` holds (a plain
// record, or something non-object). Returns '' when absent or non-scalar.
export function headerValue(headers: unknown, name: string): string {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return '';
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() === target) {
      return value == null || typeof value === 'object' ? '' : String(value);
    }
  }
  return '';
}

// A recorded binary body has no byte-string type in YAML/JSON, so it is stored
// as a byte-indexed object: {"0":48,"1":130,...,"1764":206}. Return its byte
// count when the value has exactly that shape — consecutive integer keys from 0,
// every value an integer in [0,255] — else null. Real JSON API responses keyed
// by "0","1",... are effectively serialized arrays/bytes, so the false-positive
// risk is negligible.
export function byteIndexedLength(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return null;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== String(i)) return null;
    const byte = record[keys[i]];
    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) return null;
  }
  return keys.length;
}

// A live/debug body arrives as a string. Go substitutes U+FFFD for invalid UTF-8
// when it JSON-encodes a binary body, and real binary carries NUL bytes; either
// signal — or a heavy share of C0 control characters — marks it non-text.
export function looksBinaryText(body: string): boolean {
  if (!body) return false;
  if (body.includes(NUL) || body.includes(REPLACEMENT_CHAR)) return true;
  const sample = body.length > 2048 ? body.slice(0, 2048) : body;
  let control = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0) ?? 0;
    // Tab (0x09), LF (0x0a), CR (0x0d) are normal text; other C0 controls aren't.
    if (code < 0x09 || (code > 0x0d && code < 0x20)) control++;
  }
  return sample.length > 0 && control / sample.length > 0.1;
}

// The single notice shown for any binary body. `bytes` is null when the exact
// length is unknown (a mojibake string whose original byte size was lost).
export function binaryBodyNotice(bytes: number | null, contentType?: string): string {
  const size = bytes != null ? `${bytes} byte${bytes === 1 ? '' : 's'}` : 'binary data';
  const ct = (contentType ?? '').trim();
  return ct ? `[binary content · ${size} · ${ct}]` : `[binary content · ${size}]`;
}

// Resolve the display text for a response body from either shape, collapsing a
// binary body to the shared notice. Returns null when the body is plain text and
// the caller should render it as-is (it already knows how to stringify objects).
export function binaryBodyDisplay(body: unknown, headers?: unknown): string | null {
  const contentType = headerValue(headers, 'Content-Type');
  if (typeof body === 'string') {
    return looksBinaryText(body) ? binaryBodyNotice(byteCountFromHeaders(headers), contentType) : null;
  }
  const byteLen = byteIndexedLength(body);
  return byteLen != null ? binaryBodyNotice(byteLen, contentType) : null;
}

function byteCountFromHeaders(headers: unknown): number | null {
  const raw = headerValue(headers, 'Content-Length');
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
