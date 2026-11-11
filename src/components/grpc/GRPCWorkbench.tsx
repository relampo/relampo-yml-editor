import { GRPCNativeRecorder } from './GRPCNativeRecorder';
import { GRPCBrowserRecorder } from './GRPCBrowserRecorder';
import { useEffect, useRef, useState } from 'react';
import { Upload, Radio, Search, ArrowLeft } from 'lucide-react';
import { GRPCWorkbenchFrame, GRPCWorkbenchHeader } from './GRPCWorkbenchFrame';
import { GRPCSaveProject } from './GRPCSaveProject';
import { GRPCContractResponse, GRPCMessageTabs } from './GRPCContractResponse';
import { GRPCCorrelationReview } from './GRPCCorrelationReview';
import { GRPCMessageForm } from './GRPCMessageForm';
import { GRPCStreamEditor } from './GRPCStreamEditor';
import {
  grpcRequest,
  grpcBundleURL,
  type GRPCConnection,
  type GRPCGenerated,
  type GRPCImported,
  type GRPCMethod,
  type GRPCRecording,
} from '../../utils/grpcApi';
import { useGRPCSchema } from '../../hooks/useGRPCSchema';
import type { YAMLValue } from '../../types/yaml';
const input =
  'w-full h-9.5 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 font-mono normal-case tracking-normal font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400/40';
const button =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 disabled:opacity-40 disabled:cursor-not-allowed';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 disabled:opacity-40 disabled:cursor-not-allowed';
function readFile(file: File, mode: 'text' | 'base64'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(mode === 'text' ? String(reader.result) : String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read ' + file.name));
    if (mode === 'text') reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}
function metadataFromHeaders(headers: { name: string; value: string }[]) {
  const result: Record<string, string[]> = {};
  for (const header of headers)
    if (header.name.trim()) {
      (result[header.name.trim()] ??= []).push(header.value);
    }
  return result;
}
interface GRPCWorkbenchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (yaml: string) => void;
  onActivityChange?: (active: boolean) => void;
  presentation?: 'dialog' | 'page';
  initialMode?: 'discover' | 'import' | 'record';
  saveProjectEnabled?: boolean;
  onGoToStudio?: () => void;
  language?: string;
  browserRecordingEnabled?: boolean;
}

export function GRPCWorkbench({
  open,
  onOpenChange,
  onAdd,
  onActivityChange,
  onGoToStudio,
  language = 'en',
  browserRecordingEnabled = false,
  presentation = 'dialog',
  initialMode = 'discover',
  saveProjectEnabled = false,
}: GRPCWorkbenchProps) {
  const { setCatalog } = useGRPCSchema();
  const [recordingSource, setRecordingSource] = useState<'browser' | 'native'>(
    browserRecordingEnabled ? 'browser' : 'native',
  );
  const [browserActive, setBrowserActive] = useState(false);
  const [messageTab, setMessageTab] = useState<'request' | 'response'>('request');
  const [mode, setMode] = useState<'discover' | 'import' | 'record'>(initialMode);
  const browserMode = mode === 'record' && recordingSource === 'browser' && browserRecordingEnabled;
  const [connection, setConnection] = useState<GRPCConnection>({ target: '' });
  const [headers, setHeaders] = useState<{ name: string; value: string }[]>([]);
  const [imported, setImported] = useState<GRPCImported | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<GRPCMethod | null>(null);
  const [messages, setMessages] = useState<Record<string, YAMLValue>>({});
  const [streams, setStreams] = useState<Record<string, YAMLValue>>({});
  const [generated, setGenerated] = useState<GRPCGenerated | null>(null);
  const [recording, setRecording] = useState<GRPCRecording>({ active: false, calls: [] });
  const [listen, setListen] = useState('127.0.0.1:50052');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [users, setUsers] = useState(1);
  const [duration, setDuration] = useState('1m');
  const [iterations, setIterations] = useState(1);
  const filesRef = useRef<HTMLInputElement>(null),
    folderRef = useRef<HTMLInputElement>(null),
    abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    grpcRequest<GRPCRecording>('recordings/current')
      .then(value => {
        if (!cancelled) {
          setRecording(value);
          if (value.active) setRecordingSource('native');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);
  useEffect(() => {
    if (!recording.active) return;
    let cancelled = false;
    const timer = setInterval(() => {
      grpcRequest<GRPCRecording>('recordings/current')
        .then(value => {
          if (!cancelled) setRecording(value);
        })
        .catch(cause => {
          if (!cancelled) setError(String(cause.message));
        });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [recording.active]);
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    try {
      await task(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  const metadata = () => metadataFromHeaders(headers);
  const mount = (value: GRPCImported) => {
    setImported(value);
    setMessageTab('request');
    setCatalog(value.catalog);
    setSelected([]);
    setGenerated(null);
    const first = value.catalog.services.flatMap(service => service.methods)[0];
    setActive(first ?? null);
    setMessages({});
    setStreams({});
    setReviewed(false);
  };
  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    await run(async signal => {
      if (
        list.some(file => file.size > 16 * 1024 * 1024) ||
        list.reduce((sum, file) => sum + file.size, 0) > 16 * 1024 * 1024
      )
        throw Error('Contracts must be smaller than 16 MB.');
      if (list.length === 1 && list[0].name.endsWith('.protoset')) {
        mount(
          await grpcRequest<GRPCImported>(
            'schema',
            { source: { protoset: await readFile(list[0], 'base64') } },
            signal,
          ),
        );
        return;
      }
      const sources: Record<string, string> = {};
      for (const file of list) {
        if (!file.name.endsWith('.proto')) continue;
        const relative = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name;
        if (sources[relative] !== undefined)
          throw Error('Duplicate proto filename. Import the folder to preserve paths.');
        sources[relative] = await readFile(file, 'text');
      }
      if (!Object.keys(sources).length) throw Error('Select .proto or .protoset files.');
      mount(
        await grpcRequest<GRPCImported>(
          'schema',
          { source: { files: sources, entrypoints: Object.keys(sources) } },
          signal,
        ),
      );
    });
  }
  const valueFor = (method: GRPCMethod) => messages[method.path] ?? method.template ?? {};
  const streamFor = (method: GRPCMethod) =>
    streams[method.path] ?? {
      type: method.kind,
      pacing: 'immediate',
      half_close: true,
      ...(method.kind === 'server_streaming' ? {} : { send: [{ message: valueFor(method) }] }),
    };
  const toggle = (path: string) => {
    setSelected(old => (old.includes(path) ? old.filter(item => item !== path) : [...old, path]));
    setGenerated(null);
  };
  function generate() {
    void run(async signal => {
      if (!imported) return;
      const methods = selected.map(path => {
        const method = imported.catalog.services
          .flatMap(service => service.methods)
          .find(method => method.path === path)!;
        return {
          method: path,
          message: valueFor(method),
          enabled: reviewed,
          ...(method.kind !== 'unary' ? { stream: streamFor(method) } : {}),
        };
      });
      setGenerated(
        await grpcRequest<GRPCGenerated>(
          'generate',
          {
            schemaId: imported.id,
            connection,
            metadata: metadata(),
            methods,
            load: { type: 'constant', users, duration, iterations },
          },
          signal,
        ),
      );
    });
  }
  const field = (label: string, key: keyof NonNullable<GRPCConnection['tls']>) => (
    <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {label}
      <input
        aria-label={label}
        className={input}
        value={connection.tls?.[key] || ''}
        onChange={event => setConnection({ ...connection, tls: { ...connection.tls, [key]: event.target.value } })}
      />
    </label>
  );
  useEffect(() => {
    onActivityChange?.(recording.active || browserActive);
  }, [recording.active, browserActive, onActivityChange]);
  return (
    <GRPCWorkbenchFrame
      page={presentation === 'page'}
      open={open}
      onOpenChange={value => {
        if (!value) abortRef.current?.abort();
        onOpenChange(value);
      }}
    >
      <GRPCWorkbenchHeader page={presentation === 'page'} />
      <div className="flex shrink-0 items-center border-b border-white/5 bg-[#111111]">
        {(
          [
            ['discover', 'Discover', Search],
            ['import', 'Import contract', Upload],
            ['record', 'Record traffic', Radio],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40 ${mode === key ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'}`}
            onClick={() => setMode(key)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {mode === 'record' && browserRecordingEnabled && (
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {language === 'es' ? 'Origen del tráfico' : 'Traffic source'}
            <select
              aria-label="Traffic source"
              className={input}
              value={recordingSource}
              disabled={recording.active || browserActive}
              onChange={event => setRecordingSource(event.target.value as 'browser' | 'native')}
            >
              <option value="browser">
                {language === 'es'
                  ? 'Navegador: detectar HTTP/HTTPS y gRPC-Web'
                  : 'Browser: detect HTTP/HTTPS and gRPC-Web'}
              </option>
              <option value="native">{language === 'es' ? 'Cliente gRPC nativo' : 'Native gRPC client'}</option>
            </select>
          </label>
        )}
        {browserMode && (
          <GRPCBrowserRecorder
            language={language}
            onActiveChange={setBrowserActive}
            onDiscover={() => setMode('discover')}
            onImport={() => setMode('import')}
          />
        )}
        {!browserMode && (
          <section className="grid grid-cols-2 gap-3 rounded-md border border-white/10 bg-[#111111] p-4">
            <label className="col-span-2 block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Server address
              <input
                aria-label="Server address"
                className={input}
                value={connection.target}
                placeholder="reservations.example.com:443"
                onChange={event => setConnection({ ...connection, target: event.target.value })}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(connection.plaintext)}
                onChange={event =>
                  setConnection({
                    ...connection,
                    plaintext: event.target.checked,
                    tls: event.target.checked ? undefined : connection.tls,
                  })
                }
              />
              Plaintext connection (TLS is enabled by default)
            </label>
            {!connection.plaintext && (
              <details className="col-span-2">
                <summary className="cursor-pointer text-xs text-zinc-400">
                  Custom CA and mutual TLS · paths on the Studio host
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {field('CA file', 'caFile')}
                  {field('TLS server name', 'serverName')}
                  {field('Client certificate file', 'clientCert')}
                  {field('Client key file', 'clientKey')}
                </div>
              </details>
            )}
            <div className="col-span-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Authentication and metadata
              </p>
              {headers.map((header, index) => (
                <div
                  key={index}
                  className="flex gap-2"
                >
                  <input
                    aria-label={`Metadata name ${index + 1}`}
                    className={input}
                    placeholder="authorization"
                    value={header.name}
                    onChange={event =>
                      setHeaders(headers.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                    }
                  />
                  <input
                    aria-label={`Metadata value ${index + 1}`}
                    className={input}
                    type="password"
                    placeholder="Bearer token"
                    value={header.value}
                    onChange={event =>
                      setHeaders(
                        headers.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-cyan-300"
                onClick={() => setHeaders([...headers, { name: '', value: '' }])}
              >
                Add metadata
              </button>
              <p className="text-xs text-zinc-500">
                Credentials are used for this connection. Generated projects contain variable placeholders.
              </p>
            </div>
          </section>
        )}
        {mode === 'discover' && (
          <button
            type="button"
            disabled={busy || !connection.target}
            className={primaryButton}
            onClick={() =>
              run(async signal =>
                mount(
                  await grpcRequest<GRPCImported>(
                    'schema',
                    { discover: true, connection, metadata: metadata() },
                    signal,
                  ),
                ),
              )
            }
          >
            Discover service
          </button>
        )}
        {mode === 'import' && (
          <section className="space-y-3">
            <p className="text-xs text-zinc-400">
              Import .proto files with their dependencies, a folder preserving import paths, or a .protoset. No live
              server is required.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => filesRef.current?.click()}
              >
                Choose contract files
              </button>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => folderRef.current?.click()}
              >
                Choose contract folder
              </button>
            </div>
            <input
              ref={filesRef}
              type="file"
              multiple
              accept=".proto,.protoset"
              className="hidden"
              aria-label="Contract files"
              onChange={event => {
                void importFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <input
              ref={folderRef}
              type="file"
              multiple
              {...{ webkitdirectory: '' }}
              className="hidden"
              aria-label="Contract folder"
              onChange={event => {
                void importFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </section>
        )}
        {mode === 'record' && !browserMode && (
          <GRPCNativeRecorder
            recording={recording}
            listen={listen}
            onListenChange={setListen}
            busy={busy}
            canStart={!!connection.target}
            onStart={() =>
              run(async signal => {
                const value = await grpcRequest<{ listen: string }>(
                  'recordings',
                  { connection, listen, schemaId: imported?.id, metadata: metadata() },
                  signal,
                );
                setRecording({ active: true, listen: value.listen, calls: [] });
                setGenerated(null);
              })
            }
            onStop={() =>
              run(async signal => {
                setGenerated(await grpcRequest<GRPCGenerated>('recordings/stop', {}, signal));
                setRecording({ active: false, calls: [] });
              })
            }
          />
        )}
        {imported && mode !== 'record' && (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-md border border-white/10 bg-[#111111] p-3">
              <p className="text-xs text-zinc-400">Select operations in business order.</p>
              {imported.catalog.services.map(service => (
                <div key={service.name}>
                  <h3 className="mb-2 break-all text-xs font-semibold text-cyan-300">{service.name}</h3>
                  {service.methods.map(method => (
                    <div
                      key={method.path}
                      className={
                        'mb-1 flex items-start gap-2 rounded border p-2 transition-colors ' +
                        (active?.path === method.path
                          ? 'border-yellow-400/30 bg-yellow-400/10'
                          : 'border-transparent hover:bg-white/5')
                      }
                    >
                      <input
                        className="mt-1 accent-yellow-400"
                        type="checkbox"
                        aria-label={'Select ' + method.name}
                        checked={selected.includes(method.path)}
                        onChange={() => {
                          toggle(method.path);
                          setActive(method);
                        }}
                      />
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => setActive(method)}
                      >
                        <span className="block break-all text-xs text-zinc-200">
                          {method.name}
                          {selected.includes(method.path) ? ' · ' + (selected.indexOf(method.path) + 1) : ''}
                        </span>
                        <span className="text-[10px] text-zinc-500">{method.kind.replaceAll('_', ' ')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </aside>
            <div className="space-y-3">
              {active && (
                <>
                  <h3 className="break-all text-sm text-cyan-300">{active.path}</h3>
                  {active.description && <p className="text-xs text-zinc-400">{active.description}</p>}
                  <GRPCMessageTabs
                    value={messageTab}
                    onChange={setMessageTab}
                  />
                  {messageTab === 'response' ? (
                    <GRPCContractResponse
                      messageType={active.output}
                      message={active.responseTemplate}
                      streaming={active.kind === 'server_streaming' || active.kind === 'bidi'}
                    />
                  ) : (
                    <>
                      {active.kind === 'unary' || active.kind === 'server_streaming' ? (
                        <GRPCMessageForm
                          catalog={imported.catalog}
                          messageType={active.input}
                          value={valueFor(active)}
                          onChange={value => {
                            setMessages({ ...messages, [active.path]: value });
                            setGenerated(null);
                          }}
                        />
                      ) : null}
                      {active.kind !== 'unary' && (
                        <GRPCStreamEditor
                          catalog={imported.catalog}
                          inputType={active.input}
                          template={active.template}
                          value={streamFor(active)}
                          onChange={value => {
                            setStreams({ ...streams, [active.path]: value });
                            setGenerated(null);
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        )}
        {imported && mode !== 'record' && (
          <section className="space-y-3 rounded-md border border-white/10 bg-[#111111] p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Virtual users
                <input
                  aria-label="Virtual users"
                  className={input}
                  type="number"
                  min="1"
                  value={users}
                  onChange={event => setUsers(Number(event.target.value))}
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Test duration
                <input
                  aria-label="Test duration"
                  className={input}
                  value={duration}
                  onChange={event => setDuration(event.target.value)}
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Iterations per VU (0 = duration)
                <input
                  aria-label="Iterations per VU"
                  className={input}
                  type="number"
                  min="0"
                  value={iterations}
                  onChange={event => setIterations(Number(event.target.value))}
                />
              </label>
            </div>
            <label className="flex gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={event => setReviewed(event.target.checked)}
              />
              I have reviewed the business order and supplied valid test data. Enable the generated steps.
            </label>
            <button
              type="button"
              disabled={busy || !selected.length}
              className={primaryButton}
              onClick={generate}
            >
              Generate scenario
            </button>
          </section>
        )}
        {error && (
          <p
            role="alert"
            className="rounded bg-red-500/10 p-3 text-xs text-red-300"
          >
            {error}
          </p>
        )}
        {busy && (
          <p
            role="status"
            className="text-xs text-cyan-300"
          >
            Working…
          </p>
        )}
        {generated && (
          <section className="space-y-3 rounded-md border border-white/10 bg-[#111111] p-4">
            <GRPCCorrelationReview
              key={generated.id}
              project={generated}
              onChange={setGenerated}
            />
            {generated.warnings.map(warning => (
              <p
                key={warning}
                className="text-xs text-amber-200"
              >
                {warning}
              </p>
            ))}
            <details>
              <summary className="cursor-pointer text-xs text-zinc-400">Preview generated YAML</summary>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-3 text-xs text-zinc-300">
                {generated.yaml}
              </pre>
            </details>
            <div className="flex gap-3">
              {(presentation !== 'page' || onAdd) && (
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => {
                    try {
                      onAdd?.(generated.yaml);
                      onOpenChange(false);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : String(cause));
                    }
                  }}
                >
                  Add to scenario
                </button>
              )}
              <a
                className={button}
                href={grpcBundleURL(generated.id)}
                download
              >
                Download project bundle
              </a>
            </div>
            {presentation === 'page' &&
              !onAdd &&
              (saveProjectEnabled ? (
                <GRPCSaveProject
                  projectId={generated.id}
                  language={language}
                />
              ) : (
                <p className="text-xs text-amber-300">Update Studio to save and open this project locally.</p>
              ))}
            <p className="text-xs text-zinc-500">
              Existing document: append to its first scenario. New document: use the generated load settings. The bundle
              contains YAML and its contract.
            </p>
          </section>
        )}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/5 bg-[#111111] px-6 py-4">
        <p className="text-xs text-zinc-500">
          {recording.active || browserActive
            ? language === 'es'
              ? 'La grabación continúa en segundo plano.'
              : 'Recording continues in the background.'
            : language === 'es'
              ? 'Tu escenario sigue disponible en Studio.'
              : 'Your scenario stays available in Studio.'}
        </p>
        <button
          type="button"
          className={
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-sm font-bold text-yellow-400 transition-colors hover:bg-yellow-400/10 hover:border-yellow-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40'
          }
          onClick={() => {
            abortRef.current?.abort();
            onOpenChange(false);
            onGoToStudio?.();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {presentation === 'page'
            ? language === 'es'
              ? 'Ir a Relampo Studio'
              : 'Go to Relampo Studio'
            : language === 'es'
              ? 'Ir a Studio'
              : 'Go to Studio'}
        </button>
      </footer>
    </GRPCWorkbenchFrame>
  );
}
