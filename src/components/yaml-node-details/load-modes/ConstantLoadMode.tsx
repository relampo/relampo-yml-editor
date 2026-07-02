import { LOAD_DURATION_HELP_TEXT, LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

const CONSTANT_LOAD_FIELDS = [
  { field: 'users', label: 'Virtual Users', placeholder: '10', type: 'number' },
  { field: 'duration', label: 'Duration', placeholder: '5m', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number' },
  { field: 'ramp_up', label: 'Ramp Up', placeholder: '0s', helpText: LOAD_DURATION_HELP_TEXT },
] as const;

export function ConstantLoadMode({ data, onChange }: LoadModeProps) {
  return (
    <LoadSection
      title="Constant Profile"
      description="Keep a fixed number of virtual users active for the configured duration."
    >
      <LoadGrid>
        <LoadFieldGroup
          data={data}
          fields={CONSTANT_LOAD_FIELDS}
          onChange={onChange}
        />
      </LoadGrid>
    </LoadSection>
  );
}
