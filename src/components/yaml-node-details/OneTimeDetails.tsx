import { Zap } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import type { NodeDetailProps } from './types';

export function OneTimeDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const stepsCount = node.children?.length || 0;

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-white/10 p-2 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white">One-time execution</div>
            <p className="mt-1 text-sm text-zinc-300">
              This controller runs once before dependent steps and keeps its generated data available for reuse.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Purpose (optional)
        </label>
        <Textarea
          value={data.description || ''}
          onChange={event => handleChange('description', event.target.value)}
          placeholder="Initialize session tokens, shared IDs, warm caches, bootstrap environment..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px]"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Document what this initialization block prepares for the rest of the scenario.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">Init Steps</div>
          <div className="text-2xl font-bold font-mono text-white">{stepsCount}</div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">Execution</div>
          <div className="text-2xl font-bold font-mono text-white">1x</div>
        </div>
      </div>

      {stepsCount === 0 && (
        <div className="rounded border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          Add at least one initialization step inside this controller so it produces the shared state required by the
          scenario.
        </div>
      )}
    </div>
  );
}
