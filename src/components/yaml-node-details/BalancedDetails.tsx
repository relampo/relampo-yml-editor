import { AlertTriangle, ArrowLeftRight, CheckCircle2, ChevronDown, CircleDashed, Database, Globe, GitBranch, Layers, Repeat, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  distributeEvenPercentages,
  isBalancedLoadBearingChild,
  normalizeBalancedDistributionType,
  normalizeBalancedExecutionMode,
  validateBalancedController,
} from '../../utils/balancedController';
import type { YAMLNode } from '../../types/yaml';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { NodeDetailProps } from './types';

type TranslateFn = (key: string) => string;
type FormatFn = (key: string, values?: Record<string, string | number>) => string;
type BalancedType = 'total' | 'parcial';
type BalancedMode = 'iteraciones' | 'usuarios_virtuales';
type BalancedValidation = ReturnType<typeof validateBalancedController>;

const titleTextClass = 'text-zinc-50';
const bodyTextClass = 'text-zinc-300';
const mutedTextClass = 'text-zinc-400';
const labelTextClass = 'text-zinc-400';
const accentTextClass = 'text-yellow-400';
const warningAccentTextClass = 'text-amber-200';

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
      return <Layers className="w-5 h-5" />;
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

function getBalancedTypeDescription(type: BalancedType, t: TranslateFn) {
  return type === 'total'
    ? t('yamlEditor.balanced.descriptions.typeTotal')
    : t('yamlEditor.balanced.descriptions.typeParcial');
}

function getBalancedModeDescription(mode: BalancedMode, t: TranslateFn) {
  return mode === 'iteraciones'
    ? t('yamlEditor.balanced.descriptions.modeIterations')
    : t('yamlEditor.balanced.descriptions.modeVirtualUsers');
}

function computeBalancedStatus(
  validation: BalancedValidation,
  balancedType: BalancedType,
  mode: BalancedMode,
  selectedCount: number,
  t: TranslateFn,
  format: FormatFn,
) {
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

  return { issues, statusLabel, statusClasses, summaryItems };
}

function BalancedStatusAlert({
  issues,
  hasChildren,
  balancedType,
  t,
}: {
  issues: string[];
  hasChildren: boolean;
  balancedType: BalancedType;
  t: TranslateFn;
}) {
  if (issues.length > 0 && hasChildren) {
    return (
      <div className="alert-warning rounded-md p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 alert-warning-icon" />
          <div className="min-w-0 space-y-0.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              {t('yamlEditor.balanced.alerts.attentionNeeded')}
            </div>
            {issues.map(issue => (
              <div key={issue} className="text-[13px] leading-5 opacity-80">
                {issue}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (issues.length === 0) {
    return (
      <div className="alert-success rounded-md p-3 text-[13px] flex items-start gap-2">
        <CheckCircle2 className="alert-success-icon w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {balancedType === 'total'
            ? t('yamlEditor.balanced.alerts.validTotal')
            : t('yamlEditor.balanced.alerts.validParcial')}
        </span>
      </div>
    );
  }
  return null;
}

function BalancedConfigCards({
  balancedType,
  mode,
  onFieldChange,
  t,
}: {
  balancedType: BalancedType;
  mode: BalancedMode;
  onFieldChange: (field: string, value: any) => void;
  t: TranslateFn;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="rounded-lg border border-white/7 bg-black/20 px-3 py-2.5">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}>
          {t('yamlEditor.balanced.fields.balanceType')}
        </div>
        <Select
          value={balancedType}
          onValueChange={value => onFieldChange('type', value)}
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
          onValueChange={value => onFieldChange('mode', value)}
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
  );
}

function BalancedChildrenPanel({
  loadBearingChildren,
  excludedChildren,
  balancedType,
  mode,
  excludedOpen,
  onToggleExcluded,
  onPercentageChange,
  t,
  format,
}: {
  loadBearingChildren: YAMLNode[];
  excludedChildren: YAMLNode[];
  balancedType: BalancedType;
  mode: BalancedMode;
  excludedOpen: boolean;
  onToggleExcluded: () => void;
  onPercentageChange: (childId: string, rawValue: string) => void;
  t: TranslateFn;
  format: FormatFn;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#101010] p-3.5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${labelTextClass}`}>
            {t('yamlEditor.balanced.included.title')}
          </span>
          <div className={`mt-0.5 text-xs ${bodyTextClass}`}>{t('yamlEditor.balanced.included.description')}</div>
        </div>
        <span
          className={`inline-flex items-center rounded-full border border-sky-300/20 bg-black/20 px-2 py-1 text-[11px] ${labelTextClass}`}
        >
          {format('yamlEditor.balanced.included.count', { count: loadBearingChildren.length })}
        </span>
      </div>

      {loadBearingChildren.length > 0 ? (
        loadBearingChildren.map(child => {
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
                  htmlFor={`balanced-percentage-${child.id}`}
                  className={`block mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${warningAccentTextClass}`}
                >
                  {t('yamlEditor.balanced.fields.percentage')}
                </label>
                <Input
                  id={`balanced-percentage-${child.id}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentPercentage}
                  onChange={event => onPercentageChange(child.id, event.target.value)}
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

      {excludedChildren.length > 0 && (
        <div className={`mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm leading-5 ${mutedTextClass}`}>
          <button
            type="button"
            onClick={onToggleExcluded}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1 font-medium text-zinc-200">{t('yamlEditor.balanced.included.excludedNote')}</span>
            <span className="shrink-0 text-zinc-500 text-[10px] mr-1">{excludedChildren.length}</span>
            <ChevronDown
              className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform duration-150 ${excludedOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {excludedOpen && (
            <ul className="border-t border-white/5 px-3 pb-2 pt-1.5 space-y-0.5">
              {excludedChildren.map(child => (
                <li key={child.id} className="flex items-baseline gap-1.5">
                  <span className="shrink-0 select-none text-zinc-600">–</span>
                  <span className="break-all">{child.name || child.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BalancedSummaryPanel({
  balancedType,
  mode,
  validation,
  coverageWidth,
  statusClasses,
  statusLabel,
  summaryItems,
  issuesLength,
  distributeDisabled,
  onDistributeEvenly,
  t,
}: {
  balancedType: BalancedType;
  mode: BalancedMode;
  validation: BalancedValidation;
  coverageWidth: number;
  statusClasses: string;
  statusLabel: string;
  summaryItems: Array<{ label: string; value: string; helper: string }>;
  issuesLength: number;
  distributeDisabled: boolean;
  onDistributeEvenly: () => void;
  t: TranslateFn;
}) {
  return (
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
                {issuesLength === 0 ? (
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
              onClick={onDistributeEvenly}
              disabled={distributeDisabled}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 text-sm font-medium text-yellow-400 shadow-sm transition-[color,background-color,border-color,box-shadow] duration-200 hover:bg-yellow-400/10 hover:border-yellow-400/35 hover:shadow-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="h-full rounded-full transition-[width] bg-yellow-400"
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
  );
}

export function BalancedDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const [excludedOpen, setExcludedOpen] = useState(false);
  const data = node.data || {};
  const balancedType = normalizeBalancedDistributionType(data.type);
  const mode = normalizeBalancedExecutionMode(data.mode);
  const children = node.children || [];
  // think_time, empty containers and request-less subtrees never participate in
  // the balance — they are excluded from the included list, the distribution and
  // the percentage total so they cannot consume load. See RLP-475.
  const loadBearingChildren = children.filter(isBalancedLoadBearingChild);
  const excludedChildren = children.filter(child => !isBalancedLoadBearingChild(child));
  const validation = validateBalancedController(balancedType, children);
  const selectedCount = loadBearingChildren.length;
  const coverageWidth = Math.max(0, Math.min(validation.total, 100));
  const format: FormatFn = (key, values = {}) =>
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
    if (!onNodeUpdate || loadBearingChildren.length === 0) return;
    const evenPercentages = distributeEvenPercentages(loadBearingChildren.length);
    const percentageById = new Map<string, number>();
    loadBearingChildren.forEach((child, index) => {
      percentageById.set(child.id, evenPercentages[index]);
    });
    const childUpdates = children.map(child => {
      if (percentageById.has(child.id)) {
        return {
          nodeId: child.id,
          data: { ...(child.data || {}), __balancedPercentage: percentageById.get(child.id) },
        };
      }
      const nextData = { ...(child.data || {}) };
      delete nextData.__balancedPercentage;
      return { nodeId: child.id, data: nextData };
    });
    onNodeUpdate(node.id, {
      ...data,
      __batchChildUpdates: childUpdates,
    });
  };

  const { issues, statusClasses, statusLabel, summaryItems } = computeBalancedStatus(
    validation,
    balancedType,
    mode,
    selectedCount,
    t,
    format,
  );

  return (
    <div className={`space-y-3 ${bodyTextClass}`}>
      <BalancedStatusAlert
        issues={issues}
        hasChildren={validation.hasChildren}
        balancedType={balancedType}
        t={t}
      />

      <BalancedConfigCards
        balancedType={balancedType}
        mode={mode}
        onFieldChange={handleControllerChange}
        t={t}
      />

      <BalancedChildrenPanel
        loadBearingChildren={loadBearingChildren}
        excludedChildren={excludedChildren}
        balancedType={balancedType}
        mode={mode}
        excludedOpen={excludedOpen}
        onToggleExcluded={() => setExcludedOpen(o => !o)}
        onPercentageChange={handlePercentageChange}
        t={t}
        format={format}
      />

      <BalancedSummaryPanel
        balancedType={balancedType}
        mode={mode}
        validation={validation}
        coverageWidth={coverageWidth}
        statusClasses={statusClasses}
        statusLabel={statusLabel}
        summaryItems={summaryItems}
        issuesLength={issues.length}
        distributeDisabled={!node.children || node.children.length === 0}
        onDistributeEvenly={handleDistributeEvenly}
        t={t}
      />
    </div>
  );
}
