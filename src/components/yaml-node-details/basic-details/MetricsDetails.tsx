import { EditableField } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

export function MetricsDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="metrics-enabled"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Enabled
        </label>
        <select
          id="metrics-enabled"
          value={data.enabled ? 'true' : 'false'}
          onChange={event => updateField('enabled', event.target.value === 'true')}
          className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
      <EditableField
        label="Collect Interval"
        value={data.collect_interval || ''}
        field="collect_interval"
        onChange={(field, value) => updateField(field, value)}
      />
    </div>
  );
}
