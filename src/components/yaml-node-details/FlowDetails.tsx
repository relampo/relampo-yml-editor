import { AlertTriangle, BetweenHorizontalStart, Binary, Clock3, Zap } from 'lucide-react';
import { Input } from '../ui/input';
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

export function ThinkTimeDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const hasFixed = data.duration !== undefined && String(data.duration).trim() !== '';
  const hasDistributionHints =
    data.mean !== undefined || data.std_dev !== undefined || String(data.distribution || '').toLowerCase() === 'normal';
  const mode: 'fixed' | 'range' | 'distribution' = hasFixed ? 'fixed' : hasDistributionHints ? 'distribution' : 'range';
  const fixedDuration = String(data.duration || '');
  const variableMin = String(data.min || '');
  const variableMax = String(data.max || '');
  const thinkTimeModes = [
    { value: 'fixed', label: 'Fixed', icon: Clock3 },
    { value: 'range', label: 'Range', icon: BetweenHorizontalStart },
    { value: 'distribution', label: 'Distribution', icon: Binary },
  ] as const;
  const thinkTimeModeButtonStyle: Record<'fixed' | 'range' | 'distribution', React.CSSProperties> = {
    fixed: {
      backgroundColor: '#F9731633',
      color: '#fdba74',
      borderColor: '#FDBA7480',
      boxShadow: '0 10px 22px #F9731633',
    },
    range: {
      backgroundColor: '#06B6D433',
      color: '#67e8f9',
      borderColor: '#67E8F980',
      boxShadow: '0 10px 22px #06B6D433',
    },
    distribution: {
      backgroundColor: '#A855F733',
      color: '#d8b4fe',
      borderColor: '#D8B4FE80',
      boxShadow: '0 10px 22px #A855F733',
    },
  };

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  const handleModeChange = (newMode: 'fixed' | 'range' | 'distribution') => {
    if (!onNodeUpdate) {
      return;
    }

    if (newMode === 'fixed') {
      const nextData = { ...data };
      delete nextData.min;
      delete nextData.max;
      delete nextData.mean;
      delete nextData.std_dev;
      delete nextData.distribution;
      if (!nextData.duration) {
        nextData.duration = '1s';
      }
      onNodeUpdate(node.id, nextData);
      return;
    }

    if (newMode === 'range') {
      const nextData = { ...data };
      delete nextData.duration;
      delete nextData.mean;
      delete nextData.std_dev;
      if (!nextData.min) nextData.min = '1s';
      if (!nextData.max) nextData.max = '3s';
      nextData.distribution = 'uniform';
      onNodeUpdate(node.id, nextData);
      return;
    }

    const nextData = { ...data };
    delete nextData.duration;
    if (!nextData.mean) nextData.mean = '2s';
    if (!nextData.std_dev) nextData.std_dev = '500ms';
    if (!nextData.min) nextData.min = '1s';
    if (!nextData.max) nextData.max = '3s';
    if (!nextData.distribution) nextData.distribution = 'normal';
    onNodeUpdate(node.id, nextData);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Think Time Mode
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {thinkTimeModes.map(modeItem => {
            const active = mode === modeItem.value;
            const Icon = modeItem.icon;

            return (
              <button
                key={modeItem.value}
                type="button"
                onClick={() => handleModeChange(modeItem.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${
                  active
                    ? 'border-current text-white'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'
                }`}
                style={active ? thinkTimeModeButtonStyle[modeItem.value] : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{modeItem.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'fixed' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Duration
              </label>
              <Input
                value={fixedDuration}
                onChange={event => handleChange('duration', event.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">Examples: 1s, 500ms, 2m (seconds, milliseconds, minutes)</div>
        </>
      ) : mode === 'range' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={event => handleChange('min', event.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => handleChange('max', event.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            <AlertTriangle className="inline-block h-3 w-3 mr-1" />
            Random delay is chosen between min and max on each execution.
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Mean</label>
              <Input
                value={String(data.mean || '')}
                onChange={event => handleChange('mean', event.target.value)}
                placeholder="2s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Std Dev</label>
              <Input
                value={String(data.std_dev || '')}
                onChange={event => handleChange('std_dev', event.target.value)}
                placeholder="500ms"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Minimum Duration
              </label>
              <Input
                value={variableMin}
                onChange={event => handleChange('min', event.target.value)}
                placeholder="1s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => handleChange('max', event.target.value)}
                placeholder="3s"
                className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Distribution
              </label>
              <select
                value={String(data.distribution || 'normal')}
                onChange={event => handleChange('distribution', event.target.value)}
                className="w-full h-[38px] px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono outline-none"
              >
                <option
                  value="normal"
                  className="bg-[#1a1a1a]"
                >
                  normal
                </option>
                <option
                  value="uniform"
                  className="bg-[#1a1a1a]"
                >
                  uniform
                </option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            <AlertTriangle className="inline-block h-3 w-3 mr-1" />
            Distribution mode applies normal(mean/std_dev) in runtime, bounded by min/max guardrails.
          </div>
        </>
      )}
    </div>
  );
}
