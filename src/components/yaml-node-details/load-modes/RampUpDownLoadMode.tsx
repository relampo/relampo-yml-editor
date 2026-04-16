import { limitedInputValue } from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function RampUpDownLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Ramp Up / Down"
      description="Climb to a steady user count, hold it, then ramp the load back down."
    >
      <LoadGrid>
        <LoadField
          label="Virtual Users"
          value={data.users || ''}
          placeholder="50"
          onChange={value => onChange('users', limitedInputValue(value))}
          type="number"
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
