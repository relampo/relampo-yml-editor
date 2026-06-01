import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Eye,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Square,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import { buildDebugRequests, type DebugRequestNode, type DebugStatus } from './debugRequests';

type DetailTab = 'overview' | 'request' | 'response' | 'assertions' | 'variables' | 'logs';
type SearchMode = 'text' | 'regex';

function statusTone(status: DebugStatus): string {
  switch (status) {
    case 'passed':
      return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10';
    case 'failed':
      return 'text-red-300 border-red-400/30 bg-red-400/10';
    case 'warning':
      return 'text-amber-300 border-amber-400/30 bg-amber-400/10';
    case 'running':
      return 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10';
    default:
      return 'text-zinc-500 border-white/10 bg-white/5';
  }
}

function StatusIcon({ status }: { status: DebugStatus }) {
  if (status === 'passed') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-300" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  if (status === 'running') return <Clock3 className="h-4 w-4 text-yellow-300" />;
  return <Circle className="h-4 w-4 text-zinc-600" />;
}

interface YAMLDebugSessionProps {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  validationErrors: string[];
  onSelectNode: (node: YAMLNode) => void;
  onEditNode: (node: YAMLNode) => void;
}

export function YAMLDebugSession({
  tree,
  selectedNode,
  validationErrors,
  onSelectNode,
  onEditNode,
}: YAMLDebugSessionProps) {
  const [debugVus, setDebugVus] = useState<1 | 2>(1);
  // Prototype control only: the duration is captured from the input but not yet
  // applied to the (mocked) run length — wire it up when the backend lands.
  const [durationMinutes, setDurationMinutes] = useState(1);
  const requests = useMemo(() => buildDebugRequests(tree, debugVus), [debugVus, tree]);
  const [isRunning, setIsRunning] = useState(false);
  // Starts at 0 so the timeline is empty until a run actually begins, instead
  // of showing every step as already executed before the first Run Debug.
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  useEffect(() => {
    if (!selectedNode) return;
    if (requests.some(request => request.node.id === selectedNode.id)) setActiveId(selectedNode.id);
  }, [requests, selectedNode]);

  useEffect(() => {
    if (!isRunning) return;
    if (visibleCount >= requests.length) {
      setIsRunning(false);
      return;
    }
    const timeout = window.setTimeout(() => setVisibleCount(count => Math.min(count + 1, requests.length)), 420);
    return () => window.clearTimeout(timeout);
  }, [isRunning, requests.length, visibleCount]);

  const visibleRequests = requests.slice(0, visibleCount);
  const activeRequest = requests.find(request => request.node.id === activeId) || visibleRequests[visibleRequests.length - 1] || requests[0];
  const passed = visibleRequests.filter(request => request.status === 'passed').length;
  const failed = visibleRequests.filter(request => request.status === 'failed').length;
  const redirects = visibleRequests.filter(request => request.statusCode >= 300 && request.statusCode < 400).length;
  const hasValidationErrors = validationErrors.length > 0;

  const startRun = () => {
    if (hasValidationErrors) return;
    setVisibleCount(0);
    setIsRunning(true);
    setActiveId(null);
    setDetailTab('overview');
  };

  const selectRequest = (request: DebugRequestNode) => {
    setActiveId(request.node.id);
    onSelectNode(request.node);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0d0d]">
      <div className="border-b border-white/5 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Debug session</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100">Run the current YAML with request visibility</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startRun}
              disabled={requests.length === 0 || isRunning || hasValidationErrors}
              className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run Debug
            </button>
            <button
              type="button"
              onClick={() => setIsRunning(false)}
              disabled={!isRunning}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
            <button
              type="button"
              onClick={startRun}
              disabled={requests.length === 0 || hasValidationErrors}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
              aria-label="Re-run debug"
              title="Re-run debug"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <label className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-[#161616] px-2 text-xs text-zinc-300">
              <span className="text-zinc-500">VUs</span>
              <select
                value={debugVus}
                onChange={event => setDebugVus(Number(event.target.value) === 2 ? 2 : 1)}
                className="h-7 rounded border border-white/10 bg-[#0a0a0a] px-2 text-xs text-zinc-100 outline-none focus:border-yellow-400/50"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
            <label className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-[#161616] px-2 text-xs text-zinc-300">
              <span className="text-zinc-500">Min</span>
              <input
                type="number"
                min={1}
                max={60}
                value={durationMinutes}
                onChange={event => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setDurationMinutes(Math.min(60, Math.max(1, Math.round(next))));
                }}
                className="h-7 w-14 rounded border border-white/10 bg-[#0a0a0a] px-2 text-xs text-zinc-100 outline-none focus:border-yellow-400/50"
              />
            </label>
            <span className="inline-flex h-9 items-center gap-2 rounded border border-emerald-400/20 bg-emerald-400/10 px-3 text-xs text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {hasValidationErrors ? 'Blocked' : 'Validate'}
            </span>
          </div>
        </div>
      </div>

      {hasValidationErrors && (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-200">YAML semantic validation failed before debug</p>
              <p className="mt-1 text-xs text-red-200/80">
                Fix these issues in the tree or code before running the debug session.
              </p>
              <div className="mt-2 space-y-1">
                {validationErrors.slice(0, 4).map((error, index) => (
                  <p key={`${error}-${index}`} className="break-words font-mono text-xs text-red-100/90">
                    {error}
                  </p>
                ))}
                {validationErrors.length > 4 && (
                  <p className="text-xs text-red-200/70">+{validationErrors.length - 4} more validation issues</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 border-b border-white/5 bg-[#0a0a0a]">
        {[
          ['Requests', visibleRequests.length, 'text-zinc-100'],
          ['Passed', passed, 'text-emerald-300'],
          ['Failed', failed, 'text-red-300'],
          ['Redirects', redirects, 'text-blue-300'],
        ].map(([label, value, tone]) => (
          <div key={label} className="border-r border-white/5 px-5 py-3 last:border-r-0">
            <p className={`text-lg font-semibold ${tone}`}>{value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,32%)_1fr]">
        <div className="min-h-0 border-r border-white/5">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/5 px-4 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Execution timeline</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {visibleRequests.length === 0 ? (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
                  Press Run Debug to preview the event stream for this YAML.
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleRequests.map(request => {
                    const active = activeRequest?.node.id === request.node.id;
                    return (
                      <button
                        key={request.node.id}
                        type="button"
                        onClick={() => selectRequest(request)}
                        className={`w-full border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-yellow-400/50 bg-yellow-400/10'
                            : 'border-white/10 bg-[#111111] hover:border-white/20'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <StatusIcon status={request.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                                {request.method}
                              </span>
                              <span className="truncate text-sm text-zinc-100">{request.path}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                              <span>{request.startedAt}</span>
                              <span>VU{request.vu}</span>
                              <span>{request.latencyMs}ms</span>
                              <span className={`rounded border px-1.5 py-0.5 ${statusTone(request.status)}`}>
                                {request.statusCode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 min-h-0 overflow-hidden">
          {activeRequest ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-white/5 px-4 py-3">
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="rounded border border-blue-400/25 bg-blue-400/10 px-2 py-1 text-xs font-semibold text-blue-300">
                        {activeRequest.method}
                      </span>
                      <h3 className="truncate text-base font-semibold text-zinc-100">{activeRequest.path}</h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Mapped to the selected tree node.</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditNode(activeRequest.node)}
                      className="inline-flex h-8 items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(activeRequest.status)}`}>
                      {activeRequest.status === 'failed' ? 'Failed' : activeRequest.statusCode >= 300 ? 'Redirect' : 'Passed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center border-b border-white/5 px-3">
                {(['overview', 'request', 'response', 'assertions', 'variables', 'logs'] as DetailTab[]).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`px-2.5 py-2.5 text-xs font-semibold capitalize transition-colors ${
                      detailTab === tab
                        ? 'border-b-2 border-yellow-400 text-yellow-300'
                        : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <DebugInspectorContent request={activeRequest} tab={detailTab} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <div>
                <TerminalSquare className="mx-auto h-10 w-10 text-zinc-700" />
                <p className="mt-4 text-sm text-zinc-400">Select a debug event to inspect request and response data.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebugInspectorContent({ request, tab }: { request: DebugRequestNode; tab: DetailTab }) {
  const [requestSearch, setRequestSearch] = useState('');
  const [requestSearchMode, setRequestSearchMode] = useState<SearchMode>('text');
  const [requestMatchIndex, setRequestMatchIndex] = useState(0);
  const [responseSearch, setResponseSearch] = useState('');
  const [responseSearchMode, setResponseSearchMode] = useState<SearchMode>('text');
  const [responseMatchIndex, setResponseMatchIndex] = useState(0);

  const requestRows: Array<[string, string]> = [
    ['URL', request.path],
    ['Method', request.method],
    ['Accept', 'application/json'],
    ['User-Agent', 'Relampo Debug UI'],
  ];
  const requestBody = request.method === 'POST' ? '{"username":"demo","password":"super-secret-demo"}' : '<empty>';
  const responseRows: Array<[string, string]> = [
    ['Status', String(request.statusCode)],
    ['Duration', `${request.latencyMs}ms`],
    ['Content-Type', 'application/json'],
    ['Set-Cookie', request.status === 'failed' ? '<empty>' : 'session_id=abc123-debug-session; HttpOnly'],
  ];
  const responseBody = request.status === 'failed' ? '{"error":"Internal Server Error"}' : '{"ok":true,"token":"eyJhbGciOiJIUzI1NiJ9.debug-token-value"}';

  useEffect(() => {
    setRequestMatchIndex(0);
    setResponseMatchIndex(0);
  }, [request.node.id]);

  if (tab === 'request') {
    const requestSearchText = [...requestRows.map(([label, value]) => `${label}: ${value}`), requestBody].join('\n');
    const totalMatches = findMatchRanges(requestSearchText, requestSearch, requestSearchMode).length;
    return (
      <div className="space-y-3">
        <DebugSearchControls
          value={requestSearch}
          mode={requestSearchMode}
          placeholder="Search in request..."
          totalMatches={totalMatches}
          currentMatchIndex={requestMatchIndex}
          onChange={value => {
            setRequestSearch(value);
            setRequestMatchIndex(0);
          }}
          onModeChange={mode => {
            setRequestSearchMode(mode);
            setRequestMatchIndex(0);
          }}
          onNavigate={setRequestMatchIndex}
        />
        <DebugSection
          rows={requestRows}
          body={requestBody}
          searchText={requestSearch}
          searchMode={requestSearchMode}
          currentMatchIndex={requestMatchIndex}
        />
      </div>
    );
  }

  if (tab === 'response') {
    const responseSearchText = [...responseRows.map(([label, value]) => `${label}: ${value}`), responseBody].join('\n');
    const totalMatches = findMatchRanges(responseSearchText, responseSearch, responseSearchMode).length;
    return (
      <div className="space-y-3">
        <DebugSearchControls
          value={responseSearch}
          mode={responseSearchMode}
          placeholder="Search in response..."
          totalMatches={totalMatches}
          currentMatchIndex={responseMatchIndex}
          onChange={value => {
            setResponseSearch(value);
            setResponseMatchIndex(0);
          }}
          onModeChange={mode => {
            setResponseSearchMode(mode);
            setResponseMatchIndex(0);
          }}
          onNavigate={setResponseMatchIndex}
        />
        <DebugSection
          rows={responseRows}
          body={responseBody}
          searchText={responseSearch}
          searchMode={responseSearchMode}
          currentMatchIndex={responseMatchIndex}
        />
      </div>
    );
  }

  if (tab === 'assertions') {
    return (
      <div className="space-y-3">
        <DebugLine
          icon={request.status === 'failed' ? <XCircle className="h-4 w-4 text-red-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
          title="Status code assertion"
          value={request.status === 'failed' ? 'Expected 200, got 500' : 'Expected 200, got 200'}
        />
        <DebugLine
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
          title="Response time assertion"
          value={`${request.latencyMs}ms below debug threshold`}
        />
      </div>
    );
  }

  if (tab === 'variables') {
    return (
      <DebugSection
        rows={[
          ['auth_token', request.status === 'failed' ? '<missing>' : 'eyJhbGciOiJIUzI1NiJ9.debug-token-value'],
          ['current_vu', String(request.vu)],
          ['last_status', String(request.statusCode)],
        ]}
      />
    );
  }

  if (tab === 'logs') {
    return (
      <div className="border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-6 text-zinc-300">
        <p className="text-emerald-300">[{request.startedAt}] debug session received request event</p>
        <p className="text-blue-300">[{request.startedAt}] {request.method} {request.path} - {request.statusCode} ({request.latencyMs}ms)</p>
        {request.status === 'failed' && (
          <p className="text-red-300">[{request.startedAt}] assertion failed: expected successful HTTP response</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DebugLine icon={<Eye className="h-4 w-4 text-yellow-300" />} title="Selected node" value={request.node.name} />
      <DebugLine icon={<Clock3 className="h-4 w-4 text-zinc-300" />} title="Latency" value={`${request.latencyMs}ms`} />
      <DebugLine icon={<TerminalSquare className="h-4 w-4 text-zinc-300" />} title="VU" value={`Virtual user ${request.vu}`} />
      <DebugLine icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />} title="Validation" value="YAML validation passed before debug" />
    </div>
  );
}

function DebugLine({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border border-white/10 bg-[#111111] px-3 py-2.5">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</p>
        <p className="mt-1 break-words text-sm text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

function DebugSearchControls({
  value,
  mode,
  placeholder,
  totalMatches,
  currentMatchIndex,
  onChange,
  onModeChange,
  onNavigate,
}: {
  value: string;
  mode: SearchMode;
  placeholder: string;
  totalMatches: number;
  currentMatchIndex: number;
  onChange: (value: string) => void;
  onModeChange: (mode: SearchMode) => void;
  onNavigate: (index: number) => void;
}) {
  const regexInvalid = !!value && mode === 'regex' && !buildSearchRegex(value);
  const displayIndex = value && totalMatches > 0 ? currentMatchIndex + 1 : 0;

  const move = (direction: -1 | 1) => {
    if (!value || totalMatches === 0) return;
    onNavigate((currentMatchIndex + direction + totalMatches) % totalMatches);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border border-white/10 bg-[#111111] p-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded border border-white/10 bg-[#0a0a0a] pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-yellow-400/50"
        />
      </div>
      <div className="flex items-center rounded border border-white/10 bg-[#0a0a0a] p-0.5">
        {(['text', 'regex'] as SearchMode[]).map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onModeChange(option)}
            className={`h-7 px-2 text-xs font-semibold capitalize transition-colors ${
              mode === option ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <span className={`text-xs ${regexInvalid ? 'text-red-300' : 'text-zinc-500'}`}>
        {regexInvalid ? 'Invalid regex' : value ? `${displayIndex}/${totalMatches}` : '0/0'}
      </span>
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={!value || totalMatches === 0 || regexInvalid}
        className="h-8 rounded border border-white/10 bg-white/[0.03] px-2 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={!value || totalMatches === 0 || regexInvalid}
        className="h-8 rounded border border-white/10 bg-white/[0.03] px-2 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export function DebugSection({
  rows,
  body,
  searchText = '',
  searchMode = 'text',
  currentMatchIndex = 0,
}: {
  rows: Array<[string, string]>;
  body?: string;
  searchText?: string;
  searchMode?: SearchMode;
  currentMatchIndex?: number;
}) {
  // Mirror the concatenation used to compute totalMatches in the parent, so a
  // fragment's match index maps onto the same global numbering as Next/Prev.
  const fullSearchText = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(body !== undefined ? [body] : []),
  ].join('\n');
  return (
    <div className="space-y-3">
      <div className="border border-white/10">
        {rows.map(([label, value], rowIndex) => {
          const previousText = rows.slice(0, rowIndex).map(([prevLabel, prevValue]) => `${prevLabel}: ${prevValue}`).join('\n');
          const startOffset = previousText ? previousText.length + 1 : 0;
          return (
          <div key={label} className="grid grid-cols-[112px_1fr] border-b border-white/10 last:border-b-0">
            <div className="bg-white/[0.03] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <HighlightedDebugText
                text={label}
                fullSearchText={fullSearchText}
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
                startOffset={startOffset}
              />
            </div>
            <div className="min-w-0 px-3 py-2.5 text-sm text-zinc-200 break-words">
              <HighlightedDebugText
                text={value}
                fullSearchText={fullSearchText}
                searchText={searchText}
                searchMode={searchMode}
                currentMatchIndex={currentMatchIndex}
                startOffset={startOffset + label.length + 2}
              />
            </div>
          </div>
          );
        })}
      </div>
      {body !== undefined && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Body</p>
          <pre className="max-h-56 overflow-auto border border-white/10 bg-[#050505] p-3 text-xs leading-6 text-zinc-300">
            <HighlightedDebugText
              text={body}
              fullSearchText={fullSearchText}
              searchText={searchText}
              searchMode={searchMode}
              currentMatchIndex={currentMatchIndex}
              startOffset={rows.map(([label, value]) => `${label}: ${value}`).join('\n').length + 1}
            />
          </pre>
        </div>
      )}
    </div>
  );
}

function HighlightedDebugText({
  text,
  fullSearchText,
  searchText,
  searchMode,
  currentMatchIndex,
  startOffset,
}: {
  text: string;
  fullSearchText: string;
  searchText: string;
  searchMode: SearchMode;
  currentMatchIndex: number;
  startOffset: number;
}) {
  if (!text || !searchText) return <>{text}</>;
  const ranges = findMatchRanges(text, searchText, searchMode);
  if (ranges.length === 0) return <>{text}</>;

  // Global index of this fragment's first match = how many matches in the full
  // concatenated text fall before this fragment's start. Local matches then run
  // contiguously from there, so the active "current" match lands on the right
  // fragment instead of restarting at 0 per fragment.
  const precedingMatches = findMatchRanges(fullSearchText.slice(0, startOffset), searchText, searchMode).length;

  const nodes: Array<ReactNode> = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (cursor < range.start) nodes.push(text.slice(cursor, range.start));
    const absoluteIndex = precedingMatches + index;
    const active = absoluteIndex === currentMatchIndex;
    nodes.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className={active ? 'rounded-sm bg-yellow-300 text-black ring-2 ring-amber-500' : 'rounded-sm bg-blue-500/40 text-blue-100'}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function buildSearchRegex(query: string): RegExp | null {
  try {
    return new RegExp(query, 'gi');
  } catch {
    return null;
  }
}

function findMatchRanges(text: string, query: string, mode: SearchMode): Array<{ start: number; end: number }> {
  if (!text || !query) return [];
  const ranges: Array<{ start: number; end: number }> = [];
  if (mode === 'text') {
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    let position = 0;
    while (position <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, position);
      if (index === -1) break;
      ranges.push({ start: index, end: index + needle.length });
      position = index + Math.max(needle.length, 1);
    }
    return ranges;
  }
  const regex = buildSearchRegex(query);
  if (!regex) return [];
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? -1;
    const value = match[0] ?? '';
    if (start < 0 || value.length === 0) continue;
    ranges.push({ start, end: start + value.length });
  }
  return ranges;
}
