import type { ReactNode } from 'react';
import { ArrowLeft, CircleDot, Globe, Zap } from 'lucide-react';
import { openStudioEditorTab } from '../../utils/recorderTabs';
export function RecorderShell({
  children,
  language,
  setLanguage,
  onError,
}: {
  children: ReactNode;
  language: string;
  setLanguage: (language: 'en' | 'es') => void;
  onError: (message: string) => void;
}) {
  const es = language === 'es';
  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-zinc-200">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400">
            <Zap className="h-4 w-4 fill-white text-white" />
          </div>
          <p className="text-sm font-black text-white">RELAMPO</p>
          <span className="mx-2 h-4 border-l border-white/10" />
          <h1 className="flex items-center gap-2 text-xs font-medium">
            <CircleDot className="h-3 w-3 text-red-400" />
            <Globe className="h-3.5 w-3.5 text-emerald-300" />
            HTTP/HTTPS Recorder
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
            onClick={() => {
              if (!openStudioEditorTab())
                onError(es ? 'Permite abrir Studio en otra pestaña.' : 'Allow opening Studio in another tab.');
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {es ? 'Ir a Relampo Studio' : 'Go to Relampo Studio'}
          </button>
          <button
            type="button"
            className="text-xs text-yellow-400"
            onClick={() => setLanguage(es ? 'en' : 'es')}
          >
            {es ? 'ES' : 'EN'}
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
