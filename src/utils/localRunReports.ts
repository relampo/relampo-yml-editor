import { agentRequest } from './agentTransport';
import { embeddedPlanDraftKey } from './embeddedPlanDraft';
import { loadRunReportPath } from './runApi';

export type LocalReportFormat = 'html' | 'json' | 'csv' | 'txt';
export interface LocalReportContext {
  planKey: string;
  scriptId: string;
}
export function localReportContext(): LocalReportContext | undefined {
  const planKey = embeddedPlanDraftKey();
  if (!planKey || window.parent === window) return undefined;
  return { planKey, scriptId: new URLSearchParams(location.search).get('script') || 'default' };
}
/** Probe storage before Run; an unbound/example plan uses browser downloads. */
export async function localReportStorageAvailable(): Promise<boolean> {
  const context = localReportContext();
  if (!context) return false;
  const requestId = crypto.randomUUID();
  return new Promise(resolve => {
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'relampo:report-storage-result' ||
        event.data.requestId !== requestId
      )
        return;
      cleanup();
      resolve(event.data.available === true);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, 2000);
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'relampo:report-storage', requestId, ...context }, location.origin);
  });
}

export async function persistLocalRunReports(
  id: string,
  formats: LocalReportFormat[],
  startedAt: string,
  language: 'en' | 'es',
  context = localReportContext(),
  destination: 'plan' | 'downloads' = context ? 'plan' : 'downloads',
): Promise<void> {
  const current = localReportContext();
  if (
    destination === 'plan' &&
    (!context || current?.planKey !== context.planKey || current?.scriptId !== context.scriptId)
  )
    throw Error('Return to the original Test Plan and script to save these reports.');
  const { planKey, scriptId } = context ?? { planKey: '', scriptId: 'default' };
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, '-');
  const folder = `${stamp}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const files = await Promise.all(
    formats.map(async format => {
      const path =
        format === 'html' ? loadRunReportPath(id, language) : `/api/run/${encodeURIComponent(id)}/report/${format}`;
      const response = await agentRequest(path);
      if (!response.ok)
        throw Error(
          (await response.json().catch(() => ({}))).error || `Could not generate ${format.toUpperCase()} report.`,
        );
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { path: `Reports/${folder}/report.${format}`, data: btoa(binary) };
    }),
  );
  if (destination === 'downloads') {
    for (const file of files) {
      const bytes = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${folder}.${file.path.split('.').pop()}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    return;
  }
  const requestId = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'relampo:run-reports-persisted' ||
        event.data.requestId !== requestId
      )
        return;
      cleanup();
      if (event.data.ok === true) resolve();
      else reject(Error(event.data.error || 'Could not save reports to the Test Plan.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(Error('Report storage did not respond. Retry saving the reports.'));
    }, 150000);
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'relampo:persist-run-reports', requestId, planKey, scriptId, files },
      location.origin,
    );
  });
}
