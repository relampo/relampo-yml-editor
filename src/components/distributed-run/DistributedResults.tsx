import { useMemo } from 'react';
import { ChevronDown, ExternalLink, RotateCcw, Square, Terminal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  distributedReportUrl,
  distributedStatus,
  safeProviderURL,
  type DistributedState,
  type DistributedPlan,
  type DistributedPoint,
} from '../../utils/distributedApi';
import { parseYAMLToTree } from '../../utils/yamlParser';
import type { YAMLNode } from '../../types/yaml';
import { LoadVisualization } from '../yaml-node-details/LoadVisualization';
import { normalizeLoadType, toLoadData } from '../yaml-node-details/loadUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DistributedNotice as Notice, DistributedChart as LiveChart } from './DistributedFeedback';
import { DistributedSummary } from './DistributedSummary';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40';
const stages: Record<string, [string, string]> = {
  preparing: ['Preparando archivos y publicación', 'Preparing files and publication'],
  prepared: ['Preparación completada', 'Preparation completed'],
  queued: ['En cola', 'Queued'],
  pending: ['En cola', 'Queued'],
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
  onClear,
  yamlCode,
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
  onClear: () => void;
  yamlCode: string;
}) {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (a: string, b: string) => (es ? a : b);
  const selected = state.scopes.find(item => item.key === scope) ?? state.scopes.find(item => item.key === 'global');
  const remoteURL = safeProviderURL(state.url),
    reportsURL = safeProviderURL(state.reports_url);
  const formats = state.report_formats ?? ['html', 'json', 'csv', 'txt'];
  const htmlURL = state.reports_ready && formats.includes('html') ? distributedReportUrl(runId, 'html') : undefined;
  const finished = ['completed', 'errored', 'stopped'].includes(state.status);
  const errorMessage =
    state.error &&
    (state.run_id || state.error.length > 300 || /[\r\n]/.test(state.error)
      ? t(
          'La ejecución distribuida terminó con un error. Consulta Ver ejecución para ver el detalle.',
          'The distributed execution ended with an error. Open View execution for details.',
        )
      : state.error);
  const profile = useMemo(() => {
    try {
      const tree = parseYAMLToTree(yamlCode);
      const loads: { node: YAMLNode; scenario: string }[] = [];
      let hasTransactions = false;
      const visit = (node: YAMLNode, scenario = '') => {
        const name = node.type === 'scenario' ? String(node.data?.name ?? node.name) : scenario;
        if (node.type === 'load') loads.push({ node, scenario: name });
        if (node.type === 'transaction') hasTransactions = true;
        node.children?.forEach(child => visit(child, name));
      };
      if (tree) visit(tree);
      return { loads, hasTransactions: tree ? hasTransactions : undefined };
    } catch {
      return { loads: [], hasTransactions: undefined };
    }
  }, [yamlCode]);
  const stale = state.nodes.some(node => !node.progress.final && Date.now() - Date.parse(node.updated_at) > 60000);
  return (
    <section
      className="space-y-4"
      aria-label={t('Resultados distribuidos', 'Distributed results')}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-sm ${state.status === 'errored' ? 'border-red-400/30 text-red-300' : finished ? 'border-emerald-400/30 text-emerald-300' : 'border-white/15 text-zinc-300'}`}
        >
          {state.status === 'running'
            ? (stages[state.stage]?.[es ? 0 : 1] ?? t('Ejecutando', 'Running'))
            : distributedStatus(state.status, es)}
        </span>
        {remoteURL && (
          <a
            href={remoteURL}
            target="_blank"
            rel="noreferrer"
            className={buttonClass}
          >
            <ExternalLink size={15} />
            {t('Ver ejecución', 'View execution')}
          </a>
        )}
        {active && state.run_id && (
          <button
            className={buttonClass}
            disabled={busy || state.status === 'stopping'}
            onClick={onStop}
          >
            <Square size={15} />
            {t('Cancelar ejecución remota', 'Cancel remote execution')}
          </button>
        )}
        {finished && !active && (
          <button
            className={`${buttonClass} ml-auto`}
            disabled={busy}
            onClick={onClear}
          >
            <RotateCcw size={15} />
            Clear
          </button>
        )}
      </div>
      {errorMessage && <Notice alert>{errorMessage}</Notice>}
      {state.warning && <Notice>{state.warning}</Notice>}
      {stale && active && (
        <Notice>
          {t(
            'Hay nodos sin muestras recientes. Las cifras visibles son las últimas recibidas.',
            'Some nodes have no recent samples. Visible figures are the last received.',
          )}
        </Notice>
      )}
      <Select
        value={scope}
        onValueChange={onScopeChange}
      >
        <SelectTrigger aria-label={t('Alcance del resultado distribuido', 'Distributed result scope')}>
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
                  ? `${t('Nodo', 'Node')} ${item.node_id}`
                  : item.scenario || t('Sin escenario', 'No scenario')}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <div className="grid gap-3 lg:grid-cols-3">
        <LiveChart
          label={t('Tasa de peticiones (intervalo)', 'Request rate (interval)')}
          points={points}
          field="rps"
          color="#facc15"
        />
        <LiveChart
          label={t('Latencia P95', 'P95 latency')}
          points={points}
          field="p95_ms"
          color="#60a5fa"
        />
        <LiveChart
          label={t('VUs activos', 'Active VUs')}
          points={selected?.scenario ? [] : points}
          field="active_vus"
          color="#a1a1aa"
        />
      </div>
      {!state.history.length && (
        <p
          role="status"
          className="text-sm text-zinc-400"
        >
          {active
            ? t('Esperando las primeras muestras de los workers…', 'Waiting for the first worker samples…')
            : t('No se recibieron muestras de los workers.', 'No worker samples were received.')}
        </p>
      )}
      {profile.loads
        .filter(item => !selected?.scenario || item.scenario === selected.scenario)
        .map(item => (
          <div
            key={item.node.id}
            className="border border-white/10 bg-[#111111] p-4"
          >
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {t('Perfil de carga planificado', 'Planned load profile')}
              {profile.loads.length > 1 ? ` · ${item.scenario}` : ''}
            </h3>
            <LoadVisualization
              data={toLoadData(item.node.data as Record<string, unknown> | undefined)}
              loadType={normalizeLoadType(item.node.data?.type)}
              progressSeconds={active ? selected?.total.elapsed_seconds : undefined}
            />
          </div>
        ))}
      <DistributedSummary
        state={state}
        plan={plan}
        scope={scope}
        reportURL={htmlURL}
        hasTransactions={profile.hasTransactions}
        es={es}
      />
      {state.nodes.length > 0 && (
        <details className="border border-white/10 bg-[#111] p-3">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-400">
            {t('Nodos', 'Nodes')} · {new Set(state.nodes.map(node => node.node_id)).size}/
            {state.expected_nodes ?? plan?.nodes ?? '—'}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {[
                    t('Nodo', 'Node'),
                    t('Estado', 'State'),
                    t('Peticiones', 'Requests'),
                    t('Errores', 'Errors'),
                    'RPS',
                    t('Última muestra', 'Last sample'),
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
                    key={node.key}
                    className="border-t border-white/5"
                  >
                    <td className="p-2">{node.node_id}</td>
                    <td>{node.progress.final ? t('Finalizado', 'Finished') : node.state}</td>
                    <td>{node.progress.total.requests}</td>
                    <td>{node.progress.total.failures}</td>
                    <td>{node.progress.window.rps.toFixed(1)}</td>
                    <td>{new Date(node.updated_at).toLocaleTimeString(language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <details
        open
        className="border border-white/10 bg-[#080808]"
      >
        <summary className="flex cursor-pointer items-center gap-2 border-b border-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          <ChevronDown size={14} />
          <Terminal
            size={15}
            className="text-emerald-300"
          />
          {t('Logs en vivo', 'Live logs')}
          <span className="ml-auto font-normal tracking-normal">
            {state.history.length} {t('actualizaciones', 'updates')}
          </span>
        </summary>
        <div className="max-h-60 overflow-auto px-4 py-3 font-mono text-xs text-zinc-300">
          {state.history.length ? (
            state.history.map((point, index) => (
              <p
                key={`${point.at}-${index}`}
                className={point.failures > 0 ? 'text-red-300' : ''}
              >
                <span className="mr-3 text-zinc-600">{new Date(point.at).toLocaleTimeString(language)}</span>
                {point.requests} {t('peticiones', 'requests')} · {point.failures} {t('errores', 'failures')} ·{' '}
                {point.rps.toFixed(1)} req/s
              </p>
            ))
          ) : (
            <p className="text-zinc-500">{t('Sin actualizaciones recibidas.', 'No updates received.')}</p>
          )}
        </div>
      </details>
      <p className="text-xs text-zinc-500">
        {t(
          'Percentiles aproximados por histogramas combinados. El reporte completo conserva los resultados canónicos.',
          'Percentiles are approximated from combined histograms. The full report retains canonical results.',
        )}
      </p>
      {(state.reports_ready || reportsURL) && (
        <div className="flex flex-wrap gap-2 border border-white/10 p-3">
          {state.reports_ready &&
            formats.map(format => (
              <a
                key={format}
                className={buttonClass}
                href={distributedReportUrl(runId, format, true)}
              >
                {t('Descargar', 'Download')} {format.toUpperCase()}
              </a>
            ))}
          {reportsURL && (
            <a
              className={buttonClass}
              href={reportsURL}
              target="_blank"
              rel="noreferrer"
            >
              {t('Ver reportes en el repositorio', 'View reports in repository')}
            </a>
          )}
        </div>
      )}
    </section>
  );
}
