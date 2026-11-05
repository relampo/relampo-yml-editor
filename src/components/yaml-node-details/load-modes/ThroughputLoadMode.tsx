import { useLanguage } from '../../../contexts/LanguageContext';
import {
  LoadFieldGroup,
  LoadGrid,
  LoadModeProps,
  LoadSection,
} from './shared';

export function ThroughputLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const throughputPerMinute = (parseFloat(String(data.target_rps || '0')) || 0) * 60;
  const fields = [
    {
      field: 'target_rps',
      label: t('yamlEditor.nodeDetails.load.targetRps'),
      placeholder: '20',
      type: 'number',
      helpText: t('yamlEditor.intent.helpers.targetReqPerMinute').replace('{value}', throughputPerMinute.toFixed(0)),
    },
    { field: 'min_vus', label: t('yamlEditor.nodeDetails.load.minVus'), placeholder: '1', type: 'number', helpText: t('yamlEditor.nodeDetails.load.minVusHelp') },
    { field: 'max_vus', label: t('yamlEditor.nodeDetails.load.maxVus'), placeholder: '80', type: 'number', helpText: t('studioControls.usersHelp') },
    { field: 'duration', label: t('studioControls.duration'), placeholder: '10m', helpText: t('studioControls.durationHelp') },
    { field: 'iterations', label: t('studioControls.iterations'), placeholder: '0', type: 'number', helpText: t('studioControls.iterationsHelp') },
  ] as const;

  return (
    <LoadSection
      title={t('yamlEditor.nodeDetails.load.throughputProfile')}
      description={t('yamlEditor.nodeDetails.load.throughputDescription')}
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
