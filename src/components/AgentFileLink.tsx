import { useEffect, useState, type ComponentProps } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { agentFileUrl, agentRequest } from '../utils/agentTransport';
import { AgentAnswerLost } from '../utils/relayTransport';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

type AgentFileLinkProps = Omit<ComponentProps<'a'>, 'href'> & { path: string };

/**
 * Contract, section 8, "Lost frames": the user waits for this file. After a
 * lost answer Studio reads it once more before it shows the error.
 */
async function readFile(path: string): Promise<Response> {
  try {
    return await agentRequest(path);
  } catch (cause) {
    if (!(cause instanceof AgentAnswerLost)) throw cause;
    return agentRequest(path);
  }
}

// A link to a file that the Relampo backend serves: a report or a download.
// Over HTTP it is a plain link. Through the relay a file has no URL, so Studio
// reads it and gives the browser a blob.
export function AgentFileLink({ path, ...anchor }: AgentFileLinkProps) {
  const href = agentFileUrl(path);
  if (href === null)
    return (
      <AgentFileButton
        path={path}
        {...anchor}
      />
    );
  return (
    <a
      href={href}
      {...anchor}
    />
  );
}

function AgentFileButton({ path, download, className, children }: AgentFileLinkProps) {
  const { language } = useLanguage();
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState('');
  useEffect(
    () => () => {
      if (report) URL.revokeObjectURL(report);
    },
    [report],
  );

  async function open() {
    setBusy(true);
    setError('');
    try {
      const response = await readFile(path);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : '');
      }
      const disposition = response.headers.get('content-disposition') ?? '';
      const html = (response.headers.get('content-type') ?? '').startsWith('text/html');
      const url = URL.createObjectURL(await response.blob());
      if (html && download === undefined && !disposition.startsWith('attachment')) {
        setReport(url);
        return;
      }
      const link = document.createElement('a');
      link.href = url;
      link.download =
        (typeof download === 'string' && download) ||
        /filename="?([^";]+)/.exec(disposition)?.[1] ||
        path.split('?')[0].split('/').pop()!;
      link.click();
      // The browser starts the download from the URL after the click returns.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      setError(
        (cause instanceof Error && !(cause instanceof TypeError) && cause.message) ||
          text('Could not read the file from your machine.', 'No se pudo leer el archivo de tu máquina.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => void open()}
      >
        {children}
      </button>
      {error && (
        <span
          role="alert"
          className="text-xs text-red-300"
        >
          {error}
        </span>
      )}
      <Dialog
        open={!!report}
        onOpenChange={next => {
          if (!next) setReport('');
        }}
      >
        <DialogContent className="h-[90vh] max-w-[95vw]! grid-rows-[auto_1fr] gap-2 p-3">
          <DialogTitle className="text-sm">{text('Report', 'Reporte')}</DialogTitle>
          <DialogDescription className="sr-only">
            {text('The report from your machine.', 'El reporte de tu máquina.')}
          </DialogDescription>
          {/* The report is a file from the customer's machine. Without
              allow-same-origin it cannot read the web app that frames Studio. */}
          <iframe
            title={text('Report', 'Reporte')}
            src={report}
            sandbox="allow-scripts allow-downloads"
            className="h-full w-full rounded border-0 bg-white"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
