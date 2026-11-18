import { useState } from 'react';
import { load } from 'js-yaml';
import type { RunOverrides } from '../utils/runApi';
import { useLanguage } from '../contexts/LanguageContext';
export function RunExecutionOptions({
  disabled,
  multi,
  onChange,
  onError,
}: {
  disabled: boolean;
  multi: boolean;
  onChange: (value: RunOverrides) => void;
  onError: (message: string) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [value, setValue] = useState<RunOverrides>({});
  const update = (patch: Partial<RunOverrides>) => {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  };
  return (
    <details className="shrink-0 border-b border-white/10 px-4 py-2 text-xs">
      <summary className="cursor-pointer">
        {text('Execution options · keep the script unchanged', 'Opciones de ejecución · conservar el script')}
      </summary>
      <div className="flex flex-wrap items-end gap-3 py-3">
        {(['vus', 'duration', 'rps'] as const).map(key => (
          <label
            key={key}
            className="flex flex-col gap-1"
          >
            {{ vus: 'VUs', duration: text('Duration override', 'Duración temporal'), rps: 'Target RPS' }[key]}
            <input
              aria-label={text('Execution ', 'Ejecución ') + key}
              disabled={disabled || multi}
              type={key === 'duration' ? 'text' : 'number'}
              min="0"
              step={key === 'rps' ? 'any' : '1'}
              value={value[key] ?? ''}
              placeholder={text('From script', 'Del script')}
              onChange={event =>
                update({
                  [key]:
                    key === 'duration'
                      ? event.target.value || undefined
                      : event.target.value
                        ? Number(event.target.value)
                        : undefined,
                })
              }
              className="h-8 w-28 rounded border border-white/15 bg-transparent px-2"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          {text('Variables · name=value, one per line', 'Variables · nombre=valor, una por línea')}
          <textarea
            aria-label={text('Execution variables', 'Variables de ejecución')}
            disabled={disabled}
            rows={2}
            className="min-w-64 rounded border border-white/15 bg-transparent px-2"
            onChange={event => {
              const variables: Record<string, string> = {};
              for (const line of event.target.value.split('\n').filter(line => line.trim())) {
                const at = line.indexOf('=');
                if (at <= 0 || !line.slice(0, at).trim()) {
                  onError(text('Use name=value for each variable.', 'Usa nombre=valor para cada variable.'));
                  return;
                }
                variables[line.slice(0, at).trim()] = line.slice(at + 1);
              }
              onError('');
              update({ variables });
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          {text('Variable file · YAML/JSON', 'Archivo de variables · YAML/JSON')}
          <input
            aria-label={text('Execution variable file', 'Archivo de variables de ejecución')}
            type="file"
            accept=".yaml,.yml,.json"
            disabled={disabled}
            className="max-w-60"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) {
                update({ variablesFile: undefined });
                return;
              }
              if (file.size > 1024 * 1024) {
                onError(text('Variable file exceeds 1 MiB.', 'El archivo de variables supera 1 MiB.'));
                return;
              }
              void file
                .text()
                .then(content => {
                  const parsed = load(content);
                  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                    throw Error(text('Use a variable mapping.', 'Usa un mapa de variables.'));
                  onError('');
                  update({ variablesFile: parsed as Record<string, unknown> });
                })
                .catch(cause => onError(String(cause.message || cause)));
            }}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.captureDetails === true}
            onChange={event => update({ captureDetails: event.target.checked })}
          />
          {text(
            'Capture full request/response for JSON export',
            'Capturar request/response completos para exportar JSON',
          )}
        </label>
      </div>
    </details>
  );
}
