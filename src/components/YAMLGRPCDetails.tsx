import { RequestDetailsTabs } from './RequestDetailsTabs';
import { GRPCContractResponse } from './grpc/GRPCContractResponse';
import { GRPCChecksEditor } from './grpc/GRPCChecksEditor';
import { GRPCStreamEditor, GRPCRecordedConversation } from './grpc/GRPCStreamEditor';
import { GRPCMessageForm } from './grpc/GRPCMessageForm';
import { useGRPCSchema } from '../hooks/useGRPCSchema';
import { useEffect, useState } from 'react';
import type { YAMLNodeData, YAMLValue } from '../types/yaml';
import type { NodeDetailProps } from './yaml-node-details/types';

function JsonField({
  label,
  value,
  array = false,
  anyValue = false,
  onCommit,
}: {
  label: string;
  value: unknown;
  array?: boolean;
  anyValue?: boolean;
  onCommit: (value: YAMLValue) => void;
}) {
  const serialized = JSON.stringify(value === undefined ? (array ? [] : {}) : value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(serialized);
    setError('');
  }, [serialized]);
  return (
    <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
      <span>{label}</span>
      <textarea
        aria-label={label}
        className="w-full min-h-28 p-3 rounded border border-white/10 bg-white/5 text-zinc-300 font-mono text-sm normal-case tracking-normal font-normal"
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          setError('');
        }}
        onBlur={() => {
          // Focus alone must not write a default `{}`/`[]` into the YAML.
          if (draft === serialized) return;
          try {
            const parsed: YAMLValue = JSON.parse(draft);
            if (
              array
                ? !Array.isArray(parsed)
                : !anyValue && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
            ) {
              throw new Error(array ? 'Expected a JSON array' : 'Expected a JSON object');
            }
            onCommit(parsed);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Invalid JSON');
          }
        }}
      />
      {error && (
        <span
          role="alert"
          className="text-red-400"
        >
          {error}
        </span>
      )}
    </label>
  );
}

export function YAMLGRPCDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const data = node.data || {};
  const { catalog } = useGRPCSchema();
  const method = catalog?.services.flatMap(service => service.methods).find(method => method.path === data.method);
  const update = (field: string, value: YAMLValue) => onNodeUpdate?.(node.id, { ...data, [field]: value });
  const field = (label: string, key: keyof YAMLNodeData, placeholder = '') => (
    <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
      <span>{label}</span>
      <input
        aria-label={label}
        value={String(data[key] ?? '')}
        placeholder={placeholder}
        onChange={event => {
          // An empty field removes the key so the value is inherited (for example from grpc_defaults).
          // payload_base64 stays: its presence selects the binary payload mode.
          if (event.target.value || key === 'payload_base64') return update(key, event.target.value);
          const next = { ...data };
          delete next[key];
          onNodeUpdate?.(node.id, next);
        }}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono h-9.5 normal-case tracking-normal font-normal"
      />
    </label>
  );
  if (node.type === 'grpc_defaults') {
    return (
      <section className="space-y-5">
        <h4 className="text-sm font-semibold text-cyan-300">gRPC Defaults</h4>
        {field('Target', 'target', 'host:port')}
        {field('Transport', 'transport', 'grpc or grpc_web')}
        {field('Protoset', 'protoset', './api/service.protoset')}
        {field('Timeout', 'timeout', '30s')}
        <label className="flex gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={data.plaintext === true}
            onChange={event => update('plaintext', event.target.checked)}
          />
          Plaintext connection (explicit opt-in)
        </label>
        <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <span>Connection scope</span>
          <select
            aria-label="Connection scope"
            value={data.connection_scope || 'per_vu'}
            onChange={event => update('connection_scope', event.target.value)}
            className="block w-full bg-zinc-900 p-2 rounded border border-white/10"
          >
            <option value="per_vu">Per VU</option>
            <option value="run">Shared across run</option>
          </select>
        </label>
        <label className="flex gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={data.reflection !== false}
            onChange={event => update('reflection', event.target.checked)}
          />
          Reflection
        </label>
        <JsonField
          key={node.id + '-metadata'}
          label="Metadata (JSON)"
          value={data.metadata}
          onCommit={value => update('metadata', value)}
        />
      </section>
    );
  }
  return (
    <section
      className="flex flex-col h-full"
      aria-label="gRPC Request"
    >
      <RequestDetailsTabs
        activeTab={tab}
        onChange={setTab}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <fieldset
          disabled={data.enabled === false}
          className={`min-w-0 border-0 p-0 m-0 ${data.enabled === false ? 'opacity-60' : ''}`}
        >
          {tab === 'request' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">{field('Target', 'target', 'Inherits grpc_defaults.target')}</div>
                <div className="col-span-8">{field('RPC method', 'method', '/package.Service/Method')}</div>
              </div>
              <p className="text-xs text-zinc-500">gRPC · {data.stream ? 'Streaming' : 'Unary'} · Protobuf</p>
              {field('Transport', 'transport', 'Inherits grpc_defaults.transport')}
              {field('Protoset', 'protoset', 'Inherits grpc_defaults.protoset or reflection')}
              <div className="grid grid-cols-2 gap-3">
                {field('Timeout', 'timeout', '30s')}
                {field('Expected status', 'expected_status', 'OK')}
              </div>
              {catalog &&
                method &&
                !data.payload_base64 &&
                (!data.stream || (data.stream as Record<string, YAMLValue>).type === 'server_streaming') && (
                  <GRPCMessageForm
                    catalog={catalog}
                    messageType={method.input}
                    value={data.message}
                    onChange={message => update('message', message)}
                  />
                )}
              {data.stream && (
                <GRPCStreamEditor
                  catalog={catalog}
                  inputType={method?.input}
                  template={method?.template}
                  value={data.stream}
                  onChange={stream => update('stream', stream)}
                />
              )}
              <JsonField
                key={node.id + '-metadata'}
                label="Metadata (JSON)"
                value={data.metadata}
                onCommit={value => update('metadata', value)}
              />
              {data.payload_base64 !== undefined
                ? field('Payload (base64)', 'payload_base64')
                : (!data.stream || (data.stream as Record<string, YAMLValue>).type === 'server_streaming') && (
                    <JsonField
                      key={node.id + '-message'}
                      label="Message (JSON)"
                      anyValue
                      value={data.message}
                      onCommit={value => update('message', value)}
                    />
                  )}
              <GRPCChecksEditor
                extractors={data.extractors}
                assertions={data.assertions}
                onExtractorsChange={value => update('extractors', value)}
                onAssertionsChange={value => update('assertions', value)}
              />
              <details className="rounded border border-white/10 p-3 space-y-4">
                <summary className="text-xs text-zinc-400 cursor-pointer">
                  Advanced: extractors and assertions JSON
                </summary>
                <JsonField
                  key={node.id + '-extractors'}
                  label="Extractors (JSON)"
                  array
                  value={data.extractors}
                  onCommit={value => update('extractors', value)}
                />
                <JsonField
                  key={node.id + '-assertions'}
                  label="Assertions (JSON)"
                  array
                  value={data.assertions}
                  onCommit={value => update('assertions', value)}
                />
              </details>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.response_template || method?.responseTemplate !== undefined) && (
                <GRPCContractResponse
                  messageType={data.response_template?.message_type || method?.output || ''}
                  message={data.response_template ? data.response_template.message : method?.responseTemplate}
                  streaming={!!data.stream && (data.stream as Record<string, YAMLValue>).type !== 'client_streaming'}
                />
              )}
              {!data.response && (
                <p className="text-xs text-zinc-500">
                  No recorded response yet. Run Debug or record real traffic to obtain server values.
                </p>
              )}
              <GRPCRecordedConversation messages={(data.response as Record<string, YAMLValue> | undefined)?.messages} />
              {data.response && (
                <label className="block space-y-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <span>Recorded response</span>
                  <textarea
                    aria-label="Recorded response"
                    readOnly
                    value={JSON.stringify(data.response ?? {}, null, 2)}
                    className="w-full min-h-72 p-3 rounded border border-white/10 bg-white/5 text-zinc-300 font-mono text-sm normal-case tracking-normal font-normal"
                  />
                </label>
              )}
            </div>
          )}
        </fieldset>
      </div>
    </section>
  );
}
