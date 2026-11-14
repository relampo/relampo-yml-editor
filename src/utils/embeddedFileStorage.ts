/** The same-origin SaaS owns the chosen local directory; Studio sends only its document. */
export function persistEmbeddedScript(
  scriptId: string,
  document: { yaml: string; fileName: string },
  publish = false,
): Promise<{ yaml?: string } | void> {
  if (window.parent === window) return Promise.resolve();
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    let reviewing = false;
    const receive = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data.requestId !== requestId
      )
        return;
      if (event.data.type === 'relampo:script-review-state' || event.data.type === 'relampo:script-persist-progress') {
        if (event.data.type === 'relampo:script-review-state') reviewing = event.data.reviewing === true;
        window.clearTimeout(timer);
        if (!reviewing) timer = window.setTimeout(timeout, 60000);
        window.parent.postMessage({ type: 'relampo:save-progress', reviewing }, window.location.origin);
        return;
      }
      if (event.data.type !== 'relampo:script-persisted') return;
      cleanup();
      if (event.data.ok === true) resolve(typeof event.data.yaml === 'string' ? { yaml: event.data.yaml } : undefined);
      else {
        const error = new Error(
          typeof event.data.error === 'string' ? event.data.error : 'Could not save the script to its folder.',
        );
        if (event.data.cancelled === true) error.name = 'ScriptSaveCancelled';
        reject(error);
      }
    };
    const timeout = () => {
      cleanup();
      reject(new Error('The host did not confirm the script file save.'));
    };
    let timer = window.setTimeout(timeout, publish ? 60000 : 8000);
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'relampo:persist-script', requestId, scriptId, ...document, publish },
      window.location.origin,
    );
  });
}
