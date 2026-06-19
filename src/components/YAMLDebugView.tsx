import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  Users,
  XCircle,
} from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import {
  collectDebugEventTargets,
  matchDebugEventTarget,
  requestExtractorVariableNames,
  variableRowsForRequestNode,
  type DebugStatus,
} from './debugRequests';
import { startDebugRun, streamDebugRun, type DebugVUs, type EngineEvent } from '../utils/debugApi';

type DetailTab = 'overview' | 'request' | 'response' | 'assertions' | 'variables' | 'logs';
type SearchMode = 'text' | 'regex';

// The last debug run is parked in sessionStorage so a page reload can
// re-attach and let the backend replay the run's history. Only the id and a
// fingerprint of the document are stored; the events and bodies stay on the
// studio server. The fingerprint guards against replaying a run against a
// different script (edited/uploaded YAML) after a reload.
const RUN_STORAGE_KEY = 'relampo.studio.debugRun';

interface StoredRun {
  id: string;
  fp: string;
}

// Cheap, stable (djb2) fingerprint of the document.
function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

function readStoredRun(): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.fp === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function storeRun(run: StoredRun): void {
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  } catch {
    // Private-mode / disabled storage: persistence is best-effort.
  }
}

function clearStoredRun(): void {
  try {
    sessionStorage.removeItem(RUN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// One timeline entry: a request-level engine event, optionally mapped back to
// the tree node it came from (matched by report name, best effort).
export type DebugEntry = {
  id: string;
  index: number;
  event: EngineEvent;
  node: YAMLNode | null;
  status: DebugStatus;
};

function entryStatus(event: EngineEvent): DebugStatus {
  if (event.err) return 'failed';
  if (event.status >= 400) return 'failed';
  if ((event.assertions ?? []).some(assertion => !assertion.Passed)) return 'failed';
  return 'passed';
}

// The engine only emits request-level events for actual steps; INFO events
// are verbose-run messages, SYSTEM events are lifecycle markers (e.g.
// VUS_DRAINED) and embedded events are sub-resources of a page load.
function isTimelineEvent(event: EngineEvent): boolean {
  return Boolean(event.method) && event.method !== 'INFO' && event.method !== 'SYSTEM' && !event.embedded;
}

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function formatLatency(latencyMs: number): string {
  return latencyMs < 10 ? `${latencyMs.toFixed(1)}ms` : `${Math.round(latencyMs)}ms`;
}

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
  yamlCode: string;
  // Flushes any pending debounced tree→code serialization and returns the
  // freshest YAML. Called at run start so a debug snapshot never POSTs stale
  // YAML while the tree already shows an uncommitted edit.
  flushPendingEdits?: () => string;
  // True once the editor has finished restoring (or failing to restore) the
  // document. Gates the reload re-attach so an orphaned run is not revived
  // when the document itself did not come back.
  documentReady: boolean;
  selectedNode: YAMLNode | null;
  treeFocusNodeId: string | null;
  validationErrors: string[];
  onSelectNode: (node: YAMLNode) => void;
  onEditNode: (node: YAMLNode) => void;
}

export function YAMLDebugSession({
  tree,
  yamlCode,
  flushPendingEdits,
  documentReady,
  selectedNode,
  treeFocusNodeId,
  validationErrors,
  onSelectNode,
  onEditNode,
}: YAMLDebugSessionProps) {
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [debugVUs, setDebugVUs] = useState<DebugVUs>(1);

  const debugEventTargets = useMemo(() => collectDebugEventTargets(tree), [tree]);
  const debugEventTargetsRef = useRef(debugEventTargets);
  debugEventTargetsRef.current = debugEventTargets;

  const stopStreamRef = useRef<(() => void) | null>(null);
  // Bumped on every start and on Stop; a slow startDebugRun continuation checks
  // it and bails if it was superseded or stopped while the POST was in flight.
  const startTokenRef = useRef(0);

  // Wires a run's SSE stream into the timeline. Shared by a fresh Run Debug
  // and by re-attaching to a stored run after a reload (the backend replays
  // the full event history on connect). `quiet` suppresses the error banner
  // for auto re-attach: a stored run that no longer exists (server restarted)
  // should clear silently rather than alarm the user.
  const subscribe = useCallback((runId: string, quiet: boolean) => {
    stopStreamRef.current?.();
    stopStreamRef.current = streamDebugRun(runId, {
      onEvent: event => {
        if (!isTimelineEvent(event)) return;
        setEntries(previous => [
          ...previous,
          {
            id: `evt-${previous.length}`,
            index: previous.length + 1,
            event,
            node: matchDebugEventTarget(event, debugEventTargetsRef.current),
            status: entryStatus(event),
          },
        ]);
      },
      onDone: error => {
        setIsRunning(false);
        setRunError(error);
      },
      onConnectionError: () => {
        setIsRunning(false);
        if (quiet) {
          clearStoredRun();
          setEntries([]);
        } else {
          setRunError('Lost connection to the studio server.');
        }
      },
    });
  }, []);

  useEffect(() => () => stopStreamRef.current?.(), []);

  // Re-attach to a run started before a reload — but only once the editor has
  // settled the document. A debug run belongs to a document, so if the
  // document did not come back (no draft restored), the run is orphaned and
  // its stored id is dropped instead of reviving a timeline with no script.
  const reattachedRef = useRef(false);
  useEffect(() => {
    if (!documentReady || reattachedRef.current) return;
    reattachedRef.current = true;
    const stored = readStoredRun();
    if (!stored) return;
    // Drop the run if the document did not come back, or came back as a
    // different script — replaying it against another tree is misleading.
    if (!yamlCode.trim() || stored.fp !== fingerprint(yamlCode)) {
      clearStoredRun();
      return;
    }
    setIsRunning(true);
    subscribe(stored.id, true);
  }, [documentReady, yamlCode, subscribe]);

  // When the parsed tree arrives or changes, re-resolve each entry's node. On
  // reload the SSE history can replay before the parse worker has populated
  // debugEventTargets (documentReady flips right after parsing is *posted*), so
  // entries would otherwise stay node:null and never become selectable/editable
  // once the tree lands. Idempotent: returns the same array when nothing moved.
  useEffect(() => {
    setEntries(previous => {
      let changed = false;
      const remapped = previous.map(entry => {
        const node = matchDebugEventTarget(entry.event, debugEventTargets);
        if (node?.id === entry.node?.id) return entry;
        changed = true;
        return { ...entry, node };
      });
      return changed ? remapped : previous;
    });
  }, [debugEventTargets]);

  const treeFocusedEntry =
    selectedNode && treeFocusNodeId === selectedNode.id
      ? entries.find(candidate => candidate.node?.id === selectedNode.id)
      : null;
  const nodeWithoutEvent =
    selectedNode && treeFocusNodeId === selectedNode.id && entries.length > 0 && !treeFocusedEntry ? selectedNode : null;
  const displayedActiveId = treeFocusedEntry?.id ?? activeId;
  const activeEntry = nodeWithoutEvent
    ? null
    : entries.find(entry => entry.id === displayedActiveId) || entries[entries.length - 1];
  const passed = entries.filter(entry => entry.status === 'passed').length;
  const failed = entries.filter(entry => entry.status === 'failed').length;
  const redirects = entries.reduce(
    (count, entry) =>
      count + (entry.event.redirects?.length ?? (entry.event.status >= 300 && entry.event.status < 400 ? 1 : 0)),
    0,
  );
  const hasValidationErrors = validationErrors.length > 0;

  const startRun = async () => {
    if (hasValidationErrors || isRunning) return;
    // Flush any debounced tree edit so the run uses the YAML that matches the
    // tree on screen, not a string that is up to 220 ms stale.
    const scriptAtStart = flushPendingEdits ? flushPendingEdits() : yamlCode;
    if (!scriptAtStart.trim()) return;
    const token = (startTokenRef.current += 1);
    stopStreamRef.current?.();
    setEntries([]);
    setRunError(null);
    setActiveId(null);
    setDetailTab('overview');
    setIsRunning(true);
    try {
      const runId = await startDebugRun(scriptAtStart, { vus: debugVUs });
      if (token === startTokenRef.current) {
        storeRun({ id: runId, fp: fingerprint(scriptAtStart) });
        subscribe(runId, false);
      }
    } catch (error) {
      if (token !== startTokenRef.current) return;
      setIsRunning(false);
      setRunError(error instanceof Error ? error.message : String(error));
    }
  };

  const stopRun = () => {
    startTokenRef.current += 1; // invalidate any in-flight start
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    setIsRunning(false);
  };

  const selectEntry = (entry: DebugEntry) => {
    setActiveId(entry.id);
    if (entry.node) onSelectNode(entry.node);
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
              disabled={isRunning || hasValidationErrors || !yamlCode.trim()}
              className="inline-flex h-9 items-center gap-2 rounded border border-yellow-400/40 bg-yellow-400 px-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run Debug
            </button>
            <button
              type="button"
              onClick={stopRun}
              disabled={!isRunning}
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
            <button
              type="button"
              onClick={startRun}
              disabled={isRunning || hasValidationErrors || !yamlCode.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
              aria-label="Re-run debug"
              title="Re-run debug"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <fieldset className="m-0 inline-flex h-9 min-w-0 items-center rounded border border-white/10 bg-[#161616] p-0 text-xs text-zinc-400">
              <legend className="sr-only">Debug VUs</legend>
              <span aria-hidden="true" className="inline-flex h-full items-center gap-1.5 border-r border-white/10 px-2">
                <Users className="h-3.5 w-3.5" />
                VUs
              </span>
              {[1, 2].map(value => {
                const vus = value as DebugVUs;
                const selected = debugVUs === vus;
                return (
                  <button
                    key={vus}
                    type="button"
                    onClick={() => setDebugVUs(vus)}
                    disabled={isRunning}
                    aria-pressed={selected}
                    className={`h-full min-w-14 px-2.5 font-semibold transition-colors ${
                      selected
                        ? 'bg-yellow-400 text-black'
                        : 'text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {vus} {vus === 1 ? 'VU' : 'VUs'}
                  </button>
                );
              })}
            </fieldset>
            <span className="inline-flex h-9 items-center rounded border border-white/10 bg-[#161616] px-3 text-xs text-zinc-400">
              1 pass
            </span>
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

      {runError && (
        <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-200">Debug run failed</p>
              <p className="mt-1 break-words font-mono text-xs text-red-100/90">{runError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 border-b border-white/5 bg-[#0a0a0a]">
        {[
          ['Requests', entries.length, 'text-zinc-100'],
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
              {entries.length === 0 ? (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
                  {isRunning
                    ? 'Running... waiting for the first engine event.'
                    : 'Press Run Debug to execute this YAML against the engine.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map(entry => {
                    const active = activeEntry?.id === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => selectEntry(entry)}
                        className={`w-full border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-yellow-400/50 bg-yellow-400/10'
                            : 'border-white/10 bg-[#111111] hover:border-white/20'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <StatusIcon status={entry.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                                {entry.event.method}
                              </span>
                              <span className="truncate text-sm text-zinc-100">{entry.event.path || entry.event.name}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                              <span>{formatEventTime(entry.event.ts)}</span>
                              {entry.event.vu ? <span>VU{entry.event.vu}</span> : null}
                              <span>{formatLatency(entry.event.latency_ms)}</span>
                              <span className={`rounded border px-1.5 py-0.5 ${statusTone(entry.status)}`}>
                                {entry.event.status || '—'}
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
          {activeEntry ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-white/5 px-4 py-3">
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="rounded border border-blue-400/25 bg-blue-400/10 px-2 py-1 text-xs font-semibold text-blue-300">
                        {activeEntry.event.method}
                      </span>
                      <h3 className="truncate text-base font-semibold text-zinc-100">
                        {activeEntry.event.path || activeEntry.event.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {activeEntry.node ? 'Mapped to the selected tree node.' : activeEntry.event.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeEntry.node && (
                      <button
                        type="button"
                        onClick={() => onEditNode(activeEntry.node!)}
                        className="inline-flex h-8 items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(activeEntry.status)}`}>
                      {activeEntry.status === 'failed'
                        ? 'Failed'
                        : activeEntry.event.status >= 300 && activeEntry.event.status < 400
                          ? 'Redirect'
                          : 'Passed'}
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
                <DebugInspectorContent entry={activeEntry} tab={detailTab} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <div>
                <TerminalSquare className="mx-auto h-10 w-10 text-zinc-700" />
                <p className="mt-4 text-sm text-zinc-400">
                  {nodeWithoutEvent
                    ? `No debug event for "${nodeWithoutEvent.name}" in the current run.`
                    : 'Select a debug event to inspect request and response data.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebugInspectorContent({ entry, tab }: { entry: DebugEntry; tab: DetailTab }) {
  const [requestSearch, setRequestSearch] = useState('');
  const [requestSearchMode, setRequestSearchMode] = useState<SearchMode>('text');
  const [requestMatchIndex, setRequestMatchIndex] = useState(0);
  const [responseSearch, setResponseSearch] = useState('');
  const [responseSearchMode, setResponseSearchMode] = useState<SearchMode>('text');
  const [responseMatchIndex, setResponseMatchIndex] = useState(0);

  const { event } = entry;
  const requestRows: Array<[string, string]> = [
    ['URL', event.path || '<unknown>'],
    ['Method', event.method],
    ...Object.entries(event.request_headers ?? {}),
  ];
  const requestBody = event.request_body || '<empty>';
  const responseRows: Array<[string, string]> = [
    ['Status', event.status ? String(event.status) : '—'],
    ['Duration', formatLatency(event.latency_ms)],
    ...Object.entries(event.response_headers ?? {}),
  ];
  const responseBody = event.response_body || '<empty>';

  useEffect(() => {
    setRequestMatchIndex(0);
    setResponseMatchIndex(0);
  }, [entry.id]);

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
    const assertions = event.assertions ?? [];
    if (assertions.length === 0) {
      return <p className="text-sm text-zinc-500">No assertions were evaluated for this request.</p>;
    }
    return (
      <div className="space-y-3">
        {assertions.map((assertion, index) => (
          <DebugLine
            key={`${assertion.Name}-${index}`}
            icon={
              assertion.Passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ) : (
                <XCircle className="h-4 w-4 text-red-300" />
              )
            }
            title={assertion.Name || 'Assertion'}
            value={assertion.Message || (assertion.Passed ? 'Passed' : 'Failed')}
          />
        ))}
      </div>
    );
  }

  if (tab === 'variables') {
    const variables = variableRowsForRequestNode(entry.node, event.variables ?? {});
    if (variables.length === 0) {
      const extractorNames = requestExtractorVariableNames(entry.node);
      const message =
        entry.node && extractorNames.length === 0
          ? 'No variables were extracted by this request.'
          : 'No extracted variables were captured for this request.';
      return <p className="text-sm text-zinc-500">{message}</p>;
    }
    return <DebugSection rows={variables} />;
  }

  if (tab === 'logs') {
    const time = formatEventTime(event.ts);
    return (
      <div className="border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-6 text-zinc-300">
        <p className="text-emerald-300">[{time}] debug session received request event</p>
        <p className="text-blue-300">
          [{time}] {event.method} {event.path || event.name} - {event.status || '—'} ({formatLatency(event.latency_ms)})
        </p>
        {(event.redirects ?? []).map((hop, index) => (
          <p key={`hop-${index}`} className="text-zinc-400">
            [{time}] redirect {index + 1}: {hop.status} {hop.url || ''} → {hop.location || hop.target_url || ''}
          </p>
        ))}
        {event.err && <p className="text-red-300">[{time}] {event.err}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DebugLine
        icon={<Eye className="h-4 w-4 text-yellow-300" />}
        title="Step"
        value={entry.node?.name ?? event.name}
      />
      <DebugLine icon={<Clock3 className="h-4 w-4 text-zinc-300" />} title="Latency" value={formatLatency(event.latency_ms)} />
      <DebugLine
        icon={<TerminalSquare className="h-4 w-4 text-zinc-300" />}
        title="VU"
        value={event.vu ? `Virtual user ${event.vu}` : '—'}
      />
      <DebugLine
        icon={
          event.err ? <XCircle className="h-4 w-4 text-red-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-300" />
        }
        title="Result"
        value={event.err || (event.status ? `HTTP ${event.status}` : 'Completed')}
      />
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
          const hasActiveSearch = searchText.trim().length > 0;
          return (
          <div key={label} className="grid grid-cols-[minmax(100px,30%)_1fr] border-b border-white/10 last:border-b-0">
            <div
              className={`min-w-0 bg-white/3 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 ${
                hasActiveSearch ? 'break-words' : 'truncate'
              }`}
              title={hasActiveSearch ? undefined : label}
            >
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
