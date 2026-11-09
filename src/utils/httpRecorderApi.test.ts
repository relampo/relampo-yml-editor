import { expect, it } from 'vitest';
import { normalizeRecorderBaseURLs, recorderURLProtocol, recorderTLSFailureText } from './httpRecorderApi';
it('identifies explicit HTTP and HTTPS and displays HTTPS for an unschemed URL', () => {
  expect(recorderURLProtocol('http://app.test')).toBe('HTTP');
  expect(recorderURLProtocol('https://app.test')).toBe('HTTPS');
  expect(normalizeRecorderBaseURLs('app.test, http://api.test')).toBe('https://app.test,http://api.test');
  expect(recorderURLProtocol('app.test')).toBe('HTTPS');
});
it('explains an upstream expired certificate without changing the scheme', () => {
  expect(recorderTLSFailureText({ host: 'app.test', reason: 'expired', expiresAt: '2024-02-28T23:59:59Z' }, 'es')).toBe(
    'El certificado HTTPS de app.test venció el 2024-02-28.',
  );
});
