import { ExternalLink, Square } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  distributedReportUrl,
  safeProviderURL,
  type DistributedState,
  type DistributedPlan,
  type DistributedPoint,
} from '../../utils/distributedApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DistributedNotice as Notice,
  DistributedMetric as Metric,
  DistributedChart as LiveChart,
} from './DistributedFeedback';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40';
const stageNames: Record<string, [string, string]> = {
  preparing: ['Preparando archivos y publicación', 'Preparing files and publication'],
  prepared: ['Preparación completada', 'Preparation completed'],
  queued: ['En cola', 'Queued'],
  pending: ['En cola', 'Queued'],
  created: ['Creada', 'Created'],
  waiting: ['Esperando runners', 'Waiting for runners'],
  in_progress: ['Ejecutando', 'Running'],
  running: ['Ejecutando', 'Running'],
  generating_report: ['Generando y publicando reportes', 'Generating and publishing reports'],
  reports_ready: ['Reportes disponibles', 'Reports ready'],
};
export function DistributedResults({
  state,
  runId,
  plan,
  scope,
  onScopeChange,
  points,
  active,
  busy,
  onStop,
}: {
  state: DistributedState;
  runId: string;
  plan: DistributedPlan | null;
  scope: string;
  onScopeChange: (value: string) => void;
  points: DistributedPoint[];
  active: boolean;
  busy: boolean;
  onStop: () => void;
}) {
  const { language } = useLanguage();
  const es = language === 'es';
  const text = (spanish: string, english: string) => (es ? spanish : english);
  const selectedScope =
    state?.scopes?.find(item => item.key === scope) ?? state?.scopes?.find(item => item.key === 'global');
  const total = selectedScope?.total;
  const latest = points.at(-1);
  const remoteURL = safeProviderURL(state?.url);
  const reportsURL = safeProviderURL(state?.reports_url);
  const staleNodes =
    state?.nodes.filter(node => !node.progress.final && Date.now() - Date.parse(node.updated_at) > 60_000) ?? [];
  return (
    <section
      className="space-y-4"
      aria-label={text('Resultados distribuidos', 'Distributed results')}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/15 px-3 py-1 text-sm">
          {state.status === 'running'
            ? (stageNames[state.stage]?.[es ? 0 : 1] ?? state.stage)
            : state.status === 'completed'
              ? text('Completada', 'Completed')
              : state.status === 'stopped'
                ? text('Detenida', 'Stopped')
                : state.status === 'stopping'
                  ? text('Deteniendo', 'Stopping')
                  : text('Fallida', 'Failed')}
        </span>
        {remoteURL && (
          <a
            href={remoteURL}
            target="_blank"
            rel="noreferrer"
            className={buttonClass}
          >
            <ExternalLink size={15} />
            {text('Ver ejecución', 'View execution')}
          </a>
        )}
        {active && state.run_id && (
          <button
            className={buttonClass}
            disabled={busy || state.status === 'stopping'}
            onClick={onStop}
          >
            <Square size={15} />
            {text('Cancelar ejecución remota', 'Cancel remote execution')}
          </button>
        )}
      </div>
      {state.error && <Notice alert>{state.error}</Notice>}
      {state.warning && <Notice>{state.warning}</Notice>}
      {staleNodes.length > 0 && (
        <Notice>
          {text(
            'Hay nodos sin muestras recientes. Las cifras visibles son las últimas recibidas.',
            'Some nodes have no recent samples. Visible figures are the last received.',
          )}
        </Notice>
      )}
      <Select
        value={scope}
        onValueChange={onScopeChange}
      >
        <SelectTrigger aria-label={text('Alcance del resultado distribuido', 'Distributed result scope')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">Global</SelectItem>
          {state.scopes
            .filter(item => item.key !== 'global' && !item.name)
            .map(item => (
              <SelectItem
                key={item.key}
                value={item.key}
              >
                {item.node_id
                  ? `${text('Nodo', 'Node')} ${item.node_id}`
                  : item.scenario || text('Sin escenario', 'No scenario')}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric
          label={text('Peticiones', 'Requests')}
          value={total?.requests}
        />
        <Metric
          label={text('Errores', 'Errors')}
          value={total?.failures}
        />
        <Metric
          label={text('Tasa de error', 'Error rate')}
          value={total && total.requests > 0 ? `${((100 * total.failures) / total.requests).toFixed(2)}%` : undefined}
        />
        <Metric
          label="RPS"
          value={latest?.rps.toFixed(1)}
        />
        <Metric
          label={text('Usuarios activos', 'Active users')}
          value={selectedScope?.scenario ? undefined : latest?.active_vus}
        />
        <Metric
          label={text('Latencia media', 'Average latency')}
          value={total?.avg_ms != null ? `${total.avg_ms.toFixed(1)} ms` : undefined}
        />
        <Metric
          label="P95 ≈"
          value={total?.p95_ms != null ? `${total.p95_ms.toFixed(1)} ms` : undefined}
        />
        <Metric
          label={text('Nodos con muestras', 'Nodes with samples')}
          value={`${new Set(state.nodes.map(node => node.node_id)).size}/${state.expected_nodes ?? plan?.nodes ?? '—'}`}
        />
        <Metric
          label={text('Duración observada', 'Observed duration')}
          value={total ? `${total.elapsed_seconds.toFixed(1)} s` : undefined}
        />
        <Metric
          label={text('Modo', 'Mode')}
          value={text('Distribuido', 'Distributed')}
        />
      </div>
      {!state.history.length && (
        <p
          role="status"
          className="text-sm text-zinc-400"
        >
          {text('Esperando las primeras muestras de los workers…', 'Waiting for the first worker samples…')}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-3">
        <LiveChart
          label="RPS"
          points={points}
          field="rps"
          color="#facc15"
        />
        <LiveChart
          label="P95 ≈ (ms)"
          points={points}
          field="p95_ms"
          color="#60a5fa"
        />
        <LiveChart
          label={text('Usuarios activos', 'Active users')}
          points={selectedScope?.scenario ? [] : points}
          field="active_vus"
          color="#a1a1aa"
        />
      </div>
      <p className="text-xs text-zinc-500">
        {text(
          'Métricas agregadas durante la ejecución; P95 aproximado por histograma. Los reportes finales contienen el resultado canónico. Las muestras pueden demorarse según el proveedor.',
          'Aggregated execution metrics; histogram-based approximate P95. Final reports contain the canonical result. Samples may be delayed by the provider.',
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500">
            <tr>
              {[
                text('Nodo', 'Node'),
                text('Estado', 'State'),
                text('Peticiones', 'Requests'),
                text('Errores', 'Errors'),
                'RPS',
                text('Última muestra', 'Last sample'),
              ].map(label => (
                <th
                  className="p-2"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.nodes.map(node => (
              <tr
                className="border-t border-white/5"
                key={node.key}
              >
                <td className="p-2">{node.node_id}</td>
                <td>{node.progress.final ? text('Finalizado', 'Finished') : node.state}</td>
                <td>{node.progress.total.requests}</td>
                <td>{node.progress.total.failures}</td>
                <td>{node.progress.window.rps.toFixed(1)}</td>
                <td>{new Date(node.updated_at).toLocaleTimeString(language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500">
            <tr>
              {[
                text('Nodo', 'Node'),
                text('Escenario', 'Scenario'),
                text('Petición', 'Request'),
                text('Total', 'Total'),
                text('Errores', 'Errors'),
                'P95 ≈',
              ].map(label => (
                <th
                  className="p-2"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.scopes
              .filter(
                item =>
                  item.name &&
                  (scope === 'global' ||
                    (selectedScope?.node_id
                      ? selectedScope.node_id === item.node_id
                      : selectedScope?.scenario === item.scenario)),
              )
              .map(item => (
                <tr
                  className="border-t border-white/5"
                  key={item.key}
                >
                  <td className="p-2">{item.node_id}</td>
                  <td>{item.scenario}</td>
                  <td>{item.name}</td>
                  <td>{item.total.requests}</td>
                  <td>{item.total.failures}</td>
                  <td>{item.total.p95_ms?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {(state.reports_ready || reportsURL) && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 p-4">
          {state.reports_ready && (
            <>
              <a
                className={`${buttonClass} !text-yellow-400`}
                href={distributedReportUrl(runId, 'html')}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                {text('Abrir reporte HTML', 'Open HTML report')}
              </a>
              {['html', 'json', 'csv', 'txt'].map(format => (
                <a
                  className={buttonClass}
                  key={format}
                  href={distributedReportUrl(runId, format, true)}
                >
                  {text('Descargar', 'Download')} {format.toUpperCase()}
                </a>
              ))}
            </>
          )}
          {reportsURL && (
            <a
              className={buttonClass}
              href={reportsURL}
              target="_blank"
              rel="noreferrer"
            >
              {text('Ver reportes en el repositorio', 'View reports in repository')}
            </a>
          )}
          <p className="w-full text-xs text-zinc-500">
            {text(
              'Los reportes se conservan en el proveedor. Solo se descargan al equipo cuando eliges abrirlos o descargarlos.',
              'Reports remain in the provider. They are downloaded to your computer only when you open or download them.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}
