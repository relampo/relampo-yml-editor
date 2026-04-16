import { AlertTriangle, BetweenHorizontalStart, Binary, CheckCircle2, CircleDashed, Clock3 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  normalizeBalancedDistributionType,
  normalizeBalancedExecutionMode,
  readBalancedPercentage,
  validateBalancedController,
} from '../../utils/balancedController';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { NodeDetailProps } from './types';

type TranslateFn = (key: string) => string;

export function IfDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Condition Expression
        </label>
        <Textarea
          value={data.condition || ''}
          onChange={event => handleChange('condition', event.target.value)}
          placeholder="${'{'}status${'}'} === 200\n${'{'}user_id${'}'} != null\n${'{'}count${'}'} > 10"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-[100px]"
        />
        <div className="mt-1 text-xs text-zinc-500">Steps will only execute if this condition evaluates to true</div>
      </div>

      <div className="p-3 bg-pink-400/10 border border-pink-400/20 rounded">
        <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">Conditional Steps</div>
        <div className="text-2xl font-bold text-pink-300 font-mono">{node.children?.length || 0}</div>
      </div>
    </div>
  );
}

export function LoopDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const loopCount = data.count || 1;
  const stepsCount = node.children?.length || 0;

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Loop Count</label>
        <Input
          type="number"
          value={data.count !== undefined ? data.count : 1}
          onChange={event => handleChange('count', parseInt(event.target.value, 10) || 1)}
          placeholder="1"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Number of times to repeat the steps, or use variable ${'{'}loops${'}'}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Break Condition (optional)
        </label>
        <Input
          value={data.break_on || ''}
          onChange={event => handleChange('break_on', event.target.value)}
          placeholder="${'{'}error${'}'} || ${'{'}stop${'}'}"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">Exit loop early if condition is true</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Steps Inside</div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{stepsCount}</div>
        </div>
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Total Iterations</div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{loopCount * stepsCount}</div>
        </div>
      </div>
    </div>
  );
}

export function RetryDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const backoffType = data.backoff || 'constant';

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Max Attempts</label>
        <Input
          type="number"
          value={data.attempts !== undefined ? data.attempts : 3}
          onChange={event => handleChange('attempts', parseInt(event.target.value, 10) || 3)}
          placeholder="3"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Backoff Strategy
        </label>
        <select
          value={backoffType}
          onChange={event => handleChange('backoff', event.target.value)}
          className="w-full h-[38px] px-3 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option
            value="constant"
            className="bg-zinc-900"
          >
            constant (same delay)
          </option>
          <option
            value="linear"
            className="bg-zinc-900"
          >
            linear (incremental)
          </option>
          <option
            value="exponential"
            className="bg-zinc-900"
          >
            exponential (2x each time)
          </option>
        </select>
      </div>

      {backoffType === 'constant' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Delay</label>
          <Input
            value={data.initial_delay || data.delay || ''}
            onChange={event => handleChange('initial_delay', event.target.value)}
            placeholder="1s"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
          <div className="mt-1 text-xs text-zinc-500">Same delay between all retry attempts</div>
        </div>
      )}

      {backoffType === 'linear' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={event => handleChange('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Increment</label>
            <Input
              value={data.increment || ''}
              onChange={event => handleChange('increment', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Delay increases by this amount each retry (1s, 2s, 3s...)</div>
          </div>
        </>
      )}

      {backoffType === 'exponential' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={event => handleChange('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Multiplier
            </label>
            <Input
              type="number"
              value={data.multiplier !== undefined ? data.multiplier : 2}
              onChange={event => handleChange('multiplier', parseFloat(event.target.value) || 2)}
              placeholder="2"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Delay multiplied each retry (1s, 2s, 4s, 8s...)</div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Delay (optional)
            </label>
            <Input
              value={data.max_delay || ''}
              onChange={event => handleChange('max_delay', event.target.value)}
              placeholder="30s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Cap maximum delay to prevent very long waits</div>
          </div>
        </>
      )}

      <div className="p-3 bg-white/5 border border-white/10 rounded">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Steps to Retry</div>
        <div className="text-2xl font-bold text-zinc-300 font-mono">{node.children?.length || 0}</div>
      </div>
    </div>
  );
}

function getBalancedItemLabel(type: string, t: TranslateFn) {
  switch (type) {
    case 'request':
      return t('yamlEditor.balanced.itemLabels.request');
    case 'sql':
      return t('yamlEditor.balanced.itemLabels.sql');
    case 'group':
      return t('yamlEditor.balanced.itemLabels.group');
    case 'transaction':
      return t('yamlEditor.balanced.itemLabels.transaction');
    case 'if':
      return t('yamlEditor.balanced.itemLabels.if');
    case 'loop':
      return t('yamlEditor.balanced.itemLabels.loop');
    case 'retry':
      return t('yamlEditor.balanced.itemLabels.retry');
    default:
      return type;
  }
}

function getBalancedTypeDescription(type: 'total' | 'parcial', t: TranslateFn) {
  return type === 'total'
    ? t('yamlEditor.balanced.descriptions.typeTotal')
    : t('yamlEditor.balanced.descriptions.typeParcial');
}

function getBalancedModeDescription(mode: 'iteraciones' | 'usuarios_virtuales', t: TranslateFn) {
  return mode === 'iteraciones'
    ? t('yamlEditor.balanced.descriptions.modeIterations')
    : t('yamlEditor.balanced.descriptions.modeVirtualUsers');
}

export function BalancedDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const data = node.data || {};
  const balancedType = normalizeBalancedDistributionType(data.type);
  const mode = normalizeBalancedExecutionMode(data.mode);
  const validation = validateBalancedController(balancedType, node.children || []);
  const selectedCount = node.children?.length || 0;
  const coverageWidth = Math.max(0, Math.min(validation.total, 100));
  const format = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (text, [token, value]) => text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(value)),
      t(key),
    );

  const handleControllerChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  const handlePercentageChange = (childId: string, rawValue: string) => {
    const childNode = node.children?.find(child => child.id === childId);
    if (!childNode) return;
    onNodeUpdate?.(childId, {
      ...(childNode.data || {}),
      __balancedPercentage: rawValue,
    });
  };

  const handleDistributeEvenly = () => {
    const children = node.children || [];
    if (!onNodeUpdate || children.length === 0) return;

    const base = Math.floor(100 / children.length);
    let assigned = 0;

    children.forEach((child, index) => {
      const nextValue = index === children.length - 1 ? 100 - assigned : base;
      assigned += nextValue;
      onNodeUpdate(child.id, {
        ...(child.data || {}),
        __balancedPercentage: nextValue,
      });
    });
  };

  const issues: string[] = [];
  if (!validation.hasChildren) {
    issues.push(t('yamlEditor.balanced.alerts.issueMissingChildren'));
  }
  if (validation.invalidItems.length > 0) {
    issues.push(t('yamlEditor.balanced.alerts.issueInvalidPercentage'));
  }
  if (balancedType === 'total' && validation.hasChildren && !validation.validTotal) {
    issues.push(format('yamlEditor.balanced.alerts.issueInvalidTotal', { total: validation.total }));
  }

  const statusTone =
    issues.length === 0 ? 'emerald' : !validation.hasChildren ? 'amber' : balancedType === 'total' ? 'amber' : 'sky';
  const statusLabel =
    issues.length === 0
      ? t('yamlEditor.balanced.status.ready')
      : !validation.hasChildren
        ? t('yamlEditor.balanced.status.emptyDraft')
        : balancedType === 'total'
          ? t('yamlEditor.balanced.status.needsCompletion')
          : t('yamlEditor.balanced.status.draft');

  const summaryItems = [
    {
      label: t('yamlEditor.balanced.summary.type'),
      value:
        balancedType === 'total'
          ? t('yamlEditor.balanced.summary.typeValueTotal')
          : t('yamlEditor.balanced.summary.typeValueParcial'),
      helper:
        balancedType === 'total'
          ? t('yamlEditor.balanced.summary.typeHelperTotal')
          : t('yamlEditor.balanced.summary.typeHelperParcial'),
    },
    {
      label: t('yamlEditor.balanced.summary.scope'),
      value:
        mode === 'iteraciones'
          ? t('yamlEditor.balanced.summary.scopeValueIterations')
          : t('yamlEditor.balanced.summary.scopeValueVirtualUsers'),
      helper:
        mode === 'iteraciones'
          ? t('yamlEditor.balanced.summary.scopeHelperIterations')
          : t('yamlEditor.balanced.summary.scopeHelperVirtualUsers'),
    },
    {
      label: t('yamlEditor.balanced.summary.included'),
      value: format('yamlEditor.balanced.summary.includedValue', { count: selectedCount }),
      helper: t('yamlEditor.balanced.summary.includedHelper'),
    },
  ];

  const checklist = [
    {
      label: t('yamlEditor.balanced.checklist.selectLabel'),
      done: validation.hasChildren,
      helper: validation.hasChildren
        ? format('yamlEditor.balanced.checklist.selectHelperFilled', { count: selectedCount })
        : t('yamlEditor.balanced.checklist.selectHelperEmpty'),
    },
    {
      label: t('yamlEditor.balanced.checklist.assignLabel'),
      done: validation.hasChildren && validation.invalidItems.length === 0,
      helper:
        validation.invalidItems.length === 0
          ? t('yamlEditor.balanced.checklist.assignHelperValid')
          : format('yamlEditor.balanced.checklist.assignHelperInvalid', { count: validation.invalidItems.length }),
    },
    {
      label:
        balancedType === 'total'
          ? t('yamlEditor.balanced.checklist.totalLabel')
          : t('yamlEditor.balanced.checklist.partialLabel'),
      done: balancedType === 'total' ? validation.validTotal && validation.hasChildren : validation.hasChildren,
      helper:
        balancedType === 'total'
          ? format('yamlEditor.balanced.checklist.totalHelper', { total: validation.total })
          : format('yamlEditor.balanced.checklist.partialHelper', { total: validation.total }),
    },
  ];

  const statusClasses =
    statusTone === 'emerald'
      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_#34D39926]'
      : statusTone === 'amber'
        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_#FBBF2426]'
        : 'border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-[0_0_10px_#38BDF826]';
  const titleTextClass = 'text-zinc-50';
  const bodyTextClass = 'text-zinc-300';
  const mutedTextClass = 'text-zinc-400';
  const labelTextClass = 'text-zinc-400';
  const accentTextClass = 'text-sky-300';
  const accentStrongTextClass = 'text-sky-200';
  const warningTextClass = 'text-amber-100';
  const warningAccentTextClass = 'text-amber-200';
  const successTextClass = 'text-emerald-100';

  return (
    <div className={`space-y-3 ${bodyTextClass}`}>
      {issues.length > 0 && validation.hasChildren ? (
        <div className="rounded-lg border border-[#FBBF2480] bg-[#F59E0B26] px-3 py-2.5 shadow-[0_0_12px_#FBBF241F]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
            <div className="min-w-0 space-y-1">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}>
                {t('yamlEditor.balanced.alerts.attentionNeeded')}
              </div>
              {issues.map(issue => (
                <div
                  key={issue}
                  className={`text-[13px] leading-5 ${warningTextClass}`}
                >
                  {issue}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : issues.length === 0 ? (
        <div
          className={`rounded-lg border border-emerald-300/20 bg-emerald-400/8 px-3 py-2 text-[13px] ${successTextClass}`}
        >
          {balancedType === 'total'
            ? t('yamlEditor.balanced.alerts.validTotal')
            : t('yamlEditor.balanced.alerts.validParcial')}
        </div>
      ) : null}

      <div className="space-y-2.5 rounded-2xl border border-sky-300/40 bg-sky-400/[0.15] px-3 py-3 shadow-[0_14px_40px_#0EA5E92E] backdrop-blur-[1px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <label className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
              {t('yamlEditor.balanced.included.title')}
            </label>
            <div className={`mt-0.5 text-xs ${bodyTextClass}`}>{t('yamlEditor.balanced.included.description')}</div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border border-sky-300/20 bg-black/20 px-2 py-1 text-[11px] ${labelTextClass}`}
          >
            {format('yamlEditor.balanced.included.count', { count: node.children?.length || 0 })}
          </span>
        </div>

        {node.children && node.children.length > 0 ? (
          node.children.map(child => {
            const currentPercentage = child.data?.__balancedPercentage ?? '';
            const parsedPercentage = readBalancedPercentage(currentPercentage);
            const isInvalid = parsedPercentage === null || parsedPercentage <= 0 || parsedPercentage > 100;

            return (
              <div
                key={child.id}
                className="grid grid-cols-1 mb-2 items-center gap-3 rounded-xl border border-white/20 bg-[#0d1114] p-3 lg:grid-cols-[minmax(0,1fr)_148px]"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`truncate text-sm font-semibold ${titleTextClass}`}>{child.name}</div>
                    <span className="inline-flex items-center rounded-full border border-sky-300/40 bg-sky-300/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                      {getBalancedItemLabel(child.type, t)}
                    </span>
                  </div>
                  <div className={`text-xs leading-5 ${bodyTextClass}`}>
                    {balancedType === 'total'
                      ? t('yamlEditor.balanced.included.childDescriptionTotal')
                      : t('yamlEditor.balanced.included.childDescriptionParcial')}
                  </div>
                </div>
                <div>
                  <label
                    className={`block mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}
                  >
                    {t('yamlEditor.balanced.fields.percentage')}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentPercentage}
                    onChange={event => handlePercentageChange(child.id, event.target.value)}
                    className={`w-full h-[38px] px-3 py-2 rounded text-sm font-mono ${
                      isInvalid
                        ? 'border border-red-400/60 bg-red-950/40 text-red-100 placeholder:text-red-200/55'
                        : 'bg-[#11161a] text-zinc-100 border border-white/10'
                    }`}
                    placeholder="0"
                  />
                  <div
                    className={`mt-1.5 text-[11px] leading-4 ${isInvalid ? 'font-medium text-red-200' : mutedTextClass}`}
                  >
                    {isInvalid
                      ? t('yamlEditor.balanced.included.invalidPercentage')
                      : mode === 'iteraciones'
                        ? t('yamlEditor.balanced.included.appliedIterations')
                        : t('yamlEditor.balanced.included.appliedVirtualUsers')}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-sky-300/18 bg-[#0d1114] px-3 py-3">
            <div className={`text-sm font-semibold ${titleTextClass}`}>
              {t('yamlEditor.balanced.included.emptyTitle')}
            </div>
            <div className={`mt-1 text-sm leading-5 ${bodyTextClass}`}>
              {t('yamlEditor.balanced.included.emptyDescription')}
            </div>
            <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] leading-4 ${mutedTextClass}`}>
              <div className="flex gap-1.5">
                <span className={`font-semibold ${accentTextClass}`}>1.</span>
                <span className={mutedTextClass}>{t('yamlEditor.balanced.included.emptyStep1')}</span>
              </div>
              <div className="flex gap-1.5">
                <span className={`font-semibold ${accentTextClass}`}>2.</span>
                <span className={mutedTextClass}>{t('yamlEditor.balanced.included.emptyStep2')}</span>
              </div>
              <div className="flex gap-1.5">
                <span className={`font-semibold ${accentTextClass}`}>3.</span>
                <span className={mutedTextClass}>
                  {balancedType === 'total'
                    ? t('yamlEditor.balanced.included.emptyStep3Total')
                    : t('yamlEditor.balanced.included.emptyStep3Parcial')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-sky-300/18 bg-[#0d1114] p-3.5 shadow-[0_0_0_1px_#7DD3FC08]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${accentStrongTextClass}`}>
                  {t('yamlEditor.balanced.summary.heading')}
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusClasses}`}
                >
                  {issues.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <CircleDashed className="h-3.5 w-3.5" />
                  )}
                  {statusLabel}
                </div>
              </div>
              <div className={`mt-1 text-[15px] font-semibold leading-5 ${titleTextClass}`}>
                {balancedType === 'total'
                  ? t('yamlEditor.balanced.summary.titleTotal')
                  : t('yamlEditor.balanced.summary.titleParcial')}
              </div>
              <div className={`mt-1 text-[13px] leading-5 ${bodyTextClass}`}>
                {getBalancedTypeDescription(balancedType, t)} {getBalancedModeDescription(mode, t)}
              </div>
            </div>
            {balancedType === 'total' && (
              <button
                type="button"
                onClick={handleDistributeEvenly}
                disabled={!node.children || node.children.length === 0}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-300/10 px-3 text-sm font-semibold text-sky-100 hover:bg-sky-300/14 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('yamlEditor.balanced.actions.distributeEvenly')}
              </button>
            )}
          </div>

          {validation.hasChildren ? (
            <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-lg border border-white/10 bg-[#101418] px-3 py-2.5">
                <div
                  className={`flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}
                >
                  <span className={labelTextClass}>{t('yamlEditor.balanced.summary.coverageSnapshot')}</span>
                  <span className={`font-mono ${titleTextClass}`}>{validation.total}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full border border-white/8 bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      balancedType === 'total'
                        ? validation.validTotal
                          ? 'bg-emerald-300'
                          : 'bg-amber-300'
                        : 'bg-sky-300'
                    }`}
                    style={{ width: `${coverageWidth}%` }}
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {summaryItems.map(item => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-sky-300/20 bg-[#141b21] px-2.5 py-2"
                    >
                      <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${accentTextClass}`}>
                        {item.label}
                      </div>
                      <div className={`mt-1 text-sm font-semibold ${titleTextClass}`}>{item.value}</div>
                      <div className={`mt-0.5 text-[11px] leading-4 ${mutedTextClass}`}>{item.helper}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#101418] px-3 py-2.5">
                <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
                  {t('yamlEditor.balanced.checklist.title')}
                </div>
                <div className="mt-2 space-y-1.5">
                  {checklist.map(item => (
                    <div
                      key={item.label}
                      className="grid grid-cols-[10px_minmax(0,1fr)] gap-2"
                    >
                      <div
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                          item.done
                            ? 'bg-emerald-300 shadow-[0_0_0_3px_#6EE7B714]'
                            : 'bg-amber-300 shadow-[0_0_0_3px_#FCD34D14]'
                        }`}
                      />
                      <div className="min-w-0">
                        <div
                          className={`text-[12px] font-medium leading-4 ${item.done ? titleTextClass : warningTextClass}`}
                        >
                          {item.label}
                        </div>
                        <div className={`mt-0.5 text-[11px] leading-4 ${mutedTextClass}`}>{item.helper}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {summaryItems.map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-sky-300/20 bg-[#141b21] px-2.5 py-2"
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${accentTextClass}`}>
                      {item.label}
                    </div>
                    <div className={`mt-1 text-sm font-semibold ${titleTextClass}`}>{item.value}</div>
                    <div className={`mt-0.5 text-[11px] leading-4 ${mutedTextClass}`}>{item.helper}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2.5">
                <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}>
                  {t('yamlEditor.balanced.nextStep.title')}
                </div>
                <div className={`mt-1 text-sm font-medium ${warningTextClass}`}>
                  {t('yamlEditor.balanced.nextStep.heading')}
                </div>
                <div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] leading-4 ${warningTextClass}`}>
                  <span className={warningTextClass}>{t('yamlEditor.balanced.nextStep.step1')}</span>
                  <span className={warningTextClass}>{t('yamlEditor.balanced.nextStep.step2')}</span>
                  <span className={warningTextClass}>
                    {balancedType === 'total'
                      ? t('yamlEditor.balanced.nextStep.step3Total')
                      : t('yamlEditor.balanced.nextStep.step3Parcial')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-white/7 bg-black/20 px-3 py-2.5">
              <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
                {t('yamlEditor.balanced.fields.balanceType')}
              </div>
              <select
                value={balancedType}
                onChange={event => handleControllerChange('type', event.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-sky-300/35 bg-[#11161a] px-3 py-2 text-sm font-mono text-zinc-100 cursor-pointer focus:border-sky-300/60 focus:outline-none"
              >
                <option
                  value="total"
                  className="bg-zinc-900 text-zinc-50"
                >
                  {t('yamlEditor.balanced.fields.optionTotal')}
                </option>
                <option
                  value="parcial"
                  className="bg-zinc-900 text-zinc-50"
                >
                  {t('yamlEditor.balanced.fields.optionParcial')}
                </option>
              </select>
              <div className={`mt-1.5 text-[11px] leading-4 ${mutedTextClass}`}>
                {getBalancedTypeDescription(balancedType, t)}
              </div>
            </div>

            <div className="rounded-lg border border-white/7 bg-black/20 px-3 py-2.5">
              <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
                {t('yamlEditor.balanced.fields.executionMode')}
              </div>
              <select
                value={mode}
                onChange={event => handleControllerChange('mode', event.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-sky-300/35 bg-[#11161a] px-3 py-2 text-sm font-mono text-zinc-100 cursor-pointer focus:border-sky-300/60 focus:outline-none"
              >
                <option
                  value="iteraciones"
                  className="bg-zinc-900 text-zinc-50"
                >
                  {t('yamlEditor.balanced.fields.optionIterations')}
                </option>
                <option
                  value="usuarios_virtuales"
                  className="bg-zinc-900 text-zinc-50"
                >
                  {t('yamlEditor.balanced.fields.optionVirtualUsers')}
                </option>
              </select>
              <div className={`mt-1.5 text-[11px] leading-4 ${mutedTextClass}`}>
                {getBalancedModeDescription(mode, t)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThinkTimeDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const hasFixed = data.duration !== undefined && String(data.duration).trim() !== '';
  const hasDistributionHints =
    data.mean !== undefined || data.std_dev !== undefined || String(data.distribution || '').toLowerCase() === 'normal';
  const mode: 'fixed' | 'range' | 'distribution' = hasFixed ? 'fixed' : hasDistributionHints ? 'distribution' : 'range';
  const fixedDuration = String(data.duration || '');
  const variableMin = String(data.min || '');
  const variableMax = String(data.max || '');
  const thinkTimeModes = [
    { value: 'fixed', label: 'Fixed', icon: Clock3 },
    { value: 'range', label: 'Range', icon: BetweenHorizontalStart },
    { value: 'distribution', label: 'Distribution', icon: Binary },
  ] as const;
  const thinkTimeModeButtonStyle: Record<'fixed' | 'range' | 'distribution', React.CSSProperties> = {
    fixed: {
      backgroundColor: '#F9731633',
      color: '#fdba74',
      borderColor: '#FDBA7480',
      boxShadow: '0 10px 22px #F9731633',
    },
    range: {
      backgroundColor: '#06B6D433',
      color: '#67e8f9',
      borderColor: '#67E8F980',
      boxShadow: '0 10px 22px #06B6D433',
    },
    distribution: {
      backgroundColor: '#A855F733',
      color: '#d8b4fe',
      borderColor: '#D8B4FE80',
      boxShadow: '0 10px 22px #A855F733',
    },
  };

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  const handleModeChange = (newMode: 'fixed' | 'range' | 'distribution') => {
    if (!onNodeUpdate) {
      return;
    }

    if (newMode === 'fixed') {
      const nextData = { ...data };
      delete nextData.min;
      delete nextData.max;
      delete nextData.mean;
      delete nextData.std_dev;
      delete nextData.distribution;
      if (!nextData.duration) {
        nextData.duration = '1s';
      }
      onNodeUpdate(node.id, nextData);
      return;
    }

    if (newMode === 'range') {
      const nextData = { ...data };
      delete nextData.duration;
      delete nextData.mean;
      delete nextData.std_dev;
      if (!nextData.min) nextData.min = '1s';
      if (!nextData.max) nextData.max = '3s';
      nextData.distribution = 'uniform';
      onNodeUpdate(node.id, nextData);
      return;
    }

    const nextData = { ...data };
    delete nextData.duration;
    if (!nextData.mean) nextData.mean = '2s';
    if (!nextData.std_dev) nextData.std_dev = '500ms';
    if (!nextData.min) nextData.min = '1s';
    if (!nextData.max) nextData.max = '3s';
    if (!nextData.distribution) nextData.distribution = 'normal';
    onNodeUpdate(node.id, nextData);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Think Time Mode
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {thinkTimeModes.map(modeItem => {
            const active = mode === modeItem.value;
            const Icon = modeItem.icon;

            return (
              <button
                key={modeItem.value}
                type="button"
                onClick={() => handleModeChange(modeItem.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${
                  active
                    ? 'border-current text-white'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                }`}
                style={active ? thinkTimeModeButtonStyle[modeItem.value] : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{modeItem.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'fixed' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Duration
              </label>
              <Input
                value={fixedDuration}
                onChange={event => handleChange('duration', event.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">Examples: 1s, 500ms, 2m (seconds, milliseconds, minutes)</div>
        </>
      ) : mode === 'range' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={event => handleChange('min', event.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => handleChange('max', event.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            <AlertTriangle className="inline-block h-3 w-3 mr-1" />
            Random delay is chosen between min and max on each execution.
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Mean</label>
              <Input
                value={String(data.mean || '')}
                onChange={event => handleChange('mean', event.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Std Dev</label>
              <Input
                value={String(data.std_dev || '')}
                onChange={event => handleChange('std_dev', event.target.value)}
                placeholder="500ms"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={event => handleChange('min', event.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => handleChange('max', event.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Distribution
              </label>
              <select
                value={String(data.distribution || 'normal')}
                onChange={event => handleChange('distribution', event.target.value)}
                className="w-full h-[38px] px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono outline-none"
              >
                <option
                  value="normal"
                  className="bg-[#1a1a1a]"
                >
                  normal
                </option>
                <option
                  value="uniform"
                  className="bg-[#1a1a1a]"
                >
                  uniform
                </option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            <AlertTriangle className="inline-block h-3 w-3 mr-1" />
            Distribution mode applies normal(mean/std_dev) in runtime, bounded by min/max guardrails.
          </div>
        </>
      )}
    </div>
  );
}
