import { useState } from 'react';
import { ExternalLink, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { HTTPDynamicReview } from './HTTPDynamicReview';
import { recorderCompactButton as button } from './HTTPRecorderSettings';
export function HTTPRecorderSaved({
  path,
  total,
  opening,
  onOpen,
  language,
}: {
  path: string;
  total: number;
  opening: boolean;
  onOpen: () => void;
  language: string;
}) {
  const [review, setReview] = useState(false);
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  return (
    <footer className="flex h-10 shrink-0 items-center gap-3 border-t border-white/10 bg-[#111111] px-3 text-xs">
      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
      <p
        role="status"
        className="min-w-0 flex-1 truncate font-mono text-emerald-300"
        title={path}
      >
        {path}
      </p>
      {total === 0 && <span className="text-amber-300">{text('No requests captured', 'Sin requests capturados')}</span>}
      <button
        type="button"
        className={button}
        onClick={() => setReview(true)}
      >
        {text('Review dynamic values', 'Revisar valores dinámicos')}
      </button>
      <button
        type="button"
        className={button + ' border-yellow-400/30! text-yellow-300!'}
        disabled={opening}
        onClick={onOpen}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {text('Open saved script in Studio', 'Abrir script guardado en Studio')}
      </button>
      <Dialog
        open={review}
        onOpenChange={setReview}
      >
        <DialogContent className="max-h-[80vh] max-w-xl! overflow-y-auto p-4">
          <DialogTitle className="text-sm">{text('Review dynamic values', 'Revisar valores dinámicos')}</DialogTitle>
          <DialogDescription className="text-xs">
            {text('Relationships found in the saved recording.', 'Relaciones encontradas en la grabación guardada.')}
          </DialogDescription>
          <HTTPDynamicReview
            key={path}
            language={language}
            autoAnalyze
          />
          <button
            type="button"
            className={button + ' justify-self-end'}
            onClick={() => setReview(false)}
          >
            {text('Done', 'Listo')}
          </button>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
