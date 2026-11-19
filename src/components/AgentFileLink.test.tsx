import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import * as transport from '../utils/agentTransport';
import { resetStudioSessionForTests } from '../utils/studioAuth';
import { AgentFileLink } from './AgentFileLink';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetStudioSessionForTests();
  window.history.replaceState({}, '', '/');
});

it('renders a plain link to the backend file and keeps the anchor attributes', () => {
  window.history.replaceState({}, '', '/?token=secret');
  resetStudioSessionForTests();

  render(
    <AgentFileLink
      path="/api/grpc/bundles/b1"
      className="button"
      download
    >
      Download project bundle
    </AgentFileLink>,
  );

  const link = screen.getByRole('link', { name: 'Download project bundle' });
  expect(link).toHaveAttribute('href', '/api/grpc/bundles/b1?token=secret');
  expect(link).toHaveAttribute('download');
  expect(link).toHaveClass('button');
});

describe('through the relay', () => {
  let clicked: HTMLAnchorElement[];
  let reportTab: {
    document: Document;
    opener: unknown;
    closed: boolean;
    close: () => void;
    location: { replace: ReturnType<typeof vi.fn> };
  };
  let blobs: Blob[];
  const timers: number[] = [];

  beforeEach(() => {
    vi.spyOn(transport, 'agentFileUrl').mockReturnValue(null);
    reportTab = {
      document: document.implementation.createHTMLDocument('Report'),
      opener: window,
      location: { replace: vi.fn() },
      closed: false,
      close: () => {
        reportTab.closed = true;
      },
    };
    vi.spyOn(window, 'open').mockReturnValue(reportTab as unknown as Window);
    const schedule = globalThis.setInterval;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((callback: TimerHandler, delay?: number) => {
      const timer = schedule(callback, delay);
      timers.push(timer);
      return timer;
    }) as typeof setInterval);
    blobs = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          blobs.push(blob);
          return `blob:studio/${blobs.length}`;
        }),
        revokeObjectURL: vi.fn(),
      }),
    );
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  afterEach(() => {
    for (const timer of timers.splice(0)) clearInterval(timer);
  });

  function show(path: string, download?: boolean) {
    const view = render(
      <LanguageProvider>
        <AgentFileLink
          path={path}
          className="button"
          download={download}
          target="_blank"
        >
          Open file
        </AgentFileLink>
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open file' }));
    return view;
  }

  it('downloads a file with the name that the agent gives', async () => {
    const request = vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('pem', {
        headers: { 'Content-Disposition': 'attachment; filename="relampo-recorder-ca.pem"' },
      }),
    );

    show('/api/grpc/browser-recordings/ca', true);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open file' })).toBeEnabled());
    expect(clicked).toHaveLength(1);
    expect(request).toHaveBeenCalledWith('/api/grpc/browser-recordings/ca');
    expect(clicked[0].download).toBe('relampo-recorder-ca.pem');
    expect(clicked[0].href).toBe('blob:studio/1');
    expect(screen.queryByTitle('Report')).toBeNull();
  });

  it('names a download after the path when the agent gives no name', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(new Response('zip'));

    show('/api/grpc/bundles/b1?x=1', true);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open file' })).toBeEnabled());
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('b1');
  });

  it('opens an HTML report in a new tab isolated from the web app', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('<h1>Report</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    );

    show('/api/run/7/report?lang=en');

    await waitFor(() => expect(reportTab.location.replace).toHaveBeenCalledWith('blob:studio/2'));
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(reportTab.opener).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    const viewerHTML = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(blobs[1]);
    });
    const viewer = new DOMParser().parseFromString(viewerHTML, 'text/html');
    const frame = viewer.querySelector('iframe');
    expect(viewer.doctype?.name).toBe('html');
    expect(viewer.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(
      'width=device-width, initial-scale=1',
    );
    expect(frame?.getAttribute('src')).toBe('blob:studio/1');
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-downloads');
    expect(viewerHTML).not.toMatch(/zoom:|transform:|scale\(/);
    expect(clicked).toHaveLength(0);
    reportTab.closed = true;
  });

  it('releases both blobs when the report tab closes', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('<h1>Report</h1>', { headers: { 'Content-Type': 'text/html' } }),
    );
    show('/api/run/7/report');
    await waitFor(() => expect(reportTab.location.replace).toHaveBeenCalled());
    reportTab.closed = true;
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:studio/2'), { timeout: 2000 });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:studio/1');
  });

  it('releases both blobs if the report tab cannot navigate', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('<h1>Report</h1>', { headers: { 'Content-Type': 'text/html' } }),
    );
    reportTab.location.replace.mockImplementation(() => {
      throw Error('Navigation failed');
    });
    show('/api/run/7/report');
    expect(await screen.findByRole('alert')).toHaveTextContent('Navigation failed');
    expect(reportTab.closed).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:studio/1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:studio/2');
  });

  it('frees a report that arrives after the link left the page', async () => {
    let answer!: (response: Response) => void;
    vi.spyOn(transport, 'agentRequest').mockReturnValue(new Promise(resolve => (answer = resolve)));

    const { unmount } = show('/api/run/7/report?lang=en');
    unmount();
    answer(new Response('<h1>Report</h1>', { headers: { 'Content-Type': 'text/html' } }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:studio/1'));
  });

  it('downloads an HTML report that the agent sends as an attachment', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('<h1>Report</h1>', {
        headers: { 'Content-Type': 'text/html', 'Content-Disposition': 'attachment; filename="report.html"' },
      }),
    );

    show('/api/distributed/run/r1/report/html?download=true');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Open file' })).toBeEnabled());
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('report.html');
  });

  it('shows the error of the agent', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('{"error":"report not available yet"}', { status: 404 }),
    );

    show('/api/run/7/report');

    expect(await screen.findByRole('alert')).toHaveTextContent('report not available yet');
    expect(clicked).toHaveLength(0);
  });

  it('shows a plain text when the machine is not reachable', async () => {
    vi.spyOn(transport, 'agentRequest').mockRejectedValue(new TypeError('Failed to fetch'));

    show('/api/run/7/report');

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read the file from your machine.');
  });
  it('explains a blocked tab without requesting or losing the report', async () => {
    vi.mocked(window.open).mockReturnValue(null);
    const request = vi.spyOn(transport, 'agentRequest');
    show('/api/run/7/report');
    expect(await screen.findByRole('alert')).toHaveTextContent('Allow pop-ups');
    expect(request).not.toHaveBeenCalled();
  });
});
