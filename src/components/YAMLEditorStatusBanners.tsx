import { AlertTriangle } from 'lucide-react';

interface YAMLEditorStatusBannersProps {
  error: string | null;
  validationErrors: string[];
  language: string;
}

// Parse-error banner and semantic-validation warning banner shown below the
// header. Validation is only shown when there is no hard parse error.
export function YAMLEditorStatusBanners({ error, validationErrors, language }: YAMLEditorStatusBannersProps) {
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
    </>
  );
}
