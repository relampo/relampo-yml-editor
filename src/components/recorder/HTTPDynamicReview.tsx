import { useCallback, useEffect, useState } from 'react';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
import { recorderButton } from './HTTPRecorderSettings';
interface Candidate {
  id: string;
  variable: string;
  sourceRequest: number;
  source: string;
  path: string;
  uses: number;
  confidence: number;
}
export function HTTPDynamicReview({ language, autoAnalyze = false }: { language: string; autoAnalyze?: boolean }) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const analyze = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await httpRecorderRequest<{ candidates: Candidate[] }>('correlations', {});
      setCandidates(result.candidates || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (autoAnalyze) void analyze();
  }, [autoAnalyze, analyze]);
  return (
    <div className="space-y-3 text-xs">
      {!autoAnalyze && (
        <button
          type="button"
          className={recorderButton}
          disabled={busy}
          onClick={() => void analyze()}
        >
          {text('Review dynamic values', 'Revisar valores dinámicos')}
        </button>
      )}
      {busy && (
        <p className="text-zinc-400">{text('Analyzing saved recording…', 'Analizando la grabación guardada…')}</p>
      )}
      {candidates !== null && (
        <>
          <p className="text-zinc-400">
            {text(
              'This review does not modify your recording. Masked values and missing responses can prevent relationship detection. Configure extractors in Studio or use relampo correlate to apply reviewed suggestions.',
              'Esta revisión no modifica tu grabación. Los valores enmascarados y las respuestas no capturadas pueden impedir detectar relaciones. Configura los extractores en Studio o usa relampo correlate para aplicar las sugerencias revisadas.',
            )}
          </p>
          {!candidates.length && (
            <p className="text-zinc-400">
              {text(
                'No reliable dynamic-value relationships found.',
                'No se encontraron relaciones confiables de valores dinámicos.',
              )}
            </p>
          )}
          {candidates.map(c => (
            <div
              key={c.id}
              className="rounded border border-white/10 p-3"
            >
              <span className="font-mono text-yellow-300">{c.variable}</span>
              <p className="mt-1 text-zinc-400">
                #{c.sourceRequest} · {c.source} · {c.path} → {c.uses} {text('uses', 'usos')} ·{' '}
                {Math.round(c.confidence * 100)}%
              </p>
            </div>
          ))}
        </>
      )}
      {error && (
        <p
          role="alert"
          className="text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
