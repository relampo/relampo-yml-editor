import { useEffect, useRef, useState } from 'react';
import type { DistributedState } from '../utils/distributedApi';
import {
  localReportContext,
  localReportStorageAvailable,
  persistDistributedRunReports,
} from '../utils/localRunReports';

/** Copy completed provider reports to the plan without moving/removing the provider originals. */
export function useDistributedReportStorage(state: DistributedState | null, runId: string, language: 'en' | 'es') {
  const context = localReportContext();
  const key =
    context && state?.reports_ready
      ? JSON.stringify([context.planKey, context.scriptId, state.repository, state.run_id, state.started_at])
      : '';
  const pending = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState({ key: '', saving: false, error: '' });
  useEffect(() => {
    if (!key || !state || !context) return;
    const marker = `relampo.reports.saved:${key}`;
    try {
      if (sessionStorage.getItem(marker)) return;
    } catch {
      /* Optional cache. */
    }
    let alive = true;
    if (pending.current?.key !== key) {
      const promise = (async () => {
        if (!(await localReportStorageAvailable())) return;
        if (!state.report_formats?.includes('json'))
          throw Error(
            language === 'es'
              ? 'Esta ejecución no generó JSON para Analysis. Ejecuta nuevamente con el editor actualizado.'
              : 'This execution did not generate Analysis JSON. Run it again with the updated editor.',
          );
        await persistDistributedRunReports(runId, state.report_formats, state.started_at, language, context);
        try {
          sessionStorage.setItem(marker, '1');
        } catch {
          /* The reports were still saved. */
        }
      })();
      pending.current = { key, promise };
    }
    setResult({ key, saving: true, error: '' });
    void pending.current.promise.then(
      () => {
        if (alive) setResult({ key, saving: false, error: '' });
      },
      cause => {
        if (alive) setResult({ key, saving: false, error: cause instanceof Error ? cause.message : String(cause) });
      },
    );
    return () => {
      alive = false;
    };
    // A readiness key identifies an immutable execution; live sample updates must not restart storage.
  }, [key, retry]);
  return {
    saving: result.key === key && result.saving,
    error: result.key === key ? result.error : '',
    retry: () => {
      pending.current = null;
      setRetry(n => n + 1);
    },
  };
}
