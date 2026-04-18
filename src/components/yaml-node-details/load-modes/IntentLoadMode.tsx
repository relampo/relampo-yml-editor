import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getIntentAutoConfig, limitedInputValue } from '../loadUtils';
import { LoadDisplayField, LoadField, LoadGrid, LoadModeProps, LoadSelectField } from './shared';

export function IntentLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const intentTargetUnit = String(data.target_unit || 'rps').toLowerCase();
  const intentTargetPerMinute = (parseFloat(String(data.target_value || '0')) || 0) * 60;
  const autoConfig = getIntentAutoConfig(data);
  const [expandedSections, setExpandedSections] = useState({
    contract: true,
    general: true,
    guardrails: true,
    slo: true,
  });

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

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-sky-400/20 bg-sky-400/8 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-sky-100">{t('yamlEditor.intent.overview.title')}</h4>
        <p className="mt-1 text-xs leading-relaxed text-sky-100/75">
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
            value={data.target_unit || 'rps'}
            onChange={value => onChange('target_unit', value)}
            options={[
              { label: t('yamlEditor.intent.options.targetUnitRps'), value: 'rps' },
              { label: t('yamlEditor.intent.options.targetUnitVus'), value: 'vus' },
            ]}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.targetValue')}
            value={data.target_value || ''}
            placeholder="25"
            onChange={value => onChange('target_value', limitedInputValue(value))}
            type="number"
            helpText={
              intentTargetUnit === 'rps'
                ? format('yamlEditor.intent.helpers.targetReqPerMinute', { value: intentTargetPerMinute.toFixed(0) })
                : t('yamlEditor.intent.helpers.targetVuCount')
            }
          />
          <LoadSelectField
            label={t('yamlEditor.intent.fields.aggressiveness')}
            value={data.aggressiveness || 'medium'}
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
            label={t('yamlEditor.intent.fields.window')}
            value={data.window ?? ''}
            placeholder={autoConfig.window}
            onChange={value => onChange('window', limitedInputValue(value))}
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
            label={t('yamlEditor.intent.fields.rampUp')}
            value={data.ramp_up ?? ''}
            placeholder={autoConfig.ramp_up}
            onChange={value => onChange('ramp_up', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.ramp_up })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.rampDown')}
            value={data.ramp_down ?? ''}
            placeholder={autoConfig.ramp_down}
            onChange={value => onChange('ramp_down', limitedInputValue(value))}
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.ramp_down })}
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
            value={data.max_vus ?? ''}
            placeholder={autoConfig.max_vus}
            onChange={value => onChange('max_vus', limitedInputValue(value))}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.max_vus })}
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
          <LoadDisplayField
            label={t('yamlEditor.intent.fields.average')}
            value={`${autoConfig.average_ms} ms`}
            helpText={t('yamlEditor.intent.helpers.average')}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.p95MaxMs')}
            value={data.p95_max_ms ?? ''}
            placeholder={autoConfig.p95_max_ms}
            onChange={value => onChange('p95_max_ms', limitedInputValue(value))}
            type="number"
            helpText={format('yamlEditor.intent.helpers.suggested', { value: autoConfig.p95_max_ms })}
          />
          <LoadField
            label={t('yamlEditor.intent.fields.errorMaxPct')}
            value={data.error_rate_max_pct ?? ''}
            placeholder={autoConfig.error_rate_max_pct}
            onChange={value => onChange('error_rate_max_pct', limitedInputValue(value))}
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
