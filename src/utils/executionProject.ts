import { embeddedPlanDraftKey } from './embeddedPlanDraft';
export interface ExecutionProject {
  scriptPath: string;
  files: { path: string; data: string }[];
  provider?: 'github' | 'gitlab';
  repository?: string;
  identity?: string;
}
export class ExecutionProjectError extends Error {
  constructor(message: string, readonly reconnect: boolean) {
    super(message);
  }
}

const scriptId = () => new URLSearchParams(location.search).get("script") || "default";

export function reconnectRunRepository(reconnectId?: string): void {
  window.parent.postMessage(
    { type: "relampo:reconnect-run-repository", planKey: embeddedPlanDraftKey(), scriptId: scriptId(), ...(reconnectId && { reconnectId }) },
    location.origin,
  );
}

export function onRunRepositoryReconnected(onConnected: (reconnectId?: string) => void): () => void {
  const receive = (event: MessageEvent) => {
    if (
      event.origin === location.origin &&
      event.source === window.parent &&
      event.data?.type === "relampo:run-repository-reconnected" &&
      event.data.planKey === embeddedPlanDraftKey() &&
      event.data.scriptId === scriptId()
    ) onConnected(event.data.reconnectId);
  };
  window.addEventListener("message", receive);
  return () => window.removeEventListener("message", receive);
}

/** Obtain an immutable project from its owner, without passing repository credentials. */
export function requestExecutionProject(fileName = 'script.yaml'): Promise<ExecutionProject | undefined> {
  const planKey = embeddedPlanDraftKey();
  if (!planKey || window.parent === window) return Promise.resolve(undefined);
  const requestId = crypto.randomUUID();
  const activeScriptId = scriptId();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'relampo:execution-project-result' ||
        event.data.requestId !== requestId
      )
        return;
      cleanup();
      const project = event.data.project;
      if (event.data.ok !== true) return reject(new ExecutionProjectError(typeof event.data.error === 'string' ? event.data.error : 'Could not prepare the Test Plan files.', event.data.reconnect === true));
      if (!project || typeof project.scriptPath !== 'string' || !Array.isArray(project.files))
        return reject(Error('Invalid execution project.'));
      resolve(project);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(Error('The Test Plan did not return its execution files.'));
    }, 150000);
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'relampo:execution-project', requestId, planKey, scriptId: activeScriptId, fileName },
      location.origin,
    );
  });
}
