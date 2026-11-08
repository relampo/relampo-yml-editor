import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, X, Plus, Clock } from 'lucide-react';
import { Field, Choice } from './yaml-node-details/WebSocketFields';
import { BodyTextarea } from './fields/BodyTextarea';
import { RequestUrlRow } from './fields/RequestUrlRow';
import type { NodeDetailProps } from './yaml-node-details/types';

type Data = Record<string, unknown>;
const obj = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
const list = (value: unknown): Data[] => (Array.isArray(value) ? value.map(obj) : []);
function Payload({ value, onChange, index }: { value: Data; onChange: (v: Data) => void; index: number }) {
  const binary = value.type === 'binary';
  const raw = String(value[binary ? 'data_base64' : 'data'] ?? '');
  const [draft, setDraft] = useState(raw);
  const [error, setError] = useState('');
  const [variable, setVariable] = useState('');
  useEffect(() => {
    setDraft(raw);
    setError('');
  }, [raw]);
  let fields: Data | undefined;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    )
      fields = parsed;
  } catch {
    /* plain text */
  }
  return (
    <div className="space-y-3">
      <Choice
        label={`Message format ${index}`}
        value={binary ? 'binary' : 'text'}
        choices={[
          ['text', 'Text / JSON'],
          ['binary', 'Binary (base64)'],
        ]}
        onChange={type => {
          const next: Data = { ...value, type };
          delete next.data;
          delete next.data_base64;
          next[type === 'binary' ? 'data_base64' : 'data'] = '';
          onChange(next);
          setDraft('');
        }}
      />
      {binary && <p className="text-xs">Opaque binary payload. Edit its base64 representation.</p>}
      {fields && (
        <fieldset className="space-y-2">
          <legend className="text-xs">JSON fields</legend>
          {Object.entries(fields).map(([key, v]) => (
            <Field
              key={key}
              label={`${key} · message ${index}`}
              value={v}
              onChange={text => {
                let next: unknown = text;
                if (typeof v === 'number' && text !== '' && Number.isFinite(Number(text))) next = Number(text);
                if (typeof v === 'boolean' && ['true', 'false'].includes(text)) next = text === 'true';
                const updated = JSON.stringify({ ...fields, [key]: next });
                onChange({ ...value, data: updated });
                setDraft(updated);
              }}
            />
          ))}
        </fieldset>
      )}
      <label className="block space-y-1 text-xs">
        <span>
          {binary ? 'Base64 payload' : 'Message payload'} {index}
        </span>
        <BodyTextarea
          aria-label={`Message payload ${index}`}
          value={draft === raw ? raw : draft}
          onChange={e => {
            setDraft(e.target.value);
            setError('');
          }}
          onBlur={() => {
            if (binary) {
              try {
                if (btoa(atob(draft)) !== draft) throw new Error('Use canonical padded base64');
              } catch {
                setError('Enter valid base64');
                return;
              }
            }
            if (!binary && /^\s*[[{]/.test(draft)) {
              try {
                JSON.parse(draft);
              } catch {
                setError('Check JSON syntax before saving');
                return;
              }
            }
            onChange({ ...value, [binary ? 'data_base64' : 'data']: draft });
          }}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="text-red-400 text-xs"
        >
          {error}
        </p>
      )}
      <div className="flex gap-2 items-end">
        <Field
          label={`Variable name ${index}`}
          value={variable}
          onChange={setVariable}
        />
        <button
          type="button"
          className="text-xs text-yellow-400"
          onClick={() => {
            if (variable) {
              const next = draft + '{{' + variable + '}}';
              setDraft(next);
            }
          }}
        >
          Insert variable
        </button>
      </div>
      <Field
        label={`Track response as ${index}`}
        value={value.correlation}
        placeholder="offer"
        onChange={correlation => onChange({ ...value, correlation })}
      />
      <Field
        label={`Delay before ${index}`}
        value={value.delay_before}
        placeholder="250ms"
        onChange={delay_before => onChange({ ...value, delay_before })}
      />
    </div>
  );
}
function Receive({ value, onChange, index }: { value: Data; onChange: (v: Data) => void; index: number }) {
  const match = obj(value.match);
  const operator = ['equals', 'contains', 'not_contains', 'regex'].find(k => match[k] !== undefined) || 'equals';
  const evidence = obj(value.response);
  let sample: Data = {};
  try {
    sample = obj(JSON.parse(String(evidence.data || '{}')));
  } catch {
    /* non JSON */
  }
  const updateMatch = (fields: Data) =>
    onChange({ ...value, match: { ...match, equals: match.equals ?? '', ...fields } });
  const extractors = list(value.extractors);
  const assertions = list(value.assertions);
  return (
    <div className="space-y-3">
      {evidence.data !== undefined && (
        <label className="block text-xs">
          Recorded message {index}
          <BodyTextarea
            aria-label={`Recorded message ${index}`}
            readOnly
            value={String(evidence.data)}
          />
        </label>
      )}
      {evidence.data_base64 !== undefined && (
        <p className="text-xs break-all">Recorded binary (base64): {String(evidence.data_base64)}</p>
      )}
      <Choice
        label={`Wait for ${index}`}
        value={value.match ? 'matching' : 'next'}
        choices={[
          ['next', 'Next message'],
          ['matching', 'First matching message'],
        ]}
        onChange={v => {
          const next = { ...value };
          if (v === 'next') delete next.match;
          else next.match = { equals: '' };
          onChange(next);
        }}
      />
      <Field
        label={`JSON field ${index}`}
        value={match.jsonpath}
        placeholder="$.type (empty = whole message)"
        onChange={jsonpath => updateMatch({ jsonpath })}
      />
      <Choice
        label={`Condition ${index}`}
        value={operator}
        choices={[
          ['equals', 'Equals'],
          ['contains', 'Contains'],
          ['not_contains', 'Does not contain'],
          ['regex', 'Matches pattern'],
        ]}
        onChange={key => onChange({ ...value, match: { jsonpath: match.jsonpath, [key]: match[operator] ?? '' } })}
      />
      <Field
        label={`Expected value ${index}`}
        value={match[operator]}
        onChange={v => onChange({ ...value, match: { jsonpath: match.jsonpath, [operator]: v } })}
      />
      {typeof sample.type === 'string' && (
        <button
          type="button"
          className="text-xs text-yellow-400"
          onClick={() => onChange({ ...value, match: { jsonpath: '$.type', equals: sample.type } })}
        >
          Wait for type = {sample.type}
        </button>
      )}
      <Choice
        label={`Other messages ${index}`}
        value={String(value.unmatched || 'keep')}
        choices={[
          ['keep', 'Keep for later receives'],
          ['ignore', 'Discard unmatched messages'],
          ['fail', 'Fail on unexpected message'],
        ]}
        onChange={unmatched => onChange({ ...value, unmatched })}
      />
      <Choice
        label={`Receive format ${index}`}
        value={String(value.type || 'any')}
        choices={[
          ['any', 'Any message'],
          ['text', 'Text / JSON'],
          ['binary', 'Binary'],
        ]}
        onChange={type => onChange({ ...value, type })}
      />
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          aria-label={`Optional event ${index}`}
          checked={value.optional === true}
          onChange={e => onChange({ ...value, optional: e.target.checked })}
        />
        Optional event: continue if it does not arrive before the timeout
      </label>
      <Field
        label={`Response to tracked send ${index}`}
        value={value.correlation}
        placeholder="offer"
        onChange={correlation => onChange({ ...value, correlation })}
      />
      <p className="text-xs opacity-70">
        For response timing, use the same tracking name on send and receive, and match a request ID to identify the
        response.
      </p>
      <Field
        label={`Receive timeout ${index}`}
        value={value.timeout}
        placeholder="5s"
        onChange={timeout => onChange({ ...value, timeout })}
      />
      <fieldset className="space-y-2">
        <legend className="text-xs">Save values as variables</legend>
        {Object.keys(sample)
          .slice(0, 12)
          .filter(key => !['object', 'undefined'].includes(typeof sample[key]))
          .map(key => (
            <button
              key={key}
              type="button"
              className="text-xs text-yellow-400 mr-3"
              onClick={() =>
                onChange({
                  ...value,
                  extractors: [
                    ...extractors,
                    {
                      type: 'jsonpath',
                      expression: '$[' + JSON.stringify(key) + ']',
                      var: key.replace(/[^a-zA-Z0-9_]/g, '_'),
                    },
                  ],
                })
              }
            >
              Save {key} as variable
            </button>
          ))}
        {extractors.map((ex, i) => (
          <div
            key={i}
            className="grid grid-cols-2 gap-2"
          >
            <Field
              label={`Extract field ${index}.${i + 1}`}
              value={ex.expression}
              placeholder="$.id"
              onChange={expression =>
                onChange({
                  ...value,
                  extractors: extractors.map((item, j) => (j === i ? { ...item, expression } : item)),
                })
              }
            />
            <Field
              label={`Save as ${index}.${i + 1}`}
              value={ex.var}
              placeholder="subscription_id"
              onChange={variable =>
                onChange({
                  ...value,
                  extractors: extractors.map((item, j) => (j === i ? { ...item, var: variable } : item)),
                })
              }
            />
            <button
              type="button"
              className="text-xs text-yellow-400"
              onClick={() => onChange({ ...value, extractors: extractors.filter((_, j) => j !== i) })}
            >
              Remove extraction
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-yellow-400"
          onClick={() =>
            onChange({
              ...value,
              extractors: [...extractors, { type: 'jsonpath', expression: '$.id', var: 'extracted_value' }],
            })
          }
        >
          + Extract a value
        </button>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs">Required checks</legend>
        {assertions.map((a, i) => (
          <div
            key={i}
            className="grid grid-cols-2 gap-2"
          >
            <Field
              label={`Check field ${index}.${i + 1}`}
              value={a.path}
              onChange={path =>
                onChange({ ...value, assertions: assertions.map((item, j) => (j === i ? { ...item, path } : item)) })
              }
            />
            <Field
              label={`Check equals ${index}.${i + 1}`}
              value={a.value}
              onChange={v =>
                onChange({
                  ...value,
                  assertions: assertions.map((item, j) => (j === i ? { ...item, value: v } : item)),
                })
              }
            />
            <button
              type="button"
              className="text-xs text-yellow-400"
              onClick={() => onChange({ ...value, assertions: assertions.filter((_, j) => j !== i) })}
            >
              Remove check
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-yellow-400"
          onClick={() =>
            onChange({ ...value, assertions: [...assertions, { type: 'jsonpath', path: '$.type', value: '' }] })
          }
        >
          + Add a check
        </button>
      </fieldset>
      <p className="text-xs opacity-70">Recorded messages are examples. Checks apply only when you add them.</p>
    </div>
  );
}
export function YAMLWebSocketDetails({ node, onNodeUpdate, onSplit }: NodeDetailProps & { onSplit?: () => void }) {
  const data = (node.data || {}) as unknown as Data;
  const update = (next: Data) => onNodeUpdate?.(node.id, next);
  const set = (key: string, value: unknown) => update({ ...data, [key]: value });
  const actions = list(data.actions);
  const mode = String(data.action || 'conversation');
  const setAction = (i: number, action: Data) =>
    set(
      'actions',
      actions.map((item, j) => (i === j ? action : item)),
    );
  const [tab, setTab] = useState('conversation' === mode || 'connect' === mode ? 'connection' : 'messages');
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(() => new Set());
  const disabled = data.enabled === false;
  const url = String(data.url || '');
  // Split without URL normalization so templates, IPv6 and query escaping survive edits.
  const address = /^(wss?):\/\/([^/?#]*)(.*)$/i.exec(url);
  const protocol = address?.[1]?.toLowerCase() || 'wss';
  const host = address?.[2] || '';
  const path = address?.[3] || '/';
  const updateAddress = (parts: { protocol?: string; host?: string; path?: string }) => {
    const nextPath = parts.path ?? path;
    set(
      'url',
      `${parts.protocol ?? protocol}://${parts.host ?? host}${nextPath.startsWith('/') ? nextPath : '/' + nextPath}`,
    );
  };
  const tabs = [
    ['connection', 'Connection'],
    ['messages', 'Messages'],
    ['advanced', 'Advanced'],
  ];
  return (
    <section
      className="flex flex-col min-h-0"
      data-protocol="websocket"
    >
      <div
        role="tablist"
        aria-label="WebSocket details"
        className="flex items-center border-b border-white/5 bg-[#111111] shrink-0"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`ws-${node.id}-${key}-tab`}
            aria-controls={`ws-${node.id}-${key}`}
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`ws-${node.id}-connection`}
        aria-labelledby={`ws-${node.id}-connection-tab`}
        hidden={tab !== 'connection'}
        className="p-6"
      >
        <fieldset
          disabled={disabled}
          className="min-w-0 border-0 p-0 m-0 space-y-5"
        >
          {mode === 'conversation' && onSplit && (
            <button
              type="button"
              className="text-yellow-400 text-xs rounded border border-yellow-400/20 bg-yellow-400/5 px-3 py-2"
              onClick={onSplit}
            >
              Keep connection across scenario steps
            </button>
          )}
          <Choice
            label="Connection mode"
            value={mode}
            choices={[
              ['conversation', 'Complete conversation'],
              ['connect', 'Open named connection'],
              ['send', 'Send on named connection'],
              ['receive', 'Wait on named connection'],
              ['wait', 'Keep connection open'],
              ['ping', 'Ping connection'],
              ['reconnect', 'Reconnect'],
              ['close', 'Close named connection'],
            ]}
            onChange={action => {
              const next = { ...data };
              delete next.actions;
              delete next.action;
              delete next.send;
              delete next.receive;
              delete next.close;
              delete next.wait;
              if (action === 'conversation') {
                delete next.connection;
                next.actions = actions.length ? actions : [{ receive: { type: 'text' } }, { close: { code: 1000 } }];
                next.url = next.url || 'wss://example.com/ws';
              } else {
                next.action = action;
                next.connection = typeof data.connection === 'string' ? data.connection : 'live_feed';
                if (action !== 'connect') delete next.url;
                if (action === 'send') next.send = { type: 'text', data: '{}' };
                if (action === 'receive') next.receive = { type: 'text' };
                if (action === 'wait') next.wait = '1s';
                if (action === 'connect') next.url = next.url || 'wss://example.com/ws';
              }
              update(next);
            }}
          />
          {mode !== 'conversation' && (
            <Field
              label="Connection name"
              value={data.connection}
              onChange={connection => set('connection', connection)}
            />
          )}
          {(mode === 'conversation' || mode === 'connect') && (
            <>
              {!address && url ? (
                <Field
                  label="WebSocket URL"
                  value={url}
                  onChange={url => set('url', url)}
                />
              ) : (
                <RequestUrlRow
                  requestMethod="WS"
                  onMethodChange={() => {}}
                  methodControl={
                    <span className="inline-flex h-9.5 items-center px-3 rounded border border-white/10 bg-white/5 text-violet-300 text-sm font-mono">
                      WS
                    </span>
                  }
                  protocolOptions={['wss', 'ws']}
                  protocol={protocol}
                  onProtocolChange={protocol => updateAddress({ protocol })}
                  displayBaseUrl={host}
                  baseUrlPlaceholder="example.com:8443"
                  onBaseUrlChange={host => updateAddress({ host })}
                  pathInputValue={path}
                  onPathChange={path => updateAddress({ path })}
                  searchText=""
                  compactInputClass="h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
                />
              )}
              <p className="text-xs text-zinc-500">
                {node.children?.some(child => child.type === 'headers')
                  ? 'Edit handshake headers in the Headers element under this WebSocket in the tree.'
                  : 'Use Add → Headers on this WebSocket in the tree to configure handshake headers.'}
              </p>
              <Field
                label="Subprotocols"
                value={Array.isArray(data.subprotocols) ? data.subprotocols.join(', ') : ''}
                onChange={v =>
                  set(
                    'subprotocols',
                    v
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean),
                  )
                }
              />
              <Field
                label="Expected subprotocol"
                value={data.expected_subprotocol}
                onChange={v => set('expected_subprotocol', v)}
              />
              <p className="text-xs opacity-70">
                HTTP login cookies and authentication are inherited. Use header values such as {'{{token}}'} to reuse
                extracted values.
              </p>
            </>
          )}
        </fieldset>
      </div>
      <div
        role="tabpanel"
        id={`ws-${node.id}-advanced`}
        aria-labelledby={`ws-${node.id}-advanced-tab`}
        hidden={tab !== 'advanced'}
        className="p-6"
      >
        <fieldset
          disabled={disabled}
          className="min-w-0 border-0 p-0 m-0 space-y-5"
        >
          <Field
            label="Default timeout"
            value={data.timeout}
            placeholder="30s"
            onChange={timeout => set('timeout', timeout)}
          />
          {mode === 'connect' && (
            <details>
              <summary className="text-xs">Buffer and reconnection</summary>
              <div className="space-y-3 py-3">
                <Field
                  label="Buffered messages"
                  value={data.buffer_messages ?? 64}
                  onChange={v => set('buffer_messages', Number(v))}
                />
                <Field
                  label="Buffer bytes"
                  value={data.buffer_bytes ?? 4194304}
                  onChange={v => set('buffer_bytes', Number(v))}
                />
                <Field
                  label="Reconnect attempts"
                  value={obj(data.reconnect).attempts ?? 1}
                  onChange={v => set('reconnect', { ...obj(data.reconnect), attempts: Number(v) })}
                />
                <Field
                  label="Reconnect backoff"
                  value={obj(data.reconnect).backoff ?? '1s'}
                  onChange={backoff => set('reconnect', { ...obj(data.reconnect), backoff })}
                />
              </div>
            </details>
          )}
        </fieldset>
      </div>
      <div
        role="tabpanel"
        id={`ws-${node.id}-messages`}
        aria-labelledby={`ws-${node.id}-messages-tab`}
        hidden={tab !== 'messages'}
        className="p-6 space-y-5"
      >
        {mode === 'connect' && (
          <p className="text-xs text-zinc-500">
            This step opens the connection. Use send and receive steps to exchange messages.
          </p>
        )}
        {mode === 'ping' && (
          <p className="text-xs text-zinc-500">Sends a WebSocket ping control frame on the named connection.</p>
        )}

        <fieldset
          disabled={disabled}
          className="min-w-0 border-0 p-0 m-0 space-y-5"
        >
          {mode === 'send' && (
            <Payload
              key={node.id + 'send'}
              value={obj(data.send)}
              onChange={v => set('send', v)}
              index={1}
            />
          )}
          {mode === 'receive' && (
            <Receive
              value={obj(data.receive)}
              onChange={v => set('receive', v)}
              index={1}
            />
          )}
          {mode === 'wait' && (
            <Field
              label="Wait duration"
              value={data.wait}
              onChange={v => set('wait', v)}
            />
          )}
          {mode === 'close' && (
            <Field
              label="Close code"
              value={obj(data.close).code ?? 1000}
              onChange={v => set('close', { ...obj(data.close), code: Number(v) })}
            />
          )}
          {mode === 'reconnect' && (
            <p className="text-xs">
              Reconnect opens the same URL. Add send steps to resubscribe using your saved sequence. Business messages
              are never replayed automatically.
            </p>
          )}
        </fieldset>
        {mode === 'conversation' && (
          <>
            <ol
              className="divide-y divide-white/5 border border-white/10 rounded overflow-hidden"
              aria-label="Message timeline"
            >
              {actions.map((action, i) => {
                const kind = action.send ? 'send' : action.receive ? 'receive' : 'close';
                const value = obj(action[kind]);
                return (
                  <li
                    key={node.id + '-' + i + '-' + kind}
                    className="bg-[#111111]"
                  >
                    <div className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-zinc-300">
                      <button
                        type="button"
                        aria-label={`Edit message ${i + 1}`}
                        aria-expanded={expandedMessages.has(i)}
                        aria-controls={`ws-${node.id}-message-${i}`}
                        className="flex items-center gap-2 flex-1 text-left hover:text-yellow-400"
                        onClick={() =>
                          setExpandedMessages(previous => {
                            const next = new Set(previous);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                      >
                        <span className="text-zinc-500">{expandedMessages.has(i) ? '▾' : '▸'}</span>
                        {kind === 'send' ? (
                          <ArrowUpRight size={16} />
                        ) : kind === 'receive' ? (
                          <ArrowDownLeft size={16} />
                        ) : (
                          <X size={16} />
                        )}
                        <span>{i + 1}. </span>
                        <span>
                          {kind === 'send'
                            ? 'Client → Server'
                            : kind === 'receive'
                              ? 'Server → Client'
                              : 'Close connection'}
                        </span>
                        <span className="opacity-60">
                          {String(obj(value.response_preview).time_ms ?? obj(value.response).time_ms ?? '')}{' '}
                          {value.response || value.response_preview ? 'ms recorded' : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        className="ml-auto text-zinc-500 hover:text-red-400 disabled:opacity-40"
                        aria-label={`Remove message ${i + 1}`}
                        onClick={() =>
                          set(
                            'actions',
                            actions.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div
                      id={`ws-${node.id}-message-${i}`}
                      hidden={!expandedMessages.has(i)}
                      className="p-4 border-t border-white/5"
                    >
                      <fieldset
                        disabled={disabled}
                        className="min-w-0 border-0 p-0 m-0 space-y-4"
                      >
                        {kind === 'send' ? (
                          <Payload
                            value={value}
                            onChange={v => setAction(i, { ...action, send: v })}
                            index={i + 1}
                          />
                        ) : kind === 'receive' ? (
                          <Receive
                            value={value}
                            onChange={v => setAction(i, { ...action, receive: v })}
                            index={i + 1}
                          />
                        ) : (
                          <>
                            <Field
                              label={`Close code ${i + 1}`}
                              value={value.code ?? 1000}
                              onChange={v => setAction(i, { ...action, close: { ...value, code: Number(v) } })}
                            />
                            <Field
                              label={`Close reason ${i + 1}`}
                              value={value.reason}
                              onChange={reason => setAction(i, { ...action, close: { ...value, reason } })}
                            />
                          </>
                        )}
                        {kind === 'receive' && (
                          <button
                            type="button"
                            className="text-xs opacity-70"
                            onClick={() =>
                              set(
                                'actions',
                                actions.filter((_, j) => j !== i),
                              )
                            }
                          >
                            Remove this receive step
                          </button>
                        )}
                      </fieldset>
                    </div>
                  </li>
                );
              })}
            </ol>
            <fieldset
              disabled={disabled}
              className="flex gap-4 border-0 p-0 m-0 text-xs text-yellow-400"
            >
              {(['send', 'receive'] as const).map(kind => (
                <button
                  type="button"
                  key={kind}
                  onClick={() => {
                    const next = [...actions];
                    const i = next.findIndex(a => a.close);
                    next.splice(i < 0 ? next.length : i, 0, {
                      [kind]: kind === 'send' ? { type: 'text', data: '{}' } : { type: 'text' },
                    });
                    set('actions', next);
                  }}
                >
                  <Plus
                    className="inline"
                    size={14}
                  />{' '}
                  {kind === 'send' ? 'Send message' : 'Wait for message'}
                </button>
              ))}
              {!actions.some(a => a.close) && (
                <button
                  type="button"
                  onClick={() => set('actions', [...actions, { close: { code: 1000 } }])}
                >
                  + Close
                </button>
              )}
            </fieldset>
            <p className="text-xs text-zinc-500">
              <Clock
                size={12}
                className="inline"
              />{' '}
              Actions run in order. Use named connections to interleave HTTP and WebSocket steps.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
