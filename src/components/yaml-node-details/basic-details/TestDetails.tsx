import { useLanguage } from '../../../contexts/LanguageContext';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps } from '../types';

export function TestDetails({ node, onNodeUpdate, fileName }: NamedNodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="test-detail-name"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {t('yamlEditor.common.name')}
          </label>
          <Input
            id="test-detail-name"
            value={data.name || node.name || ''}
            maxLength={50}
            onChange={event => {
              const value = event.target.value.slice(0, 50);
              onNodeUpdate?.(node.id, { ...node.data, name: value, __name: value });
            }}
            placeholder={t('yamlEditor.nodeDetails.test.namePlaceholder')}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
          />
        </div>
        <div className="w-24 shrink-0">
          <label
            htmlFor="test-detail-version"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {t('yamlEditor.nodeDetails.test.version')}
          </label>
          <Input
            id="test-detail-version"
            value={data.version || ''}
            maxLength={5}
            onChange={event => updateField('version', event.target.value.slice(0, 5))}
            placeholder="1.0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono text-center"
          />
        </div>
      </div>

      {(node.children?.find(child => child.type === 'scenarios')?.children?.length ?? 0) > 1 && (
        <div>
          <label htmlFor="test-scenario-mode" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            {t('yamlEditor.nodeDetails.test.scenarioScheduling')}
          </label>
          <select
            id="test-scenario-mode"
            value={data.scenario_mode ?? ''}
            onChange={event => updateField('scenario_mode', event.target.value)}
            className="w-full px-3 py-2 bg-[#111111] border border-white/10 rounded text-sm text-zinc-300"
          >
            <option value="">{t('yamlEditor.nodeDetails.test.chooseScheduling')}</option>
            <option value="sequential">{t('yamlEditor.nodeDetails.test.sequential')}</option>
            <option value="parallel">{t('yamlEditor.nodeDetails.test.parallel')}</option>
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="test-detail-file-name"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          {t('yamlEditor.nodeDetails.test.fileName')}
        </label>
        <Input
          id="test-detail-file-name"
          value={fileName || ''}
          readOnly
          aria-readonly="true"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      <div>
        <label
          htmlFor="test-detail-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          {t('yamlEditor.common.description')}
        </label>
        <Textarea
          id="test-detail-description"
          value={data.description || ''}
          maxLength={250}
          onChange={event => updateField('description', event.target.value.slice(0, 250))}
          placeholder={t('yamlEditor.nodeDetails.test.descriptionPlaceholder')}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-25 resize-none"
        />
      </div>
    </div>
  );
}
