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
