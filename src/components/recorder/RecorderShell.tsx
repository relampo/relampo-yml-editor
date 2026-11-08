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
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400">
            <Zap className="h-6 w-6 fill-white text-white" />
          </div>
          <div>
            <p className="text-xl font-black text-white">RELAMPO</p>
            <p className="flex items-center gap-2 text-xs text-zinc-400">
              <CircleDot className="h-3 w-3 text-red-400" />
              Recorder
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
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
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-white/10 bg-[#111111] px-6 py-4">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Globe className="h-5 w-5 text-emerald-300" />
            HTTP/HTTPS Recorder
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {es
              ? 'Graba tu flujo en Firefox. Relampo prepara el proxy y el certificado automáticamente.'
              : 'Record your flow in Firefox. Relampo prepares the proxy and certificate automatically.'}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
