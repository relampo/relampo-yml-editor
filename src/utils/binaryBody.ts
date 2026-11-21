
const NUL = String.fromCharCode(0);
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

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

export interface BinaryBodyDownload {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
  extension: string;
  filename: string;
}

export function byteIndexedBytes(value: unknown): Uint8Array<ArrayBuffer> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return null;
  const bytes = new Uint8Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== String(i)) return null;
    const byte = record[keys[i]];
    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) return null;
    bytes[i] = byte;
  }
  return bytes;
}

export function byteIndexedLength(value: unknown): number | null {
  return byteIndexedBytes(value)?.length ?? null;
}

export function looksBinaryText(body: string): boolean {
  if (!body) return false;
  if (body.includes(NUL) || body.includes(REPLACEMENT_CHAR)) return true;
  const sample = body.length > 2048 ? body.slice(0, 2048) : body;
  let control = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x09 || (code > 0x0d && code < 0x20)) control++;
  }
  return sample.length > 0 && control / sample.length > 0.1;
}

export function binaryBodyNotice(bytes: number | null, contentType?: string): string {
  const size = bytes != null ? `${bytes} byte${bytes === 1 ? '' : 's'}` : 'binary data';
  const ct = (contentType ?? '').trim();
  return ct ? `[binary content · ${size} · ${ct}]` : `[binary content · ${size}]`;
}

export function binaryBodyDisplay(body: unknown, headers?: unknown): string | null {
  const contentType = headerValue(headers, 'Content-Type');
  if (typeof body === 'string') {
    return looksBinaryText(body) ? binaryBodyNotice(byteCountFromHeaders(headers), contentType) : null;
  }
  const byteLen = byteIndexedLength(body);
  return byteLen != null ? binaryBodyNotice(byteLen, contentType) : null;
}

export function binaryBodyDownload(body: unknown, headers?: unknown): BinaryBodyDownload | null {
  const bytes = byteIndexedBytes(body);
  if (!bytes) return null;
  return binaryBodyDownloadFromBytes(bytes, headers);
}

export function binaryBodyDownloadFromBase64(bodyBase64: unknown, headers?: unknown): BinaryBodyDownload | null {
  if (typeof bodyBase64 !== 'string' || !bodyBase64.trim()) return null;
  try {
    const raw = atob(bodyBase64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return binaryBodyDownloadFromBytes(bytes, headers);
  } catch {
    return null;
  }
}

function binaryBodyDownloadFromBytes(bytes: Uint8Array<ArrayBuffer>, headers?: unknown): BinaryBodyDownload {
  const contentType = headerValue(headers, 'Content-Type').trim() || 'application/octet-stream';
  const extension = binaryBodyExtension(contentType);
  return {
    bytes,
    contentType,
    extension,
    filename: binaryBodyFilename(headers, extension),
  };
}

function byteCountFromHeaders(headers: unknown): number | null {
  const raw = headerValue(headers, 'Content-Length');
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function binaryBodyExtension(contentType: string): string {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase();
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'application/pkix-cert':
    case 'application/x-x509-ca-cert':
    case 'application/x-x509-user-cert':
      return '.cer';
    case 'image/gif':
      return '.gif';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.bin';
  }
}

function binaryBodyFilename(headers: unknown, extension: string): string {
  return contentDispositionFilename(headerValue(headers, 'Content-Disposition')) ?? `response-body${extension}`;
}

function contentDispositionFilename(value: string): string | null {
  const encoded = value.match(/(?:^|;)\s*filename\*\s*=\s*([^;]+)/i);
  if (encoded) {
    const raw = trimQuotes(encoded[1].trim()).replace(/^UTF-8''/i, '');
    try {
      return cleanFilename(decodeURIComponent(raw));
    } catch {
      return cleanFilename(raw);
    }
  }

  const plain = value.match(/(?:^|;)\s*filename\s*=\s*("[^"]*"|[^;]+)/i);
  return plain ? cleanFilename(trimQuotes(plain[1].trim())) : null;
}

function trimQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/\\"/g, '"') : value;
}

function cleanFilename(value: string): string | null {
  const basename = value.split(/[\\/]/).pop();
  if (!basename) return null;
  let clean = '';
  for (const char of basename) {
    const code = char.charCodeAt(0);
    if (code >= 0x20 && code !== 0x7f) clean += char;
  }
  const filename = clean.trim();
  return filename && filename !== '.' && filename !== '..' ? filename : null;
}
