import { Activity, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import {
  distributedStatus,
  type DistributedPlan,
  type DistributedScope,
  type DistributedState,
} from '../../utils/distributedApi';
import { AgentFileLink } from '../AgentFileLink';

export function DistributedSummary({
  state,
  plan,
  scope,
  reportPath,
  hasTransactions,
  es,
}: {
  state: DistributedState;
  plan: DistributedPlan | null;
  scope: string;
  reportPath?: string;
  hasTransactions?: boolean;
  es: boolean;
}) {
  const t = (a: string, b: string) => (es ? a : b);
  const selected = state.scopes.find(item => item.key === scope) ?? state.scopes.find(item => item.key === 'global');
  const total = selected?.total;
  const nodes = state.nodes.filter(node => !selected?.node_id || node.node_id === selected.node_id);
  const peaks = new Map<number, number>();
  for (const node of nodes)
    peaks.set(node.node_id, Math.max(peaks.get(node.node_id) ?? 0, node.progress.peak_vus ?? 0));
  const observed = nodes.length > 0;
  const peakVUs = [...peaks.values()].reduce((sum, value) => sum + value, 0);
  const configured = scope === 'global' ? plan?.users : undefined;
  const errorPercent = total && total.requests > 0 ? (total.failures * 100) / total.requests : undefined;
  const resource = (field: 'rss_peak_mib' | 'cpu_percent_peak', unit: string, digits: number) => {
    if (selected?.scenario && !selected.node_id) return '—';
    const values = nodes
      .map(node => ({ id: node.node_id, value: node.progress.resource_measurements?.[field] }))
      .filter(
        (item): item is { id: number; value: number } =>
          item.value != null && Number.isFinite(item.value) && item.value >= 0,
      )
      .sort((a, b) => b.value - a.value);
    const peak = values[0];
    return peak
      ? `${peak.value.toFixed(digits)}${unit}${peaks.size > 1 ? ` (${t('Nodo', 'Node')} ${peak.id})` : ''}`
      : '—';
  };
  const metrics = [
    {
      label: t('Estado', 'Status'),
      value: state.stage === 'prepared' ? t('Preparada', 'Prepared') : distributedStatus(state.status, es),
    },
    { label: t('Duración', 'Duration'), value: total ? `${total.elapsed_seconds.toFixed(1)}s` : '—' },
    {
      label: t('VUs (pico/conf.)', 'VUs (peak/conf.)'),
      value: `${observed && !selected?.scenario ? peakVUs : '—'}/${configured ?? '—'}`,
    },
    { label: t('Total de peticiones', 'Total requests'), value: total?.requests.toLocaleString() ?? '—' },
    {
      label: 'Error %',
      value: errorPercent == null ? '—' : `${errorPercent.toFixed(2)}%`,
      tone: (total?.failures ?? 0) > 0 ? 'text-red-300' : undefined,
    },
    { label: 'RPS', value: total?.rps.toFixed(1) ?? '—' },
    { label: 'TPS', value: hasTransactions === false ? t('No aplica', 'Not applicable') : '—' },
    { label: t('Memoria', 'Memory'), value: resource('rss_peak_mib', ' MiB', 0) },
    { label: 'CPU', value: resource('cpu_percent_peak', '%', 1) },
    { label: t('Modo de ejecución', 'Execution mode'), value: t('Distribuido', 'Distributed') },
  ];
  const named = state.scopes.filter(item => !!item.name);
  const combined = named.filter(item => !item.node_id);
  const requests: DistributedScope[] = selected?.node_id
    ? named.filter(item => item.node_id === selected.node_id)
    : (combined.length ? combined : named).filter(item => !selected?.scenario || item.scenario === selected.scenario);
  const scenarios = new Set(requests.map(item => item.scenario));
  const ms = (value: number | null | undefined) => (value == null ? '—' : `${value.toFixed(1)}ms`);
  return (
    <section
      aria-label={t('Resumen de la ejecución', 'Execution summary')}
      className="border border-white/10 bg-[#111111]"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-3">
        {state.status === 'running' ? (
          <Activity className="h-4 w-4 text-blue-300" />
        ) : state.status === 'errored' ? (
          <XCircle className="h-4 w-4 text-red-300" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        )}
        <h3 className="text-sm font-semibold text-zinc-100">{t('Resumen de la ejecución', 'Execution summary')}</h3>
        {reportPath && (
          <AgentFileLink
            path={reportPath}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-xs font-semibold text-yellow-300 hover:bg-yellow-400/20"
          >
            <ExternalLink size={14} />
            {t('Abrir el reporte completo', 'Open full report')}
          </AgentFileLink>
        )}
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map(metric => (
          <div
            key={metric.label}
            className="bg-[#111111] px-4 py-3"
          >
            <p className={`text-base font-semibold ${metric.tone ?? 'text-zinc-100'}`}>{metric.value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{metric.label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label={t('Resumen por petición', 'Request summary')}
          className="w-full min-w-150 text-left text-xs"
        >
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
              {[
                t('Petición', 'Request'),
                t('Cantidad', 'Count'),
                t('Fallos', 'Failures'),
                t('Prom.', 'Avg.'),
                'P50 ≈',
                'P90 ≈',
                'P95 ≈',
                'P99 ≈',
              ].map((label, index) => (
                <th
                  key={label}
                  className={index === 0 ? 'px-4 py-2' : 'px-3 py-2 text-right'}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map(item => {
              const match = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE|GRPC|SQL)\s+(.+)$/i.exec(
                item.name ?? '',
              );
              return (
                <tr
                  key={item.key}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <td
                    className="max-w-72 truncate px-4 py-2 text-zinc-200"
                    title={item.name}
                  >
                    {match && (
                      <span className="mr-2 rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                        {match[1]}
                      </span>
                    )}
                    {scenarios.size > 1 && <span className="mr-2 text-zinc-400">{item.scenario}</span>}
                    {!combined.length && !selected?.node_id && item.node_id && (
                      <span className="mr-2 text-zinc-500">N{item.node_id}</span>
                    )}
                    {match?.[2] ?? item.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">
                    {item.total.requests.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${item.total.failures > 0 ? 'text-red-300' : 'text-zinc-500'}`}
                  >
                    {item.total.failures.toLocaleString()}
                  </td>
                  {[item.total.avg_ms, item.total.p50_ms, item.total.p90_ms, item.total.p95_ms, item.total.p99_ms].map(
                    (value, index) => (
                      <td
                        key={index}
                        className="px-3 py-2 text-right font-mono text-zinc-300"
                      >
                        {ms(value)}
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p className="px-4 py-3 text-xs text-zinc-500">
            {t('Sin métricas de peticiones recibidas.', 'No request metrics received.')}
          </p>
        )}
      </div>
    </section>
  );
}
