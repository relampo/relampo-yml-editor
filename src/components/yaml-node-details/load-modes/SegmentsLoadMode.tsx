import { Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import {
  LOAD_ITERATIONS_HELP_TEXT,
  LoadFieldGroup,
  LoadGrid,
  LoadModeProps,
  LoadSection,
} from './shared';
import {
  getSegmentDurationSummary,
  normalizeLoadSegments,
  type LoadDataValue,
  type LoadSegmentData,
  type SegmentTargetType,
} from '../loadUtils';

const GLOBAL_SEGMENT_FIELDS = [
  { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number', helpText: LOAD_ITERATIONS_HELP_TEXT },
] as const;

const DEFAULT_SEGMENT: LoadSegmentData = {
  name: 'new_segment',
  duration: '1m',
  transition: 'constant',
  min_vus: '0',
  target_rps: '5',
  max_vus: '100',
};

export function SegmentsLoadMode({ data, onChange }: LoadModeProps) {
  const segments = normalizeSegments(data.segments);
  const durationSummary = getDurationSummary(data.duration, segments);
  const rowKeysRef = useRef<string[]>([]);
  const rowKeys = syncSegmentRowKeys(rowKeysRef.current, segments.length);

  const updateSegment = (index: number, field: keyof LoadSegmentData, value: string) => {
    const next = segments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) return segment;
      const updated: LoadSegmentData = { ...segment, [field]: value };
      if (field === 'target_rps' && value.trim() !== '') {
        delete updated.target_vus;
      }
      if (field === 'target_vus' && value.trim() !== '') {
        delete updated.target_rps;
        delete updated.min_vus;
        delete updated.max_vus;
      }
      return updated;
    });
    onChange('segments', next);
  };

  const updateSegmentTargetType = (index: number, targetType: SegmentTargetType) => {
    const next = segments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) return segment;
      const currentTarget = String(segment.target_rps ?? segment.target_vus ?? '').trim() || (targetType === 'rps' ? '5' : '50');
      const updated: LoadSegmentData = { ...segment };
      if (targetType === 'vus') {
        delete updated.target_rps;
        delete updated.min_vus;
        delete updated.max_vus;
        updated.target_vus = currentTarget;
      } else {
        delete updated.target_vus;
        updated.target_rps = currentTarget;
        updated.transition = 'constant';
        updated.min_vus = updated.min_vus ?? '0';
        if (String(updated.max_vus ?? '').trim() === '') {
          updated.max_vus = '100';
        }
      }
      return removeEmptySegmentFields(updated);
    });
    onChange('segments', next);
  };

  const updateSegmentTargetValue = (index: number, value: string) => {
    const segment = segments[index];
    updateSegment(index, segmentTargetType(segment) === 'vus' ? 'target_vus' : 'target_rps', value);
  };

  const addSegment = () => {
    rowKeysRef.current = [...rowKeys, crypto.randomUUID()];
    onChange('segments', [...segments, { ...DEFAULT_SEGMENT }]);
  };

  const removeSegment = (index: number) => {
    const next = segments.filter((_, segmentIndex) => segmentIndex !== index);
    const nextKeys = rowKeys.filter((_, segmentIndex) => segmentIndex !== index);
    rowKeysRef.current = next.length > 0 ? nextKeys : [crypto.randomUUID()];
    onChange('segments', next.length > 0 ? next : [{ ...DEFAULT_SEGMENT }]);
  };

  return (
    <LoadSection
      title="Segments Profile"
      description="Run consecutive segments with VU transitions or a constant RPS target and adaptive VUs within Min/Max."
    >
      <LoadGrid>
        <label className="text-sm text-zinc-400">
          Total Duration
          <input aria-label="Total Duration" readOnly value={durationSummary.segmentsLabel}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-zinc-200" />
        </label>
        <LoadFieldGroup
          data={data}
          fields={GLOBAL_SEGMENT_FIELDS}
          onChange={onChange}
        />
      </LoadGrid>

      <div
        className={`mt-4 rounded-md border px-3 py-2 text-xs ${
          durationSummary.matches
            ? 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-200'
            : 'border-red-400/25 bg-red-400/[0.05] text-red-200'
        }`}
      >
        <span className="font-medium">Duration check</span>
        <span className="ml-2 font-mono">
          segments total {durationSummary.segmentsLabel}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <div className="grid min-w-[800px] grid-cols-[minmax(130px,1fr)_100px_95px_95px_120px_160px_40px] border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <div className="px-3 py-2">Name</div>
          <div className="px-3 py-2">Duration</div>
          <div className="px-3 py-2">Target Type</div>
          <div className="px-3 py-2">Target</div>
          <div className="px-3 py-2">Transition</div>
          <div className="px-3 py-2">VUs Min / Max</div>
          <div />
        </div>
        {segments.map((segment, index) => {
          const rowKey = rowKeys[index];
          return (
          <div
            key={rowKey}
            className="grid min-w-[800px] grid-cols-[minmax(130px,1fr)_100px_95px_95px_120px_160px_40px] border-b border-white/5 last:border-b-0"
          >
            <SegmentInput
              ariaLabel={`Name for segment ${index + 1}`}
              required
              value={segment.name}
              placeholder={`segment_${index + 1}`}
              onChange={value => updateSegment(index, 'name', value)}
            />
            <SegmentInput
              ariaLabel={`Duration for segment ${index + 1}`}
              required
              value={segment.duration}
              placeholder="1m"
              onChange={value => updateSegment(index, 'duration', value)}
            />
            <SegmentTargetTypeSelect
              value={segmentTargetType(segment)}
              ariaLabel={`Target type for segment ${index + 1}`}
              onChange={value => updateSegmentTargetType(index, value)}
            />
            <SegmentInput
              ariaLabel={`Target for segment ${index + 1}`}
              required
              value={segment.target_rps ?? segment.target_vus}
              placeholder={segmentTargetType(segment) === 'vus' ? '50' : '5'}
              onChange={value => updateSegmentTargetValue(index, value)}
            />
            <select
              aria-label={`Transition for segment ${index + 1}`}
              required
              value={segment.transition ?? ''}
              onChange={event => updateSegment(index, 'transition', event.target.value)}
              className="min-h-10 w-full border-0 border-r border-white/5 bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none"
            >
              <option value="" disabled>Select transition</option>
              <option value="constant">Constant</option>
              {segmentTargetType(segment) === 'vus' && <option value="ramp_up">Ramp up</option>}
              {segmentTargetType(segment) === 'vus' && index > 0 && <option value="ramp_down">Ramp down</option>}
              {segmentTargetType(segment) === 'vus' && index === 0 && segment.transition === 'ramp_down' && (
                <option value="ramp_down" disabled>Ramp down (invalid for first segment)</option>
              )}
            </select>
            <div className="grid grid-cols-2 gap-1 px-2 py-2">
              <SegmentInput
                ariaLabel={`VUs Min for segment ${index + 1}`}
                required={segmentTargetType(segment) === 'rps'}
                value={segment.min_vus}
                placeholder="min"
                onChange={value => updateSegment(index, 'min_vus', value)}
                disabled={segmentTargetType(segment) === 'vus'}
              />
              <SegmentInput
                ariaLabel={`VUs Max for segment ${index + 1}`}
                required={segmentTargetType(segment) === 'rps'}
                value={segment.max_vus}
                placeholder="max"
                onChange={value => updateSegment(index, 'max_vus', value)}
                disabled={segmentTargetType(segment) === 'vus'}
              />
            </div>
            <button
              type="button"
              onClick={() => removeSegment(index)}
              className="flex items-center justify-center text-zinc-500 transition-colors hover:text-red-300"
              aria-label={`Remove segment ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addSegment}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-300/30 hover:text-amber-200"
      >
        <Plus className="h-4 w-4" />
        Add Segment
      </button>
    </LoadSection>
  );
}

function SegmentInput({
  value,
  placeholder,
  onChange,
  disabled = false,
  ariaLabel,
  required = false,
}: {
  value: string | number | undefined;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  required?: boolean;
}) {
  return (
    <input
      aria-label={ariaLabel}
      required={required}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={event => onChange(event.target.value.slice(0, 32))}
      className="min-h-10 w-full border-0 border-r border-white/5 bg-transparent px-3 py-2 font-mono text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:bg-white/[0.03] disabled:text-zinc-700"
    />
  );
}

function SegmentTargetTypeSelect({
  value,
  ariaLabel,
  onChange,
}: {
  value: SegmentTargetType;
  ariaLabel: string;
  onChange: (value: SegmentTargetType) => void;
}) {
  return (
    <select
      value={value}
      required
      aria-label={ariaLabel}
      onChange={event => onChange(event.target.value === 'vus' ? 'vus' : 'rps')}
      className="min-h-10 w-full border-0 border-r border-white/5 bg-transparent px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:bg-white/[0.03]"
    >
      <option value="rps">RPS</option>
      <option value="vus">VUs</option>
    </select>
  );
}

function normalizeSegments(value: LoadDataValue): LoadSegmentData[] {
  return normalizeLoadSegments(value, [DEFAULT_SEGMENT]);
}

function syncSegmentRowKeys(keys: string[], count: number): string[] {
  while (keys.length < count) {
    keys.push(crypto.randomUUID());
  }
  if (keys.length > count) {
    keys.length = count;
  }
  return keys;
}

function removeEmptySegmentFields(segment: LoadSegmentData): LoadSegmentData {
  return Object.fromEntries(
    Object.entries(segment).filter(([, value]) => String(value ?? '').trim() !== ''),
  ) as LoadSegmentData;
}

function segmentTargetType(segment: LoadSegmentData): SegmentTargetType {
  return Object.hasOwn(segment, 'target_vus') ? 'vus' : 'rps';
}

function getDurationSummary(rootDuration: LoadDataValue, segments: LoadSegmentData[]) {
  const summary = getSegmentDurationSummary(rootDuration, segments);
  return {
    matches: summary.matches,
    segmentsLabel: summary.allSegmentDurationsValid ? formatDuration(summary.segmentSeconds) : 'incomplete',
  };
}

function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${Math.round(seconds)}s`;
}
