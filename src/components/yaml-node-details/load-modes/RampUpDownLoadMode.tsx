import { useLanguage } from '../../../contexts/LanguageContext';
import { LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function RampUpDownLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const durationHelp = t('studioControls.durationHelp');
  const fields = [
    { field: 'users', label: t('studioControls.users'), placeholder: '50', type: 'number' },
    { field: 'duration', label: t('studioControls.duration'), placeholder: '10m', helpText: durationHelp },
    { field: 'iterations', label: t('studioControls.iterations'), placeholder: '0', type: 'number' },
    { field: 'ramp_up', label: t('studioControls.rampUp'), placeholder: '1m', helpText: durationHelp },
    { field: 'ramp_down', label: t('yamlEditor.nodeDetails.load.rampDown'), placeholder: '1m', helpText: durationHelp },
  ] as const;
  return (
    <LoadSection
      title={t('yamlEditor.nodeDetails.load.rampUpDown')}
      description={t('yamlEditor.nodeDetails.load.rampUpDownDescription')}
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
