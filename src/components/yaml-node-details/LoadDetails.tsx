import { useLanguage } from '../../contexts/LanguageContext';
import { Crosshair, Gauge, ListTree, Mountain, TrendingUp, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { LoadVisualization } from './LoadVisualization';
import {
  buildLoadDataForType,
  getIntentAutoConfig,
  getLoadTypeLabel,
  normalizeLoadType,
  toLoadData,
  deriveSegmentDuration,
  type LoadData,
  type LoadDataValue,
  type LoadType,
} from './loadUtils';
import { ConstantLoadMode } from './load-modes/ConstantLoadMode';
import { IntentLoadMode } from './load-modes/IntentLoadMode';
import { RampLoadMode } from './load-modes/RampLoadMode';
import { RampUpDownLoadMode } from './load-modes/RampUpDownLoadMode';
import { SegmentsLoadMode } from './load-modes/SegmentsLoadMode';
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
  { type: 'intent', label: 'Intent', icon: Crosshair },
  { type: 'segments', label: 'Segments', icon: ListTree },
];

export function LoadDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const activeData = toLoadData(data as Record<string, unknown>);
  const activeType = normalizeLoadType(activeData.type);
  const hasSelection = data.__loadSelected !== false;
  const [preview, setPreview] = useState({ nodeId: node.id, type: activeType });
  const loadType = preview.nodeId === node.id ? preview.type : activeType;
  const profiles = data.__loadProfiles && typeof data.__loadProfiles === 'object'
    ? data.__loadProfiles as Record<string, LoadData> : {};
  const saved = profiles[loadType] ?? (loadType === 'segments' ? data.__segmentsProfile : undefined);
  const loadData = hasSelection && loadType === activeType ? activeData
    : saved && typeof saved === 'object' ? toLoadData(saved)
    : buildLoadDataForType(loadType, activeData);

  const saveProfile = (nextData: LoadData) => {
    if (hasSelection && loadType === activeType) {
      updateData({ ...nextData, __loadProfiles: profiles });
    } else {
      updateData({ ...data, __loadProfiles: { ...profiles, [loadType]: nextData } });
    }
  };

  const selectProfile = (selectedType: LoadType, checked: boolean) => {
    const nextProfiles = { ...profiles };
    if (hasSelection) nextProfiles[activeType] = activeData;
    const nextData = nextProfiles[selectedType] ?? buildLoadDataForType(selectedType, activeData);
    if (checked) delete nextProfiles[selectedType];
    setPreview({ nodeId: node.id, type: selectedType });
    updateData({
      ...(checked ? nextData : { type: 'constant', users: 1, iterations: 1 }),
      __loadProfiles: nextProfiles,
      __loadSelected: checked,
      __name: checked ? `Load: ${getLoadTypeLabel(selectedType)}` : 'Load',
    });
  };

  const handleChange = (field: string, value: LoadDataValue) => {
    if (field === 'run_until_stopped') {
      const nextData = { ...loadData };
      if (value === true) {
        nextData.run_until_stopped = true;
        nextData.duration = '';
        nextData.iterations = '';
      } else {
        delete nextData.run_until_stopped;
      }
      saveProfile(nextData);
      return;
    }
    if (loadType === 'intent' && ['target', 'target_unit', 'target_value', 'aggressiveness'].includes(field)) {
      const nextData = { ...loadData, [field]: value };
      const { average_ms: _averageMs, ...autoConfig } = getIntentAutoConfig(nextData);
      saveProfile({ ...nextData, ...autoConfig });
      return;
    }
    if (loadType === 'segments' && field === 'segments' && Array.isArray(value)) {
      saveProfile({ ...loadData, segments: value, duration: deriveSegmentDuration(value) });
      return;
    }
    saveProfile({ ...loadData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t('studioControls.loadPattern')}</span>
          <span className="text-sm text-zinc-400">{t('studioControls.loadSelectionHelp')}</span>
        </legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {LOAD_MODE_OPTIONS.map(option => {
            const Icon = option.icon;
            const isSelected = hasSelection && activeType === option.type;
            return (
              <div key={option.type} className={`relative flex rounded-xl border bg-white/[0.02] ${isSelected ? 'border-yellow-400 bg-yellow-400/[0.04] ring-1 ring-yellow-400' : 'border-white/10'}`}>
                <input
                  type="checkbox"
                  aria-label={`${t('studioControls.selectLoadModel')}: ${t(`studioControls.${option.type}`)}`}
                  checked={isSelected}
                  onChange={event => selectProfile(option.type, event.target.checked)}
                  className="absolute left-3 top-3 z-10 h-5 w-5 cursor-pointer appearance-none rounded-full border border-zinc-500 bg-[#111] checked:border-yellow-400 checked:bg-yellow-400 checked:shadow-[inset_0_0_0_5px_#111] forced-colors:appearance-auto focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400"
                />
                <button
                  type="button"
                  aria-pressed={loadType === option.type}
                  onClick={() => setPreview({ nodeId: node.id, type: option.type })}
                  className="flex w-full flex-col items-center gap-3 rounded-xl px-3 pb-4 pt-5 text-center text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400"
                  aria-label={t(`studioControls.${option.type}`)}
                >
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-yellow-400' : 'text-zinc-200'}`} aria-hidden="true" />
                  <span className="font-semibold text-zinc-100">{t(`studioControls.${option.type}`)}</span>
                  <span className="text-xs leading-relaxed text-zinc-400">{t(`studioControls.loadDescriptions.${option.type}`)}</span>
                </button>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p aria-live="polite" className="text-sm text-amber-300">
        {hasSelection ? `${t('studioControls.selectedLoadModel')}: ${t(`yamlEditor.nodeDetails.load.type_${activeType}`)}` : t('studioControls.noLoadSelection')}
      </p>

      <LoadModePanel
        data={loadData}
        loadType={loadType}
        onChange={handleChange}
      />

      {loadType !== 'intent' && loadType !== 'segments' && (
        <ManualStopControl
          checked={loadData.run_until_stopped === true}
          onChange={checked => handleChange('run_until_stopped', checked)}
        />
      )}

      <div className="h-px bg-white/10" />

      <LoadVisualization
        data={loadData}
        loadType={loadType}
      />
    </div>
  );
}

function ManualStopControl({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { t } = useLanguage();
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
          <span className="block font-medium">{t('studioControls.manualStop')}</span>
          <span
            id={helpId}
            className="mt-1 block text-xs leading-relaxed text-zinc-400"
          >
            {t('studioControls.manualStopHelp')}
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

  if (loadType === 'segments') {
    return (
      <SegmentsLoadMode
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
