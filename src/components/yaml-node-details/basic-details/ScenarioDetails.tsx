import { useLanguage } from '../../../contexts/LanguageContext';
import { Textarea } from '../../ui/textarea';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps, NodeDetailProps } from '../types';

export function ScenariosContainerDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const scenarios = node.children || [];

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="scenarios-container-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          {t('yamlEditor.nodeDetails.scenario.descriptionComments')}
        </label>
        <Textarea
          id="scenarios-container-description"
          value={data.description || ''}
          onChange={event => updateField('description', event.target.value)}
          placeholder={t('yamlEditor.nodeDetails.scenario.containerPlaceholder')}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-25"
        />
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          {t('yamlEditor.nodeDetails.scenario.inThisTest')}
        </p>
        {scenarios.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            {t('yamlEditor.nodeDetails.scenario.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className="p-3 bg-white/5 border-2 border-white/10 hover:border-purple-400/30 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-400/5 text-yellow-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">{scenario.name}</div>
                    {scenario.data?.name && <div className="text-xs text-zinc-500 mt-0.5">{scenario.data.name}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ScenarioDetails({ node, onNodeUpdate }: NamedNodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="mb-4">
      <label
        htmlFor="scenario-comments"
        className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
      >
        {t('yamlEditor.nodeDetails.scenario.commentsDescription')}
      </label>
      <Textarea
        id="scenario-comments"
        value={data.comments || ''}
        onChange={event => updateField('comments', event.target.value.slice(0, 250))}
        maxLength={250}
        placeholder={t('yamlEditor.nodeDetails.scenario.commentsPlaceholder')}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-20"
      />
    </div>
  );
}
