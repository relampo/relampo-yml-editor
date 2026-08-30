import { Plus, Trash2 } from 'lucide-react';
import {
  LOAD_DURATION_HELP_TEXT,
  LOAD_ITERATIONS_HELP_TEXT,
  LoadFieldGroup,
  LoadGrid,
  LoadModeProps,
  LoadSection,
} from './shared';
import type { LoadDataValue, LoadSegmentData } from '../loadUtils';

const GLOBAL_SEGMENT_FIELDS = [
  { field: 'duration', label: 'Total Duration', placeholder: '1h', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number', helpText: LOAD_ITERATIONS_HELP_TEXT },
] as const;

const DEFAULT_SEGMENT: LoadSegmentData = {
  name: 'new_segment',
  target_rps: '5',
  max_vus: '100',
};

export function SegmentsLoadMode({ data, onChange }: LoadModeProps) {
  const segments = normalizeSegments(data.segments);
  const durationSummary = getDurationSummary(data.duration, segments);

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
      return removeEmptySegmentFields(updated);
    });
    onChange('segments', next);
  };

  const updateSegmentTargetType = (index: number, targetType: string) => {
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
    onChange('segments', [...segments, { ...DEFAULT_SEGMENT }]);
  };

  const removeSegment = (index: number) => {
    const next = segments.filter((_, segmentIndex) => segmentIndex !== index);
    onChange('segments', next.length > 0 ? next : [{ ...DEFAULT_SEGMENT }]);
  };

  return (
    <LoadSection
      title="Segments Profile"
      description="Run sequential load blocks with either an RPS target or a fixed VU target."
    >
      <LoadGrid>
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
          total {durationSummary.rootLabel} · segments {durationSummary.segmentsLabel}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1.2fr_0.75fr_0.7fr_0.7fr_0.8fr_40px] border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <div className="px-3 py-2">Name</div>
          <div className="px-3 py-2">Duration</div>
          <div className="px-3 py-2">Target Type</div>
          <div className="px-3 py-2">Target</div>
          <div className="px-3 py-2">VU Range</div>
          <div />
        </div>
        {segments.map((segment, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.2fr_0.75fr_0.7fr_0.7fr_0.8fr_40px] border-b border-white/5 last:border-b-0"
          >
            <SegmentInput
              value={segment.name}
              placeholder={`segment_${index + 1}`}
              onChange={value => updateSegment(index, 'name', value)}
            />
            <SegmentInput
              value={segment.duration}
              placeholder="auto"
              onChange={value => updateSegment(index, 'duration', value)}
            />
            <SegmentTargetTypeSelect
              value={segmentTargetType(segment)}
              onChange={value => updateSegmentTargetType(index, value)}
            />
            <SegmentInput
              value={segment.target_rps ?? segment.target_vus}
              placeholder={segmentTargetType(segment) === 'vus' ? '50' : '5'}
              onChange={value => updateSegmentTargetValue(index, value)}
            />
            <div className="grid grid-cols-2 gap-1 px-2 py-2">
              <SegmentInput
                value={segment.min_vus}
                placeholder="min"
                onChange={value => updateSegment(index, 'min_vus', value)}
                disabled={segmentTargetType(segment) === 'vus'}
              />
              <SegmentInput
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
        ))}
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
}: {
  value: LoadDataValue;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      value={typeof value === 'boolean' || Array.isArray(value) ? '' : (value ?? '')}
      placeholder={placeholder}
      disabled={disabled}
      onChange={event => onChange(event.target.value.slice(0, 32))}
      className="min-h-10 w-full border-0 border-r border-white/5 bg-transparent px-3 py-2 font-mono text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:bg-white/[0.03] disabled:text-zinc-700"
    />
  );
}

function SegmentTargetTypeSelect({ value, onChange }: { value: 'rps' | 'vus'; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="min-h-10 w-full border-0 border-r border-white/5 bg-transparent px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:bg-white/[0.03]"
    >
      <option value="rps">RPS</option>
      <option value="vus">VUs</option>
    </select>
  );
}

function normalizeSegments(value: LoadDataValue): LoadSegmentData[] {
  if (!Array.isArray(value)) {
    return [{ ...DEFAULT_SEGMENT }];
  }
  const segments = value.filter(segment => segment && typeof segment === 'object') as LoadSegmentData[];
  return segments.length > 0 ? segments : [{ ...DEFAULT_SEGMENT }];
}

function removeEmptySegmentFields(segment: LoadSegmentData): LoadSegmentData {
  return Object.fromEntries(
    Object.entries(segment).filter(([, value]) => String(value ?? '').trim() !== ''),
  ) as LoadSegmentData;
}

function segmentTargetType(segment: LoadSegmentData): 'rps' | 'vus' {
  return segment.target_vus !== undefined && String(segment.target_vus).trim() !== '' ? 'vus' : 'rps';
}

function getDurationSummary(rootDuration: LoadDataValue, segments: LoadSegmentData[]) {
  const rootSeconds = parseDurationSeconds(String(rootDuration ?? '').trim());
  const segmentSeconds = segments.reduce((total, segment) => {
    return total + parseDurationSeconds(String(segment.duration ?? '').trim());
  }, 0);
  const hasSegmentDurations = segments.some(segment => parseDurationSeconds(String(segment.duration ?? '').trim()) > 0);
  const matches = !hasSegmentDurations || rootSeconds === 0 || Math.abs(rootSeconds - segmentSeconds) < 0.001;
  return {
    matches,
    rootLabel: rootSeconds > 0 ? formatDuration(rootSeconds) : 'auto',
    segmentsLabel: hasSegmentDurations ? formatDuration(segmentSeconds) : 'auto',
  };
}

function parseDurationSeconds(value: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;
  switch (match[2]) {
    case 'ms':
      return amount / 1000;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 's':
    default:
      return amount;
  }
}

function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${Math.round(seconds)}s`;
}
