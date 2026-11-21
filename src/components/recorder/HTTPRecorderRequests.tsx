import { useEffect, useState } from 'react';
import { httpMethodAttr, httpStatusClass } from '../../utils/httpBadges';
import { httpRecorderRequest, type HTTPRecordedRow, type HTTPRecordingPreview } from '../../utils/httpRecorderApi';
import { recorderCompactInput as recorderInput } from './HTTPRecorderSettings';
import { useResizePanel } from '../../hooks/useResizePanel';
import { HTTPRecorderExchangeDetails } from './HTTPRecorderExchangeDetails';
export function HTTPRecorderRequests({
  rows: liveRows,
  total,
  responses,
  language,
  transactionsEnabled = false,
}: {
  rows: HTTPRecordedRow[];
  total: number;
  responses: boolean;
  language: string;
  transactionsEnabled?: boolean;
}) {
  const [history, setHistory] = useState<HTTPRecordedRow[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const rows = Array.from(new Map([...history, ...liveRows].map(row => [row.id, row])).values()).sort(
    (a, b) => a.id - b.id,
  );
  useEffect(() => {
    setHistory(previous => Array.from(new Map([...previous, ...liveRows].map(row => [row.id, row])).values()));
  }, [liveRows]);
  async function loadEarlier() {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const page = await httpRecorderRequest<{ requests: HTTPRecordedRow[] }>(
        'requests?before=' + Math.min(...rows.map(row => row.id)) + '&limit=500',
      );
      setHistory(previous => [...page.requests, ...previous]);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoadingHistory(false);
    }
  }
  const [search, setSearch] = useState(''),
    [method, setMethod] = useState(''),
    [status, setStatus] = useState(''),
    [domain, setDomain] = useState('');
  const [selected, setSelected] = useState<number | null>(null),
    [loadedPreview, setLoadedPreview] = useState<{ path: string; details: HTTPRecordingPreview } | null>(null),
    [error, setError] = useState('');
  const { leftPanelWidth, setIsResizing } = useResizePanel(55);
  const [revealedRequest, setRevealedRequest] = useState<number | null>(null);
  const showSensitive = selected !== null && revealedRequest === selected;
  const previewPath = selected === null ? null : 'requests/' + selected + (showSensitive ? '?showSensitive=true' : '');
  const preview = loadedPreview?.path === previewPath ? loadedPreview.details : null;
  const selectRequest = (id: number) => {
    if (selected !== id) setRevealedRequest(null);
    setSelected(id);
  };
  const es = language === 'es',
    text = (en: string, spanish: string) => (es ? spanish : en);
  const hosts = Array.from(
    new Set(
      rows.map(row => {
        try {
          return new URL(row.url).host;
        } catch {
          return '';
        }
      }),
    ),
  );
  useEffect(() => {
    if (previewPath === null) return;
    const controller = new AbortController();
    setError('');
    httpRecorderRequest<HTTPRecordingPreview>(previewPath, undefined, controller.signal)
      .then(details => {
        if (!controller.signal.aborted) setLoadedPreview({ path: previewPath, details });
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [previewPath]);
  const visible = rows.filter(
    row =>
      (!search || (row.name + ' ' + row.url).toLowerCase().includes(search.toLowerCase())) &&
      (!method || row.method === method) &&
      (!status || (status === 'errors' ? row.status >= 400 : row.status >= 200 && row.status < 400)) &&
      (!domain || new URL(row.url).host === domain),
  );
  return (
    <div data-recorder-panels="" className="flex min-h-0 min-w-0 flex-1 overflow-hidden border-t border-white/10">
      <section
        role="region"
        aria-label="Recorded traffic"
        data-recorder-panel=""
        className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden bg-[#0a0a0a]"
        style={{ width: `${leftPanelWidth}%` }}
      >
        <div className="flex h-9 shrink-0 items-center border-b border-white/10 px-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {text('Recorded traffic', 'Tráfico grabado')}
          <span className="ml-auto font-mono text-zinc-500">{total}</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-white/5 p-2">
          <input
            aria-label="Search requests"
            className={recorderInput + ' min-w-24! flex-1! w-24!'}
            placeholder={text('Search requests…', 'Buscar requests…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            aria-label="Method filter"
            className={recorderInput + ' w-auto!'}
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            <option value="">{text('All methods', 'Todos los métodos')}</option>
            {Array.from(new Set(rows.map(row => row.method))).map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Status filter"
            className={recorderInput + ' w-auto!'}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">{text('All statuses', 'Todos los estados')}</option>
            <option value="success">2xx / 3xx</option>
            <option value="errors">4xx / 5xx</option>
          </select>
          <select
            aria-label="Domain filter"
            className={recorderInput + ' w-auto!'}
            value={domain}
            onChange={e => setDomain(e.target.value)}
          >
            <option value="">{text('All domains', 'Todos los dominios')}</option>
            {hosts.map(host => (
              <option key={host}>{host}</option>
            ))}
          </select>
        </div>
        <p className="shrink-0 px-3 py-1 text-[10px] text-zinc-500">
          {text('View filters do not change what is saved.', 'Los filtros de vista no cambian lo que se guarda.')}{' '}
          {total > rows.length
            ? text(
                `Showing the latest ${rows.length} of ${total} requests.`,
                `Se muestran los últimos ${rows.length} de ${total} requests.`,
              )
            : `${total} requests`}
        </p>
        {rows.length > 0 && rows[0].id > 0 && (
          <button
            type="button"
            className="shrink-0 p-2 text-xs text-yellow-300"
            disabled={loadingHistory}
            onClick={() => void loadEarlier()}
          >
            {text('Load earlier requests', 'Cargar requests anteriores')}
          </button>
        )}
        {historyError && (
          <p
            role="alert"
            className="p-2 text-xs text-red-300"
          >
            {historyError}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#1a1a1a] text-xs text-zinc-400">
              <tr>
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Prefix</th>
                {transactionsEnabled && <th className="px-2 py-1.5">{text('Transaction', 'Transacción')}</th>}
                <th className="px-2 py-1.5">{text('Method', 'Método')}</th>
                <th className="px-2 py-1.5">URL</th>
                <th className="px-2 py-1.5">{text('Status', 'Estado')}</th>
                <th className="px-2 py-1.5">ms</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-selected={selected === row.id}
                  onClick={() => selectRequest(row.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectRequest(row.id);
                    }
                  }}
                  data-selected={selected === row.id ? '' : undefined}
                  className={
                    'border-t border-white/5 hover:bg-white/5 ' + (selected === row.id ? 'bg-yellow-400/5' : '')
                  }
                >
                  <td className="px-2 py-1.5 font-mono text-yellow-400">{String(row.id + 1).padStart(2, '0')}</td>
                  <td className="px-2 py-1.5">{row.name.split(' - ' + row.method + ' ')[0] || '—'}</td>
                  {transactionsEnabled && <td className="px-2 py-1.5 text-violet-300">{row.transaction || '—'}</td>}
                  <td className="px-2 py-1.5 font-mono text-emerald-300">
                    <span data-method={httpMethodAttr(row.method)}>{row.method}</span>
                  </td>
                  <td className="max-w-[240px] truncate px-2 py-1.5">
                    <button
                      type="button"
                      title={row.url}
                      className="w-full truncate text-left hover:text-yellow-300"
                      onClick={() => selectRequest(row.id)}
                    >
                      {row.url}
                    </button>
                  </td>
                  <td className={'px-2 py-1.5 font-mono ' + (row.status >= 400 ? 'text-red-300' : 'text-emerald-300')}>
                    <span data-status-class={httpStatusClass(row.status)}>{row.status}</span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-zinc-400">{row.durationMs.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p data-recorder-empty="" className="p-8 text-center text-sm text-zinc-500">
              {text(
                'Requests will appear here as you use your application.',
                'Los requests aparecerán aquí mientras usas tu aplicación.',
              )}
            </p>
          )}
        </div>
      </section>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        tabIndex={0}
        onMouseDown={event => {
          event.preventDefault();
          setIsResizing(true);
        }}
        className="relative z-20 w-1 shrink-0 cursor-col-resize bg-white/5 transition-colors hover:bg-yellow-400/40 active:bg-yellow-400/60"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      <HTTPRecorderExchangeDetails
        showSensitive={showSensitive}
        onToggleSensitive={
          showSensitive || (preview !== null && preview.masked !== false)
            ? () => setRevealedRequest(showSensitive ? null : selected)
            : undefined
        }
        row={rows.find(row => row.id === selected)}
        preview={preview}
        error={error}
        responses={responses}
        language={language}
      />
    </div>
  );
}
