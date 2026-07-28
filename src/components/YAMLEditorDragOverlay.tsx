interface YAMLEditorDragOverlayProps {
  language: string;
}

// Hint shown while a file is being dragged over the editor.
export function YAMLEditorDragOverlay({ language }: YAMLEditorDragOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a]/88 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="px-8 py-6 rounded-2xl border border-yellow-400/40 bg-[#111111] shadow-2xl shadow-yellow-400/10 text-center">
        <p className="text-base font-bold text-yellow-400">
          {language === 'es' ? 'Suelta tu archivo YAML aquí' : 'Drop your YAML file here'}
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {language === 'es'
            ? 'El árbol y el editor se actualizarán automáticamente'
            : 'The tree and code editor will update automatically'}
        </p>
      </div>
    </div>
  );
}
