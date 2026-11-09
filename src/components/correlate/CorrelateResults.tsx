import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { AppliedCorrelation } from '../../utils/correlateApi';
import { correlationRequestLabel } from '../../utils/correlateApi';
import { CorrelateCandidates } from './CorrelateCandidates';
import { CorrelateUses } from './CorrelateUses';
export function CorrelateResults({
  results,
  ...props
}: ComponentProps<typeof CorrelateCandidates> & { results: AppliedCorrelation[] | null }) {
  const [tab, setTab] = useState<'candidates' | 'correlated'>('candidates');
  const es = props.language === 'es';
  useEffect(() => {
    setTab(results === null ? 'candidates' : 'correlated');
  }, [results]);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        role="tablist"
        aria-label="Correlation results"
        className="flex h-9 shrink-0 border-b border-white/10 bg-[#111111] text-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'candidates'}
          onClick={() => setTab('candidates')}
          className={
            'flex items-center gap-3 border-b-2 px-4 ' +
            (tab === 'candidates'
              ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400'
              : 'border-transparent text-zinc-500')
          }
        >
          {es ? 'Candidatos' : 'Candidates'}
          <span className="font-mono text-[10px]">{props.rows?.length ?? 0}</span>
        </button>
        {results !== null && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'correlated'}
            onClick={() => setTab('correlated')}
            className={
              'flex items-center gap-3 border-b-2 px-4 ' +
              (tab === 'correlated'
                ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400'
                : 'border-transparent text-zinc-500')
            }
          >
            {es ? 'Correlaciones' : 'Correlated'}
            <span className="font-mono text-[10px]">{results.length}</span>
          </button>
        )}
      </div>
      {tab === 'candidates' || results === null ? (
        <CorrelateCandidates {...props} />
      ) : (
        <section
          role="region"
          aria-label="Applied correlations"
          className="min-h-0 flex-1 overflow-auto"
        >
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#1a1a1a] text-[10px] text-zinc-400">
              <tr>
                {[
                  es ? 'Variable generada' : 'Generated variable',
                  es ? 'Extractor' : 'Extractor',
                  es ? 'Regex / expresión' : 'Regex / expression',
                  es ? 'Request de origen' : 'Source request',
                  es ? 'Se reutiliza en' : 'Used in',
                ].map(label => (
                  <th
                    scope="col"
                    key={label}
                    className="whitespace-nowrap px-3 py-2"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr
                  key={row.variable + '-' + index}
                  className="border-t border-white/5 align-top hover:bg-white/5"
                >
                  <td className="px-3 py-3 font-mono text-yellow-400">
                    {row.variable}
                    <span className="mt-1 block text-[10px] text-zinc-500">{row.placeholder}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-300">
                    {row.type}
                    <span className="mt-1 block font-mono text-[10px] text-zinc-500">{row.from}</span>
                  </td>
                  <td className="max-w-96 px-3 py-3">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-emerald-300">
                      {row.pattern || row.expression || row.header || '—'}
                    </pre>
                    {row.configuration && (
                      <details className="mt-2 text-[10px] text-zinc-500">
                        <summary className="cursor-pointer hover:text-yellow-300">
                          {es ? 'Ver configuración YAML' : 'View YAML configuration'}
                        </summary>
                        <pre
                          aria-label={'Extractor configuration ' + row.variable}
                          className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded border border-white/10 bg-[#111111] p-2 text-zinc-300"
                        >
                          {row.configuration}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="max-w-64 px-3 py-3">
                    <button
                      type="button"
                      className="max-w-full truncate text-left text-emerald-300 hover:text-yellow-300"
                      title={correlationRequestLabel(row.source)}
                      onClick={() =>
                        props.onLocate({ ...row, id: row.variable, value: '', kind: 'auto', applicable: false })
                      }
                    >
                      {correlationRequestLabel(row.source)}
                    </button>
                    <span className="mt-1 block break-words font-mono text-[10px] text-zinc-500">
                      {row.source.Location} {row.source.Path}
                    </span>
                  </td>
                  <td className="max-w-64 px-3 py-2 text-zinc-400">
                    <CorrelateUses
                      targets={row.targets}
                      label={'Used in correlation ' + row.variable}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length && (
            <p className="p-8 text-center text-xs text-zinc-500">
              {es ? 'No se generaron correlaciones.' : 'No correlations were generated.'}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
