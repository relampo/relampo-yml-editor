import { useLanguage } from '../contexts/LanguageContext';
import type { SQLResult } from '../utils/sqlResults';

export function SQLResultTable({ result, label }: { result: SQLResult; label?: string }) {
  const { t } = useLanguage();
  const text = (key: string) => t(`yamlEditor.sqlResults.${key}`);
  return (
    <section
      aria-label={text('title')}
      className="min-w-0 border border-white/10 bg-[#111111]"
    >
      <div className="space-y-1 border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-teal-300">
          {text('title')}
          {label ? ` · ${label}` : ''}
        </p>
        <p className="text-xs text-zinc-400">
          {result.kind === 'exec'
            ? `${text('affected')}: ${result.rows_affected}`
            : `${text('returned')}: ${result.rows_returned} · ${text('shown')}: ${result.rows.length}`}
        </p>
        {result.query && (
          <details className="pt-2 text-xs text-zinc-300">
            <summary className="cursor-pointer text-teal-300">{text('request')}</summary>
            <p className="mt-2 text-zinc-400">
              {text('dialect')}: {result.dialect ?? '—'}
            </p>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono">
              {result.query}
            </pre>
            <p className="mt-2 text-zinc-400">{text('params')}</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono">
              {JSON.stringify(result.params ?? [], null, 2)}
            </pre>
            {result.request_truncated && <p className="mt-2 text-amber-300">{text('requestTruncated')}</p>}
          </details>
        )}
        {result.truncated && <p className="text-xs text-amber-300">{text('truncated')}</p>}
      </div>
      {result.kind === 'query' &&
        (result.rows.length > 0 ? (
          <div className="max-h-80 overflow-auto">
            <table
              aria-label={text('rows')}
              className="w-full text-left text-xs"
            >
              <thead className="sticky top-0 bg-[#191919] text-zinc-300">
                <tr>
                  {result.columns.map((column, index) => (
                    <th
                      scope="col"
                      key={index}
                      className="border-b border-white/10 px-3 py-2 whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5"
                  >
                    {row.map((cell, column) => (
                      <td
                        key={column}
                        className="max-w-96 px-3 py-2 break-words whitespace-pre-wrap font-mono text-zinc-200"
                      >
                        {cell === null ? <span className="italic text-zinc-500">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-3 text-xs text-zinc-400">{text(result.rows_returned > 0 ? 'omitted' : 'empty')}</p>
        ))}
    </section>
  );
}
