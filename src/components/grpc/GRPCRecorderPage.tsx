import { useEffect, useState } from 'react';
import { CircleDot, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAgentState } from '../../hooks/useAgentState';
import { agentUnavailableText } from '../../utils/agentHost';
import { usesRelay } from '../../utils/agentTransport';
import { probeStudio } from '../../utils/debugApi';
import { openStudioEditorTab } from '../../utils/recorderTabs';
import { GRPCWorkbench } from './GRPCWorkbench';

export function GRPCRecorderPage({
  embedded = false,
  onAdd,
  onGoToScripting,
  onActivityChange,
  onPendingChange,
}: {
  embedded?: boolean;
  onAdd?: (yaml: string, afterSaved?: () => Promise<void>) => Promise<void> | void;
  onGoToScripting?: () => void;
  onActivityChange?: (active: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
} = {}) {
  const { language, setLanguage } = useLanguage();
  const [capabilities, setCapabilities] = useState<{ browser: boolean; tabs: boolean } | null>(null),
    [error, setError] = useState('');
  // Through the relay the machine can connect later: a new state asks again.
  const agentState = useAgentState();
  useEffect(() => {
    const previous = document.title;
    document.title = 'Relampo Recorder · gRPC';
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get('lang');
    if (lang === 'es' || lang === 'en') setLanguage(lang);
    let cancelled = false;
    probeStudio()
      .then(value => {
        if (cancelled) return;
        if (!value?.studio || !value.capabilities?.grpcAuthoring) {
          setError(
            !usesRelay()
              ? 'A compatible local Relampo Studio is required.'
              : value
                ? 'The gRPC recorder is not available with your plan or your agent version.'
                : agentUnavailableText(),
          );
          return;
        }
        setError('');
        setCapabilities({
          browser: value.capabilities.grpcBrowserRecording === true,
          tabs: value.capabilities.grpcRecorderTabs === true,
        });
      })
      .catch(cause => {
        if (!cancelled) setError(String(cause.message));
      });
    return () => {
      cancelled = true;
    };
  }, [setLanguage, agentState]);
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a]">
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-6 py-4">
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
          <button
            type="button"
            className="text-xs text-yellow-400"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          >
            {language === 'es' ? 'ES' : 'EN'}
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="p-6 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {!capabilities && !error && (
        <p
          role="status"
          className="p-6 text-sm text-zinc-400"
        >
          {language === 'es' ? 'Abriendo Recorder…' : 'Opening Recorder…'}
        </p>
      )}
      {capabilities && (
        <GRPCWorkbench
          open
          presentation="page"
          onAdd={onAdd}
          onActivityChange={onActivityChange}
          onPendingChange={onPendingChange}
          initialMode="record"
          browserRecordingEnabled={capabilities.browser}
          saveProjectEnabled={!embedded && capabilities.tabs}
          language={language}
          onOpenChange={() => {}}
          onGoToStudio={() => {
            if (onGoToScripting) {
              onGoToScripting();
              return;
            }
            if (!openStudioEditorTab())
              setError(
                language === 'es' ? 'Permite abrir Studio en otra pestaña.' : 'Allow opening Studio in another tab.',
              );
          }}
        />
      )}
    </div>
  );
}
