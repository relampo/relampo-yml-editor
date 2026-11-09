import { correlationRequestLabel as requestLabel, type CorrelateCandidate } from '../../utils/correlateApi';
import { CorrelateUses } from './CorrelateUses';
import { recorderCompactInput } from '../recorder/HTTPRecorderSettings';
import { useState } from 'react';
export function CorrelateCandidates({
  rows,
  selected,
  onSelected,
  onLocate,
  disabled,
  language,
}: {
  rows: CorrelateCandidate[] | null;
  selected: string[];
  onSelected: (ids: string[]) => void;
  onLocate: (row: CorrelateCandidate) => void;
  disabled: boolean;
  language: string;
}) {
  const [search, setSearch] = useState('');
  const es = language === 'es';
  const visible =
    rows?.filter(row =>
      (row.variable + ' ' + row.value + ' ' + row.source.URL + ' ' + row.id)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  const applicable = visible.filter(row => row.applicable);
  const all = applicable.length > 0 && applicable.every(row => selected.includes(row.id));
  return (
    <section
      role="region"
      aria-label="Correlation candidates"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]"
    >
      <div className="shrink-0 border-b border-white/5 p-2">
        <input
          aria-label="Search candidates"
          placeholder={es ? 'Buscar candidatos…' : 'Search candidates…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={recorderCompactInput}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#1a1a1a] text-[10px] text-zinc-400">
            <tr>
              <th
                scope="col"
                className="px-2 py-2"
              >
                <input
                  type="checkbox"
                  aria-label="Select applicable candidates"
                  disabled={disabled || !applicable.length}
                  checked={all}
                  onChange={e =>
                    onSelected(
                      e.target.checked
                        ? [...new Set([...selected, ...applicable.map(row => row.id)])]
                        : selected.filter(id => !applicable.some(row => row.id === id)),
                    )
                  }
                />
              </th>
              {[
                'ID',
                es ? 'Variable' : 'Variable',
                'Value',
                es ? 'Request de origen' : 'Source request',
                es ? 'Ubicación' : 'Location',
                es ? 'Se reutiliza en' : 'Used in',
              ].map(label => (
                <th
                  scope="col"
                  className="whitespace-nowrap px-2 py-2"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr
                key={row.id}
                className={
                  'border-t border-white/5 hover:bg-white/5 ' + (selected.includes(row.id) ? 'bg-yellow-400/5' : '')
                }
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label={'Select candidate ' + row.id}
                    checked={selected.includes(row.id)}
                    disabled={disabled || !row.applicable}
                    onChange={e =>
                      onSelected(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))
                    }
                  />
                </td>
                <td className="px-2 py-2 font-mono text-yellow-400">{row.id}</td>
                <td className="max-w-48 break-words px-2 py-2 font-mono text-zinc-200">{row.variable}</td>
                <td className="px-2 py-2 text-zinc-400">
                  <div className="max-h-24 max-w-64 overflow-y-auto whitespace-pre-wrap break-all font-mono text-zinc-300">
                    {row.value ?? '—'}
                  </div>
                  {!row.applicable && (
                    <span className="mt-1 block text-[10px] text-amber-300">
                      {es ? 'Revisión manual' : 'Manual review'}
                    </span>
                  )}
                </td>
                <td className="max-w-64 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onLocate(row)}
                    className="max-w-full truncate text-left text-emerald-300 hover:text-yellow-300"
                    title={requestLabel(row.source)}
                  >
                    {requestLabel(row.source)}
                  </button>
                </td>
                <td className="max-w-44 break-words px-2 py-2 font-mono text-zinc-400">
                  {row.source.Location}
                  <span className="block text-zinc-500">{row.source.Path}</span>
                </td>
                <td className="max-w-64 px-2 py-2 text-zinc-400">
                  <CorrelateUses
                    targets={row.targets}
                    label={'Used in candidate ' + row.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-8 text-center text-xs text-zinc-500">
            {rows === null
              ? es
                ? 'Abre un script y pulsa Analizar.'
                : 'Load a script, then click Analyze.'
              : es
                ? 'No se encontraron candidatos.'
                : 'No candidates found.'}
          </p>
        )}
      </div>
    </section>
  );
}
