import { AlertCircle, Info } from 'lucide-react';
import type { DocumentIssue, IssueMarker, IssueSeverity } from '../utils/documentIssues';
import { DESCENDANT_ISSUE_LABEL, previewIssueValue } from '../utils/documentIssues';

const SEVERITY_STYLE: Record<IssueSeverity, { icon: typeof Info; badge: string; dot: string; text: string }> = {
  error: {
    icon: AlertCircle,
    badge: 'bg-red-400/15 text-red-300 border-red-400/40',
    dot: 'bg-red-400',
    text: 'text-red-300',
  },
  info: {
    icon: Info,
    badge: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
  },
};

/** Tree badge for a node's own issues: the icon of the highest severity, plus a count when there is more than one. */
export function IssueBadge({ marker }: { marker?: IssueMarker }) {
  if (!marker?.severity) return null;
  const { icon: Icon, badge } = SEVERITY_STYLE[marker.severity];
  return (
    <span
      aria-hidden="true"
      title={marker.issues.map(issue => issue.message).join('\n')}
      className={`inline-flex h-5 items-center gap-0.5 shrink-0 rounded border px-1 text-xs font-medium leading-none ${badge}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {marker.issues.length > 1 && marker.issues.length}
    </span>
  );
}

/** Dot on a collapsed node that has issues inside it. */
export function DescendantIssueDot({ severity }: { severity: IssueSeverity }) {
  return (
    <span
      aria-hidden="true"
      title={DESCENDANT_ISSUE_LABEL[severity]}
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_STYLE[severity].dot}`}
    />
  );
}

/** Read-only "Issues" section in Element Details. Errors come first. */
export function NodeIssuesSection({ issues, language }: { issues: DocumentIssue[]; language: string }) {
  if (!issues.length) return null;
  const es = language === 'es';
  const sorted = [...issues].sort((a, b) => Number(a.severity === 'info') - Number(b.severity === 'info'));
  const typeLabel = { text: es ? 'texto' : 'text', list: es ? 'lista' : 'list', object: es ? 'objeto' : 'object' };
  return (
    <section aria-labelledby="node-issues-title" className="mb-6 rounded border border-white/10 bg-white/[0.02] p-3">
      <h4 id="node-issues-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {es ? 'Problemas' : 'Issues'}
      </h4>
      <ul className="space-y-2">
        {sorted.map(issue => {
          const { icon: Icon, text } = SEVERITY_STYLE[issue.severity];
          const value = issue.kind === 'unrecognized_field' ? previewIssueValue(issue.value) : null;
          return (
            <li key={issue.id} className="flex items-start gap-2 text-sm">
              <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} />
              <div className="min-w-0 flex-1">
                {issue.kind === 'configuration' ? (
                  <p className="wrap-break-word text-zinc-200">{issue.message}</p>
                ) : (
                  <>
                    <p className="text-zinc-200">
                      {es ? 'Campo no reconocido' : 'Unrecognized field'}{' '}
                      <code className="wrap-break-word font-mono text-xs text-zinc-300">{issue.relativePath}</code>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {es
                        ? 'Relampo no usa este campo. Se guarda sin cambios.'
                        : 'Relampo does not use this field. It is saved without changes.'}
                    </p>
                    {value && (
                      <p className="mt-1 wrap-break-word font-mono text-xs text-zinc-400">
                        <span className="text-zinc-500">{typeLabel[value.type]}: </span>
                        {value.preview}
                        {value.truncated && '…'}
                      </p>
                    )}
                    {issue.path !== issue.relativePath && (
                      <p className="mt-0.5 wrap-break-word font-mono text-[11px] text-zinc-600">{issue.path}</p>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One line in Debug and Run when configuration errors block the session. */
export function BlockedByIssuesNotice({
  errorCount,
  action,
  onGoToFirstError,
  extraMessages = [],
}: {
  errorCount: number;
  action: 'debug' | 'run';
  onGoToFirstError?: () => void;
  extraMessages?: string[];
}) {
  return (
    <div className="border-b border-red-400/20 bg-red-500/10 px-5 py-3">
      <div className="flex items-center gap-3">
        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-red-300" />
        <p className="flex-1 text-sm font-semibold text-red-200">
          {errorCount > 0
            ? `Fix ${errorCount} configuration ${errorCount === 1 ? 'error' : 'errors'} before you ${action}.`
            : `This ${action === 'debug' ? 'debug session' : 'load test'} cannot start.`}
        </p>
        {errorCount > 0 && onGoToFirstError && (
          <button
            type="button"
            onClick={onGoToFirstError}
            className="shrink-0 rounded border border-red-300/40 px-2 py-1 text-xs font-medium text-red-100 hover:bg-red-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
          >
            Go to first error
          </button>
        )}
      </div>
      {extraMessages.map(message => (
        <p key={message} className="mt-1 pl-7 wrap-break-word text-xs text-red-200/80">
          {message}
        </p>
      ))}
    </div>
  );
}
