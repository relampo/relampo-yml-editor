import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { applyStudioTheme, initializeEmbeddedTheme, studioTheme } from './studioTheme';
import { useStudioTheme } from '../hooks/useStudioTheme';
import { useEmbeddedHost } from '../hooks/useEmbeddedHost';

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-studio-theme');
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
  window.history.replaceState({}, '', '/');
});

it('updates subscribers and native form controls when switching in either direction', () => {
  const { result } = renderHook(useStudioTheme);
  expect(result.current).toBe('dark');
  act(() => applyStudioTheme('light'));
  expect(result.current).toBe('light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  act(() => applyStudioTheme('dark'));
  expect(result.current).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

it('accepts appearance changes only from its same-origin host and validates the theme', () => {
  const host = { postMessage: vi.fn() };
  vi.stubGlobal('parent', host);
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-01');
  renderHook(() => useEmbeddedHost(vi.fn()));
  const send = (origin: string, source: object, theme: string) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin,
          source: source as Window,
          data: { type: 'relampo:appearance', theme },
        }),
      );
    });
  send('https://untrusted.example', host, 'light');
  expect(studioTheme()).toBe('dark');
  send(window.location.origin, {}, 'light');
  expect(studioTheme()).toBe('dark');
  send(window.location.origin, host, 'unexpected');
  expect(studioTheme()).toBe('dark');
  send(window.location.origin, host, 'light');
  expect(studioTheme()).toBe('light');
});

it('initializes from the host before rendering without changing standalone Studio', () => {
  initializeEmbeddedTheme();
  expect(document.documentElement.dataset.studioTheme).toBeUndefined();
  vi.stubGlobal('parent', {
    location: { origin: window.location.origin },
    document: { documentElement: { classList: { contains: () => false } } },
  });
  window.history.replaceState({}, '', '/?embedded=1&account=user-a&plan=tp-01');
  initializeEmbeddedTheme();
  expect(studioTheme()).toBe('light');
});
