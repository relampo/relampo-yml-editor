import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps } from '../types';

export function TestDetails({ node, onNodeUpdate }: NamedNodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="test-detail-name"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            Name
          </label>
          <Input
            id="test-detail-name"
            value={data.name || node.name || ''}
            maxLength={50}
            onChange={event => updateField('name', event.target.value.slice(0, 50))}
            placeholder="Test Plan Name"
            className="w-17.5 shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
          />
        </div>
        <div className="w-24 shrink-0">
          <label
            htmlFor="test-detail-version"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            Version
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

      <div>
        <label
          htmlFor="test-detail-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Description
        </label>
        <Textarea
          id="test-detail-description"
          value={data.description || ''}
          maxLength={250}
          onChange={event => updateField('description', event.target.value.slice(0, 250))}
          placeholder="Test description..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-25 resize-none"
        />
      </div>
    </div>
  );
}
