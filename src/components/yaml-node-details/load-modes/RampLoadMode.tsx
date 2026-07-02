import { LOAD_DURATION_HELP_TEXT, LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

const RAMP_LOAD_FIELDS = [
  { field: 'start_users', label: 'Start Users', placeholder: '1', type: 'number' },
  { field: 'end_users', label: 'End Users', placeholder: '100', type: 'number' },
  { field: 'duration', label: 'Duration', placeholder: '10m', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number' },
] as const;

export function RampLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Linear Ramp"
      description="Move from the starting user count to the ending user count over the configured duration."
    >
      <LoadGrid>
        <LoadFieldGroup
          data={data}
          fields={RAMP_LOAD_FIELDS}
          onChange={onChange}
        />
      </LoadGrid>
    </LoadSection>
  );
}
