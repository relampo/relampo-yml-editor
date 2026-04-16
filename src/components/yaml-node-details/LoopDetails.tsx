import { Input } from '../ui/input';
import type { NodeDetailProps } from './types';

export function LoopDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const loopCount = data.count || 1;
  const stepsCount = node.children?.length || 0;

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Loop Count</label>
        <Input
          type="number"
          value={data.count !== undefined ? data.count : 1}
          onChange={event => handleChange('count', parseInt(event.target.value, 10) || 1)}
          placeholder="1"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Number of times to repeat the steps, or use variable ${'{'}loops${'}'}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Break Condition (optional)
        </label>
        <Input
          value={data.break_on || ''}
          onChange={event => handleChange('break_on', event.target.value)}
          placeholder="${'{'}error${'}'} || ${'{'}stop${'}'}"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">Exit loop early if condition is true</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Steps Inside</div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{stepsCount}</div>
        </div>
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Total Iterations</div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{loopCount * stepsCount}</div>
        </div>
      </div>
    </div>
  );
}
