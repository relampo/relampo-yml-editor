import {
  LOAD_DURATION_HELP_TEXT,
  LOAD_ITERATIONS_HELP_TEXT,
  LOAD_USERS_HELP_TEXT,
  LoadFieldGroup,
  LoadGrid,
  LoadModeProps,
  LoadSection,
} from './shared';

const CONSTANT_LOAD_FIELDS = [
  { field: 'users', label: 'Virtual Users', type: 'number', helpText: LOAD_USERS_HELP_TEXT },
  { field: 'duration', label: 'Duration', helpText: LOAD_DURATION_HELP_TEXT },
  { field: 'iterations', label: 'Iterations', type: 'number', helpText: LOAD_ITERATIONS_HELP_TEXT },
  { field: 'ramp_up', label: 'Ramp Up', helpText: LOAD_DURATION_HELP_TEXT },
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
