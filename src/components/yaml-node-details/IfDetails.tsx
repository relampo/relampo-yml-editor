import { Textarea } from '../ui/textarea';
import type { NodeDetailProps } from './types';

export function IfDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Condition Expression
        </label>
        <Textarea
          value={data.condition || ''}
          onChange={event => handleChange('condition', event.target.value)}
          placeholder="${'{'}status${'}'} === 200\n${'{'}user_id${'}'} != null\n${'{'}count${'}'} > 10"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-[100px]"
        />
        <div className="mt-1 text-xs text-zinc-500">Steps will only execute if this condition evaluates to true</div>
      </div>

      <div className="p-3 bg-pink-400/10 border border-pink-400/20 rounded">
        <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">Conditional Steps</div>
        <div className="text-2xl font-bold text-pink-300 font-mono">{node.children?.length || 0}</div>
      </div>
    </div>
  );
}
