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
