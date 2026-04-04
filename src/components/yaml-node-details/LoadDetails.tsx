import { Gauge, Mountain, TrendingUp, Users } from 'lucide-react';
import { Input } from '../ui/input';
import { LoadVisualization } from './LoadVisualization';
import {
  limitedInputValue,
  loadTypeAllowedKeys,
  loadTypeDefaults,
  normalizeLoadType,
  selectedLoadButtonStyle,
  type LoadType,
} from './loadUtils';
import type { NodeDetailProps } from './types';

export function LoadDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const loadType = normalizeLoadType(data.type);
  const compactInputClass = 'w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono';
  const intentTargetUnit = String(data.target_unit || 'rps').toLowerCase();
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;
  const intentTargetPerMinute = (parseFloat(String(data.target_value || '0')) || 0) * 60;

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) {
      return;
    }
    if (field === 'type') {
      const selectedType = normalizeLoadType(value);
      const defaults = loadTypeDefaults[selectedType] || {};
      const allowed = new Set(loadTypeAllowedKeys[selectedType] || ['type']);
      const normalized: Record<string, any> = { type: selectedType };

      for (const key of allowed) {
        if (key === 'type') {
          continue;
        }
        if (data[key] !== undefined && data[key] !== '') {
          normalized[key] = data[key];
        }
      }

      for (const [key, defaultValue] of Object.entries(defaults)) {
        if (!allowed.has(key)) {
          continue;
        }
        if (normalized[key] === undefined || normalized[key] === '') {
          normalized[key] = defaultValue;
        }
      }

      onNodeUpdate(node.id, normalized);
      return;
    }

    onNodeUpdate(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Load Pattern
        </label>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => handleChange('type', 'constant')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'constant' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`}
            style={loadType === 'constant' ? selectedLoadButtonStyle.constant : undefined}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Constant</span>
          </button>
          <button
            onClick={() => handleChange('type', 'ramp')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'ramp' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`}
            style={loadType === 'ramp' ? selectedLoadButtonStyle.ramp : undefined}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Lineal</span>
          </button>
          <button
            onClick={() => handleChange('type', 'ramp_up_down')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'ramp_up_down' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`}
            style={loadType === 'ramp_up_down' ? selectedLoadButtonStyle.ramp_up_down : undefined}
          >
            <Mountain className="h-3.5 w-3.5" />
            <span>Ramp Up/Down</span>
          </button>
          <button
            onClick={() => handleChange('type', 'throughput')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1.5 ${loadType === 'throughput' ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`}
            style={loadType === 'throughput' ? selectedLoadButtonStyle.throughput : undefined}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>Throughput</span>
          </button>
        </div>
      </div>

      <LoadFields
        data={data}
        loadType={loadType}
        compactInputClass={compactInputClass}
        intentTargetUnit={intentTargetUnit}
        throughputPerMinute={throughputPerMinute}
        intentTargetPerMinute={intentTargetPerMinute}
        onChange={handleChange}
      />

      <div className="h-px bg-white/10" />

      <LoadVisualization data={data} loadType={loadType} />
    </div>
  );
}

function LoadFields({
  data,
  loadType,
  compactInputClass,
  intentTargetUnit,
  throughputPerMinute,
  intentTargetPerMinute,
  onChange,
}: {
  data: Record<string, any>;
  loadType: LoadType;
  compactInputClass: string;
  intentTargetUnit: string;
  throughputPerMinute: number;
  intentTargetPerMinute: number;
  onChange: (field: string, value: any) => void;
}) {
  if (loadType === 'constant') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Virtual Users" value={data.users || ''} placeholder="10" className={compactInputClass} onChange={(value) => onChange('users', limitedInputValue(value))} type="number" />
          <LabeledInput label="Duration" value={data.duration || ''} placeholder="5m" className={compactInputClass} onChange={(value) => onChange('duration', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="Iterations" value={data.iterations || ''} placeholder="0" className={compactInputClass} onChange={(value) => onChange('iterations', limitedInputValue(value))} type="number" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Ramp Up" value={data.ramp_up || ''} placeholder="0s" className={compactInputClass} onChange={(value) => onChange('ramp_up', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <div />
        </div>
      </div>
    );
  }

  if (loadType === 'ramp') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Start Users" value={data.start_users || ''} placeholder="1" className={compactInputClass} onChange={(value) => onChange('start_users', limitedInputValue(value))} type="number" />
          <LabeledInput label="End Users" value={data.end_users || ''} placeholder="100" className={compactInputClass} onChange={(value) => onChange('end_users', limitedInputValue(value))} type="number" />
          <LabeledInput label="Duration" value={data.duration || ''} placeholder="10m" className={compactInputClass} onChange={(value) => onChange('duration', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Iterations" value={data.iterations || ''} placeholder="0" className={compactInputClass} onChange={(value) => onChange('iterations', limitedInputValue(value))} type="number" />
          <div />
          <div />
        </div>
      </div>
    );
  }

  if (loadType === 'ramp_up_down') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Virtual Users" value={data.users || ''} placeholder="50" className={compactInputClass} onChange={(value) => onChange('users', limitedInputValue(value))} type="number" />
          <LabeledInput label="Duration" value={data.duration || ''} placeholder="10m" className={compactInputClass} onChange={(value) => onChange('duration', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="Iterations" value={data.iterations || ''} placeholder="0" className={compactInputClass} onChange={(value) => onChange('iterations', limitedInputValue(value))} type="number" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <LabeledInput label="Ramp Up" value={data.ramp_up || ''} placeholder="1m" className={compactInputClass} onChange={(value) => onChange('ramp_up', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="Ramp Down" value={data.ramp_down || ''} placeholder="1m" className={compactInputClass} onChange={(value) => onChange('ramp_down', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <div />
        </div>
      </div>
    );
  }

  if (loadType === 'intent') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Target Unit</label>
            <select value={data.target_unit || 'rps'} onChange={(event) => onChange('target_unit', event.target.value)} className="w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono">
              <option value="rps">RPS</option>
              <option value="vus">VU</option>
            </select>
          </div>
          <LabeledInput label="Target Value" value={data.target_value || ''} placeholder="3" className={compactInputClass} onChange={(value) => onChange('target_value', limitedInputValue(value))} type="number" helpText={intentTargetUnit === 'rps' ? `${intentTargetPerMinute.toFixed(0)} req/min` : undefined} />
          <LabeledInput label="Duration" value={data.duration || ''} placeholder="10m" className={compactInputClass} onChange={(value) => onChange('duration', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="Warmup" value={data.warmup || ''} placeholder="30s" className={compactInputClass} onChange={(value) => onChange('warmup', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          <LabeledInput label="Ramp Up" value={data.ramp_up || ''} placeholder="30s" className={compactInputClass} onChange={(value) => onChange('ramp_up', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="Ramp Down" value={data.ramp_down || ''} placeholder="30s" className={compactInputClass} onChange={(value) => onChange('ramp_down', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
          <LabeledInput label="P95 Max (ms)" value={data.p95_max_ms || ''} placeholder="800" className={compactInputClass} onChange={(value) => onChange('p95_max_ms', limitedInputValue(value))} type="number" />
          <LabeledInput label="Error Max (%)" value={data.error_rate_max_pct || ''} placeholder="1" className={compactInputClass} onChange={(value) => onChange('error_rate_max_pct', limitedInputValue(value))} type="number" />
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Aggressiveness</label>
            <select value={data.aggressiveness || 'medium'} onChange={(event) => onChange('aggressiveness', event.target.value)} className="w-[10ch] max-w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <LabeledInput label="Min VUs" value={data.min_vus || ''} placeholder="1" className={compactInputClass} onChange={(value) => onChange('min_vus', limitedInputValue(value))} type="number" />
          <LabeledInput label="Max VUs" value={data.max_vus || ''} placeholder="80" className={compactInputClass} onChange={(value) => onChange('max_vus', limitedInputValue(value))} type="number" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <LabeledInput label="Target RPS" value={data.target_rps || ''} placeholder="20" className={compactInputClass} onChange={(value) => onChange('target_rps', limitedInputValue(value))} type="number" helpText={`${throughputPerMinute.toFixed(0)} req/min`} />
        <LabeledInput label="Duration" value={data.duration || ''} placeholder="10m" className={compactInputClass} onChange={(value) => onChange('duration', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
        <LabeledInput label="Iterations" value={data.iterations || ''} placeholder="0" className={compactInputClass} onChange={(value) => onChange('iterations', limitedInputValue(value))} type="number" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <LabeledInput label="Ramp Up" value={data.ramp_up || ''} placeholder="1m" className={compactInputClass} onChange={(value) => onChange('ramp_up', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
        <LabeledInput label="Ramp Down" value={data.ramp_down || ''} placeholder="1m" className={compactInputClass} onChange={(value) => onChange('ramp_down', limitedInputValue(value))} helpText="Format: 500ms, 5s, 5m" />
        <div />
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  className,
  onChange,
  helpText,
  type = 'text',
}: {
  label: string;
  value: string;
  placeholder: string;
  className: string;
  onChange: (value: string) => void;
  helpText?: string;
  type?: 'text' | 'number';
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input
        type={type}
        maxLength={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
      {helpText && <div className="mt-1 text-xs text-zinc-500">{helpText}</div>}
    </div>
  );
}
