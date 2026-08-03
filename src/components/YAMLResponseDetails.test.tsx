import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YAMLResponseDetails } from './YAMLResponseDetails';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('YAMLResponseDetails', () => {
  it('downloads the exact recorded response bytes for byte-indexed binary bodies (RLP-555)', async () => {
    const createObjectURL = vi.fn(() => 'blob:response-body');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });

    render(
      <YAMLResponseDetails
        response={{
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename=Certificado.cer', 'Content-Type': 'application/octet-stream' },
          body: { '0': 48, '1': 130, '2': 6, '3': 206 },
        }}
        onResponseUpdate={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('[binary content · 4 bytes · application/octet-stream]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download response body bytes' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/octet-stream');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([48, 130, 6, 206]);
    expect(downloadedFilename).toBe('Certificado.cer');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:response-body');
  });

  it('does not show a download button for plain text responses', () => {
    render(
      <YAMLResponseDetails
        response={{
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: 'ok',
        }}
        onResponseUpdate={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Download response body bytes' })).not.toBeInTheDocument();
  });
});

describe('YAMLResponseDetails — regex search highlighting', () => {
  // RLP-670 made Relampo's inline-flag patterns compile in the details panels.
  // Before this test the panels ran their own copy of findMatchRanges that
  // located the capture with `full.indexOf(g1)` — the *first* textual
  // occurrence, not the capture's position — so a body where the key repeats
  // the captured value highlighted the key instead. The panels now share
  // debugSearch's `d`-flag implementation; this pins that down.
  it('highlights the captured value, not an earlier identical substring', () => {
    render(
      <YAMLResponseDetails
        response={{ status: 200, headers: {}, body: '{"version":"version"}' }}
        onResponseUpdate={vi.fn()}
        searchText={'(?is)"version"\\s*:\\s*"(.+?)"'}
        searchMode="regex"
      />,
    );

    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('version');
    // Both the key and the value read "version", so the mark's text alone proves
    // nothing — the text preceding it is what pins which one got highlighted.
    // The old `indexOf` matcher produced `{"` here (the key).
    expect(marks[0].previousSibling?.textContent).toBe('{"version":"');
  });

  it('reports a flags-only pattern as an invalid regex instead of matching everything', () => {
    render(
      <YAMLResponseDetails
        response={{ status: 200, headers: {}, body: 'some recorded body' }}
        onResponseUpdate={vi.fn()}
        searchText="(?i)"
        searchMode="regex"
      />,
    );

    expect(document.querySelectorAll('mark')).toHaveLength(0);
    expect(screen.getByText(/invalid regex/i)).toBeInTheDocument();
  });
});
