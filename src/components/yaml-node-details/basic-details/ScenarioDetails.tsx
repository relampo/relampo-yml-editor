import { Textarea } from '../../ui/textarea';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps, NodeDetailProps } from '../types';

export function ScenariosContainerDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const scenarios = node.children || [];

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="scenarios-container-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Description / Comments
        </label>
        <Textarea
          id="scenarios-container-description"
          value={data.description || ''}
          onChange={event => updateField('description', event.target.value)}
          placeholder="Add notes or description about your scenarios..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-25"
        />
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Scenarios in this test
        </p>
        {scenarios.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            No scenarios defined. Right-click on "scenarios" in the tree to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className="p-3 bg-white/5 border-2 border-white/10 hover:border-purple-400/30 rounded-lg transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">
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
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="mb-4">
      <label
        htmlFor="scenario-comments"
        className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
      >
        Comments / Description
      </label>
      <Textarea
        id="scenario-comments"
        value={data.comments || ''}
        onChange={event => updateField('comments', event.target.value.slice(0, 250))}
        maxLength={250}
        placeholder="Add notes or comments about this scenario..."
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-20"
      />
    </div>
  );
}
