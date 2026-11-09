import type { YAMLValue } from '../../types/yaml';
import type { GRPCCatalog } from '../../utils/grpcApi';
import { FreeJSON, GRPCMessageForm } from './GRPCMessageForm';
const input = 'w-full rounded border border-white/15 bg-zinc-950 p-2 text-xs text-zinc-200';
const object = (value: YAMLValue | undefined): Record<string, YAMLValue> =>
  value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Uint8Array) ? value : {};
export function GRPCStreamEditor({
  value,
  onChange,
  catalog,
  inputType,
  template,
}: {
  value: YAMLValue;
  onChange: (value: YAMLValue) => void;
  catalog?: GRPCCatalog | null;
  inputType?: string;
  template?: YAMLValue;
}) {
  const config = object(value),
    sends = Array.isArray(config.send) ? config.send.map(object) : [],
    receives = Array.isArray(config.receive) ? config.receive.map(object) : [];
  const update = (key: string, item: YAMLValue) => onChange({ ...config, [key]: item });
  const updateSend = (index: number, key: string, item: YAMLValue) =>
    update(
      'send',
      sends.map((send, i) => (i === index ? { ...send, [key]: item } : send)),
    );
  const text = (label: string, key: string, placeholder = '') => (
    <label className="block text-xs text-zinc-400">
      {label}
      <input
        aria-label={label}
        className={input}
        value={String(config[key] ?? '')}
        placeholder={placeholder}
        onChange={event => update(key, key.endsWith('_messages') ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
  return (
    <section className="space-y-4 rounded border border-cyan-400/20 p-4">
      <h4 className="text-sm text-cyan-300">Streaming conversation · {String(config.type)}</h4>
      <p className="text-xs text-zinc-400">
        Sending and receiving run independently. Incoming messages are never replayed back to the server.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {text('Session duration', 'duration', 'Optional, e.g. 30s')}
        {text('Fixed interval', 'interval', 'e.g. 100ms')}
        <label className="text-xs text-zinc-400">
          Pacing
          <select
            aria-label="Pacing"
            className={input}
            value={String(config.pacing || 'recorded')}
            onChange={event => update('pacing', event.target.value)}
          >
            <option value="recorded">Recorded timing</option>
            <option value="fixed">Fixed interval</option>
            <option value="immediate">As fast as allowed</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Streams per VU
          <input
            aria-label="Streams per VU"
            className={input}
            type="number"
            min="1"
            max="64"
            value={Number(config.streams_per_vu || 1)}
            onChange={event => update('streams_per_vu', Number(event.target.value))}
          />
        </label>
        {text('Minimum received messages', 'min_messages', '0')}
        {text('Stop after received messages', 'max_messages', 'Optional')}
      </div>
      <fieldset className="space-y-2 rounded border border-white/10 p-3">
        <legend className="px-1 text-xs text-cyan-300">Message latency (optional)</legend>
        <p className="text-xs text-zinc-400">
          Match a unique request ID in outgoing and incoming messages. Leave empty for independent streams.
        </p>
        {(['sent_path', 'received_path'] as const).map(key => (
          <label
            key={key}
            className="block text-xs text-zinc-400"
          >
            {key === 'sent_path' ? 'Outgoing request ID JSONPath' : 'Incoming request ID JSONPath'}
            <input
              aria-label={key === 'sent_path' ? 'Outgoing request ID JSONPath' : 'Incoming request ID JSONPath'}
              className={input}
              placeholder="$.requestId"
              value={String(object(config.latency_correlation)[key] ?? '')}
              onChange={event => {
                const next = { ...object(config.latency_correlation), [key]: event.target.value };
                if (!next.sent_path && !next.received_path) {
                  const rest = { ...config };
                  delete rest.latency_correlation;
                  onChange(rest);
                } else update('latency_correlation', next);
              }}
            />
          </label>
        ))}
      </fieldset>
      <label className="flex gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={config.half_close !== false}
          onChange={event => update('half_close', event.target.checked)}
        />
        Finish sending after the outgoing messages (half-close); keep receiving
      </label>
      {config.type !== 'server_streaming' && (
        <div className="space-y-3">
          <h5 className="text-xs font-semibold text-cyan-300">Client → Server</h5>
          {sends.map((send, index) => (
            <article
              key={index}
              className="space-y-3 rounded border border-white/10 p-3"
            >
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Outgoing message {index + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'send',
                      sends.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-400">
                  Send at
                  <input
                    aria-label={`Send at ${index + 1}`}
                    className={input}
                    value={String(send.at || '')}
                    placeholder="Relative time, e.g. 250ms"
                    onChange={event => updateSend(index, 'at', event.target.value)}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Wait for variable
                  <input
                    aria-label={`Wait for variable ${index + 1}`}
                    className={input}
                    value={String(send.wait_for || '')}
                    placeholder="Variable extracted from a response"
                    onChange={event => updateSend(index, 'wait_for', event.target.value)}
                  />
                </label>
              </div>
              {send.payload_base64 !== undefined ? (
                <label className="text-xs text-amber-300">
                  Binary payload (not semantically editable)
                  <textarea
                    aria-label={`Binary message ${index + 1}`}
                    className={input}
                    value={String(send.payload_base64)}
                    onChange={event => updateSend(index, 'payload_base64', event.target.value)}
                  />
                </label>
              ) : catalog && inputType ? (
                <GRPCMessageForm
                  catalog={catalog}
                  messageType={inputType}
                  value={send.message}
                  onChange={message => updateSend(index, 'message', message)}
                />
              ) : (
                <FreeJSON
                  label={`Message ${index + 1} (JSON)`}
                  value={send.message}
                  onChange={message => updateSend(index, 'message', message)}
                />
              )}
            </article>
          ))}
          <button
            type="button"
            className="text-xs text-cyan-300"
            onClick={() => update('send', [...sends, { message: template ?? {} }])}
          >
            Add outgoing message
          </button>
        </div>
      )}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold text-amber-300">Server → Client · extraction and expectations</h5>
        {receives.map((rule, index) => {
          const edit = (key: string, item: YAMLValue) =>
            update(
              'receive',
              receives.map((old, i) => (i === index ? { ...old, [key]: item } : old)),
            );
          const extractors = Array.isArray(rule.extractors) ? rule.extractors : [];
          const extractor = object(extractors[0]);
          return (
            <article
              key={index}
              className="space-y-2 rounded border border-white/10 p-3"
            >
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Incoming rule {index + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      'receive',
                      receives.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-400">
                  Message number
                  <input
                    aria-label={`Incoming index ${index + 1}`}
                    className={input}
                    type="number"
                    min="0"
                    value={Number(rule.index || 0)}
                    onChange={event => edit('index', Number(event.target.value))}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Match field
                  <input
                    aria-label={`Match field ${index + 1}`}
                    className={input}
                    value={String(rule.path || '')}
                    placeholder="e.g. type"
                    onChange={event => edit('path', event.target.value)}
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Equals
                  <input
                    aria-label={`Match value ${index + 1}`}
                    className={input}
                    value={String(rule.equals ?? '')}
                    onChange={event => edit('equals', event.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-400">
                  Extract variable
                  <input
                    aria-label={`Extract variable ${index + 1}`}
                    className={input}
                    value={String(extractor.var || '')}
                    onChange={event =>
                      edit('extractors', [
                        { ...extractor, type: 'jsonpath', var: event.target.value },
                        ...extractors.slice(1),
                      ])
                    }
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  JSONPath
                  <input
                    aria-label={`Extractor path ${index + 1}`}
                    className={input}
                    placeholder="$.sessionId"
                    value={String(extractor.expression || '')}
                    onChange={event =>
                      edit('extractors', [
                        { ...extractor, type: 'jsonpath', expression: event.target.value },
                        ...extractors.slice(1),
                      ])
                    }
                  />
                </label>
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-zinc-400">Advanced assertions and extractors</summary>
                <FreeJSON
                  label={`Incoming assertions ${index + 1}`}
                  value={rule.assertions ?? []}
                  onChange={next => edit('assertions', next)}
                />
                <FreeJSON
                  label={`Incoming extractors ${index + 1}`}
                  value={rule.extractors ?? []}
                  onChange={next => edit('extractors', next)}
                />
              </details>
            </article>
          );
        })}
        <button
          type="button"
          className="text-xs text-amber-300"
          onClick={() => update('receive', [...receives, { index: 0 }])}
        >
          Add incoming rule
        </button>
      </div>
    </section>
  );
}
export function GRPCRecordedConversation({ messages }: { messages: YAMLValue }) {
  if (!Array.isArray(messages)) return null;
  return (
    <section className="space-y-2">
      <h4 className="text-xs text-zinc-300">Recorded conversation · evidence, not deterministic expected responses</h4>
      {messages.slice(0, 200).map((value, index) => {
        const item = object(value);
        return (
          <article
            key={index}
            className={
              'rounded border p-3 text-xs ' +
              (item.direction === 'client' ? 'border-cyan-400/20 bg-cyan-400/5' : 'border-amber-400/20 bg-amber-400/5')
            }
          >
            <div className="mb-2 flex justify-between text-zinc-400">
              <span>{item.direction === 'client' ? 'Client → Server' : 'Server → Client'}</span>
              <span>
                +{Number(item.at_ms || 0).toFixed(1)} ms · {Number(item.size_bytes || 0)} bytes
              </span>
            </div>
            <pre className="overflow-auto whitespace-pre-wrap font-mono text-zinc-300">
              {JSON.stringify(item.message ?? { payload_base64: item.payload_base64 }, null, 2)}
            </pre>
          </article>
        );
      })}
      {messages.length > 200 && (
        <p className="text-xs text-zinc-400">Showing the first 200 messages. Full evidence remains in the YAML.</p>
      )}
    </section>
  );
}
