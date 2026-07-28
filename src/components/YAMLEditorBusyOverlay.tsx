import { Loader2 } from 'lucide-react';

interface YAMLEditorBusyOverlayProps {
  isFileLoading: boolean;
  language: string;
}

// Shown while the full YAML is loading or the in-memory tree is (re)parsing.
// The UI is intentionally paused to prevent duplicate actions on the document.
export function YAMLEditorBusyOverlay({ isFileLoading, language }: YAMLEditorBusyOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-60 bg-[#050505]/82 backdrop-blur-sm flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-[min(420px,calc(100%-32px))] rounded-lg border border-yellow-400/25 bg-[#111111] shadow-2xl shadow-black/50 px-6 py-5 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-zinc-100">
          {isFileLoading
            ? language === 'es'
              ? 'Cargando YAML completo'
              : 'Loading full YAML'
            : language === 'es'
              ? 'Procesando árbol en memoria'
              : 'Processing tree in memory'}
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          {language === 'es'
            ? 'La interfaz se pausa momentáneamente para evitar acciones duplicadas y mantener el archivo íntegro.'
            : 'The interface is paused briefly to prevent duplicate actions and keep the file intact.'}
        </p>
      </div>
    </div>
  );
}
