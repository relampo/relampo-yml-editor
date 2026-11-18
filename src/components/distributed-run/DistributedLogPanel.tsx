import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DistributedPoint } from '../../utils/distributedApi';

// Match Local's log presentation while retaining the distributed measurements.
export function DistributedLogPanel({ history }: { history: DistributedPoint[] }) {
  const { t, language } = useLanguage();
  const es = language === 'es';
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [history, collapsed]);
  const time = (at: string) => {
    const date = new Date(at);
    if (!Number.isFinite(date.getTime())) return '';
    const pad = (value: number, size = 2) => String(value).padStart(size, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  };
  return (
    <div className="border border-white/10 bg-[#050505]">
      <button
        type="button"
        onClick={() => setCollapsed(value => !value)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/3 ${collapsed ? '' : 'border-b border-white/5'}`}
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
          {history.length.toLocaleString()}{' '}
          {t(`yamlEditor.runDebug.run.logs.line${history.length === 1 ? 'One' : 'Many'}`)}
        </span>
      </button>
      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-5"
        >
          {!history.length ? (
            <p className="text-zinc-600">{t('yamlEditor.runDebug.run.logs.waiting')}</p>
          ) : (
            history.map((point, index) => (
              <div
                key={`${point.at}-${index}`}
                className="flex gap-2 break-all whitespace-pre-wrap"
              >
                <span className="shrink-0 text-zinc-600">{time(point.at)}</span>
                <span className={point.failures > 0 ? 'text-red-300' : 'text-zinc-300'}>
                  {point.requests} {es ? 'peticiones' : 'requests'} · {point.failures} {es ? 'errores' : 'failures'} ·{' '}
                  {point.rps.toFixed(1)} req/s
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
