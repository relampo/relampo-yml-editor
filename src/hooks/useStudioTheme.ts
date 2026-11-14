import { useSyncExternalStore } from 'react';
import { STUDIO_THEME_EVENT, studioTheme } from '../utils/studioTheme';

function subscribe(notify: () => void) {
  window.addEventListener(STUDIO_THEME_EVENT, notify);
  return () => window.removeEventListener(STUDIO_THEME_EVENT, notify);
}

export function useStudioTheme() {
  return useSyncExternalStore(subscribe, studioTheme, () => 'dark' as const);
}

export function useStudioMonacoTheme() {
  return useStudioTheme() === 'light' ? 'relampo-yaml-light' : 'vs-dark';
}
