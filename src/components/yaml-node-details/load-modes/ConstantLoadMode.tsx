import { limitedInputValue } from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function ConstantLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Constant Profile"
      description="Keep a fixed number of virtual users active for the configured duration."
    >
      <LoadGrid>
        <LoadField
          label="Virtual Users"
          value={data.users || ''}
          placeholder="10"
          onChange={value => onChange('users', limitedInputValue(value))}
          type="number"
        />
        <LoadField
          label="Duration"
          value={data.duration || ''}
          placeholder="5m"
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
          placeholder="0s"
          onChange={value => onChange('ramp_up', limitedInputValue(value))}
          helpText="Format: 500ms, 5s, 5m"
        />
      </LoadGrid>
    </LoadSection>
  );
}
