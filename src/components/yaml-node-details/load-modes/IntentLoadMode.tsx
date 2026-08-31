import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  getIntentAutoConfig,
  getIntentErrorRateData,
  getIntentLatencyData,
  getIntentTargetData,
  limitedInputValue,
} from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSelectField } from './shared';

export function IntentLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const intentTarget = getIntentTargetData(data);
  const intentLatency = getIntentLatencyData(data);
  const intentErrorRate = getIntentErrorRateData(data);
  const intentTargetUnit = String(intentTarget.type || 'rps').toLowerCase();
  const intentTargetPerMinute = (parseFloat(String(intentTarget.value || '0')) || 0) * 60;
  const locksMaxVusToTarget = intentTargetUnit === 'vus';
  const autoConfig = getIntentAutoConfig(data);
  const [expandedSections, setExpandedSections] = useState({
    contract: true,
    general: true,
    guardrails: true,
    slo: true,
  });

  useEffect(() => {
    if (!locksMaxVusToTarget) {
      return;
    }
    const targetValue = String(intentTarget.value || '').trim();
    if (targetValue !== '' && String(data.max_vus ?? '').trim() !== targetValue) {
      onChange('max_vus', targetValue);
    }
  }, [data.max_vus, intentTarget.value, locksMaxVusToTarget, onChange]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(current => ({
      ...current,
      [section]: !current[section],
    }));
  };
  const format = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (text, [token, value]) => text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(value)),
      t(key),
    );
  const updateTarget = (field: 'type' | 'value', value: string) => {
    onChange('target', {
      ...intentTarget,
      [field]: field === 'value' ? limitedInputValue(value) : value,
    });
  };
  const updateLatency = (field: 'metric' | 'max_ms', value: string) => {
    onChange('latency', {
      ...intentLatency,
      [field]: field === 'max_ms' ? limitedInputValue(value) : value,
    });
  };
  const updateErrorRate = (value: string) => {
    onChange('error_rate', {
      ...intentErrorRate,
      max_pct: limitedInputValue(value),
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-yellow-100">{t('yamlEditor.intent.overview.title')}</h4>
        <p className="mt-1 text-xs leading-relaxed text-yellow-100/75">
          {t('yamlEditor.intent.overview.description')}
        </p>
      </section>

      <AccordionSection
        title={t('yamlEditor.intent.sections.contract.title')}
        description={t('yamlEditor.intent.sections.contract.description')}
        expanded={expandedSections.contract}
        onToggle={() => toggleSection('contract')}
      >
        <LoadGrid>
          <LoadSelectField
            label={t('yamlEditor.intent.fields.targetUnit')}
            value={intentTargetUnit}
            onChange={value => updateTarget('type', value)}
            options={[
              { label: t('yamlEditor.intent.options.targetUnitRps'), value: 'rps' },
              { label: t('yamlEditor.intent.options.targetUnitVus'), value: 'vus' },
            ]}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.targetValue')}
            value={intentTarget.value || ''}
            placeholder="25"
            onChange={value => updateTarget('value', value)}
            type="number"
            helpText={
              intentTargetUnit === 'rps'
                ? format('yamlEditor.intent.helpers.targetReqPerMinute', { value: intentTargetPerMinute.toFixed(0) })
                : t('yamlEditor.intent.helpers.targetVuCount')
            }
          />
          <LoadSelectField
            label={t('yamlEditor.intent.fields.aggressiveness')}
            value={String(data.aggressiveness || 'medium')}
            onChange={value => onChange('aggressiveness', value)}
            helpText={t('yamlEditor.intent.helpers.aggressiveness')}
            options={[
              { label: t('yamlEditor.intent.options.aggressivenessLow'), value: 'low' },
              { label: t('yamlEditor.intent.options.aggressivenessMedium'), value: 'medium' },
              { label: t('yamlEditor.intent.options.aggressivenessHigh'), value: 'high' },
            ]}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.warmup')}
            value={data.warmup ?? ''}
            placeholder={autoConfig.warmup}
            onChange={value => onChange('warmup', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.warmup })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.rampUp')}
            value={data.ramp_up ?? ''}
            placeholder={autoConfig.ramp_up}
            onChange={value => onChange('ramp_up', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.ramp_up })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.window')}
            value={data.control_window ?? data.window ?? ''}
            placeholder={autoConfig.window}
            onChange={value => onChange('control_window', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.window })}
          />
        </LoadGrid>
      </AccordionSection>

      <AccordionSection
        title={t('yamlEditor.intent.sections.general.title')}
        description={t('yamlEditor.intent.sections.general.description')}
        expanded={expandedSections.general}
        onToggle={() => toggleSection('general')}
      >
        <LoadGrid>
          <LoadField
            label={t('yamlEditor.intent.fields.duration')}
            value={data.duration ?? ''}
            placeholder={autoConfig.duration}
            onChange={value => onChange('duration', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.duration })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.iteration')}
            value={data.iterations ?? ''}
            placeholder={t('yamlEditor.intent.placeholders.notApplicable')}
            onChange={value => onChange('iterations', limitedInputValue(value))}
            helpText={t('yamlEditor.intent.helpers.iteration')}
          />
        </LoadGrid>
      </AccordionSection>

      <AccordionSection
        title={t('yamlEditor.intent.sections.guardrails.title')}
        description={t('yamlEditor.intent.sections.guardrails.description')}
        expanded={expandedSections.guardrails}
        onToggle={() => toggleSection('guardrails')}
      >
        <LoadGrid>
          <LoadField
            label={t('yamlEditor.intent.fields.minVus')}
            value={data.min_vus ?? ''}
            placeholder={autoConfig.min_vus}
            onChange={value => onChange('min_vus', limitedInputValue(value))}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.min_vus })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.maxVus')}
            value={locksMaxVusToTarget ? intentTarget.value || autoConfig.max_vus : data.max_vus ?? ''}
            placeholder={autoConfig.max_vus}
            onChange={value => {
              if (!locksMaxVusToTarget) {
                onChange('max_vus', limitedInputValue(value));
              }
            }}
            type="number"
            disabled={locksMaxVusToTarget}
            helpText={
              locksMaxVusToTarget
                ? t('yamlEditor.intent.helpers.maxVusLockedToTarget')
                : format('yamlEditor.intent.helpers.suggested', { value: autoConfig.max_vus })
            }
          />
        </LoadGrid>
      </AccordionSection>

      <AccordionSection
        title={t('yamlEditor.intent.sections.slo.title')}
        description={t('yamlEditor.intent.sections.slo.description')}
        expanded={expandedSections.slo}
        onToggle={() => toggleSection('slo')}
      >
        <LoadGrid>
          <LoadField
            label={t('yamlEditor.intent.fields.latencyMaxMs')}
            value={intentLatency.max_ms ?? ''}
            placeholder={autoConfig.p95_max_ms}
            onChange={value => updateLatency('max_ms', value)}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.p95_max_ms })}
          />
          <LoadSelectField
            label={t('yamlEditor.intent.fields.latencyMetric')}
            value={String(intentLatency.metric || 'p95')}
            onChange={value => updateLatency('metric', value)}
            options={[
              { label: 'avg', value: 'avg' },
              { label: 'p50', value: 'p50' },
              { label: 'p75', value: 'p75' },
              { label: 'p90', value: 'p90' },
              { label: 'p95', value: 'p95' },
              { label: 'p99', value: 'p99' },
            ]}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.errorMaxPct')}
            value={intentErrorRate.max_pct ?? ''}
            placeholder={autoConfig.error_rate_max_pct}
            onChange={value => updateErrorRate(value)}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.error_rate_max_pct })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.error4xxMaxPct')}
            value={data.error_4xx_max_pct ?? ''}
            placeholder={autoConfig.error_4xx_max_pct}
            onChange={value => onChange('error_4xx_max_pct', limitedInputValue(value))}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.error_4xx_max_pct })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.error5xxMaxPct')}
            value={data.error_5xx_max_pct ?? ''}
            placeholder={autoConfig.error_5xx_max_pct}
            onChange={value => onChange('error_5xx_max_pct', limitedInputValue(value))}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.error_5xx_max_pct })}
          />
        </LoadGrid>
      </AccordionSection>
    </div>
  );
}

function AccordionSection({
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/3 p-4 sm:p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
          {description && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>}
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && <div className="mt-4">{children}</div>}
    </section>
  );
}
