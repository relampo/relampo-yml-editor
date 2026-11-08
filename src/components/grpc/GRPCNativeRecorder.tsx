import type { GRPCRecording } from '../../utils/grpcApi';
const input =
  'w-full h-9.5 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400/40';
const button =
  'inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-40';
export function GRPCNativeRecorder({
  recording,
  listen,
  onListenChange,
  onStart,
  onStop,
  busy,
  canStart,
}: {
  recording: GRPCRecording;
  listen: string;
  onListenChange: (listen: string) => void;
  onStart: () => void;
  onStop: () => void;
  busy: boolean;
  canStart: boolean;
}) {
  return (
    <section className="space-y-3 rounded-md border border-white/10 bg-[#111111] p-4">
      <h3 className="text-sm text-cyan-300">Client → Relampo recorder → gRPC service</h3>
      <p className="text-xs text-zinc-400">
        Point the gRPC client or the application server to the recorder. Recording browser HTTPS alone does not capture
        internal gRPC calls. The local recording listener uses plaintext on loopback; the upstream uses the connection
        settings above.
      </p>
      <label className="block text-xs text-zinc-400">
        Local recorder address
        <input
          aria-label="Local recorder address"
          className={input}
          value={listen}
          onChange={event => onListenChange(event.target.value)}
        />
      </label>
      {recording.active ? (
        <>
          <p className="text-xs text-cyan-300">Recording at {recording.listen}</p>
          <button
            type="button"
            disabled={busy}
            className={button}
            onClick={onStop}
          >
            Stop and review recording
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy || !canStart}
          className={button}
          onClick={onStart}
        >
          Start recording
        </button>
      )}
      {recording.calls.map((call, index) => (
        <p
          key={index}
          className="text-xs text-zinc-400"
        >
          {call.method} · {call.type} · {call.messages} messages · {call.status}
        </p>
      ))}
      {recording.truncated && (
        <p className="text-xs text-amber-300">
          Capture limit reached. Forwarding continues; incomplete replay steps will be disabled.
        </p>
      )}
    </section>
  );
}
