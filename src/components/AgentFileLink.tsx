import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { agentFileUrl, agentRequest } from '../utils/agentTransport';
import { AgentAnswerLost } from '../utils/relayTransport';

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

function AgentFileButton({ path, download, target, className, children }: AgentFileLinkProps) {
  const { language } = useLanguage();
  const text = (en: string, es: string) => (language === 'es' ? es : en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A read can end after this link left the page. Then nothing revokes a new URL.
  const gone = useRef(false);
  useEffect(() => {
    // Also false again: in development React runs an effect, its cleanup, and the effect again.
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  async function open() {
    setBusy(true);
    setError('');
    let tab: Window | null = null;
    const objectURLs: string[] = [];
    const revokeURLs = () => objectURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
    const wantsTab =
      download === undefined &&
      !/[?&]download=/.test(path) &&
      (target === '_blank' || /\/report(?:\?|$)|\/report\/html(?:\?|$)/.test(path));
    try {
      // Reserve a browser tab during the click, before the asynchronous relay read.
      if (wantsTab) {
        tab = window.open('about:blank', '_blank');
        if (!tab)
          throw Error(
            text(
              'Allow pop-ups to open the report in a new tab.',
              'Permite las ventanas emergentes para abrir el reporte en otra pestaña.',
            ),
          );
        tab.opener = null;
        tab.document.title = text('Report', 'Reporte');
        tab.document.body.textContent = text('Opening report…', 'Abriendo reporte…');
      }
      const response = await readFile(path);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : '');
      }
      const disposition = response.headers.get('content-disposition') ?? '';
      const html = (response.headers.get('content-type') ?? '').startsWith('text/html');
      // react-doctor-disable-next-line react-doctor/no-create-object-url-without-revoke -- false positive: every path revokes this URL: just below, in the effect above (a report), or after the download.
      const url = URL.createObjectURL(await response.blob());
      objectURLs.push(url);
      if (gone.current) {
        revokeURLs();
        tab?.close();
        return;
      }
      if (html && download === undefined && !disposition.startsWith('attachment')) {
        tab ??= window.open('about:blank', '_blank');
        if (!tab || tab.closed) {
          revokeURLs();
          throw Error(text('Could not open the report tab.', 'No se pudo abrir la pestaña del reporte.'));
        }
        tab.opener = null;
        // Chrome can store a separate zoom level for about:blank. Navigate to
        // a real document instead of leaving the report inside that blank tab.
        // The exported report keeps its original CSS and remains sandboxed.
        const viewer = document.implementation.createHTMLDocument(text('Report', 'Reporte'));
        viewer.documentElement.lang = language;
        const viewport = viewer.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1';
        viewer.head.append(viewport);
        const frame = viewer.createElement('iframe');
        frame.title = text('Report', 'Reporte');
        frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
        frame.src = url;
        frame.style.cssText = 'width:100%;height:100vh;border:0;display:block;background:white';
        viewer.body.style.margin = '0';
        viewer.body.append(frame);
        const viewerURL = URL.createObjectURL(
          new Blob(['<!doctype html>\n', viewer.documentElement.outerHTML], { type: 'text/html;charset=utf-8' }),
        );
        objectURLs.push(viewerURL);
        tab.location.replace(viewerURL);
        const reportTab = tab;
        const cleanup = setInterval(() => {
          if (reportTab.closed) {
            clearInterval(cleanup);
            revokeURLs();
          }
        }, 1000);
        return;
      }
      tab?.close();
      const link = document.createElement('a');
      link.href = url;
      link.download =
        (typeof download === 'string' && download) ||
        /filename="?([^";]+)/.exec(disposition)?.[1] ||
        path.split('?')[0].split('/').pop()!;
      link.click();
      // The browser starts the download from the URL after the click returns.
      setTimeout(revokeURLs, 60_000);
    } catch (cause) {
      revokeURLs();
      tab?.close();
      if (gone.current) return;
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
    </>
  );
}
