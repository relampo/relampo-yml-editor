import { withStudioToken } from './studioAuth';

function focusNamedTab(url: string, name: string, pathname: string): boolean {
  const tab = window.open('', name);
  if (!tab) return false;
  let alreadyOpen = false;
  try {
    alreadyOpen = tab.location.origin === window.location.origin && tab.location.pathname === pathname;
  } catch {
    /* Replace only with the trusted local route below. */
  }
  if (!alreadyOpen) tab.location.replace(url);
  tab.focus();
  return true;
}
export function openGRPCRecorderTab(language = 'en'): boolean {
  window.name = 'relampo-studio-' + window.location.host;
  const url = new URL('/recorder/grpc', window.location.origin);
  url.searchParams.set('lang', language);
  return focusNamedTab(
    withStudioToken(url.toString()),
    'relampo-grpc-recorder-' + window.location.host,
    '/recorder/grpc',
  );
}
export function openHTTPRecorderTab(language = 'en'): boolean {
  window.name = 'relampo-studio-' + window.location.host;
  const url = new URL('/recorder/http', window.location.origin);
  url.searchParams.set('lang', language);
  return focusNamedTab(
    withStudioToken(url.toString()),
    'relampo-http-recorder-' + window.location.host,
    '/recorder/http',
  );
}
export function openStudioEditorTab(): boolean {
  return focusNamedTab(
    withStudioToken(new URL('/', window.location.origin).toString()),
    'relampo-studio-' + window.location.host,
    '/',
  );
}
export function validateSavedEditorURL(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/' ||
    url.username ||
    url.password ||
    url.hash ||
    !url.port
  )
    throw Error('Studio returned an invalid local editor address');
  return url.toString();
}

export function openHTTPRecordingControls(language = 'en'): Window | null {
  const url = new URL('/recorder/http/control', window.location.origin);
  url.searchParams.set('lang', language);
  url.searchParams.set('waiting', '1');
  const popup = window.open(
    '',
    'relampo-http-controls-' + window.location.host,
    'popup=yes,width=460,height=650,resizable=yes,scrollbars=yes',
  );
  if (!popup) return null;
  let existing = false;
  try {
    existing = popup.location.origin === location.origin && popup.location.pathname === '/recorder/http/control';
  } catch {
    /* Use the local route below. */
  }
  if (!existing) popup.location.replace(withStudioToken(url.toString()));
  popup.focus();
  return popup;
}
export function returnToHTTPRecorderTab(): boolean {
  return focusNamedTab(
    withStudioToken(new URL('/recorder/http', location.origin).toString()),
    'relampo-http-recorder-' + location.host,
    '/recorder/http',
  );
}

/** Always create a separate document; Recorder navigation retains its named-tab behavior. */
export function openNewStudioTab(language = 'en'): boolean {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('editor', crypto.randomUUID());
  url.searchParams.set('lang', language);
  const tab = window.open('about:blank', '_blank');
  if (!tab) return false;
  tab.opener = null;
  tab.location.replace(withStudioToken(url.toString()));
  return true;
}
