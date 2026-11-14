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

  beforeEach(() => {
    vi.spyOn(transport, 'agentFileUrl').mockReturnValue(null);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:studio/1'), revokeObjectURL: vi.fn() }));
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
  });

  function show(path: string, download?: boolean) {
    render(
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

  it('shows an HTML report in a frame that cannot reach the web app', async () => {
    vi.spyOn(transport, 'agentRequest').mockResolvedValue(
      new Response('<h1>Report</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    );

    show('/api/run/7/report?lang=en');

    const frame = await screen.findByTitle('Report');
    expect(frame).toHaveAttribute('src', 'blob:studio/1');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-downloads');
    expect(clicked).toHaveLength(0);
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
});
