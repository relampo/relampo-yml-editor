import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleSlash,
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
import type { RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import {
  collectDebugEventTargets,
  debugEventRequestNumber,
  isRedirectStepEvent,
  matchDebugEventTarget,
  requestVariableNames,
  skippedRedirectHops,
  variableRowsForRequestNode,
  type DebugStatus,
} from './debugRequests';
import { binaryBodyDisplay } from '../utils/binaryBody';
import { startDebugRun, streamDebugRun, type DebugVUs, type EngineEvent } from '../utils/debugApi';
import { DebugSection } from './debugSection';
import { buildSearchRegex, findMatchRanges, type SearchMode } from './debugSearch';
import { createStoredRunStore, fingerprint, type StoredRun } from '../utils/studioRunStore';

type DetailTab = 'overview' | 'request' | 'response' | 'assertions' | 'variables' | 'logs';

// The last debug run is parked in sessionStorage so a page reload can re-attach
// and let the backend replay the run's history.
const runStore = createStoredRunStore('relampo.studio.debugRun');

// One timeline entry: a request-level engine event, optionally mapped back to
// the tree node it came from (matched by report name, best effort).
export type DebugEntry = {
  id: string;
  index: number;
  event: EngineEvent;
  node: YAMLNode | null;
  status: DebugStatus;
};

type StoredDebugEntry = Omit<DebugEntry, 'node'>;

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
    case 'skipped':
      return 'text-zinc-400 border-white/10 bg-white/5';
    default:
      return 'text-zinc-500 border-white/10 bg-white/5';
  }
}

function StatusIcon({ status }: { status: DebugStatus }) {
  if (status === 'passed') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-300" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  if (status === 'running') return <Clock3 className="h-4 w-4 text-yellow-300" />;
  if (status === 'skipped') return <CircleSlash className="h-4 w-4 text-zinc-500" />;
  return <Circle className="h-4 w-4 text-zinc-600" />;
}

interface YAMLDebugSessionProps {
  tree: YAMLNode | null;
  yamlCode: string;
  // Flushes any pending debounced tree→code serialization and returns the
  // freshest YAML. Called at run start so a debug snapshot never POSTs stale
  // YAML while the tree already shows an uncommitted edit.
  flushPendingEdits?: () => string;
  documentReady: boolean;
  validationErrors: string[];
  redirectedRequestMap?: Record<string, RedirectedRequestInfo>;
  onSelectNode: (node: YAMLNode | null) => void;
  onEditNode: (node: YAMLNode) => void;
}

export function YAMLDebugSession({
  tree,
  yamlCode,
  flushPendingEdits,
  documentReady,
  validationErrors,
  redirectedRequestMap = {},
  onSelectNode,
  onEditNode,
}: YAMLDebugSessionProps) {
  const [entryEvents, setEntryEvents] = useState<StoredDebugEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runCompleted, setRunCompleted] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [debugVUs, setDebugVUs] = useState<DebugVUs>(1);
  const timelineButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const debugEventTargets = useMemo(() => collectDebugEventTargets(tree), [tree]);
  const entries = useMemo<DebugEntry[]>(
    () =>
      entryEvents.map(entry => ({
        ...entry,
        node: matchDebugEventTarget(entry.event, debugEventTargets),
      })),
    [debugEventTargets, entryEvents],
  );
  // The timeline shows one row per engine event, but a recorded redirect chain
  // can be longer than the live run walks: the engine stops following at a hop
  // it won't cross (e.g. a cross-site OAuth callback blocked by the redirect
  // trust boundary, backend RLP-492), so recorded-but-unfollowed children emit
  // no event and would silently vanish (#123.1 shows, #123.2 disappears). Weave
  // them back as read-only "skipped" placeholders right after their chain's last
  // real row, so the timeline stays faithful to the recorded chain. RLP-607.
  const timelineEntries = useMemo<DebugEntry[]>(() => {
    if (!runCompleted) return entries;
    const skipped = skippedRedirectHops(
      entries.map(entry => entry.event),
      debugEventTargets,
    );
    if (skipped.length === 0) return entries;
    const placeholdersByAnchor = new Map<number, DebugEntry[]>();
    skipped.forEach(hop => {
      const anchor = entries[hop.afterEventIndex];
      if (!anchor) return;
      const child = hop.node;
      const event: EngineEvent = {
        ts: '',
        name: child.name,
        method: String(child.data?.method ?? anchor.event.method ?? 'GET').toUpperCase(),
        path: String(child.data?.url ?? child.data?.path ?? child.name ?? ''),
        status: 0,
        latency_ms: 0,
        concurrency: 0,
        vu: anchor.event.vu,
        request_id: anchor.event.request_id,
        chain_id: String(child.data?.chain_id ?? anchor.event.chain_id ?? ''),
        chain_role: String(child.data?.chain_role ?? ''),
        redirect_index: hop.position,
      };
      const placeholder: DebugEntry = {
        id: `skip-${anchor.id}-${child.id}`,
        index: 0,
        event,
        node: child,
        status: 'skipped',
      };
      const list = placeholdersByAnchor.get(hop.afterEventIndex);
      if (list) list.push(placeholder);
      else placeholdersByAnchor.set(hop.afterEventIndex, [placeholder]);
    });
    const woven: DebugEntry[] = [];
    entries.forEach((entry, index) => {
      woven.push(entry);
      const extras = placeholdersByAnchor.get(index);
      if (extras) woven.push(...extras);
    });
    return woven;
  }, [debugEventTargets, entries, runCompleted]);
  const stopStreamRef = useRef<(() => void) | null>(null);
  // Bumped on every start and on Stop; a slow startDebugRun continuation checks
  // it and bails if it was superseded or stopped while the POST was in flight.
  const startTokenRef = useRef(0);
  const storedRunRef = useRef<StoredRun | null | undefined>(undefined);
  if (storedRunRef.current === undefined) {
    storedRunRef.current = runStore.read();
  }

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
        setEntryEvents(previous => [
          ...previous,
          {
            id: `evt-${previous.length}`,
            index: previous.length + 1,
            event,
            status: entryStatus(event),
          },
        ]);
      },
      onDone: error => {
        setIsRunning(false);
        setRunCompleted(true);
        setRunError(error);
      },
      onConnectionError: () => {
        setIsRunning(false);
        setRunCompleted(false);
        if (quiet) {
          runStore.clear();
          setEntryEvents([]);
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
  const reattachStoredRun = useCallback((element: HTMLSpanElement | null) => {
    if (!element || !documentReady || reattachedRef.current) return;
    const storedRun = storedRunRef.current;
    if (!storedRun) return;
    if (!yamlCode.trim() || storedRun.fp !== fingerprint(yamlCode)) {
      runStore.clear();
      storedRunRef.current = null;
      return;
    }
    reattachedRef.current = true;
    setIsRunning(true);
    subscribe(storedRun.id, true);
  }, [documentReady, subscribe, yamlCode]);

  const activeEntry = timelineEntries.find(entry => entry.id === activeId) || timelineEntries[timelineEntries.length - 1];
  const passed = entries.filter(entry => entry.status === 'passed').length;
  const failed = entries.filter(entry => entry.status === 'failed').length;
  // Count the same redirect follow-up steps the tree labels REDIRECTED, so the
  // summary reconciles with the tree (RLP-588). Counting 3xx response statuses
  // instead diverged: it swept in 304 Not Modified and standalone 302s (e.g. a
  // sign-off) that never produced a labeled follow-up step.
  const redirects = entries.reduce(
    (count, entry) => count + (isRedirectStepEvent(entry.event) ? 1 : 0),
    0,
  );
  const hasValidationErrors = validationErrors.length > 0;

  const startRun = async () => {
    if (hasValidationErrors || isRunning) return;
    let scriptAtStart: string;
    try {
      scriptAtStart = flushPendingEdits ? flushPendingEdits() : yamlCode;
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!scriptAtStart.trim()) return;
    const token = (startTokenRef.current += 1);
    stopStreamRef.current?.();
    setEntryEvents([]);
    setRunError(null);
    setActiveId(null);
    setDetailTab('overview');
    setRunCompleted(false);
    setIsRunning(true);
    try {
      const runId = await startDebugRun(scriptAtStart, { vus: debugVUs });
      if (token === startTokenRef.current) {
        runStore.store({ id: runId, fp: fingerprint(scriptAtStart) });
        subscribe(runId, false);
      }
    } catch (error) {
      if (token !== startTokenRef.current) return;
      setIsRunning(false);
      setRunCompleted(false);
      setRunError(error instanceof Error ? error.message : String(error));
    }
  };

  const stopRun = () => {
    startTokenRef.current += 1; // invalidate any in-flight start
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    setIsRunning(false);
    setRunCompleted(false);
  };

  const selectEntry = (entry: DebugEntry) => {
    setActiveId(entry.id);
    onSelectNode(entry.node);
  };

  const moveTimelineSelection = (entry: DebugEntry, direction: -1 | 1) => {
    const currentIndex = timelineEntries.findIndex(candidate => candidate.id === entry.id);
    if (currentIndex < 0) return;

    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), timelineEntries.length - 1);
    if (nextIndex === currentIndex) return;

    const nextEntry = timelineEntries[nextIndex];
    selectEntry(nextEntry);

    window.requestAnimationFrame(() => {
      timelineButtonRefs.current.get(nextEntry.id)?.focus();
    });
  };

  const handleTimelineEntryKeyDown = (event: KeyboardEvent<HTMLButtonElement>, entry: DebugEntry) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    moveTimelineSelection(entry, event.key === 'ArrowDown' ? 1 : -1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0d0d]">
      {storedRunRef.current && <span ref={reattachStoredRun} hidden aria-hidden="true" />}
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
              className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/3 px-3 text-sm text-zinc-300 transition-colors hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
            <button
              type="button"
              onClick={startRun}
              disabled={isRunning || hasValidationErrors || !yamlCode.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-white/3 text-zinc-300 transition-colors hover:bg-white/6 disabled:opacity-40"
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
                        : 'text-zinc-300 hover:bg-white/6 hover:text-zinc-100'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {vus} {vus === 1 ? 'VU' : 'VUs'}
                  </button>
                );
              })}
            </fieldset>
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
                  <p key={`${error}-${index}`} className="wrap-break-word font-mono text-xs text-red-100/90">
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
              <p className="mt-1 wrap-break-word font-mono text-xs text-red-100/90">{runError}</p>
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
              {timelineEntries.length === 0 ? (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">
                  {isRunning
                    ? 'Running... waiting for the first engine event.'
                    : 'Press Run Debug to execute this YAML against the engine.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {timelineEntries.map(entry => {
                    const active = activeEntry?.id === entry.id;
                    const requestNumber = debugEventRequestNumber(entry.event, entry.node, debugEventTargets);
                    return (
                      <button
                        key={entry.id}
                        ref={element => {
                          if (element) {
                            timelineButtonRefs.current.set(entry.id, element);
                          } else {
                            timelineButtonRefs.current.delete(entry.id);
                          }
                        }}
                        type="button"
                        onClick={() => selectEntry(entry)}
                        onKeyDown={event => handleTimelineEntryKeyDown(event, entry)}
                        aria-current={active ? 'true' : undefined}
                        className={`w-full border px-3 py-2.5 text-left transition-colors ${
                          active ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-white/10 bg-[#111111] hover:border-white/20'
                        } ${entry.status === 'skipped' ? 'opacity-70' : ''} focus:outline-none focus-visible:border-yellow-400/70 focus-visible:ring-2 focus-visible:ring-yellow-400/40`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <StatusIcon status={entry.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              {requestNumber && (
                                <span
                                  className="shrink-0 rounded border border-zinc-500/25 bg-white/4 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300"
                                  title="Request ID"
                                >
                                  #{requestNumber}
                                </span>
                              )}
                              <span className="rounded border border-blue-400/25 bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                                {entry.event.method}
                              </span>
                              <span className="truncate text-sm text-zinc-100">{entry.event.path || entry.event.name}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                              {entry.status === 'skipped' ? (
                                <>
                                  {entry.event.vu ? <span>VU{entry.event.vu}</span> : null}
                                  <span className={`rounded border px-1.5 py-0.5 ${statusTone(entry.status)}`}>
                                    Skipped · redirect not followed
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>{formatEventTime(entry.event.ts)}</span>
                                  {entry.event.vu ? <span>VU{entry.event.vu}</span> : null}
                                  <span>{formatLatency(entry.event.latency_ms)}</span>
                                  <span className={`rounded border px-1.5 py-0.5 ${statusTone(entry.status)}`}>
                                    {entry.event.status || '—'}
                                  </span>
                                </>
                              )}
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
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeEntry.node && (
                      <button
                        type="button"
                        onClick={() => onEditNode(activeEntry.node!)}
                        className="inline-flex h-8 items-center gap-2 rounded border border-white/10 bg-white/3 px-2.5 text-xs text-zinc-300 transition-colors hover:bg-white/6"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(activeEntry.status)}`}>
                      {activeEntry.status === 'skipped'
                        ? 'Skipped'
                        : activeEntry.status === 'failed'
                          ? 'Failed'
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
                {activeEntry.status === 'skipped' && (
                  <div className="mb-4 flex items-start gap-2 rounded border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-zinc-400">
                    <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                    <span>
                      This redirect hop was recorded but not followed in this run — the engine stopped at the redirect
                      trust boundary (e.g. a cross-site callback), so no live request was made. It is shown to keep the
                      recorded chain visible; there is no live request or response to inspect.
                    </span>
                  </div>
                )}
                <DebugInspectorContent
                  key={activeEntry.id}
                  entry={activeEntry}
                  tab={detailTab}
                  redirectedInfo={activeEntry.node ? (redirectedRequestMap[activeEntry.node.id] ?? null) : null}
                />
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

function DebugInspectorContent({
  entry,
  tab,
  redirectedInfo,
}: {
  entry: DebugEntry;
  tab: DetailTab;
  redirectedInfo?: RedirectedRequestInfo | null;
}) {
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
  // Collapse a binary response body to the same notice the recorded Response
  // view shows, so the live Debug body and the recording stay comparable instead
  // of one dumping mojibake and the other {"0":48,...}. RLP-555.
  const responseBody = event.response_body
    ? (binaryBodyDisplay(event.response_body, event.response_headers) ?? event.response_body)
    : '<empty>';

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
      const usedNames = requestVariableNames(entry.node);
      const message =
        entry.node && usedNames.length === 0
          ? 'This request neither extracts nor uses any variables.'
          : 'No variable values were captured for this request.';
      return <p className="text-sm text-zinc-500">{message}</p>;
    }
    return <DebugSection rows={variables} wrapLabels />;
  }

  if (tab === 'logs') {
    const time = formatEventTime(event.ts);
    const redirectHops = event.redirects ?? [];
    return (
      <div className="border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-6 text-zinc-300 wrap-break-word">
        <p className="text-emerald-300">[{time}] debug session received request event</p>
        <p className="text-blue-300">
          [{time}] {event.method} {event.path || event.name} - {event.status || '—'} ({formatLatency(event.latency_ms)})
        </p>
        {redirectHops.length > 0 && (
          // These rows are the redirect chain that led to the response above —
          // not the request's own status. Spell that out so a final 200 that
          // followed 302s no longer reads as if the request itself were a 302.
          // RLP-585 #7.
          <p className="text-zinc-400">
            [{time}] followed {redirectHops.length} redirect{redirectHops.length === 1 ? '' : 's'} before this{' '}
            {event.status || ''} response:
          </p>
        )}
        {redirectHops.map((hop, index) => {
          const targetStatus = redirectHops[index + 1]?.status ?? event.status;
          const targetMethod = redirectHops[index + 1]?.method ?? event.method;
          return (
            <p key={`${hop.status}-${hop.method ?? ''}-${hop.url ?? ''}-${hop.location ?? hop.target_url ?? ''}`} className="pl-6 text-zinc-400 break-all">
              ↳ hop {index + 1}: {hop.status || '—'} {hop.method ? `${hop.method} ` : ''}{hop.url || ''} →{' '}
              {targetStatus || '—'} {targetMethod ? `${targetMethod} ` : ''}{hop.location || hop.target_url || ''}
            </p>
          );
        })}
        {/* RLP-598 #1: on the final 200 the full hop chain above already names the
            immediate predecessor, so drop the redundant "launched by" line there.
            Intermediate 302 children (no hop chain yet) still show it. */}
        {redirectedInfo && redirectHops.length === 0 && (
          <p className="text-zinc-400">
            [{time}] redirected request launched by {redirectedInfo.sourceRequestLabel}
            {redirectedInfo.matchedLocation ? ` → ${redirectedInfo.matchedLocation}` : ''}
          </p>
        )}
        {event.err && <p className="text-red-300">[{time}] {event.err}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DebugLine
        icon={<Eye className="h-4 w-4 text-yellow-300" />}
        title="Step"
        // Show what the run actually sent, sourced from the event like the
        // timeline and the header above — not the recorded node name, which
        // bakes in the capture-time value of any correlated placeholder. When an
        // extraction fails the node name still reads NROEXP=2026-88-001-0168
        // while the request went out as NROEXP=Regex+value+not+found, so reading
        // from the node made Overview contradict the Request tab. RLP-593.
        value={event.path || event.name}
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
        <p className="mt-1 wrap-break-word text-sm text-zinc-200">{value}</p>
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
      <div className="relative min-w-55 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          aria-label={placeholder}
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
        className="h-8 rounded border border-white/10 bg-white/3 px-2 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={!value || totalMatches === 0 || regexInvalid}
        className="h-8 rounded border border-white/10 bg-white/3 px-2 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
