import { expect, it } from 'vitest';
import { runRequestPresentation } from './runRequestPresentation';

it('shows only the method and resolved request, without a tree number or recording prefix', () => {
  expect(
    runRequestPresentation({
      name: '[8] HOMEPAGE - GET /demo/login',
      method: 'GET',
      path: 'http://example.test/demo/login',
    }),
  ).toEqual({ method: 'GET', label: 'http://example.test/demo/login', title: 'http://example.test/demo/login' });
});
it('extracts the method and request from a prefixed distributed scope name', () => {
  expect(runRequestPresentation({ name: '[11] CHECKOUT - POST /checkout', method: '', path: '' })).toEqual({
    method: 'POST',
    label: '/checkout',
    title: '/checkout',
  });
});
it('preserves the actual URL of runtime-discovered redirects', () => {
  expect(
    runRequestPresentation({ name: '[3] POST /login -> final 1 GET /home', method: 'GET', path: '/home' }).label,
  ).toBe('/home');
});
it('preserves custom operation names when old evidence provides no request path', () => {
  expect(runRequestPresentation({ name: '[2] Find customer', method: 'SQL', path: '' })).toEqual({
    method: 'SQL',
    label: 'Find customer',
    title: 'Find customer',
  });
});
