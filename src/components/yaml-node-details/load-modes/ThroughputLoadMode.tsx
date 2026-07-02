import { LOAD_DURATION_HELP_TEXT, LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function ThroughputLoadMode({ data, onChange }: LoadModeProps) {
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;
  const fields = [
    {
      field: 'target_rps',
      label: 'Target RPS',
      placeholder: '20',
      type: 'number',
      helpText: `${throughputPerMinute.toFixed(0)} req/min`,
    },
    { field: 'duration', label: 'Duration', placeholder: '10m', helpText: LOAD_DURATION_HELP_TEXT },
    { field: 'iterations', label: 'Iterations', placeholder: '0', type: 'number' },
    { field: 'ramp_up', label: 'Ramp Up', placeholder: '1m', helpText: LOAD_DURATION_HELP_TEXT },
    { field: 'ramp_down', label: 'Ramp Down', placeholder: '1m', helpText: LOAD_DURATION_HELP_TEXT },
  ] as const;

  return (
    <LoadSection
      title="Throughput Profile"
      description="Drive traffic toward a target request rate while shaping the ramp-up and ramp-down windows."
    >
      <LoadGrid>
        <LoadFieldGroup
          data={data}
          fields={fields}
          onChange={onChange}
        />
      </LoadGrid>
    </LoadSection>
  );
}
