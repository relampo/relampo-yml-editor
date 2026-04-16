import { Input } from '../ui/input';
import type { NodeDetailProps } from './types';

export function RetryDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const backoffType = data.backoff || 'constant';

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Max Attempts</label>
        <Input
          type="number"
          value={data.attempts !== undefined ? data.attempts : 3}
          onChange={event => handleChange('attempts', parseInt(event.target.value, 10) || 3)}
          placeholder="3"
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Backoff Strategy
        </label>
        <select
          value={backoffType}
          onChange={event => handleChange('backoff', event.target.value)}
          className="w-full h-[38px] px-3 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option
            value="constant"
            className="bg-zinc-900"
          >
            constant (same delay)
          </option>
          <option
            value="linear"
            className="bg-zinc-900"
          >
            linear (incremental)
          </option>
          <option
            value="exponential"
            className="bg-zinc-900"
          >
            exponential (2x each time)
          </option>
        </select>
      </div>

      {backoffType === 'constant' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Delay</label>
          <Input
            value={data.initial_delay || data.delay || ''}
            onChange={event => handleChange('initial_delay', event.target.value)}
            placeholder="1s"
            className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
          <div className="mt-1 text-xs text-zinc-500">Same delay between all retry attempts</div>
        </div>
      )}

      {backoffType === 'linear' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={event => handleChange('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Increment</label>
            <Input
              value={data.increment || ''}
              onChange={event => handleChange('increment', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Delay increases by this amount each retry (1s, 2s, 3s...)</div>
          </div>
        </>
      )}

      {backoffType === 'exponential' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={event => handleChange('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Multiplier
            </label>
            <Input
              type="number"
              value={data.multiplier !== undefined ? data.multiplier : 2}
              onChange={event => handleChange('multiplier', parseFloat(event.target.value) || 2)}
              placeholder="2"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Delay multiplied each retry (1s, 2s, 4s, 8s...)</div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Delay (optional)
            </label>
            <Input
              value={data.max_delay || ''}
              onChange={event => handleChange('max_delay', event.target.value)}
              placeholder="30s"
              className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Cap maximum delay to prevent very long waits</div>
          </div>
        </>
      )}

      <div className="p-3 bg-white/5 border border-white/10 rounded">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Steps to Retry</div>
        <div className="text-2xl font-bold text-zinc-300 font-mono">{node.children?.length || 0}</div>
      </div>
    </div>
  );
}
