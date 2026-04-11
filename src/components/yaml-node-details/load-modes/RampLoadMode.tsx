import { limitedInputValue } from '../loadUtils';
import { LoadField, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function RampLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Linear Ramp"
      description="Move from the starting user count to the ending user count over the configured duration."
    >
      <LoadGrid>
        <LoadField
          label="Start Users"
          value={data.start_users || ''}
          placeholder="1"
          onChange={value => onChange('start_users', limitedInputValue(value))}
          type="number"
        />
        <LoadField
          label="End Users"
          value={data.end_users || ''}
          placeholder="100"
          onChange={value => onChange('end_users', limitedInputValue(value))}
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
      </LoadGrid>
    </LoadSection>
  );
}
