import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, Globe, Square } from 'lucide-react';
import { grpcRequest, grpcBrowserCAURL, type GRPCBrowserRecording } from '../../utils/grpcApi';

const empty: GRPCBrowserRecording = {
  active: false,
  detected: 'none',
  counts: { http: 0, https: 0, grpcWeb: 0, grpcNative: 0 },
  totalRequests: 0,
  tlsFailures: 0,
  requests: [],
  grpcWebReplaySupported: false,
  firefoxAvailable: false,
};
const input =
  'w-full h-9.5 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400/40';
const button =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 disabled:opacity-40';
export function GRPCBrowserRecorder({
  onDiscover,
  onImport,
  onActiveChange,
  language = 'en',
}: {
  onDiscover: () => void;
  onImport: () => void;
  onActiveChange?: (active: boolean) => void;
  language?: string;
}) {
  const [state, setState] = useState<GRPCBrowserRecording>(empty);
  const [applicationURL, setApplicationURL] = useState('');
  const [listen, setListen] = useState('127.0.0.1:0');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const mounted = useRef(true),
    action = useRef<AbortController | null>(null);
  const es = language === 'es';
  const text = (en: string, spanish: string) => (es ? spanish : en);
  useEffect(() => {
    onActiveChange?.(state.active);
  }, [state.active, onActiveChange]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    grpcRequest<GRPCBrowserRecording>('browser-recordings/current', undefined, controller.signal)
      .then(value => {
        if (mounted.current) {
          setState(value);
          if (value.applicationUrl) setApplicationURL(value.applicationUrl);
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(String(cause.message));
      });
    return () => {
      mounted.current = false;
      controller.abort();
      action.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!state.active) return;
    let pending = false;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (pending) return;
      pending = true;
      grpcRequest<GRPCBrowserRecording>('browser-recordings/current', undefined, controller.signal)
        .then(value => {
          if (!controller.signal.aborted) setState(value);
        })
        .catch(cause => {
          if (!controller.signal.aborted) setError(String(cause.message));
        })
        .finally(() => {
          pending = false;
        });
    }, 1000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [state.active]);
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    action.current?.abort();
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setError('');
    try {
      await task(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const observed = state.totalRequests > 0;
  const heading =
    state.detected === 'grpc_web'
      ? text('gRPC-Web detected', 'gRPC-Web detectado')
      : state.detected === 'grpc_native'
        ? text('Native gRPC traffic observed', 'Se observó tráfico gRPC nativo')
        : observed
          ? text('HTTP/HTTPS traffic observed', 'Se observó tráfico HTTP/HTTPS')
          : text('Waiting for browser traffic', 'Esperando tráfico del navegador');
  return (
    <section
      className="space-y-4"
      aria-label={text('Browser protocol recording', 'Grabación de protocolos del navegador')}
    >
      <p className="text-sm text-zinc-400">
        {text(
          'Enter the application URL, start capture, then use the application in Firefox. Relampo identifies the requests that pass through this recorder.',
          'Introduce la URL de la aplicación, inicia la captura y utiliza la app en Firefox. Relampo identifica las peticiones que pasan por este grabador.',
        )}
      </p>
      <div className="grid gap-3 rounded-md border border-white/10 bg-[#111111] p-4 sm:grid-cols-2">
        <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {text('Application URL', 'URL de la aplicación')}
          <input
            aria-label="Application URL"
            type="url"
            placeholder="https://app.example.com"
            className={input + ' normal-case font-normal tracking-normal'}
            value={applicationURL}
            disabled={state.active || busy}
            onChange={e => setApplicationURL(e.target.value)}
          />
        </label>
        <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {text('Local browser proxy', 'Proxy local del navegador')}
          <input
            aria-label="Local browser proxy"
            className={input + ' normal-case font-normal tracking-normal'}
            value={listen}
            disabled={state.active || busy}
            onChange={e => setListen(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        {!state.active ? (
          <button
            type="button"
            disabled={busy || !applicationURL.trim()}
            className={button + ' border-yellow-400/30 text-yellow-400'}
            onClick={() =>
              run(async signal => {
                const value = await grpcRequest<GRPCBrowserRecording>(
                  'browser-recordings',
                  { applicationUrl: applicationURL, listen },
                  signal,
                );
                if (mounted.current) setState(value);
              })
            }
          >
            {text('Start browser recording', 'Iniciar grabación del navegador')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={button}
              disabled={busy || !state.firefoxAvailable || state.firefoxRunning}
              onClick={() =>
                run(async signal => {
                  await grpcRequest('browser-recordings/firefox', {}, signal);
                  if (mounted.current) setState(current => ({ ...current, firefoxRunning: true }));
                })
              }
            >
              <Globe className="h-4 w-4" />
              {text('Open Firefox', 'Abrir Firefox')}
            </button>
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() =>
                run(async signal => {
                  const value = await grpcRequest<GRPCBrowserRecording>('browser-recordings/stop', {}, signal);
                  if (mounted.current) setState(value);
                })
              }
            >
              <Square className="h-4 w-4" />
              {text('Stop browser recording', 'Detener grabación del navegador')}
            </button>
          </>
        )}
      </div>
      {state.proxyAddress && (
        <div className="space-y-2 rounded-md border border-white/10 p-4 text-xs text-zinc-400">
          <p>
            {text('Browser proxy:', 'Proxy del navegador:')} <code className="text-zinc-200">{state.proxyAddress}</code>
          </p>
          <p>
            {text(
              'Open Firefox creates a separate profile with this proxy configured. Your usual Firefox settings stay untouched. Stopping capture closes that recording window.',
              'Abrir Firefox crea un perfil separado con este proxy configurado. Conserva la configuración de tu Firefox habitual. Al detener la captura se cierra esa ventana de grabación.',
            )}
          </p>
          {!state.firefoxAvailable && (
            <p>
              {text(
                'Firefox was not found. You can use another browser by setting its HTTP and HTTPS proxy to the address above.',
                'Firefox no se encontró. Puedes utilizar otro navegador configurando su proxy HTTP y HTTPS con la dirección anterior.',
              )}
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-yellow-400">
              {text('HTTPS certificate setup', 'Configuración del certificado HTTPS')}
            </summary>
            <p className="mt-2">
              {text(
                'For HTTPS inspection, Firefox must trust the Relampo recorder CA. If a certificate warning appears, import this certificate in Firefox Settings → Privacy & Security → Certificates → Authorities, and trust it to identify websites. Reload the application afterwards.',
                'Para inspeccionar HTTPS, Firefox debe confiar en la CA del grabador Relampo. Si aparece un aviso de certificado, impórtalo en Ajustes de Firefox → Privacidad y seguridad → Certificados → Autoridades, y confía en él para identificar sitios web. Después vuelve a cargar la aplicación.',
              )}
            </p>
            <a
              className={button + ' mt-2'}
              href={grpcBrowserCAURL()}
              download
            >
              <Download className="h-4 w-4" />
              {text('Download recorder certificate', 'Descargar certificado del grabador')}
            </a>
          </details>
        </div>
      )}
      {(state.active || observed || state.tlsFailures > 0) && (
        <div
          role="status"
          className="space-y-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 p-4"
        >
          <h3 className="text-sm font-semibold text-yellow-400">{heading}</h3>
          {!observed && (
            <p className="text-xs text-zinc-400">
              {text(
                'No requests have been observed. Open the application, interact with it, and check the browser proxy and recorder certificate. This does not mean that the application cannot use gRPC.',
                'Todavía no se observaron peticiones. Abre la aplicación, interactúa con ella y revisa el proxy y el certificado del grabador. Esto no significa que la aplicación no pueda usar gRPC.',
              )}
            </p>
          )}
          {state.detected === 'http' && (
            <p className="text-xs text-zinc-400">
              {text(
                'HTTP/HTTPS requests were captured. No gRPC-Web calls have been observed so far. Browser traffic does not reveal whether the server uses gRPC internally.',
                'Se capturaron peticiones HTTP/HTTPS. Hasta ahora no se observaron llamadas gRPC-Web. El tráfico del navegador no permite saber si el servidor usa gRPC internamente.',
              )}
            </p>
          )}
          {state.detected === 'grpc_web' && (
            <p className="text-xs text-zinc-400">
              {text(
                'These requests identify gRPC-Web traffic. gRPC-Web script generation is not available yet. To test the native gRPC service, use Discovery or import its .proto contract.',
                'Estas peticiones identifican tráfico gRPC-Web. La generación de scripts gRPC-Web todavía no está disponible. Para probar el servicio gRPC nativo, utiliza Discovery o importa su contrato .proto.',
              )}
            </p>
          )}
          {state.detected === 'grpc_native' && (
            <p className="text-xs text-zinc-400">
              {text(
                'A native gRPC content type was observed. Use the Native gRPC client recorder with a client that sends traffic through it.',
                'Se observó un tipo de contenido gRPC nativo. Utiliza el grabador de cliente gRPC nativo con un cliente que envíe el tráfico a través de él.',
              )}
            </p>
          )}
          {state.tlsFailures > 0 && (
            <p className="text-xs text-amber-300">
              {text(
                'A browser TLS handshake failed. Check that Firefox trusts the recorder certificate; traffic inside a failed TLS tunnel cannot be inspected.',
                'Falló una negociación TLS del navegador. Comprueba que Firefox confía en el certificado del grabador; no se puede inspeccionar el tráfico dentro de un túnel TLS fallido.',
              )}
            </p>
          )}
          <p className="text-xs text-zinc-400">
            HTTP: {state.counts.http} · HTTPS: {state.counts.https} · gRPC-Web: {state.counts.grpcWeb} ·{' '}
            {text('Observed requests', 'Peticiones observadas')}: {state.totalRequests}
          </p>
        </div>
      )}
      <div className="space-y-3 rounded-md border border-white/10 bg-[#111111] p-4">
        <p className="text-xs text-zinc-400">
          {text(
            'To test gRPC directly, use Discovery or import a .proto. You need the gRPC endpoint, authentication and valid test data. A contract does not contain real responses or prove authorization relationships.',
            'Para probar gRPC directamente, utiliza Discovery o importa un .proto. Necesitas el endpoint gRPC, la autenticación y datos de prueba válidos. Un contrato no contiene respuestas reales ni demuestra relaciones de autorización.',
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            onClick={onDiscover}
          >
            {text('Use Discovery', 'Usar Discovery')}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={button}
            onClick={onImport}
          >
            {text('Import .proto', 'Importar .proto')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {state.requests.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-left text-xs">
            <caption className="px-3 py-2 text-left text-zinc-500">
              {text(
                'Latest observed requests. Bodies, headers and URL query values are not stored by this protocol detector.',
                'Últimas peticiones observadas. El detector no almacena cuerpos, cabeceras ni valores de consulta de las URL.',
              )}
            </caption>
            <thead className="bg-[#111111] text-zinc-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{text('Protocol', 'Protocolo')}</th>
                <th className="p-3">{text('Method', 'Método')}</th>
                <th className="p-3">URL</th>
              </tr>
            </thead>
            <tbody>
              {state.requests.map((request, i) => (
                <tr
                  key={i}
                  className="border-t border-white/5 text-zinc-300"
                >
                  <td className="p-3">{state.totalRequests - state.requests.length + i + 1}</td>
                  <td className="p-3">
                    {request.protocol === 'grpc_web' ? 'gRPC-Web' : request.protocol.toUpperCase()}
                  </td>
                  <td className="p-3 font-mono">{request.method}</td>
                  <td className="max-w-xl break-all p-3 font-mono">{request.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
