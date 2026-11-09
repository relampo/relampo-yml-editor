import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import type { HTTPRecordOptions } from '../../utils/httpRecorderApi';
export const recorderInput =
  'w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-yellow-400/60 disabled:opacity-50';
export const recorderButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-40';
export const recorderCompactInput =
  'h-7 min-w-0 w-full rounded border border-white/10 bg-[#171717] px-2 text-xs text-zinc-200 outline-none focus:border-yellow-400/60 disabled:opacity-50';
export const recorderCompactButton =
  'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 text-xs font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-40';
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
  const field = (label: string, key: 'include' | 'name' | 'baseUrls' | 'applicationUrl', help?: string) => (
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
    <Dialog
      open={expanded}
      onOpenChange={setExpanded}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded(true)}
        className={recorderCompactButton}
        aria-label={text('Recording options', 'Opciones de grabación')}
        title={text('Recording options', 'Opciones de grabación')}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>
      <DialogContent className="max-h-[85vh] max-w-xl! overflow-y-auto p-4">
        <DialogTitle className="text-sm">{text('Recording options', 'Opciones de grabación')}</DialogTitle>
        <DialogDescription className="text-xs">
          {text('Additional preferences for this recording.', 'Preferencias adicionales para esta grabación.')}
        </DialogDescription>
        <fieldset
          disabled={disabled}
          className="grid gap-3 md:grid-cols-2"
        >
          {field(text('Test name (optional)', 'Nombre del test (opcional)'), 'name')}
          {field(text('Application URL (start page)', 'URL de inicio en Firefox'), 'applicationUrl')}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options.openFirefox}
              onChange={e => onChange({ openFirefox: e.target.checked })}
            />
            {text('Configure and open Firefox automatically', 'Configurar y abrir Firefox automáticamente')}
          </label>
          <div className="space-y-3">
            <label className="block space-y-1 text-xs text-zinc-400">
              {text('Automatic grouping', 'Agrupación automática')}
              <select
                aria-label="Grouping"
                disabled={options.transactionsEnabled}
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
          </div>
          {toggle(
            text('Mask sensitive values in YAML and previews', 'Enmascarar valores sensibles en YAML y vistas previas'),
            'maskSensitive',
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
        <button
          type="button"
          className={recorderCompactButton + ' justify-self-end'}
          onClick={() => setExpanded(false)}
        >
          {text('Done', 'Listo')}
        </button>
      </DialogContent>
    </Dialog>
  );
}
