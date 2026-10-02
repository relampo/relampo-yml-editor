import { useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../utils/analytics';
import { getRuntimeConfig } from '../utils/runtimeConfig';

export function UsageMetricsConsent({ language }: { language: string }) {
  const [enabled, setEnabled] = useState(getAnalyticsConsent);
  if (getRuntimeConfig().mode !== 'studio') return null;
  return (
    <label
      className="flex max-w-48 items-center gap-2 text-xs text-zinc-400"
      title={
        language === 'es'
          ? 'Comparte acciones y resultados anónimos. No envía scripts, URL, nombres de archivos ni variables.'
          : 'Share anonymous actions and outcomes. Scripts, URLs, file names, and variables stay private.'
      }
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={event => {
          setAnalyticsConsent(event.target.checked);
          setEnabled(getAnalyticsConsent());
        }}
        className="accent-yellow-400"
      />
      {language === 'es' ? 'Compartir métricas de uso' : 'Share usage metrics'}
    </label>
  );
}
