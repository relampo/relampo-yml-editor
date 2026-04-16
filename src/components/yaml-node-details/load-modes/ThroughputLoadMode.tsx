import { limitedInputValue } from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function ThroughputLoadMode({ data, onChange }: LoadModeProps) {
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;

  return (
    <LoadSection
      title="Throughput Profile"
      description="Drive traffic toward a target request rate while shaping the ramp-up and ramp-down windows."
    >
      <LoadGrid>
        <LoadField
          label="Target RPS"
          value={data.target_rps || ''}
          placeholder="20"
          onChange={value => onChange('target_rps', limitedInputValue(value))}
          type="number"
          helpText={`${throughputPerMinute.toFixed(0)} req/min`}
        />
        <LoadField
          label="Duration"
          value={data.duration || ''}
          placeholder="10m"
          onChange={value => onChange('duration', limitedInputValue(value))}
          helpText="Format: 500ms, 5s, 5m"
        />
        <LoadField
          label="Iterations"
          value={data.iterations || ''}
          placeholder="0"
          onChange={value => onChange('iterations', limitedInputValue(value))}
          type="number"
        />
        <LoadField
          label="Ramp Up"
          value={data.ramp_up || ''}
          placeholder="1m"
          onChange={value => onChange('ramp_up', limitedInputValue(value))}
          helpText="Format: 500ms, 5s, 5m"
        />
        <LoadField
          label="Ramp Down"
          value={data.ramp_down || ''}
          placeholder="1m"
          onChange={value => onChange('ramp_down', limitedInputValue(value))}
          helpText="Format: 500ms, 5s, 5m"
        />
      </LoadGrid>
    </LoadSection>
  );
}
