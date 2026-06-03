import { useLanguage } from '../../../contexts/LanguageContext';
import { Textarea } from '../../ui/textarea';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

export function StepDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="mb-6">
      <label
        htmlFor="step-description"
        className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
      >
        {t('yamlEditor.common.description')}
      </label>
      <Textarea
        id="step-description"
        value={data.description || ''}
        onChange={event => updateField('description', event.target.value)}
        placeholder={t('yamlEditor.common.description')}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-24 resize-y"
      />
    </div>
  );
}
