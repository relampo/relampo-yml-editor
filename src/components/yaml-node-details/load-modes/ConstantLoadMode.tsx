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
