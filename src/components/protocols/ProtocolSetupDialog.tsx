import { useState } from 'react';
import { ArrowLeft, Cable, Globe, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { createProtocolStep, type StarterProtocol } from '../../utils/protocolProject';
const fieldClass =
  'w-full rounded-md border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-yellow-400/50 focus:outline-none';
export function ProtocolSetupDialog({
  open,
  protocol,
  language,
  onOpenChange,
  onAdd,
  onGoToStudio,
}: {
  open: boolean;
  protocol: StarterProtocol;
  language: string;
  onOpenChange: (open: boolean) => void;
  onAdd: (step: Record<string, unknown>) => void;
  onGoToStudio: () => void;
}) {
  const [url, setURL] = useState(''),
    [name, setName] = useState(''),
    [method, setMethod] = useState('GET');
  const [message, setMessage] = useState(''),
    [headers, setHeaders] = useState(''),
    [receive, setReceive] = useState(true),
    [expected, setExpected] = useState('');
  const [error, setError] = useState('');
  const es = language === 'es',
    websocket = protocol === 'websocket',
    Icon = websocket ? Cable : Globe;
  const text = (en: string, spanish: string) => (es ? spanish : en);
  const back = () => {
    onOpenChange(false);
    onGoToStudio();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex max-h-[90vh] w-[min(680px,95vw)] max-w-none! flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={'h-5 w-5 ' + (websocket ? 'text-violet-300' : 'text-emerald-300')} />
            {websocket ? 'WebSocket' : 'HTTPS'}
          </DialogTitle>
          <DialogDescription>
            {websocket
              ? text(
                  'Configure a connection and its messages, then open the session in Studio.',
                  'Configura la conexión y sus mensajes, y abre la sesión en Studio.',
                )
              : text(
                  'Create a request and continue editing its flow in Studio.',
                  'Crea una petición y continúa editando su flujo en Studio.',
                )}
          </DialogDescription>
        </DialogHeader>
        <form
          id="protocol-setup"
          className="min-h-0 space-y-4 overflow-y-auto pr-1"
          onSubmit={event => {
            event.preventDefault();
            setError('');
            try {
              onAdd(createProtocolStep(protocol, { url, name, method, message, headers, receive, expected }));
              onOpenChange(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : String(cause));
            }
          }}
        >
          <label className="block space-y-1 text-xs text-zinc-400">
            {text('Name (optional)', 'Nombre (opcional)')}
            <input
              className={fieldClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={websocket ? 'WebSocket session' : 'HTTPS request'}
            />
          </label>
          <div className={websocket ? '' : 'grid grid-cols-[110px_1fr] gap-3'}>
            {!websocket && (
              <label className="block space-y-1 text-xs text-zinc-400">
                {text('Method', 'Método')}
                <select
                  className={fieldClass}
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1 text-xs text-zinc-400">
              URL
              <input
                aria-label="URL"
                className={fieldClass}
                value={url}
                onChange={e => setURL(e.target.value)}
                placeholder={websocket ? 'wss://events.example.com/live' : 'https://api.example.com/orders'}
                autoFocus
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-zinc-400">
            {websocket
              ? text('Send message (optional)', 'Enviar mensaje (opcional)')
              : text('Request body (optional)', 'Cuerpo de la petición (opcional)')}
            <textarea
              className={fieldClass + ' min-h-24 font-mono'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={websocket ? '{"action":"subscribe"}' : '{"item":"{{item}}"}'}
            />
          </label>
          {websocket && (
            <div className="space-y-3 rounded-md border border-white/10 p-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={receive}
                  onChange={e => setReceive(e.target.checked)}
                />
                {text('Wait for a response', 'Esperar una respuesta')}
              </label>
              {receive && (
                <label className="block space-y-1 text-xs text-zinc-400">
                  {text('Response contains (optional)', 'La respuesta contiene (opcional)')}
                  <input
                    className={fieldClass}
                    value={expected}
                    onChange={e => setExpected(e.target.value)}
                    placeholder={text('Text to check', 'Texto que verificar')}
                  />
                </label>
              )}
            </div>
          )}
          <details className="rounded-md border border-white/10 p-3">
            <summary className="cursor-pointer text-xs text-zinc-400">
              {text('Headers and authentication', 'Cabeceras y autenticación')}
            </summary>
            <label className="mt-3 block space-y-1 text-xs text-zinc-400">
              {text('Headers (JSON)', 'Cabeceras (JSON)')}
              <textarea
                className={fieldClass + ' min-h-20 font-mono'}
                value={headers}
                onChange={e => setHeaders(e.target.value)}
                placeholder={'{"Authorization":"Bearer {{token}}"}'}
              />
            </label>
          </details>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300"
            >
              {error}
            </p>
          )}
        </form>
        <DialogFooter className="mt-0 flex-row items-center justify-between! gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            {text('Go to Studio', 'Ir a Studio')}
          </button>
          <button
            type="submit"
            form="protocol-setup"
            className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-xs font-semibold text-black hover:bg-yellow-300"
          >
            <Plus className="h-4 w-4" />
            {text('Add to Studio', 'Añadir a Studio')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
