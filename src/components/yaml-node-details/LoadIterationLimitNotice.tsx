import { useLanguage } from '../../contexts/LanguageContext';
import { parseTimeToSeconds, type LoadData } from './loadUtils';

export function LoadIterationLimitNotice({ data, onUseDuration }: { data: LoadData; onUseDuration?: () => void }) {
  const { language } = useLanguage();
  const iterations = Number(data.iterations);
  if (
    !Number.isInteger(iterations) ||
    iterations <= 0 ||
    parseTimeToSeconds(String(data.duration ?? '')) <= 0 ||
    data.run_until_stopped === true
  )
    return null;
  const es = language === 'es';
  return (
    <div
      role="note"
      className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200"
    >
      <p>
        {es
          ? `Límite activo: ${iterations} ${iterations === 1 ? 'iteración' : 'iteraciones'} por usuario. Cada usuario se detiene al completar ese límite; la prueba puede terminar antes de la duración y no alcanzar la concurrencia planificada.`
          : `Active limit: ${iterations} ${iterations === 1 ? 'iteration' : 'iterations'} per user. Each user stops after reaching that limit; the test may finish before its duration and miss the planned concurrency.`}
      </p>
      {onUseDuration && (
        <button
          type="button"
          className="mt-2 rounded-md border border-yellow-400/40 px-2 py-1 font-semibold text-yellow-300 hover:bg-yellow-400/10"
          onClick={onUseDuration}
        >
          {es ? 'Repetir durante toda la duración' : 'Repeat for the full duration'}
        </button>
      )}
    </div>
  );
}
