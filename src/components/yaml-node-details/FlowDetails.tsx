import { AlertTriangle, BetweenHorizontalStart, Binary, Box, Clock3, GitFork, Hourglass, Info, Layers, List, Play } from 'lucide-react';
import type { RetryEditorConfig } from '../../types/shared';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { createNodeDataUpdater } from './nodeDetailHelpers';
import type { NodeDetailProps } from './types';

export function IfDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Condition Expression
        </label>
        <Textarea
          value={data.condition || ''}
          onChange={event => updateField('condition', event.target.value)}
          placeholder="${'{'}status${'}'} === 200\n${'{'}user_id${'}'} != null\n${'{'}count${'}'} > 10"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-25"
        />
        <div className="mt-1 text-xs text-zinc-500">Steps will only execute if this condition evaluates to true</div>
      </div>

      <div className="rounded-l-md rounded-r-2xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] border-l-4 border-l-yellow-400">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white mb-4">
          Conditional Steps
        </div>
        <div className="flex items-center gap-4">
          <Box className="w-10 h-10 text-yellow-400 shrink-0" />
          <div className="border-l border-white/10 pl-4">
            <div className="text-3xl font-black font-mono text-white">{node.children?.length || 0}</div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Steps inside this controller that will run if the condition is true
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoopDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const loopCount = data.count || 1;
  const stepsCount = node.children?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Loop Count</label>
        <Input
          type="number"
          value={data.count !== undefined ? data.count : 1}
          onChange={event => updateField('count', parseInt(event.target.value, 10) || 1)}
          placeholder="1"
          className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
          onChange={event => updateField('break_on', event.target.value)}
          placeholder="${'{'}error${'}'} || ${'{'}stop${'}'}"
          className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">Exit loop early if condition is true</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 border border-white/10 rounded">
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Steps Inside</div>
          <div className="text-2xl font-bold text-zinc-300 font-mono">{stepsCount}</div>
        </div>
        <div className="p-3 bg-white/5 border border-white/10 rounded">
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Total Iterations</div>
          <div className="text-2xl font-bold text-zinc-300 font-mono">{loopCount * stepsCount}</div>
        </div>
      </div>
    </div>
  );
}

export function RetryDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const retryData = data as RetryEditorConfig;
  const backoffType = retryData.backoff === 'fixed' ? 'constant' : retryData.backoff || 'constant';

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Max Attempts</label>
        <Input
          type="number"
          value={retryData.attempts !== undefined ? retryData.attempts : 3}
          onChange={event => updateField('attempts', parseInt(event.target.value, 10) || 3)}
          placeholder="3"
          className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Backoff Strategy
        </label>
        <Select
          value={backoffType}
          onValueChange={value => updateField('backoff', value)}
        >
          <SelectTrigger className="w-full h-9.5 px-3 py-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded text-sm font-mono">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="constant">constant (same delay)</SelectItem>
            <SelectItem value="linear">linear (incremental)</SelectItem>
            <SelectItem value="exponential">exponential (2x each time)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {backoffType === 'constant' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Delay</label>
          <Input
            value={retryData.initial_delay || retryData.delay || ''}
            onChange={event => updateField('initial_delay', event.target.value)}
            placeholder="1s"
            className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
              value={retryData.initial_delay || ''}
              onChange={event => updateField('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Increment</label>
            <Input
              value={retryData.increment || ''}
              onChange={event => updateField('increment', event.target.value)}
              placeholder="1s"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
              value={retryData.initial_delay || ''}
              onChange={event => updateField('initial_delay', event.target.value)}
              placeholder="1s"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Multiplier
            </label>
            <Input
              type="number"
              value={retryData.multiplier !== undefined ? retryData.multiplier : 2}
              onChange={event => updateField('multiplier', parseFloat(event.target.value) || 2)}
              placeholder="2"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">Delay multiplied each retry (1s, 2s, 4s, 8s...)</div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Delay (optional)
            </label>
            <Input
              value={retryData.max_delay || ''}
              onChange={event => updateField('max_delay', event.target.value)}
              placeholder="30s"
              className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const stepsCount = node.children?.length || 0;

  return (
    <div className="space-y-6">

      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Purpose (optional)
        </label>
        <Textarea
          value={data.description || ''}
          onChange={event => updateField('description', event.target.value)}
          placeholder="Initialize session tokens, shared IDs, warm caches, bootstrap environment..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-25"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Document what this initialization block prepares for the rest of the scenario.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-white/10 bg-white/5 p-3 flex items-start gap-3">
          <div className="rounded-full bg-yellow-400/10 p-2 shrink-0 mt-0.5">
            <List className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Init Steps</div>
            <div className="text-2xl font-bold font-mono text-white">{stepsCount}</div>
            <div className="text-xs text-zinc-500 mt-1">Number of steps to run during initialization.</div>
          </div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-3 flex items-start gap-3">
          <div className="rounded-full bg-yellow-400/10 p-2 shrink-0 mt-0.5">
            <Play className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Execution</div>
            <div className="text-2xl font-bold font-mono text-white">1x</div>
            <div className="text-xs text-zinc-500 mt-1">This controller will execute exactly once.</div>
          </div>
        </div>
      </div>

      {stepsCount === 0 && (
        <div className="alert-info rounded-md p-3 text-[13px] flex items-start gap-2">
          <Info className="alert-info-icon w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Add at least one initialization step inside this controller so it produces the shared state required by the
            scenario.
          </span>
        </div>
      )}
    </div>
  );
}

export function ParallelDetails({ node }: NodeDetailProps) {
  const stepsCount = node.children?.length || 0;
  const isEmpty = stepsCount === 0;

  return (
    <div
      className="space-y-6 text-zinc-50"
      style={{ color: '#f8fafc' }}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-start gap-3">
          <div className="inline-flex items-center justify-center rounded-full bg-yellow-400/10 p-2.5 text-yellow-400 shadow-sm shrink-0 mt-0.5">
            <GitFork className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              Execution Model
            </div>
            <p className="text-sm leading-6" style={{ color: '#f8fafc' }}>
              All child steps start together and this controller finishes only when every child step completes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center rounded-xs bg-yellow-400/10 p-2.5 text-yellow-400 shadow-sm shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                Parallel Steps
              </div>
              <div
                className="text-3xl font-black font-mono mt-1"
                style={{ color: '#ffffff' }}
              >
                {stepsCount}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center rounded-xs bg-yellow-400/10 p-2.5 text-yellow-400 shadow-sm shrink-0">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                Completion
              </div>
              <div
                className="text-base font-semibold mt-1"
                style={{ color: isEmpty ? '#fde68a' : '#f8fafc' }}
              >
                {isEmpty ? 'Blocked' : 'Waits for all'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div
            className="mb-2 text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: '#fde68a' }}
          >
            Validation
          </div>
          <p
            className="text-sm leading-6"
            style={{ color: '#fffbeb' }}
          >
            A parallel controller cannot be saved without at least one child step.
          </p>
        </div>
      )}
    </div>
  );
}

export function ThinkTimeDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField, updateData } = createNodeDataUpdater(node, onNodeUpdate);
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
  const thinkTimeActiveTabColor = 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400';

  const handleModeChange = (newMode: 'fixed' | 'range' | 'distribution') => {
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
      updateData(nextData);
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
      updateData(nextData);
      return;
    }

    const nextData = { ...data };
    delete nextData.duration;
    if (!nextData.mean) nextData.mean = '2s';
    if (!nextData.std_dev) nextData.std_dev = '500ms';
    if (!nextData.min) nextData.min = '1s';
    if (!nextData.max) nextData.max = '3s';
    if (!nextData.distribution) nextData.distribution = 'normal';
    updateData(nextData);
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Think time mode"
        className="flex items-center border-b border-white/5 bg-[#111111] shrink-0 rounded-t-md"
      >
        {thinkTimeModes.map(modeItem => {
          const active = mode === modeItem.value;
          const Icon = modeItem.icon;

          return (
            <button
              key={modeItem.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleModeChange(modeItem.value)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? thinkTimeActiveTabColor
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {modeItem.label}
            </button>
          );
        })}
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
                onChange={event => updateField('duration', event.target.value)}
                placeholder="2s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
                onChange={event => updateField('min', event.target.value)}
                placeholder="1s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => updateField('max', event.target.value)}
                placeholder="3s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="p-3 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs text-zinc-400">
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
                onChange={event => updateField('mean', event.target.value)}
                placeholder="2s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Std Dev</label>
              <Input
                value={String(data.std_dev || '')}
                onChange={event => updateField('std_dev', event.target.value)}
                placeholder="500ms"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
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
                onChange={event => updateField('min', event.target.value)}
                placeholder="1s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Maximum Duration
              </label>
              <Input
                value={variableMax}
                onChange={event => updateField('max', event.target.value)}
                placeholder="3s"
                className="w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Distribution
              </label>
              <Select
                value={String(data.distribution || 'normal')}
                onValueChange={value => updateField('distribution', value)}
              >
                <SelectTrigger className="w-full h-9.5 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono">
                  <SelectValue placeholder="Select distribution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">normal</SelectItem>
                  <SelectItem value="uniform">uniform</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs text-zinc-400">
            <AlertTriangle className="inline-block h-3 w-3 mr-1" />
            Normal samples around mean/std_dev; uniform samples directly between min and max. Both respect the min/max
            guardrails.
          </div>
        </>
      )}
    </div>
  );
}
