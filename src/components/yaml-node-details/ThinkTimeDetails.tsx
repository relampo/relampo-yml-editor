import type { CSSProperties } from 'react';
import { AlertTriangle, BetweenHorizontalStart, Binary, Clock3 } from 'lucide-react';
import { Input } from '../ui/input';
import type { NodeDetailProps } from './types';

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
  const thinkTimeModeButtonStyle: Record<'fixed' | 'range' | 'distribution', CSSProperties> = {
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
