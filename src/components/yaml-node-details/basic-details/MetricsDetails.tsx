import { EditableField } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { NodeDetailProps } from '../types';

export function MetricsDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-6">
      <div>
        <label
          id="metrics-enabled-label"
          htmlFor="metrics-enabled"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Enabled
        </label>
        <Select
          value={data.enabled ? 'true' : 'false'}
          onValueChange={value => updateField('enabled', value === 'true')}
        >
          <SelectTrigger
            id="metrics-enabled"
            aria-labelledby="metrics-enabled-label"
            className="w-full h-9.5 border-white/10 bg-white/5 text-zinc-300 font-mono"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10">
            <SelectItem value="true" className="font-mono">true</SelectItem>
            <SelectItem value="false" className="font-mono">false</SelectItem>
          </SelectContent>
        </Select>
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
