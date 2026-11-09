import { useEffect, useRef } from 'react';
import { createCorrelateSource, type CorrelateDocument } from '../../utils/correlateBridge';
import { withStudioToken } from '../../utils/studioAuth';
export function useCorrelateSource(
  current: () => CorrelateDocument,
  update: (yaml: string, name: string) => Promise<void>,
  language: string,
  onError: (message: string) => void,
) {
  const latest = useRef({ current, update });
  useEffect(() => {
    latest.current = { current, update };
  });
  const sessions = useRef(new Map<string, ReturnType<typeof createCorrelateSource>>());
  const tabs = useRef(new Map<string, Window>());
  useEffect(
    () => () => {
      sessions.current.forEach(source => source.close());
      sessions.current.clear();
    },
    [],
  );
  return () => {
    try {
      // A closed tab cannot always say goodbye (window.close, X button), so release its session here.
      sessions.current.forEach((source, id) => {
        if (tabs.current.get(id)?.closed) source.close();
      });
      if (sessions.current.size >= 8)
        throw Error(
          language === 'es'
            ? 'Cierra una pestaña Correlate antes de abrir otra.'
            : 'Close a Correlate tab before opening another.',
        );
      const session = crypto.randomUUID();
      const source = createCorrelateSource(
        () => latest.current.current(),
        (yaml, name) => latest.current.update(yaml, name),
        undefined,
        () => {
          sessions.current.delete(session);
          tabs.current.delete(session);
        },
      );
      source.connect(session);
      sessions.current.set(session, source);
      const url = new URL('/correlate', location.origin);
      url.searchParams.set('session', session);
      url.searchParams.set('lang', language);
      const tab = window.open(withStudioToken(url.toString()), '_blank');
      if (tab) tabs.current.set(session, tab);
      else {
        source.close();
        throw Error(
          language === 'es' ? 'Permite abrir Correlate en una pestaña nueva.' : 'Allow opening Correlate in a new tab.',
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };
}
