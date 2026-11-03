import { useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';
import { nextIssueNodeId, type DocumentIssueIndex } from '../utils/documentIssues';

interface YAMLEditorStatusBannersProps {
  error: string | null;
  issueIndex: DocumentIssueIndex;
  selectedNodeId?: string;
  onGoToIssue: (nodeId: string) => void;
  language: string;
}

function countLabel(count: number, es: boolean, kind: 'error' | 'info') {
  if (kind === 'error')
    return es
      ? `${count} ${count === 1 ? 'error de configuración' : 'errores de configuración'}`
      : `${count} configuration ${count === 1 ? 'error' : 'errors'}`;
  return es
    ? `${count} ${count === 1 ? 'campo no reconocido' : 'campos no reconocidos'}`
    : `${count} unrecognized ${count === 1 ? 'field' : 'fields'}`;
}

// Syntax-error banner, plus a one-line summary of the document issues shown in
// the tree. The summary can be closed only when nothing blocks Debug or Run.
export function YAMLEditorStatusBanners({
  error,
  issueIndex,
  selectedNodeId,
  onGoToIssue,
  language,
}: YAMLEditorStatusBannersProps) {
  const es = language === 'es';
  const { errorCount, infoCount, navigationOrder } = issueIndex;
  const infoSignature = JSON.stringify(issueIndex.issues.map(issue => issue.path ?? issue.message));
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const showSummary = !error && navigationOrder.length > 0 && (errorCount > 0 || dismissedSignature !== infoSignature);
  const hasErrors = errorCount > 0;

  return (
    <>
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {showSummary && (
        <div
          role="status"
          className={`px-6 py-2 shrink-0 flex items-center gap-2.5 border-b ${
            hasErrors ? 'bg-red-500/10 border-red-500/20' : 'bg-sky-400/5 border-sky-400/15'
          }`}
        >
          {hasErrors ? (
            <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 text-red-300" />
          ) : (
            <Info aria-hidden="true" className="w-4 h-4 shrink-0 text-sky-300" />
          )}
          <p className="min-w-0 flex-1 text-sm text-zinc-200">
            {[errorCount && countLabel(errorCount, es, 'error'), infoCount && countLabel(infoCount, es, 'info')]
              .filter(Boolean)
              .join(' · ')}
            {infoCount > 0 && (
              <span className="text-zinc-400">
                {' — '}
                {es ? 'los campos no reconocidos se guardan sin cambios.' : 'unrecognized fields are saved without changes.'}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              const nodeId = nextIssueNodeId(navigationOrder, selectedNodeId);
              if (nodeId) onGoToIssue(nodeId);
            }}
            className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs font-medium text-zinc-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70"
          >
            {es ? 'Ir al siguiente' : 'Go to next'}
          </button>
          {!hasErrors && (
            <button
              type="button"
              onClick={() => setDismissedSignature(infoSignature)}
              aria-label={es ? 'Cerrar aviso' : 'Close notice'}
              className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
