import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface YAMLEditorStatusBannersProps {
  error: string | null;
  validationErrors: string[];
  unknownFieldPaths: string[];
  language: string;
}

// Parse-error banner and semantic-validation warning banner shown below the
// header. Validation is only shown when there is no hard parse error.
export function YAMLEditorStatusBanners({
  error,
  validationErrors,
  unknownFieldPaths,
  language,
}: YAMLEditorStatusBannersProps) {
  const unknownFieldSignature = JSON.stringify(unknownFieldPaths);
  const [dismissedUnknownFieldSignature, setDismissedUnknownFieldSignature] = useState<string | null>(null);
  const showUnknownFieldWarning =
    !error &&
    unknownFieldPaths.length > 0 &&
    dismissedUnknownFieldSignature !== unknownFieldSignature;

  return (
    <>
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {!error && validationErrors.length > 0 && (
        <div className="alert-warning px-6 py-3 border-b-0 shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="alert-warning-icon w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {language === 'es'
                ? 'Problemas de validación semántica detectados.'
                : 'Semantic validation issues detected.'}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {validationErrors[0]}
              {validationErrors.length > 1 ? ` (+${validationErrors.length - 1})` : ''}
            </p>
          </div>
        </div>
      )}

      {showUnknownFieldWarning && (
        <div className="alert-warning px-6 py-3 border-b-0 shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="alert-warning-icon w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {language === 'es'
                ? 'Este documento contiene campos desconocidos que se conservarán.'
                : 'This document contains unknown fields that will be preserved.'}
            </p>
            <ul className="mt-0.5 text-xs opacity-80 list-disc list-inside">
              {unknownFieldPaths.map(path => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setDismissedUnknownFieldSignature(unknownFieldSignature)}
            aria-label={language === 'es' ? 'Cerrar advertencia' : 'Close warning'}
            className="ml-auto flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
