import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, ArrowLeft } from 'lucide-react';
import type { HTTPRecordingState } from '../../utils/httpRecorderApi';
import { styleRecorderControlWindow } from '../../utils/recorderControlWindow';
import { HTTPRecorderControls } from './HTTPRecorderControls';
import { recorderCompactButton } from './HTTPRecorderSettings';

export function HTTPRecorderFloatingControls({
  target,
  state,
  busy,
  error,
  language,
  onAction,
  onClose,
}: {
  target: Window;
  state: HTTPRecordingState;
  busy: string;
  error: string;
  language: string;
  onAction: (path: string, body: unknown) => Promise<unknown>;
  onClose: () => void;
}) {
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  useEffect(() => {
    const cleanStyles = styleRecorderControlWindow(target);
    target.addEventListener('pagehide', onClose);
    const close = () => target.close();
    window.addEventListener('pagehide', close);
    return () => {
      cleanStyles();
      target.removeEventListener('pagehide', onClose);
      window.removeEventListener('pagehide', close);
      target.close();
    };
  }, [target, onClose]);
  useEffect(() => {
    target.document.title = 'Relampo · ' + text('Recording controls', 'Control de grabación');
  });
  return createPortal(
    <main
      data-recording-controls
      className="min-h-screen bg-[#0a0a0a] p-3 text-xs text-zinc-200"
    >
      <header className="mb-2 flex h-9 items-center gap-2 border-b border-white/10 pb-2">
        <h1 className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-yellow-400">
            <Zap className="h-3 w-3 fill-white text-white" />
          </span>
          Relampo
        </h1>
        <p
          role="status"
          className="min-w-0 flex-1 truncate text-[11px] text-zinc-400"
        >
          {state.active
            ? state.recording
              ? text('Recording', 'Grabando')
              : text('Ready to record', 'Listo para grabar')
            : busy === 'start'
              ? text('Preparing Firefox…', 'Preparando Firefox…')
              : text('Recording ready', 'Grabación lista')}
          {' · '}
          {state.totalRequests} requests
        </p>
        <button
          type="button"
          className={recorderCompactButton}
          onClick={() => window.parent.focus()}
          title={text('Return to Relampo', 'Volver a Relampo')}
          aria-label={text('Return to Relampo', 'Volver a Relampo')}
        >
          <ArrowLeft className="h-3 w-3" />
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="mb-2 text-red-300"
        >
          {error}
        </p>
      )}
      {state.active && (
        <HTTPRecorderControls
          compact
          state={state}
          busy={busy}
          language={language}
          stopLabel={text('Stop recording', 'Detener grabación')}
          stopHelp={text(
            'Return to Relampo to add the recording to the test plan.',
            'Vuelve a Relampo para agregar la grabación al plan de pruebas.',
          )}
          onAction={onAction}
        />
      )}
    </main>,
    target.document.body,
  );
}
