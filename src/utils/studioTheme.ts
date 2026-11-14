export type StudioTheme = 'light' | 'dark';
export const STUDIO_THEME_EVENT = 'relampo:theme-change';

export function studioTheme(): StudioTheme {
  return document.documentElement.dataset.studioTheme === 'light' ? 'light' : 'dark';
}

export function applyStudioTheme(theme: StudioTheme): void {
  const root = document.documentElement;
  root.dataset.studioTheme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.dispatchEvent(new Event(STUDIO_THEME_EVENT));
}

/** Match the same-origin host before the first render; standalone Studio stays dark. */
export function initializeEmbeddedTheme(): void {
  if (window.parent === window || new URLSearchParams(window.location.search).get('embedded') !== '1') return;
  try {
    if (window.parent.location.origin === window.location.origin) {
      applyStudioTheme(window.parent.document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }
  } catch {
    /* The validated appearance bridge handles other embedding contexts. */
  }
}
