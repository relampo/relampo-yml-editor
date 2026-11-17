import { expect, it } from 'vitest';
import {
  applyRecorderDetectedURLs,
  normalizeRecorderBaseURLs,
  recorderURLProtocol,
  recorderTLSFailureText,
} from './httpRecorderApi';
it('preserves schemeless addresses for automatic detection', () => {
  expect(recorderURLProtocol('http://app.test')).toBe('HTTP');
  expect(recorderURLProtocol('https://app.test')).toBe('HTTPS');
  expect(normalizeRecorderBaseURLs('app.test, http://api.test')).toBe('app.test,http://api.test');
  expect(recorderURLProtocol('app.test')).toBe('AUTO');
  expect(recorderURLProtocol('localhost:8080/login')).toBe('AUTO');
  expect(recorderURLProtocol('')).toBe('');
});
it('shows detected schemes while preserving paths, queries and explicit protocols', () => {
  expect(
    applyRecorderDetectedURLs(
      'app.test/login?q=keep, api.test:8080/v1, https://other.test',
      'http://app.test,https://api.test:8080',
    ),
  ).toBe('http://app.test/login?q=keep,https://api.test:8080/v1,https://other.test');
  expect(applyRecorderDetectedURLs('unresolved.test', '')).toBe('unresolved.test');
  expect(applyRecorderDetectedURLs('app.test:80/login', 'http://app.test:80')).toBe('http://app.test:80/login');
});
it('explains an upstream expired certificate without changing the scheme', () => {
  expect(recorderTLSFailureText({ host: 'app.test', reason: 'expired', expiresAt: '2024-02-28T23:59:59Z' }, 'es')).toBe(
    'El certificado HTTPS de app.test venció el 2024-02-28.',
  );
});
