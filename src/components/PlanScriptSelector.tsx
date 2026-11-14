import { useContext } from 'react';
import { PlanScriptsContext } from '../contexts/PlanScriptsContext';

export function PlanScriptSelector({ language, disabled = false }: { language: string; disabled?: boolean }) {
  const scripts = useContext(PlanScriptsContext);
  if (!scripts) return null;
  return (
    <label className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-zinc-400">
      <span>{language === 'es' ? 'Script del plan' : 'Plan script'}</span>
      <select
        aria-label={language === 'es' ? 'Script del plan' : 'Plan script'}
        className="min-w-0 flex-1 rounded border border-white/15 bg-[#181818] px-2 py-1.5 text-zinc-100 disabled:opacity-60"
        value={scripts.selectedId}
        disabled={scripts.disabled || disabled}
        title={language === 'es' ? 'Script activo del plan' : 'Active script for this plan'}
        onChange={event => scripts.select(event.target.value)}
      >
        {scripts.scripts.map(script => (
          <option
            key={script.id}
            value={script.id}
          >
            {script.fileName}
          </option>
        ))}
      </select>
    </label>
  );
}
