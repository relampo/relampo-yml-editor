import { AlertTriangle, ArrowLeftRight, CheckCircle2, CircleDashed, Database, Globe, Folder, GitBranch, Repeat, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  normalizeBalancedDistributionType,
  normalizeBalancedExecutionMode,
  validateBalancedController,
} from '../../utils/balancedController';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { NodeDetailProps } from './types';

type TranslateFn = (key: string) => string;
function getBalancedItemLabel(type: string, t: TranslateFn) {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  if (httpMethods.includes(type)) {
    return t('yamlEditor.balanced.itemLabels.request');
  }
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

function getBalancedItemIcon(type: string) {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'request'];
  if (httpMethods.includes(type)) {
    return <Globe className="w-5 h-5" />;
  }
  switch (type) {
    case 'sql':
      return <Database className="w-5 h-5" />;
    case 'group':
      return <Folder className="w-5 h-5" />;
    case 'transaction':
      return <ArrowLeftRight className="w-5 h-5" />;
    case 'if':
      return <GitBranch className="w-5 h-5" />;
    case 'loop':
      return <Repeat className="w-5 h-5" />;
    case 'retry':
      return <RotateCcw className="w-5 h-5" />;
    default:
      return null;
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
    const childUpdates = children.map((child, index) => {
      const nextValue = index === children.length - 1 ? 100 - assigned : base;
      assigned += nextValue;
      return {
        nodeId: child.id,
        data: {
          ...(child.data || {}),
          __balancedPercentage: nextValue,
        },
      };
    });

    onNodeUpdate(node.id, {
      ...data,
      __batchChildUpdates: childUpdates,
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
  const accentTextClass = 'text-yellow-400';
  const warningTextClass = 'text-amber-100';
  const warningAccentTextClass = 'text-amber-200';
  const successTextClass = 'text-emerald-100';

  return (
    <div className={`space-y-3 ${bodyTextClass}`}>
      {issues.length > 0 && validation.hasChildren ? (
        <div className="rounded-lg border border-[#FBBF2480] bg-[#F59E0B26] px-3 py-2.5 shadow-[0_0_12px_#FBBF241F]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
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

      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-white/7 bg-black/20 px-3 py-2.5">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}>
              {t('yamlEditor.balanced.fields.balanceType')}
            </div>
            <Select
              value={balancedType}
              onValueChange={value => handleControllerChange('type', value)}
            >
              <SelectTrigger className="mt-2 h-9 w-full text-sm font-mono text-zinc-100 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">
                  {t('yamlEditor.balanced.fields.optionTotal')}
                </SelectItem>
                <SelectItem value="parcial">
                  {t('yamlEditor.balanced.fields.optionParcial')}
                </SelectItem>
              </SelectContent>
            </Select>
            <div className={`mt-1.5 text-[11px] leading-4 ${mutedTextClass}`}>
              {getBalancedTypeDescription(balancedType, t)}
            </div>
          </div>

          <div className="rounded-lg border border-white/7 bg-black/20 px-3 py-2.5">
            <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}>
              {t('yamlEditor.balanced.fields.executionMode')}
            </div>
            <Select
              value={mode}
              onValueChange={value => handleControllerChange('mode', value)}
            >
              <SelectTrigger className="mt-2 h-9 w-full text-sm font-mono text-zinc-100 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iteraciones">
                  {t('yamlEditor.balanced.fields.optionIterations')}
                </SelectItem>
                <SelectItem value="usuarios_virtuales">
                  {t('yamlEditor.balanced.fields.optionVirtualUsers')}
                </SelectItem>
              </SelectContent>
            </Select>
            <div className={`mt-1.5 text-[11px] leading-4 ${mutedTextClass}`}>
              {getBalancedModeDescription(mode, t)}
            </div>
          </div>
        </div>

      <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#101010] p-3.5">
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

            return (
              <div
                key={child.id}
                className="grid grid-cols-1 mb-2 items-center gap-3 rounded-xl border border-white/20 bg-[#080808] p-3 lg:grid-cols-[minmax(0,1fr)_148px]"
              >
                <div className="min-w-0 flex gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-400/5 shrink-0 text-yellow-400 mr-2">{getBalancedItemIcon(child.type)}</div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`truncate text-sm font-semibold ${titleTextClass}`}>{child.name}</div>
                      <span className="inline-flex items-center bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-200 rounded">
                        {getBalancedItemLabel(child.type, t)}
                      </span>
                    </div>
                    <div className={`text-xs leading-5 ${bodyTextClass}`}>
                      {balancedType === 'total'
                        ? t('yamlEditor.balanced.included.childDescriptionTotal')
                        : t('yamlEditor.balanced.included.childDescriptionParcial')}
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    className={`block mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}
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
                    className="w-full h-9.5 px-3 py-2 rounded text-sm font-mono bg-[#101010] text-zinc-100 border border-white/10"
                    placeholder="0"
                  />
                  <div
                    className={`mt-1.5 text-[11px] leading-4 ${mutedTextClass}`}
                  >
                    {mode === 'iteraciones'
                      ? t('yamlEditor.balanced.included.appliedIterations')
                      : t('yamlEditor.balanced.included.appliedVirtualUsers')}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101010] p-3.5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
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
                className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 text-sm font-medium text-yellow-400 shadow-sm transition-all duration-200 hover:bg-yellow-400/10 hover:border-yellow-400/35 hover:shadow-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('yamlEditor.balanced.actions.distributeEvenly')}
              </button>
            )}
          </div>

          {validation.hasChildren ? (
            <div className="rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5">
              <div
                className={`flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}
              >
                <span className={labelTextClass}>{t('yamlEditor.balanced.summary.coverageSnapshot')}</span>
                <span className={`font-mono ${titleTextClass}`}>{validation.total}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full border border-white/8 bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-yellow-400"
                  style={{ width: `${coverageWidth}%` }}
                />
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {summaryItems.map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/10 bg-[#101010] px-2.5 py-2"
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${warningAccentTextClass}`}>
                      {item.label}
                    </div>
                    <div className={`mt-1 text-sm font-semibold ${titleTextClass}`}>{item.value}</div>
                    <div className={`mt-0.5 text-[11px] leading-4 ${mutedTextClass}`}>{item.helper}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {summaryItems.map(item => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/10 bg-[#101010] px-2.5 py-2"
                >
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${warningAccentTextClass}`}>
                    {item.label}
                  </div>
                  <div className={`mt-1 text-sm font-semibold ${titleTextClass}`}>{item.value}</div>
                  <div className={`mt-0.5 text-[11px] leading-4 ${mutedTextClass}`}>{item.helper}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
