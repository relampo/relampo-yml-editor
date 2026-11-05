import { useLanguage } from '../../../contexts/LanguageContext';
import { LoadFieldGroup, LoadGrid, LoadModeProps, LoadSection } from './shared';

export function RampLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const fields = [
    { field: 'start_users', label: t('yamlEditor.nodeDetails.load.startUsers'), placeholder: '1', type: 'number' },
    { field: 'end_users', label: t('yamlEditor.nodeDetails.load.endUsers'), placeholder: '100', type: 'number' },
    { field: 'duration', label: t('studioControls.duration'), placeholder: '10m', helpText: t('studioControls.durationHelp') },
    { field: 'iterations', label: t('studioControls.iterations'), placeholder: '0', type: 'number' },
  ] as const;
  return (
    <LoadSection
      title={t('yamlEditor.nodeDetails.load.linearRamp')}
      description={t('yamlEditor.nodeDetails.load.linearRampDescription')}
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
