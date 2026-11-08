import { useEffect, useState } from 'react';
import type { HTTPRecordOptions } from '../../utils/httpRecorderApi';
export const recorderInput =
  'w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-yellow-400/60 disabled:opacity-50';
export const recorderButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-40';
export function HTTPRecorderSettings({
  options,
  onChange,
  disabled,
  language,
}: {
  options: HTTPRecordOptions;
  onChange: (patch: Partial<HTTPRecordOptions>) => void;
  disabled: boolean;
  language: string;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (disabled) setExpanded(false);
  }, [disabled]);
  const es = language === 'es',
    text = (en: string, spanish: string) => (es ? spanish : en);
  const field = (label: string, key: 'include' | 'name' | 'baseUrls', help?: string) => (
    <label className="block space-y-1 text-xs text-zinc-400">
      {label}
      <input
        className={recorderInput}
        value={options[key]}
        onChange={e => onChange({ [key]: e.target.value })}
      />
      {help && <span className="block text-zinc-500">{help}</span>}
    </label>
  );
  const toggle = (
    label: string,
    key: 'maskSensitive' | 'preserveCompressedResponses' | 'force' | 'redirectDisabling',
  ) => (
    <label className="flex items-start gap-2 text-sm">
      <input
        className="mt-1 accent-yellow-400"
        type="checkbox"
        checked={options[key]}
        onChange={e => onChange({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <details
      open={expanded}
      onToggle={event => setExpanded(event.currentTarget.open)}
      className="rounded-lg border border-white/10 bg-[#111111]"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-300">
        {text('Advanced settings', 'Configuración avanzada')}
      </summary>
      <fieldset
        disabled={disabled}
        className="grid gap-5 border-t border-white/10 p-4 md:grid-cols-2"
      >
        <label className="block space-y-1 text-xs text-zinc-400">
          {text('Proxy port (0 = automatic)', 'Puerto del proxy (0 = automático)')}
          <input
            aria-label="Proxy port"
            className={recorderInput}
            type="number"
            min="0"
            max="65535"
            value={options.port}
            onChange={e => onChange({ port: Number(e.target.value) })}
          />
        </label>
        {field(text('Test name (optional)', 'Nombre del test (opcional)'), 'name')}
        {field(
          text('Base URLs / domains to capture', 'URLs base / dominios que se grabarán'),
          'baseUrls',
          text(
            'Comma-separated URLs. Leave empty for CLI-style automatic base URL detection and all proxied domains.',
            'URLs separadas por coma. Vacío: detectar URL base y capturar todos los dominios, como la CLI.',
          ),
        )}
        {field(text('Include URL containing', 'Incluir URL que contenga'), 'include')}
        <label className="block space-y-1 text-xs text-zinc-400">
          {text('Exclude URL patterns (one per line)', 'Excluir patrones de URL (uno por línea)')}
          <textarea
            aria-label="Exclude patterns"
            className={recorderInput + ' min-h-24 font-mono'}
            value={options.exclude.join('\n')}
            onChange={e => onChange({ exclude: e.target.value.split('\n') })}
          />
          <span className="block text-zinc-500">*.css · png,jpg · (?i).*\.(css|js)(\?.*)?$</span>
        </label>
        <div className="space-y-3">
          <label className="block space-y-1 text-xs text-zinc-400">
            {text('Grouping', 'Agrupación')}
            <select
              aria-label="Grouping"
              className={recorderInput}
              value={options.grouping}
              onChange={e => onChange({ grouping: e.target.value })}
            >
              {[
                ['none', text('None', 'Sin agrupación')],
                ['separator', text('Separators', 'Separadores')],
                ['controller', 'Controller'],
                ['transaction', text('Transactions', 'Transacciones')],
                ['first-only', 'First-only'],
              ].map(([id, label]) => (
                <option
                  key={id}
                  value={id}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs text-zinc-400">
            {text('Redirect handling', 'Manejo de redirecciones')}
            <select
              aria-label="Redirect handling"
              className={recorderInput}
              value={options.redirectMode}
              onChange={e => onChange({ redirectMode: e.target.value, redirectDisabling: e.target.value === 'jmeter' })}
            >
              <option value="jmeter">JMeter</option>
              <option value="legacy">Legacy</option>
            </select>
          </label>
        </div>
        {toggle(
          text('Mask sensitive values in YAML and previews', 'Enmascarar valores sensibles en YAML y vistas previas'),
          'maskSensitive',
        )}
        {toggle(
          text(
            'Disable duplicate redirect-target requests',
            'Deshabilitar requests destino duplicados de redirecciones',
          ),
          'redirectDisabling',
        )}
        {toggle(
          text(
            'Keep original compressed response bodies (legacy)',
            'Conservar cuerpos comprimidos originales (legacy)',
          ),
          'preserveCompressedResponses',
        )}
        {toggle(
          text('Overwrite the output YAML if it already exists', 'Sobrescribir el YAML de salida si ya existe'),
          'force',
        )}
        <p className="text-xs text-zinc-500 md:col-span-2">
          {text(
            'Responses and masking are enabled in this UI. Masked credentials must be supplied before replay. These choices are explicit; the CLI defaults remain unchanged.',
            'Esta interfaz activa respuestas y enmascarado. Debes proporcionar las credenciales enmascaradas antes de ejecutar. Los valores predeterminados de la CLI se mantienen.',
          )}
        </p>
      </fieldset>
    </details>
  );
}
