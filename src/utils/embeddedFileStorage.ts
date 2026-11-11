/** The same-origin SaaS owns the chosen local directory; Studio sends only its document. */
export function persistEmbeddedScript(
  scriptId: string,
  document: { yaml: string; fileName: string },
  publish = false,
): Promise<void> {
  if (window.parent === window) return Promise.resolve();
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'relampo:script-persisted' ||
        event.data.requestId !== requestId
      )
        return;
      cleanup();
      if (event.data.ok === true) resolve();
      else
        reject(
          new Error(
            typeof event.data.error === 'string' ? event.data.error : 'Could not save the script to its folder.',
          ),
        );
    };
    const timer = window.setTimeout(
      () => {
        cleanup();
        reject(new Error('The host did not confirm the script file save.'));
      },
      publish ? 60000 : 8000,
    );
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'relampo:persist-script', requestId, scriptId, ...document, publish },
      window.location.origin,
    );
  });
}
