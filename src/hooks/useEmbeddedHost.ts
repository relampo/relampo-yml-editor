import { useEffect } from 'react';

const themeTokens = ['--card', '--foreground', '--muted-foreground', '--border', '--accent', '--ring'] as const;

/** Same-origin SaaS owns appearance and language; this bridge carries no credentials. */
export function useEmbeddedHost(setLanguage: (language: 'en' | 'es') => void): boolean {
  const embedded = window.parent !== window && new URLSearchParams(window.location.search).get('embedded') === '1';

  useEffect(() => {
    if (!embedded) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object') return;
      const message = data as Record<string, unknown>;
      if (message.type !== 'relampo:appearance' || (message.theme !== 'dark' && message.theme !== 'light')) return;
      const root = document.documentElement;
      root.classList.toggle('dark', message.theme === 'dark');
      root.style.colorScheme = message.theme;
      if (message.language === 'en' || message.language === 'es') setLanguage(message.language);
      if (message.tokens && typeof message.tokens === 'object') {
        const tokens = message.tokens as Record<string, unknown>;
        for (const token of themeTokens) {
          const value = tokens[token];
          if (typeof value === 'string' && value.length <= 128 && CSS.supports('color', value)) {
            root.style.setProperty(token, value);
          }
        }
      }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'relampo:ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, [embedded, setLanguage]);

  return embedded;
}
