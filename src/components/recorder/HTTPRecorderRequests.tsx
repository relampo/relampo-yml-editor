import { useEffect, useState } from 'react';
import { httpRecorderRequest, type HTTPRecordedRow, type HTTPRecordingPreview } from '../../utils/httpRecorderApi';
import { recorderInput } from './HTTPRecorderSettings';
export function HTTPRecorderRequests({
  rows,
  total,
  responses,
  language,
}: {
  rows: HTTPRecordedRow[];
  total: number;
  responses: boolean;
  language: string;
}) {
  const [search, setSearch] = useState(''),
    [method, setMethod] = useState(''),
    [status, setStatus] = useState(''),
    [domain, setDomain] = useState('');
  const [selected, setSelected] = useState<number | null>(null),
    [preview, setPreview] = useState<HTTPRecordingPreview | null>(null),
    [error, setError] = useState(''),
    [tab, setTab] = useState<'request' | 'response'>('request');
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
    if (selected === null) return;
    const controller = new AbortController();
    setPreview(null);
    setError('');
    httpRecorderRequest<HTTPRecordingPreview>('requests/' + selected, undefined, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setPreview(value);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [selected]);
  const visible = rows.filter(
    row =>
      (!search || (row.name + ' ' + row.url).toLowerCase().includes(search.toLowerCase())) &&
      (!method || row.method === method) &&
      (!status || (status === 'errors' ? row.status >= 400 : row.status >= 200 && row.status < 400)) &&
      (!domain || new URL(row.url).host === domain),
  );
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3">
        <input
          aria-label="Search requests"
          className={recorderInput + ' max-w-sm'}
          placeholder={text('Search requests…', 'Buscar requests…')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          aria-label="Method filter"
          className={recorderInput + ' w-auto'}
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
          className={recorderInput + ' w-auto'}
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">{text('All statuses', 'Todos los estados')}</option>
          <option value="success">2xx / 3xx</option>
          <option value="errors">4xx / 5xx</option>
        </select>
        <select
          aria-label="Domain filter"
          className={recorderInput + ' w-auto'}
          value={domain}
          onChange={e => setDomain(e.target.value)}
        >
          <option value="">{text('All domains', 'Todos los dominios')}</option>
          {hosts.map(host => (
            <option key={host}>{host}</option>
          ))}
        </select>
      </div>
      <p className="px-4 py-2 text-xs text-zinc-500">
        {text('View filters do not change what is saved.', 'Los filtros de vista no cambian lo que se guarda.')}{' '}
        {total > rows.length
          ? text(
              `Showing the latest ${rows.length} of ${total} requests.`,
              `Se muestran los últimos ${rows.length} de ${total} requests.`,
            )
          : `${total} requests`}
      </p>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#1a1a1a] text-xs text-zinc-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Prefix</th>
              <th className="p-3">{text('Method', 'Método')}</th>
              <th className="p-3">URL</th>
              <th className="p-3">{text('Status', 'Estado')}</th>
              <th className="p-3">ms</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr
                key={row.id}
                className={'border-t border-white/5 hover:bg-white/5 ' + (selected === row.id ? 'bg-yellow-400/5' : '')}
              >
                <td className="p-3 font-mono text-yellow-400">{String(row.id + 1).padStart(2, '0')}</td>
                <td className="p-3">{row.name.split(' - ')[0] || '—'}</td>
                <td className="p-3 font-mono text-emerald-300">{row.method}</td>
                <td className="max-w-xl truncate p-3">
                  <button
                    type="button"
                    className="w-full truncate text-left hover:text-yellow-300"
                    onClick={() => setSelected(row.id)}
                  >
                    {row.url}
                  </button>
                </td>
                <td className={'p-3 font-mono ' + (row.status >= 400 ? 'text-red-300' : 'text-emerald-300')}>
                  {row.status}
                </td>
                <td className="p-3 font-mono text-zinc-400">{row.durationMs.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-zinc-500">
            {text(
              'Requests will appear here as you use your application.',
              'Los requests aparecerán aquí mientras usas tu aplicación.',
            )}
          </p>
        )}
      </div>
      {selected !== null && (
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex gap-4">
            {(['request', 'response'] as const).map(value => (
              <button
                type="button"
                key={value}
                className={
                  'border-b-2 pb-2 text-sm ' +
                  (tab === value ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-zinc-400')
                }
                onClick={() => setTab(value)}
              >
                {value === 'request' ? 'Request' : 'Response'}
              </button>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="text-red-300"
            >
              {error}
            </p>
          )}
          {tab === 'response' && !responses ? (
            <p className="text-sm text-zinc-400">
              {text(
                'Response bodies were not captured. Enable Capture responses before starting a new recording.',
                'No se capturaron cuerpos de respuesta. Activa Capturar respuestas antes de iniciar otra grabación.',
              )}
            </p>
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/40 p-3 font-mono text-xs text-zinc-300">
              {preview ? JSON.stringify(preview[tab], null, 2) : text('Loading…', 'Cargando…')}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
