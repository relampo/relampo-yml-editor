import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface RunRequestRow {
  key: string;
  label: string;
  title: string;
  method: string;
  scenario?: string;
  count: number;
  failures: number;
  avg: number | null;
  p50?: number | null;
  p90?: number | null;
  p95?: number | null;
  p99?: number | null;
  details?: ReactNode;
}
type SortKey = 'label' | 'count' | 'failures' | 'avg' | 'p50' | 'p90' | 'p95' | 'p99';
const pageSize = 50;

export function RunRequestTable({
  rows,
  es,
  approximate = false,
  formatLatency,
}: {
  rows: RunRequestRow[];
  es: boolean;
  approximate?: boolean;
  formatLatency: (value: number | null | undefined) => string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const filtered = search
    ? rows.filter(row => [row.method, row.label, row.scenario ?? ''].join(' ').toLocaleLowerCase().includes(search))
    : rows;
  const columns: { key: SortKey; label: string }[] = [
    { key: 'label', label: es ? 'Petición' : 'Request' },
    { key: 'count', label: es ? 'Cantidad' : 'Count' },
    { key: 'failures', label: es ? 'Fallos' : 'Fail' },
    { key: 'avg', label: es ? 'Prom.' : 'Avg' },
    ...(['p50', 'p90', 'p95', 'p99'] as const).map(key => ({
      key,
      label: approximate ? `${key.toUpperCase()} ≈` : key,
    })),
  ];
  const ordered = sort
    ? [...filtered].sort((a, b) => {
        const left = a[sort.key],
          right = b[sort.key];
        // Missing measurements stay last in either direction.
        if (left == null) return right == null ? 0 : 1;
        if (right == null) return -1;
        const comparison =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
        return sort.descending ? -comparison : comparison;
      })
    : filtered;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const offset = currentPage * pageSize;
  return (
    <div>
      <div className="border-b border-white/5 px-4 py-2">
        <label className="flex items-center gap-2 rounded border border-white/15 bg-[#0d0d0d] px-2.5 py-1.5 text-zinc-400 focus-within:border-yellow-400/50">
          <Search
            aria-hidden
            className="h-3.5 w-3.5 shrink-0"
          />
          <input
            type="search"
            aria-label={es ? 'Buscar peticiones' : 'Search requests'}
            placeholder={es ? 'Buscar por método o petición…' : 'Search by method or request…'}
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label={es ? 'Resumen por petición' : 'Request summary'}
          className="w-full min-w-150 text-left text-xs"
        >
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  aria-sort={sort?.key === column.key ? (sort.descending ? 'descending' : 'ascending') : 'none'}
                  className={index === 0 ? 'px-4 py-2' : 'px-3 py-2 text-right'}
                >
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 hover:text-yellow-300 ${index ? 'justify-end' : ''}`}
                    onClick={() => {
                      setSort({ key: column.key, descending: sort?.key === column.key && !sort.descending });
                      setPage(0);
                    }}
                  >
                    {column.label}
                    {sort?.key === column.key ? (
                      sort.descending ? (
                        <ArrowDown
                          aria-hidden
                          className="h-3 w-3"
                        />
                      ) : (
                        <ArrowUp
                          aria-hidden
                          className="h-3 w-3"
                        />
                      )
                    ) : (
                      <ArrowUpDown
                        aria-hidden
                        className="h-3 w-3"
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.slice(offset, offset + pageSize).map(row => (
              <tr
                key={row.key}
                className="border-b border-white/5 last:border-b-0"
              >
                <td
                  className="max-w-72 truncate px-4 py-2 text-zinc-200"
                  title={row.title}
                >
                  {row.method && (
                    <span className="mr-2 rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      {row.method}
                    </span>
                  )}
                  {row.scenario && <span className="mr-2 text-zinc-400">{row.scenario}</span>}
                  {row.label}
                  {row.details}
                </td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{row.count.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-mono ${row.failures > 0 ? 'text-red-300' : 'text-zinc-500'}`}>
                  {row.failures.toLocaleString()}
                </td>
                {[row.avg, row.p50, row.p90, row.p95, row.p99].map((value, index) => (
                  <td
                    key={index}
                    className="px-3 py-2 text-right font-mono text-zinc-300"
                  >
                    {formatLatency(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && search && (
        <p
          role="status"
          className="px-4 py-3 text-xs text-zinc-400"
        >
          {es ? 'No hay peticiones que coincidan.' : 'No matching requests.'}
        </p>
      )}
      <div
        className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-2 text-xs text-zinc-400"
        aria-label={es ? 'Paginación de peticiones' : 'Request pagination'}
      >
        <span>
          {filtered.length ? offset + 1 : 0}–{Math.min(offset + pageSize, filtered.length)} / {filtered.length} ·{' '}
          {es ? '50 por página' : '50 per page'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 hover:text-yellow-300 disabled:opacity-40"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
            {es ? 'Anterior' : 'Previous'}
          </button>
          <span>
            {currentPage + 1} / {pages}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 hover:text-yellow-300 disabled:opacity-40"
            disabled={currentPage + 1 >= pages}
            onClick={() => setPage(currentPage + 1)}
          >
            {es ? 'Siguiente' : 'Next'}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
