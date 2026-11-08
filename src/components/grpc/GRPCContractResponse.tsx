import type { YAMLValue } from '../../types/yaml';
export function GRPCContractResponse({
  messageType,
  message,
  streaming = false,
}: {
  messageType: string;
  message: YAMLValue;
  streaming?: boolean;
}) {
  return (
    <section className="space-y-3 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-cyan-300">Response template from contract</h4>
        <span className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-zinc-400">Not executed</span>
      </div>
      <p className="break-all font-mono text-xs text-zinc-400">{messageType}</p>
      <p className="text-xs text-zinc-400">
        This shows fields and initial values from the contract, not an actual server response. Real values appear after
        executing or recording the call.
      </p>
      {streaming && (
        <p className="text-xs text-zinc-400">
          Structure of one server message. The stream may return multiple messages.
        </p>
      )}
      <textarea
        aria-label="Contract response template"
        readOnly
        value={JSON.stringify(message ?? null, null, 2)}
        className="min-h-44 w-full rounded border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-200"
      />
      <p className="text-xs text-zinc-500">
        Repeated message fields show one example item to reveal their structure. This template does not create
        extractors or authorization rules.
      </p>
    </section>
  );
}

export function GRPCMessageTabs({
  value,
  onChange,
}: {
  value: 'request' | 'response';
  onChange: (tab: 'request' | 'response') => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="RPC messages"
      className="flex gap-4 border-b border-white/10 pb-2"
    >
      {(['request', 'response'] as const).map(tab => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          onClick={() => onChange(tab)}
          className={'text-sm ' + (value === tab ? 'text-yellow-300' : 'text-zinc-400')}
        >
          {tab === 'request' ? 'Request' : 'Response'}
        </button>
      ))}
    </div>
  );
}
