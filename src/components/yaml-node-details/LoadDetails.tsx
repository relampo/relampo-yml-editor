import { Gauge, Mountain, TrendingUp, Users } from 'lucide-react';
import { useId } from 'react';
import { LoadVisualization } from './LoadVisualization';
import {
  buildLoadDataForType,
  getIntentAutoConfig,
  getLoadTypeLabel,
  normalizeLoadType,
  selectedLoadButtonStyle,
  type LoadData,
  type LoadDataValue,
  type LoadType,
} from './loadUtils';
import { ConstantLoadMode } from './load-modes/ConstantLoadMode';
import { IntentLoadMode } from './load-modes/IntentLoadMode';
import { RampLoadMode } from './load-modes/RampLoadMode';
import { RampUpDownLoadMode } from './load-modes/RampUpDownLoadMode';
import { ThroughputLoadMode } from './load-modes/ThroughputLoadMode';
import { createNodeDataUpdater } from './nodeDetailHelpers';
import type { NodeDetailProps } from './types';

const LOAD_MODE_OPTIONS: Array<{
  type: LoadType;
  label: string;
  icon: typeof Users;
}> = [
  { type: 'constant', label: 'Constant', icon: Users },
  { type: 'linear', label: 'Linear', icon: TrendingUp },
  { type: 'ramp_up_down', label: 'Ramp Up/Down', icon: Mountain },
  { type: 'throughput', label: 'Throughput', icon: Gauge },
];

export function LoadDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateData, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const loadType = normalizeLoadType(data.type);

  const handleChange = (field: string, value: LoadDataValue) => {
    if (field === 'type') {
      const selectedType = normalizeLoadType(value);
      updateData({
        ...buildLoadDataForType(selectedType, data),
        __name: `Load: ${getLoadTypeLabel(selectedType)}`,
      });
      return;
    }

    if (field === 'run_until_stopped') {
      const nextData = { ...data };
      if (value === true) {
        nextData.run_until_stopped = true;
        nextData.duration = '';
        nextData.iterations = '';
      } else {
        delete nextData.run_until_stopped;
      }
      updateData(nextData);
      return;
    }

    if (loadType === 'intent' && ['target_unit', 'target_value', 'aggressiveness'].includes(field)) {
      const nextData = { ...data, [field]: value };
      const { average_ms: _averageMs, ...autoConfig } = getIntentAutoConfig(nextData);
      updateData({ ...nextData, ...autoConfig });
      return;
    }

    updateField(field, value);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Load Pattern</label>
        <div className="flex flex-wrap gap-2">
          {LOAD_MODE_OPTIONS.map(option => {
            const Icon = option.icon;
            const isActive = loadType === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => handleChange('type', option.type)}
                aria-pressed={isActive}
                className={`flex min-w-30 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive ? 'border-current text-white shadow-sm' : 'border-white/5 bg-white/2 text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-zinc-100'}`}
                style={isActive ? selectedLoadButtonStyle[option.type] : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <LoadModePanel
        data={data}
        loadType={loadType}
        onChange={handleChange}
      />

      {loadType !== 'intent' && (
        <ManualStopControl
          checked={data.run_until_stopped === true}
          onChange={checked => handleChange('run_until_stopped', checked)}
        />
      )}

      <div className="h-px bg-white/10" />

      <LoadVisualization
        data={data}
        loadType={loadType}
      />
    </div>
  );
}

function ManualStopControl({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const helpId = useId();

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-100">
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          aria-describedby={helpId}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#151515] accent-amber-400"
        />
        <span>
          <span className="block font-medium">Run until manually stopped</span>
          <span
            id={helpId}
            className="mt-1 block text-xs leading-relaxed text-zinc-400"
          >
            Explicitly runs until Stop or Ctrl+C, subject to the active license duration limit. Duration and iterations
            are cleared.
          </span>
        </span>
      </label>
    </div>
  );
}

function LoadModePanel({
  data,
  loadType,
  onChange,
}: {
  data: LoadData;
  loadType: LoadType;
  onChange: (field: string, value: LoadDataValue) => void;
}) {
  if (loadType === 'constant') {
    return (
      <ConstantLoadMode
        data={data}
        onChange={onChange}
      />
    );
  }

  if (loadType === 'linear') {
    return (
      <RampLoadMode
        data={data}
        onChange={onChange}
      />
    );
  }

  if (loadType === 'ramp_up_down') {
    return (
      <RampUpDownLoadMode
        data={data}
        onChange={onChange}
      />
    );
  }

  if (loadType === 'intent') {
    return (
      <IntentLoadMode
        data={data}
        onChange={onChange}
      />
    );
  }

  return (
    <ThroughputLoadMode
      data={data}
      onChange={onChange}
    />
  );
}
