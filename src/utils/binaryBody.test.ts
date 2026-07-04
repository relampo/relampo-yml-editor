import { describe, expect, it } from 'vitest';
import { binaryBodyDisplay, binaryBodyNotice, byteIndexedLength, looksBinaryText } from './binaryBody';

const NUL = String.fromCharCode(0);
const FFFD = String.fromCharCode(0xfffd);

describe('byteIndexedLength', () => {
  it('detects a byte-indexed object (the recorded binary shape) and returns its length', () => {
    // A DER certificate starts 30 82 06 CE -> {0:48,1:130,2:6,3:206}.
    expect(byteIndexedLength({ '0': 48, '1': 130, '2': 6, '3': 206 })).toBe(4);
  });

  it('rejects non-byte-map values', () => {
    expect(byteIndexedLength('hello')).toBeNull();
    expect(byteIndexedLength([48, 130])).toBeNull(); // arrays are not the recorded shape
    expect(byteIndexedLength({ name: 'ok', id: 1 })).toBeNull(); // real JSON object
    expect(byteIndexedLength({ '0': 48, '2': 6 })).toBeNull(); // non-consecutive keys
    expect(byteIndexedLength({ '0': 48, '1': 999 })).toBeNull(); // value out of byte range
    expect(byteIndexedLength({})).toBeNull();
    expect(byteIndexedLength(null)).toBeNull();
  });
});

describe('looksBinaryText', () => {
  it('flags strings carrying NUL or the U+FFFD replacement char', () => {
    expect(looksBinaryText('0' + NUL + '0')).toBe(true);
    expect(looksBinaryText('MI' + FFFD + FFFD + 'B')).toBe(true);
  });

  it('flags control-char-heavy mojibake', () => {
    expect(looksBinaryText(String.fromCharCode(1, 2, 3, 4, 5, 6, 7, 8))).toBe(true);
  });

  it('leaves normal text and JSON alone', () => {
    expect(looksBinaryText('{"access_token":"abc","expires_in":3600}')).toBe(false);
    expect(looksBinaryText('plain body\nwith lines\ttabs')).toBe(false);
    expect(looksBinaryText('')).toBe(false);
  });
});

describe('binaryBodyNotice', () => {
  it('formats byte count and content type', () => {
    expect(binaryBodyNotice(1765, 'application/octet-stream')).toBe('[binary content · 1765 bytes · application/octet-stream]');
    expect(binaryBodyNotice(1)).toBe('[binary content · 1 byte]');
    expect(binaryBodyNotice(null, 'image/png')).toBe('[binary content · binary data · image/png]');
  });
});

describe('binaryBodyDisplay', () => {
  it('collapses a recorded byte-indexed body to the notice with its content type', () => {
    const body = { '0': 48, '1': 130, '2': 6, '3': 206 };
    const headers = { 'Content-Type': 'application/octet-stream' };
    expect(binaryBodyDisplay(body, headers)).toBe('[binary content · 4 bytes · application/octet-stream]');
  });

  it('collapses a mojibake live body using Content-Length for the byte count', () => {
    const body = '0' + FFFD + FFFD + '0';
    const headers = { 'content-type': 'application/octet-stream', 'Content-Length': '1765' };
    expect(binaryBodyDisplay(body, headers)).toBe('[binary content · 1765 bytes · application/octet-stream]');
  });

  it('returns null for plain text and real JSON so the caller renders them as-is', () => {
    expect(binaryBodyDisplay('{"ok":true}', { 'Content-Type': 'application/json' })).toBeNull();
    expect(binaryBodyDisplay({ name: 'delvis', roles: ['qa'] })).toBeNull();
  });
});
