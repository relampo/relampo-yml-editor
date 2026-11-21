import { useLanguage } from '../../contexts/LanguageContext';
import { createNodeDataUpdater } from './nodeDetailHelpers';
import type { YAMLValue } from '../../types/yaml';
import type { NodeDetailProps } from './types';

export function SQLAssertionDetails({ node, onNodeUpdate, sqlKind }: NodeDetailProps & { sqlKind?: string }) {
  const { t } = useLanguage();
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const kind = String(data.type || (sqlKind === 'exec' ? 'rows_affected' : 'rows_returned'));
  const criterion =
    data.value && typeof data.value === 'object' && !Array.isArray(data.value)
      ? (data.value as Record<string, YAMLValue>)
      : null;
  const mode = criterion
    ? 'min' in criterion && 'max' in criterion
      ? 'range'
      : 'min' in criterion
        ? 'min'
        : 'max'
    : data.max_ms !== undefined && kind === 'duration'
      ? 'max'
      : 'eq';
  const value = criterion || (kind === 'duration' && data.max_ms !== undefined ? { max: data.max_ms } : null);
  const inputClass = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono';
  const numberOrVariable = (raw: string) => (raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw);
  const change = (nextMode: string, key: string, raw: string) => {
    const next = numberOrVariable(raw);
    const { max_ms: _, ...rest } = data;
    const selected =
      nextMode === 'eq'
        ? next
        : nextMode === 'range'
          ? { min: value?.min ?? 0, max: value?.max ?? 1, [key]: next }
          : { [nextMode]: next };
    updateData({ ...rest, value: selected });
  };
  const choices = sqlKind === 'exec' ? ['rows_affected', 'duration'] : ['rows_returned', 'duration'];
  return (
    <>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        {t('yamlEditor.nodeDetails.validation.assertionType')}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {choices.map(type => (
          <button
            key={type}
            type="button"
            aria-pressed={kind === type}
            className={`px-3 py-1.5 text-sm rounded-full border ${kind === type ? 'border-green-400 text-green-300 bg-green-400/15' : 'border-transparent text-zinc-400 hover:bg-white/6'}`}
            onClick={() => updateData({ ...data, type, value: type === 'duration' ? { max: 1000 } : { min: 1 } })}
          >
            {t(`yamlEditor.nodeDetails.sqlAssertion.${type}`)}
          </button>
        ))}
      </div>
      <label className="block text-xs text-zinc-400 mb-4">
        {t('yamlEditor.nodeDetails.sqlAssertion.comparison')}
        <select
          aria-label={t('yamlEditor.nodeDetails.sqlAssertion.comparison')}
          className={inputClass}
          value={mode}
          onChange={event =>
            change(
              event.target.value,
              event.target.value === 'range' ? 'min' : event.target.value,
              String(data.value && typeof data.value !== 'object' ? data.value : 1),
            )
          }
        >
          {['eq', 'min', 'max', 'range'].map(op => (
            <option
              key={op}
              value={op}
            >
              {t(`yamlEditor.nodeDetails.sqlAssertion.${op}`)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {(mode === 'range' ? ['min', 'max'] : [mode]).map(key => (
          <label
            key={key}
            className="text-xs text-zinc-400"
          >
            {t(`yamlEditor.nodeDetails.sqlAssertion.${key}`)}
            {kind === 'duration' ? ' (ms)' : ''}
            <input
              className={inputClass}
              aria-label={t(`yamlEditor.nodeDetails.sqlAssertion.${key}`)}
              value={String(mode === 'eq' ? (data.value ?? '') : (value?.[key] ?? ''))}
              placeholder="{{valor}}"
              onChange={event => change(mode, key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </>
  );
}
