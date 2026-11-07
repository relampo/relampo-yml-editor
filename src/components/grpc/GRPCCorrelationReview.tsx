import { useState } from 'react';
import { grpcRequest, type GRPCGenerated } from '../../utils/grpcApi';
interface Candidate {
  ID: string;
  VariableName: string;
  Type: string;
  ValueExample: string;
  FinalScore: number;
  Explanation: string;
  ReviewRequired: boolean;
  Source: { URL: string; Path: string; MessageIndex?: number };
  Targets: unknown[];
}
export function GRPCCorrelationReview({
  project,
  onChange,
}: {
  project: GRPCGenerated;
  onChange: (project: GRPCGenerated) => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function analyze() {
    setBusy(true);
    setError('');
    try {
      const result = await grpcRequest<{ candidates: Candidate[] }>('correlations', { yaml: project.yaml });
      setCandidates(result.candidates || []);
      setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    setError('');
    try {
      onChange(
        await grpcRequest<GRPCGenerated>('correlations', {
          yaml: project.yaml,
          projectId: project.id,
          apply: true,
          selectedIds: selected,
          variables: names,
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-white/10 pt-3">
      <button
        type="button"
        disabled={busy}
        className="rounded border border-white/15 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
        onClick={analyze}
      >
        Find dynamic values
      </button>
      <p className="text-xs text-zinc-500">
        Relationships use recorded values and timing. Masked credentials cannot prove a relationship. Review
        asynchronous message filters before applying.
      </p>
      {candidates?.length === 0 && (
        <p className="text-xs text-zinc-400">
          No reliable relationships found. You can configure extractors and authorization variables in the request
          editor.
        </p>
      )}
      {candidates?.map(candidate => (
        <article
          key={candidate.ID}
          className="space-y-2 rounded border border-white/10 p-3 text-xs"
        >
          <label className="flex gap-2 text-zinc-300">
            <input
              type="checkbox"
              aria-label={'Apply ' + candidate.VariableName}
              checked={selected.includes(candidate.ID)}
              onChange={event =>
                setSelected(
                  event.target.checked ? [...selected, candidate.ID] : selected.filter(id => id !== candidate.ID),
                )
              }
            />
            <span>
              {candidate.Source.URL} · {candidate.Source.Path} → {candidate.Targets.length} uses ·{' '}
              {Math.round(candidate.FinalScore * 100)}% confidence
            </span>
          </label>
          {candidate.ReviewRequired && (
            <p className="text-amber-300">Review required: choose the correct source and incoming-message filter.</p>
          )}
          <p className="text-zinc-500">{candidate.Explanation}</p>
          <label className="block text-zinc-400">
            Variable name
            <input
              aria-label={'Variable ' + candidate.ID}
              className="mt-1 w-full rounded border border-white/10 bg-zinc-950 p-2 text-zinc-200"
              value={names[candidate.ID] ?? candidate.VariableName}
              onChange={event => setNames({ ...names, [candidate.ID]: event.target.value })}
            />
          </label>
        </article>
      ))}
      {Boolean(selected.length) && (
        <button
          type="button"
          disabled={busy}
          className="rounded border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
          onClick={apply}
        >
          Apply selected correlations
        </button>
      )}
      {error && (
        <p
          role="alert"
          className="text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
