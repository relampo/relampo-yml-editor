import { FolderOpen, Settings2, Check } from 'lucide-react';
import type { useHTTPRecorder } from './useHTTPRecorder';
import { DEFAULT_EMBEDDED_EXCLUDE, normalizeRecorderBaseURLs, recorderURLProtocol } from '../../utils/httpRecorderApi';
import {
  HTTPRecorderSettings,
  recorderCompactInput as input,
  recorderCompactButton as button,
} from './HTTPRecorderSettings';
export function HTTPRecorderSetup({
  recorder,
  language,
  disabled = false,
}: {
  recorder: ReturnType<typeof useHTTPRecorder>;
  language: string;
  disabled?: boolean;
}) {
  const { options, update, busy, ready, firefoxAvailable, firefoxConfigured } = recorder;
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const label = 'flex min-w-0 flex-col gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500';
  return (
    <fieldset
      aria-label={text('Recording configuration', 'Configuración de grabación')}
      disabled={disabled || !!busy}
      className="shrink-0 space-y-2 border-b border-white/10 bg-[#111111] px-3 py-2"
    >
      <div className="grid items-end gap-2 grid-cols-[120px_88px_auto_minmax(150px,1fr)_minmax(200px,1.1fr)]">
        <label className={label}>
          {text('Proxy host', 'Host proxy')}
          <input
            aria-label="Proxy host"
            className={input + ' font-mono'}
            value="localhost"
            readOnly
          />
        </label>
        <label className={label}>
          {text('Port', 'Puerto')}
          <input
            aria-label="Proxy port"
            type="number"
            min="0"
            max="65535"
            className={input + ' font-mono'}
            value={options.port}
            onChange={e => update({ port: Number(e.target.value) })}
          />
        </label>
        <button
          type="button"
          aria-label="Config Firefox"
          disabled={!ready || !firefoxAvailable}
          className={button}
          title={
            firefoxConfigured
              ? text(
                  `Firefox configured: localhost:${options.port} · Certificate ready`,
                  `Firefox configurado: localhost:${options.port} · Certificado preparado`,
                )
              : 'Config Firefox'
          }
          onClick={() => void recorder.configureFirefox()}
        >
          {firefoxConfigured ? (
            <Check className="h-3.5 w-3.5 text-emerald-300" />
          ) : (
            <Settings2 className="h-3.5 w-3.5" />
          )}
          {busy === 'configure-firefox' ? text('Configuring…', 'Configurando…') : 'Config Firefox'}
        </button>
        <label className={label}>
          <span className="flex items-center gap-2">
            Base URL<span className="text-[9px] text-emerald-400/80">{recorderURLProtocol(options.baseUrls)}</span>
          </span>
          <input
            aria-label="Base URL"
            className={input}
            placeholder="https://my-app.example"
            title={text(
              'Comma-separated application, API or authentication URLs.',
              'URLs de aplicación, API o autenticación separadas por coma.',
            )}
            value={options.baseUrls}
            onBlur={() => {
              const baseUrls = normalizeRecorderBaseURLs(options.baseUrls);
              update({ baseUrls, applicationUrl: baseUrls.split(',')[0] || '' });
            }}
            onChange={e => update({ baseUrls: e.target.value, applicationUrl: e.target.value.split(',')[0].trim() })}
          />
        </label>
        <div className="min-w-0">
          <label
            htmlFor="http-output"
            className={label}
          >
            {text('Output YAML file', 'Archivo YAML')}
          </label>
          <div className="mt-1 flex gap-1">
            <input
              id="http-output"
              aria-label="Output YAML file"
              className={input + ' font-mono'}
              value={options.output}
              title={options.output}
              onChange={e => update({ output: e.target.value })}
            />
            <button
              type="button"
              disabled={!ready}
              className={button}
              aria-label={text('Browse…', 'Seleccionar…')}
              title={text('Choose output file', 'Seleccionar archivo de salida')}
              onClick={() => void recorder.chooseOutput()}
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className={label + ' min-w-[140px] flex-1'}>
          {text('Include (contains)', 'Include (contiene)')}
          <input
            aria-label="Include URL containing"
            className={input + ' font-mono'}
            value={options.include}
            placeholder={text('All URLs', 'Todas las URLs')}
            onChange={e => update({ include: e.target.value })}
          />
        </label>
        <label className={label + ' min-w-[200px] flex-[1.5]'}>
          Exclude
          <textarea
            rows={1}
            wrap="off"
            aria-label="Exclude patterns"
            className={input + ' resize-none font-mono leading-6'}
            title={options.exclude.join('\n')}
            value={options.exclude.join('\n')}
            onChange={e => update({ exclude: e.target.value.split('\n') })}
          />
        </label>
        <label className="flex h-7 items-center gap-1.5 whitespace-nowrap text-xs text-zinc-400">
          <input
            aria-label="Exclude embedded resources"
            className="accent-yellow-400"
            type="checkbox"
            checked={options.exclude.includes(DEFAULT_EMBEDDED_EXCLUDE)}
            onChange={e =>
              update({
                exclude: e.target.checked
                  ? [DEFAULT_EMBEDDED_EXCLUDE, ...options.exclude.filter(p => p !== DEFAULT_EMBEDDED_EXCLUDE)]
                  : options.exclude.filter(p => p !== DEFAULT_EMBEDDED_EXCLUDE),
              })
            }
          />
          {text('Exclude embedded resources', 'Excluir recursos embebidos')}
        </label>
        <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-400">
          <label className="flex items-center gap-1.5">
            <input
              aria-label="Enable prefix"
              className="accent-yellow-400"
              type="checkbox"
              checked={options.prefixEnabled}
              onChange={e => update({ prefixEnabled: e.target.checked })}
            />
            Prefix
          </label>
          <label className="flex items-center gap-1.5">
            <input
              aria-label="Enable transactions"
              className="accent-yellow-400"
              type="checkbox"
              checked={options.transactionsEnabled}
              onChange={e =>
                update({ transactionsEnabled: e.target.checked, grouping: e.target.checked ? 'none' : options.grouping })
              }
            />
            {text('Transactions', 'Transacciones')}
          </label>
          <label className="flex items-center gap-1.5">
            <input
              aria-label="Capture responses for correlation"
              className="accent-yellow-400"
              type="checkbox"
              checked={options.responses}
              onChange={e => update({ responses: e.target.checked })}
            />
            {text('Capture responses', 'Capturar respuestas')}
          </label>
          <span className="ml-auto flex items-center gap-2">
            {!firefoxAvailable && ready && (
              <span className="text-amber-300">{text('Firefox not found', 'Firefox no encontrado')}</span>
            )}
            <HTTPRecorderSettings
              options={options}
              onChange={update}
              disabled={disabled || !!busy}
              language={language}
            />
          </span>
        </div>
      </div>
    </fieldset>
  );
}
