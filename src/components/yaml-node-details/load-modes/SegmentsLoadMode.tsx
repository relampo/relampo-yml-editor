import { useLanguage } from '../../../contexts/LanguageContext';
import { nativeSelectClassName } from '../../ui/select';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import {
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

const DEFAULT_SEGMENT: LoadSegmentData = {
  name: 'new_segment',
  duration: '1m',
  transition: 'constant',
  min_vus: '0',
  target_rps: '5',
  max_vus: '100',
};

const SEGMENT_DRAG_TYPE = 'application/x-relampo-load-segment';

export function SegmentsLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const globalSegmentFields = [
    {
      field: 'iterations',
      label: t('studioControls.iterations'),
      placeholder: '0',
      type: 'number',
      helpText: t('studioControls.iterationsHelp'),
    },
  ] as const;
  const segments = normalizeSegments(data.segments);
  const durationSummary = getDurationSummary(data.duration, segments);
  const segmentsLabel = durationSummary.segmentsLabel ?? t('yamlEditor.nodeDetails.load.incomplete');
  const rowKeysRef = useRef<string[]>([]);
  const rowKeys = syncSegmentRowKeys(rowKeysRef.current, segments.length);
  const draggedKeyRef = useRef<string | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  // Do not let a reorder silently discard malformed imported entries filtered by the form.
  const canReorder = Array.isArray(data.segments) && data.segments.length === segments.length;

  const clearDrag = () => {
    draggedKeyRef.current = null;
    setDraggedKey(null);
    setDropKey(null);
  };

  const moveSegment = (key: string, to: number) => {
    const from = rowKeys.indexOf(key);
    if (!canReorder || from < 0 || to < 0 || to >= segments.length || from === to) return;
    const next = [...segments];
    const nextKeys = [...rowKeys];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    nextKeys.splice(to, 0, nextKeys.splice(from, 1)[0]);
    rowKeysRef.current = nextKeys;
    // Publish the entire ordered list so existing semantic validation and preview
    // recompute every predecessor relationship. Values are never corrected here.
    onChange('segments', next);
    setMoveAnnouncement(
      t('yamlEditor.nodeDetails.load.segmentMoved').replace('{name}', moved.name || t('yamlEditor.nodeDetails.load.segment')).replace('{position}', String(to + 1)),
    );
  };

  const startDrag = (event: DragEvent<HTMLButtonElement>, key: string) => {
    event.stopPropagation();
    draggedKeyRef.current = key;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(SEGMENT_DRAG_TYPE, key);
    setDraggedKey(key);
  };

  const dropSegment = (event: DragEvent<HTMLDivElement>, key: string) => {
    if (!draggedKeyRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceKey = draggedKeyRef.current;
    if (event.dataTransfer.getData(SEGMENT_DRAG_TYPE) === sourceKey) {
      moveSegment(sourceKey, rowKeys.indexOf(key));
    }
    clearDrag();
  };

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
    clearDrag();
    rowKeysRef.current = [...rowKeys, crypto.randomUUID()];
    onChange('segments', [...segments, { ...DEFAULT_SEGMENT }]);
  };

  const removeSegment = (index: number) => {
    clearDrag();
    const next = segments.filter((_, segmentIndex) => segmentIndex !== index);
    const nextKeys = rowKeys.filter((_, segmentIndex) => segmentIndex !== index);
    rowKeysRef.current = next.length > 0 ? nextKeys : [crypto.randomUUID()];
    onChange('segments', next.length > 0 ? next : [{ ...DEFAULT_SEGMENT }]);
  };

  return (
    <LoadSection
      title={t('yamlEditor.nodeDetails.load.segmentsProfile')}
      description={t('yamlEditor.nodeDetails.load.segmentsDescription')}
    >
      <LoadGrid>
        <label className="text-sm text-zinc-400">
          {t('yamlEditor.nodeDetails.load.totalDuration')}
          <input aria-label={t('yamlEditor.nodeDetails.load.totalDuration')} readOnly value={segmentsLabel}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-zinc-200" />
        </label>
        <LoadFieldGroup
          data={data}
          fields={globalSegmentFields}
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
        <span className="font-medium">{t('yamlEditor.nodeDetails.load.durationCheck')}</span>
        <span className="ml-2 font-mono">
          {t('yamlEditor.nodeDetails.load.segmentsTotal').replace('{value}', segmentsLabel)}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <div className="grid min-w-[872px] grid-cols-[72px_minmax(130px,1fr)_100px_95px_95px_120px_160px_40px] border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <div className="px-2 py-2">{t('yamlEditor.nodeDetails.load.order')}</div>
          <div className="px-3 py-2">{t('yamlEditor.common.name')}</div>
          <div className="px-3 py-2">{t('studioControls.duration')}</div>
          <div className="px-3 py-2">{t('yamlEditor.nodeDetails.load.targetType')}</div>
          <div className="px-3 py-2">{t('yamlEditor.nodeDetails.load.target')}</div>
          <div className="px-3 py-2">{t('yamlEditor.nodeDetails.load.transition')}</div>
          <div className="px-3 py-2">{t('yamlEditor.nodeDetails.load.vusMinMax')}</div>
          <div />
        </div>
        {segments.map((segment, index) => {
          const rowKey = rowKeys[index];
          return (
          <div
            key={rowKey}
            data-segment-row={rowKey}
            onDragOver={event => {
              if (!draggedKeyRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = 'move';
              setDropKey(rowKey);
            }}
            onDrop={event => dropSegment(event, rowKey)}
            className={`grid min-w-[872px] grid-cols-[72px_minmax(130px,1fr)_100px_95px_95px_120px_160px_40px] border-b border-white/5 last:border-b-0 ${draggedKey === rowKey ? 'opacity-50' : ''} ${dropKey === rowKey && draggedKey !== rowKey ? 'bg-amber-300/10 ring-1 ring-inset ring-amber-300/40' : ''}`}
          >
            <div className="flex items-center justify-center gap-1 border-r border-white/5 px-1">
              <button
                type="button"
                draggable={canReorder && segments.length > 1}
                disabled={!canReorder || segments.length < 2}
                aria-label={t('yamlEditor.nodeDetails.load.dragSegment').replace('{n}', String(index + 1))}
                title={t('yamlEditor.nodeDetails.load.dragTitle')}
                onDragStart={event => startDrag(event, rowKey)}
                onDragEnd={clearDrag}
                className="flex h-10 w-6 cursor-grab items-center justify-center rounded text-zinc-400 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-30"
              >
                <GripVertical size={16} aria-hidden="true" />
              </button>
              <div className="flex flex-col">
                <button type="button" aria-label={t('yamlEditor.nodeDetails.load.moveUp').replace('{n}', String(index + 1))} disabled={!canReorder || index === 0}
                  onClick={() => { clearDrag(); moveSegment(rowKey, index - 1); }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-30">
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button type="button" aria-label={t('yamlEditor.nodeDetails.load.moveDown').replace('{n}', String(index + 1))} disabled={!canReorder || index === segments.length - 1}
                  onClick={() => { clearDrag(); moveSegment(rowKey, index + 1); }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-30">
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
            <SegmentInput
              ariaLabel={t('yamlEditor.nodeDetails.load.nameFor').replace('{n}', String(index + 1))}
              required
              value={segment.name}
              placeholder={`segment_${index + 1}`}
              onChange={value => updateSegment(index, 'name', value)}
            />
            <SegmentInput
              ariaLabel={t('yamlEditor.nodeDetails.load.durationFor').replace('{n}', String(index + 1))}
              required
              value={segment.duration}
              placeholder="1m"
              onChange={value => updateSegment(index, 'duration', value)}
            />
            <SegmentTargetTypeSelect
              value={segmentTargetType(segment)}
              ariaLabel={t('yamlEditor.nodeDetails.load.targetTypeFor').replace('{n}', String(index + 1))}
              onChange={value => updateSegmentTargetType(index, value)}
            />
            <SegmentInput
              ariaLabel={t('yamlEditor.nodeDetails.load.targetFor').replace('{n}', String(index + 1))}
              required
              value={segment.target_rps ?? segment.target_vus}
              placeholder={segmentTargetType(segment) === 'vus' ? '50' : '5'}
              onChange={value => updateSegmentTargetValue(index, value)}
            />
            <select
              aria-label={t('yamlEditor.nodeDetails.load.transitionFor').replace('{n}', String(index + 1))}
              required
              value={segment.transition ?? ''}
              onChange={event => updateSegment(index, 'transition', event.target.value)}
              className={nativeSelectClassName}
            >
              <option value="" disabled>{t('yamlEditor.nodeDetails.load.selectTransition')}</option>
              <option value="constant">{t('studioControls.constant')}</option>
              {segmentTargetType(segment) === 'vus' && <option value="ramp_up">{t('yamlEditor.nodeDetails.load.rampUpOption')}</option>}
              {segmentTargetType(segment) === 'vus' && index > 0 && <option value="ramp_down">{t('yamlEditor.nodeDetails.load.rampDownOption')}</option>}
              {segmentTargetType(segment) === 'vus' && index === 0 && segment.transition === 'ramp_down' && (
                <option value="ramp_down" disabled>{t('yamlEditor.nodeDetails.load.rampDownInvalid')}</option>
              )}
            </select>
            <div className="grid grid-cols-2 gap-1 px-2 py-2">
              <SegmentInput
                ariaLabel={t('yamlEditor.nodeDetails.load.vusMinFor').replace('{n}', String(index + 1))}
                required={segmentTargetType(segment) === 'rps'}
                value={segment.min_vus}
                placeholder={t('yamlEditor.nodeDetails.load.phMin')}
                onChange={value => updateSegment(index, 'min_vus', value)}
                disabled={segmentTargetType(segment) === 'vus'}
              />
              <SegmentInput
                ariaLabel={t('yamlEditor.nodeDetails.load.vusMaxFor').replace('{n}', String(index + 1))}
                required={segmentTargetType(segment) === 'rps'}
                value={segment.max_vus}
                placeholder={t('yamlEditor.nodeDetails.load.phMax')}
                onChange={value => updateSegment(index, 'max_vus', value)}
                disabled={segmentTargetType(segment) === 'vus'}
              />
            </div>
            <button
              type="button"
              onClick={() => removeSegment(index)}
              className="flex items-center justify-center text-zinc-500 transition-colors hover:text-red-300"
              aria-label={t('yamlEditor.nodeDetails.load.removeSegment').replace('{n}', String(index + 1))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-zinc-500">{t('yamlEditor.nodeDetails.load.dragHint')}</p>
      <span role="status" aria-live="polite" className="sr-only">{moveAnnouncement}</span>

      <button
        type="button"
        onClick={addSegment}
        className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-300/30 hover:text-amber-200"
      >
        <Plus className="h-4 w-4" />
        {t('yamlEditor.nodeDetails.load.addSegment')}
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
      className={nativeSelectClassName}
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
    segmentsLabel: summary.allSegmentDurationsValid ? formatDuration(summary.segmentSeconds) : null,
  };
}

function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 1) return `${Number((seconds * 1000).toFixed(6))}ms`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${Number(seconds.toFixed(9))}s`;
}
