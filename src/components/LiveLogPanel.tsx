import { useState, type RefObject } from 'react';
import { ChevronRight, ChevronDown, Terminal } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { RunLogLine } from '../utils/runApi';
import { formatRunLatency as formatMs } from '../utils/runPresentation';

function formatLogTime(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

const LOG_LEVEL_TONE: Record<RunLogLine['level'], string> = {
  request: 'text-zinc-300',
  info: 'text-blue-300',
  error: 'text-red-300',
  system: 'text-amber-300',
};

function logLineText(line: RunLogLine): string {
  const scope = line.scenario_name ? `[${line.scenario_name}] ` : '';
  if (line.method) {
    const vu = line.vu ? `VU${line.vu} ` : '';
    const status = line.status ? ` → ${line.status}` : '';
    const latency = line.latency_ms != null ? ` (${formatMs(line.latency_ms)})` : '';
    const error = line.message ? `  ${line.message}` : '';
    return `${scope}${vu}${line.method} ${line.path || ''}${status}${latency}${error}`;
  }
  return `${scope}${line.message || ''}`;
}

// A live-tailing log feed of engine events (one panel, capped client-side and
// server-side). Auto-scrolls to the newest line via the parent's scroll ref.
export function LiveLogPanel({ logs, scrollRef }: { logs: RunLogLine[]; scrollRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const firstSequence = logs[0]?.seq;
  const lastSequence = logs[logs.length - 1]?.seq;
  const hasOmittedPrefix = firstSequence != null && firstSequence > 0;
  return (
    <div className="border border-white/10 bg-[#050505]">
      <button
        type="button"
        onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3 ${
          collapsed ? '' : 'border-b border-white/5'
        }`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
        <Terminal className="h-4 w-4 text-emerald-300" />
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          {t('yamlEditor.runDebug.run.logs.title')}
        </p>
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {logs.length.toLocaleString()}{' '}
          {t(
            `yamlEditor.runDebug.run.logs.${hasOmittedPrefix ? 'latestLine' : 'line'}${logs.length === 1 ? 'One' : 'Many'}`,
          )}
        </span>
      </button>
      {/* The notice sits outside the scrolling body: that body is auto-scrolled
          to its newest line, so a notice inside it would be ~1000 rows out of
          view exactly when there is something to say. */}
      {!collapsed && hasOmittedPrefix && lastSequence != null && (
        <p className="border-b border-amber-400/20 px-3 py-2 font-mono text-xs text-amber-200/80">
          {t('yamlEditor.runDebug.run.logs.omitted')
            .replace('{from}', String(firstSequence + 1))
            .replace('{to}', String(lastSequence + 1))}
        </p>
      )}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-5"
        >
          {logs.length === 0 ? (
            <p className="text-zinc-600">{t('yamlEditor.runDebug.run.logs.waiting')}</p>
          ) : (
            logs.map(line => (
              <div
                key={line.seq}
                className="flex gap-2 break-all whitespace-pre-wrap"
              >
                <span className="shrink-0 text-zinc-600">{formatLogTime(line.ts)}</span>
                <span className={LOG_LEVEL_TONE[line.level]}>{logLineText(line)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
