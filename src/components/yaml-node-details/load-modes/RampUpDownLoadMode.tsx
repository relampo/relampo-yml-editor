import { LOAD_DURATION_HELP_TEXT, LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

const RAMP_UP_DOWN_LOAD_FIELDS = [
  { field: 'users', label: 'Virtual Users', placeholder: '50', type: 'number' },
  { field: 'duration', label: 'Duration', placeholder: '10m', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number' },
  { field: 'ramp_up', label: 'Ramp Up', placeholder: '1m', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'ramp_down', label: 'Ramp Down', placeholder: '1m', helpText: LOAD_DURATION_HELP_TEXT },
] as const;

export function RampUpDownLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Ramp Up / Down"
      description="Climb to a steady user count, hold it, then ramp the load back down."
    >
      <LoadGrid>
        <LoadFieldGroup
          data={data}
          fields={RAMP_UP_DOWN_LOAD_FIELDS}
          onChange={onChange}
        />
      </LoadGrid>
    </LoadSection>
  );
}
