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
export async function persistLocalRunReports(
  id: string,
  formats: LocalReportFormat[],
  startedAt: string,
  language: 'en' | 'es',
  context = localReportContext(),
): Promise<void> {
  if (!context) return;
  const { planKey, scriptId } = context;
  const current = localReportContext();
  if (current?.planKey !== planKey || current?.scriptId !== scriptId)
    throw Error('Return to the original Test Plan and script to save these reports.');
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
