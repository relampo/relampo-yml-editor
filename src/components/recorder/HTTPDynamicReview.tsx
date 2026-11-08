import { useState } from 'react';
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
export function HTTPDynamicReview({ language }: { language: string }) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  return (
    <div className="space-y-3 border-t border-emerald-400/10 pt-3">
      <button
        type="button"
        className={recorderButton}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const result = await httpRecorderRequest<{ candidates: Candidate[] }>('correlations', {});
            setCandidates(result.candidates);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        {text('Review dynamic values', 'Revisar valores dinámicos')}
      </button>
      {candidates !== null && (
        <>
          <p className="text-xs text-zinc-400">
            {text(
              'This review does not modify your recording. Masked values and missing responses can prevent relationship detection. Configure extractors in Studio or use relampo correlate to apply reviewed suggestions.',
              'Esta revisión no modifica tu grabación. Los valores enmascarados y las respuestas no capturadas pueden impedir detectar relaciones. Configura los extractores en Studio o usa relampo correlate para aplicar las sugerencias revisadas.',
            )}
          </p>
          {!candidates.length && (
            <p className="text-sm text-zinc-400">
              {text(
                'No reliable dynamic-value relationships found.',
                'No se encontraron relaciones confiables de valores dinámicos.',
              )}
            </p>
          )}
          {candidates.map(c => (
            <div
              key={c.id}
              className="rounded border border-white/10 p-3 text-xs"
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
          className="text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
