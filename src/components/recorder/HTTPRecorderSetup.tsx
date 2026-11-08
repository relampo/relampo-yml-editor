import { FolderOpen, Settings2, Check } from 'lucide-react';
import type { useHTTPRecorder } from './useHTTPRecorder';
import { recorderInput, recorderButton } from './HTTPRecorderSettings';
export function HTTPRecorderSetup({
  recorder,
  language,
}: {
  recorder: ReturnType<typeof useHTTPRecorder>;
  language: string;
}) {
  const { options, update, busy, ready, firefoxAvailable, firefoxConfigured } = recorder;
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  return (
    <fieldset
      disabled={!!busy}
      className="space-y-5 rounded-lg border border-white/10 bg-[#111111] p-4"
    >
      <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="block space-y-2 text-xs text-zinc-400">
          {text('Proxy host', 'Host del proxy')}
          <input
            aria-label="Proxy host"
            className={recorderInput + ' font-mono'}
            value="localhost"
            readOnly
          />
        </label>
        <label className="block space-y-2 text-xs text-zinc-400">
          {text('Proxy port', 'Puerto del proxy')}
          <input
            aria-label="Proxy port"
            type="number"
            min="0"
            max="65535"
            className={recorderInput}
            value={options.port}
            onChange={e => update({ port: Number(e.target.value) })}
          />
        </label>
        <button
          type="button"
          disabled={!ready || !firefoxAvailable}
          className={recorderButton}
          onClick={() => void recorder.configureFirefox()}
        >
          <Settings2 className="h-4 w-4" />
          {busy === 'configure-firefox' ? text('Configuring…', 'Configurando…') : 'Config Firefox'}
        </button>
      </div>
      {firefoxConfigured && (
        <p className="flex items-center gap-2 text-xs text-emerald-300">
          <Check className="h-4 w-4" />
          {text('Firefox configured: localhost:', 'Firefox configurado: localhost:')}
          {options.port} · {text('Certificate ready', 'Certificado preparado')}
        </p>
      )}
      {!firefoxAvailable && ready && (
        <p className="text-sm text-amber-300">
          {text('Firefox was not found on this computer.', 'No se encontró Firefox en esta PC.')}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 text-xs font-semibold text-zinc-400">
          Base URL
          <input
            aria-label="Base URL"
            type="text"
            placeholder="https://my-app.example"
            className={recorderInput}
            value={options.baseUrls}
            onChange={e => {
              const baseUrls = e.target.value;
              update({ baseUrls, applicationUrl: baseUrls.split(',')[0].trim() });
            }}
          />
          <span className="block text-xs font-normal text-zinc-500">
            {text(
              'Add API or authentication origins separated by commas. Firefox opens the first URL.',
              'Añade orígenes de API o autenticación separados por coma. Firefox abre la primera URL.',
            )}
          </span>
        </label>
        <div className="space-y-2">
          <label
            className="block text-xs font-semibold text-zinc-400"
            htmlFor="http-output"
          >
            {text('Output YAML file', 'Archivo YAML de salida')}
          </label>
          <div className="flex gap-2">
            <input
              id="http-output"
              aria-label="Output YAML file"
              className={recorderInput + ' font-mono'}
              value={options.output}
              onChange={e => update({ output: e.target.value })}
            />
            <button
              type="button"
              className={recorderButton + ' shrink-0'}
              onClick={() => void recorder.chooseOutput()}
              disabled={!ready}
            >
              <FolderOpen className="h-4 w-4" />
              {text('Browse…', 'Seleccionar…')}
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            aria-label="Enable prefix"
            className="accent-yellow-400"
            type="checkbox"
            checked={options.prefixEnabled}
            onChange={e => update({ prefixEnabled: e.target.checked })}
          />
          {text('Use request prefixes', 'Usar prefix en requests')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            aria-label="Enable transactions"
            className="accent-yellow-400"
            type="checkbox"
            checked={options.transactionsEnabled}
            onChange={e =>
              update({ transactionsEnabled: e.target.checked, grouping: e.target.checked ? 'none' : options.grouping })
            }
          />
          {text('Use manual transactions', 'Usar transacciones manuales')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            className="accent-yellow-400"
            type="checkbox"
            checked={options.responses}
            onChange={e => update({ responses: e.target.checked })}
          />
          {text('Capture responses for correlation', 'Capturar respuestas para correlación')}
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        {text(
          'Starting opens a separate recording control window with prefix, transaction and Stop controls.',
          'Al iniciar se abre una ventana de control con prefix, transacciones y Stop.',
        )}
      </p>
    </fieldset>
  );
}
