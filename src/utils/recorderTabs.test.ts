import { afterEach, expect, it, vi } from 'vitest';
import { openGRPCRecorderTab, openStudioEditorTab, validateSavedEditorURL } from './recorderTabs';
import { resetStudioSessionForTests } from './studioAuth';
afterEach(() => {
  vi.restoreAllMocks();
  resetStudioSessionForTests();
  window.history.replaceState({}, '', '/');
  window.name = '';
});
it('opens the Recorder in its own authenticated named tab and leaves the editor document intact', () => {
  window.history.replaceState({}, '', '/?token=test-session');
  const popup = {
    location: { href: 'about:blank', origin: 'null', pathname: 'blank', replace: vi.fn() },
    focus: vi.fn(),
  };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  expect(openGRPCRecorderTab('es')).toBe(true);
  expect(window.location.pathname).toBe('/');
  const url = new URL(popup.location.replace.mock.calls[0][0]);
  expect(url.pathname).toBe('/recorder/grpc');
  expect(url.searchParams.get('token')).toBe('test-session');
  expect(url.searchParams.get('lang')).toBe('es');
});
it('focuses an existing editor without reloading its unsaved document', () => {
  const editor = { location: { origin: window.location.origin, pathname: '/' }, focus: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(editor as unknown as Window);
  expect(openStudioEditorTab()).toBe(true);
  expect(editor.focus).toHaveBeenCalledOnce();
});
it('rejects external or executable editor destinations returned by a save', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://evil.test/',
    'http://127.0.0.1:1234/private',
    'http://user:secret@127.0.0.1:1234/',
  ])
    expect(() => validateSavedEditorURL(url)).toThrow();
  expect(validateSavedEditorURL('http://127.0.0.1:1234/?token=test')).toBe('http://127.0.0.1:1234/?token=test');
});

it('returns to an existing Recorder tab without reloading its in-progress recording', () => {
  const recorder = {
    location: { origin: window.location.origin, pathname: '/recorder/grpc', replace: vi.fn() },
    focus: vi.fn(),
  };
  vi.spyOn(window, 'open').mockReturnValue(recorder as unknown as Window);
  expect(openGRPCRecorderTab()).toBe(true);
  expect(recorder.location.replace).not.toHaveBeenCalled();
  expect(recorder.focus).toHaveBeenCalledOnce();
});
