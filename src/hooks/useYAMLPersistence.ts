import { useState, useRef, useEffect } from 'react';
import yaml from 'js-yaml';

function normalizeYamlFileName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'relampo-script.yaml';
  return /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yaml`;
}

function stripResponsesFromObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripResponsesFromObject);
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'response') continue;
      next[key] = stripResponsesFromObject(nestedValue);
    }
    return next;
  }
  return value;
}

function buildDownloadContent(
  includeResponses: boolean,
  sourceYaml: string,
  language: string
): { content: string | null; error?: string } {
  if (includeResponses) return { content: sourceYaml };
  try {
    const parsed = yaml.load(sourceYaml);
    const sanitized = stripResponsesFromObject(parsed);
    return {
      content: yaml.dump(sanitized, { lineWidth: -1, noRefs: true, sortKeys: false }),
    };
  } catch {
    return {
      content: null,
      error:
        language === 'es'
          ? 'No se pudo generar el YAML sin respuestas. Verifica que el contenido sea válido.'
          : 'Could not generate YAML without responses. Make sure the content is valid.',
    };
  }
}

interface UseYAMLPersistenceParams {
  isDirty: boolean;
  setIsDirty: (v: boolean) => void;
  isInitialized: boolean;
  yamlCode: string;
  currentFileName: string;
  language: string;
  getPersistableYaml: () => string;
  setHasDocumentActivity: (v: boolean) => void;
  setError: (v: string | null) => void;
  serializeDebounceRef: React.MutableRefObject<number | null>;
}

export function useYAMLPersistence({
  isDirty,
  setIsDirty,
  isInitialized,
  yamlCode,
  currentFileName,
  language,
  getPersistableYaml,
  setHasDocumentActivity,
  setError,
  serializeDebounceRef,
}: UseYAMLPersistenceParams) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const actionMessageTimeoutRef = useRef<number | null>(null);
  const autosaveDebounceRef = useRef<number | null>(null);
  const bypassUnloadWarningRef = useRef(false);

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    if (actionMessageTimeoutRef.current) window.clearTimeout(actionMessageTimeoutRef.current);
    actionMessageTimeoutRef.current = window.setTimeout(() => setActionMessage(''), 1800);
  };

  const handleSave = () => {
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    let yamlToPersist: string;
    try {
      yamlToPersist = getPersistableYaml();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
      return;
    }

    const now = new Date();
    localStorage.setItem('relampo-yaml-draft', yamlToPersist);
    localStorage.setItem('relampo-yaml-draft-timestamp', now.toISOString());
    localStorage.setItem('relampo-yaml-draft-filename', currentFileName);
    setHasDocumentActivity(true);
    setIsDirty(false);
    setLastSavedAt(now.toLocaleTimeString());
    showActionMessage(language === 'es' ? 'Cambios guardados' : 'Changes saved');
  };

  const handleDownload = (includeResponses: boolean) => {
    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
      serializeDebounceRef.current = null;
    }

    let sourceYaml: string;
    try {
      sourceYaml = getPersistableYaml();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
      return;
    }

    const { content, error } = buildDownloadContent(includeResponses, sourceYaml, language);
    if (content === null) {
      if (error) setError(error);
      return;
    }

    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = normalizeYamlFileName(currentFileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasDocumentActivity(true);
    setIsDirty(false);
    setLastSavedAt(new Date().toLocaleTimeString());
    showActionMessage(
      includeResponses
        ? language === 'es'
          ? 'YAML descargado con respuestas'
          : 'YAML downloaded with responses'
        : language === 'es'
          ? 'YAML descargado sin respuestas'
          : 'YAML downloaded without responses'
    );
  };

  // Autosave
  useEffect(() => {
    if (!isDirty || !isInitialized) return;
    if (autosaveDebounceRef.current) window.clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = window.setTimeout(() => {
      handleSave();
    }, 2000);
    return () => {
      if (autosaveDebounceRef.current) window.clearTimeout(autosaveDebounceRef.current);
    };
  }, [isDirty, yamlCode]);

  // Before-unload warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || bypassUnloadWarningRef.current) return;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.onbeforeunload = handleBeforeUnload;
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      if (window.onbeforeunload === handleBeforeUnload) window.onbeforeunload = null;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefreshShortcut =
        e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');
      if (isRefreshShortcut && isDirty) {
        e.preventDefault();
        const confirmMessage =
          language === 'es'
            ? 'Tienes cambios sin guardar. Si recargas, se perderán. ¿Quieres continuar?'
            : 'You have unsaved changes. If you reload, they will be lost. Continue?';
        if (window.confirm(confirmMessage)) {
          bypassUnloadWarningRef.current = true;
          window.location.reload();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleDownload(true);
          return;
        }
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [yamlCode, currentFileName, language, isDirty]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (actionMessageTimeoutRef.current) window.clearTimeout(actionMessageTimeoutRef.current);
      if (autosaveDebounceRef.current) window.clearTimeout(autosaveDebounceRef.current);
    };
  }, []);

  return { lastSavedAt, actionMessage, handleSave, handleDownload };
}
