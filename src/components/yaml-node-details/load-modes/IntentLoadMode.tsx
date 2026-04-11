import { limitedInputValue } from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSection, LoadSelectField } from './shared';

export function IntentLoadMode({ data, onChange }: LoadModeProps) {
  const intentTargetUnit = String(data.target_unit || 'rps').toLowerCase();
  const intentTargetPerMinute = (parseFloat(String(data.target_value || '0')) || 0) * 60;

  return (
    <div className="space-y-4">
      <LoadSection description="Intent mode maps directly to the backend controller contract. Define the target, controller timing, execution guardrails, and at least one SLO bound.">
        <div className="rounded-lg border border-rose-400/20 bg-rose-500/[0.08] px-3 py-2 text-xs leading-relaxed text-zinc-300">
          `window` is required by the backend validator, and `iterations` is intentionally not part of this mode.
        </div>
      </LoadSection>

      <LoadSection
        title="Intent Contract"
        description="These fields define what the controller should chase and how quickly it should react."
      >
        <LoadGrid>
          <LoadSelectField
            label="Target Unit"
            value={data.target_unit || 'rps'}
            onChange={value => onChange('target_unit', value)}
            options={[
              { label: 'RPS', value: 'rps' },
              { label: 'VUs', value: 'vus' },
            ]}
          />
          <LoadField
            label="Target Value"
            value={data.target_value || ''}
            placeholder="25"
            onChange={value => onChange('target_value', limitedInputValue(value))}
            type="number"
            helpText={intentTargetUnit === 'rps' ? `${intentTargetPerMinute.toFixed(0)} req/min` : 'Target VU count'}
          />
          <LoadField
            label="Duration"
            value={data.duration || ''}
            placeholder="10m"
            onChange={value => onChange('duration', limitedInputValue(value))}
            helpText="Format: 500ms, 5s, 5m"
          />
          <LoadField
            label="Warmup"
            value={data.warmup || ''}
            placeholder="30s"
            onChange={value => onChange('warmup', limitedInputValue(value))}
            helpText="Format: 500ms, 5s, 5m"
          />
          <LoadField
            label="Window"
            value={data.window || ''}
            placeholder="2s"
            onChange={value => onChange('window', limitedInputValue(value))}
            helpText="Sampling window for control ticks"
          />
          <LoadField
            label="Ramp Up"
            value={data.ramp_up || ''}
            placeholder="30s"
            onChange={value => onChange('ramp_up', limitedInputValue(value))}
            helpText="Format: 500ms, 5s, 5m"
          />
          <LoadField
            label="Ramp Down"
            value={data.ramp_down || ''}
            placeholder="30s"
            onChange={value => onChange('ramp_down', limitedInputValue(value))}
            helpText="Format: 500ms, 5s, 5m"
          />
          <LoadSelectField
            label="Aggressiveness"
            value={data.aggressiveness || 'medium'}
            onChange={value => onChange('aggressiveness', value)}
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ]}
          />
        </LoadGrid>
      </LoadSection>

      <LoadSection
        title="Execution Guardrails"
        description="Bound the controller so it knows the minimum and maximum concurrency it can use."
      >
        <LoadGrid>
          <LoadField
            label="Min VUs"
            value={data.min_vus || ''}
            placeholder="1"
            onChange={value => onChange('min_vus', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="Max VUs"
            value={data.max_vus || ''}
            placeholder="80"
            onChange={value => onChange('max_vus', limitedInputValue(value))}
            type="number"
          />
        </LoadGrid>
      </LoadSection>

      <LoadSection
        title="SLO Bounds"
        description="The backend requires at least one bound here. Add more bounds when you need tighter control."
      >
        <LoadGrid>
          <LoadField
            label="P50 Max (ms)"
            value={data.p50_max_ms || ''}
            placeholder="400"
            onChange={value => onChange('p50_max_ms', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="P75 Max (ms)"
            value={data.p75_max_ms || ''}
            placeholder="600"
            onChange={value => onChange('p75_max_ms', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="P95 Max (ms)"
            value={data.p95_max_ms || ''}
            placeholder="800"
            onChange={value => onChange('p95_max_ms', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="P99 Max (ms)"
            value={data.p99_max_ms || ''}
            placeholder="1200"
            onChange={value => onChange('p99_max_ms', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="P999 Max (ms)"
            value={data.p999_max_ms || ''}
            placeholder="1500"
            onChange={value => onChange('p999_max_ms', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="Error Max (%)"
            value={data.error_rate_max_pct || ''}
            placeholder="1"
            onChange={value => onChange('error_rate_max_pct', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="4xx Max (%)"
            value={data.error_4xx_max_pct || ''}
            placeholder="2"
            onChange={value => onChange('error_4xx_max_pct', limitedInputValue(value))}
            type="number"
          />
          <LoadField
            label="5xx Max (%)"
            value={data.error_5xx_max_pct || ''}
            placeholder="1"
            onChange={value => onChange('error_5xx_max_pct', limitedInputValue(value))}
            type="number"
          />
        </LoadGrid>
      </LoadSection>
    </div>
  );
}
