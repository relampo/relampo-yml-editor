import { useEffect, useState } from 'react';
import { FolderOpen, Save } from 'lucide-react';
import { grpcRequest } from '../../utils/grpcApi';
import { validateSavedEditorURL } from '../../utils/recorderTabs';
const input = 'w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 font-mono';
export function GRPCSaveProject({ projectId, language }: { projectId: string; language: string }) {
  const [directory, setDirectory] = useState(''),
    [name, setName] = useState('grpc-recording');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [savedPath, setSavedPath] = useState('');
  const es = language === 'es';
  const text = (en: string, spanish: string) => (es ? spanish : en);
  useEffect(() => {
    const controller = new AbortController();
    grpcRequest<{ directory: string }>('projects/save-options', undefined, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setDirectory(current => current || value.directory);
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(String(cause.message));
      });
    return () => controller.abort();
  }, []);
  async function saveAndOpen() {
    if (busy) return;
    // Open synchronously on the user gesture; navigate only after persistence.
    const editor = window.open('about:blank', '_blank');
    if (!editor) {
      setError(
        text(
          'Allow this site to open the saved script in a new tab.',
          'Permite que este sitio abra el script guardado en una pestaña nueva.',
        ),
      );
      return;
    }
    editor.opener = null;
    editor.document.title = text('Saving recording…', 'Guardando grabación…');
    editor.document.body.textContent = text(
      'Saving your recording before opening Studio…',
      'Guardando tu grabación antes de abrir Studio…',
    );
    setBusy(true);
    setError('');
    try {
      const result = await grpcRequest<{ savedPath: string; editorUrl: string }>(
        'projects/' + encodeURIComponent(projectId) + '/save',
        { directory, name },
      );
      setSavedPath(result.savedPath);
      const url = validateSavedEditorURL(result.editorUrl);
      if (!editor.closed) editor.location.replace(url);
    } catch (cause) {
      editor.close();
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-md border border-white/10 bg-[#111111] p-4"
      aria-label={text('Save recording locally', 'Guardar grabación en la PC')}
    >
      <p className="text-xs text-zinc-400">
        {text(
          'Save the YAML and its contracts on your computer, then open the saved project in a separate Studio editor.',
          'Guarda el YAML y sus contratos en tu PC y abre el proyecto guardado en un editor Studio separado.',
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {text('Save folder', 'Carpeta de guardado')}
          <input
            aria-label="Save folder"
            className={input + ' normal-case font-normal tracking-normal'}
            value={directory}
            disabled={busy}
            onChange={event => setDirectory(event.target.value)}
          />
        </label>
        <label className="block space-y-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {text('Script name', 'Nombre del script')}
          <input
            aria-label="Script name"
            className={input + ' normal-case font-normal tracking-normal'}
            value={name}
            disabled={busy}
            onChange={event => setName(event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || !directory.trim() || !name.trim()}
        onClick={saveAndOpen}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        {busy ? text('Saving…', 'Guardando…') : text('Save and open in editor', 'Guardar y abrir en el editor')}
      </button>
      {savedPath && (
        <p
          role="status"
          className="flex items-start gap-2 break-all text-xs text-emerald-400"
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          {text('Saved: ', 'Guardado: ')}
          {savedPath}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
