import { useLanguage } from '../../../contexts/LanguageContext';
import {
  LoadFieldGroup,
  LoadGrid,
  LoadModeProps,
  LoadSection,
} from './shared';

export function ConstantLoadMode({ data, onChange }: LoadModeProps) {
  const { t } = useLanguage();
  const fields = [
    { field: 'users', label: t('studioControls.users'), type: 'number', helpText: t('studioControls.usersHelp') },
    { field: 'duration', label: t('studioControls.duration'), helpText: t('studioControls.durationHelp') },
    { field: 'iterations', label: t('studioControls.iterations'), type: 'number', helpText: t('studioControls.iterationsHelp') },
    { field: 'ramp_up', label: t('studioControls.rampUp'), helpText: t('studioControls.durationHelp') },
  ] as const;
  return (
    <LoadSection
      title={t('studioControls.constantProfile')}
      description={t('studioControls.constantDescription')}
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
