import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLNodeDetails } from './YAMLNodeDetails';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDetails(
  node: YAMLNode,
  options: { dataSourceFileBrowseEnabled?: boolean } = {},
) {
  render(
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        dataSourceFileBrowseEnabled={options.dataSourceFileBrowseEnabled}
      />
    </LanguageProvider>,
  );
}

function StatefulDetails({
  initialNode,
  options = {},
}: {
  initialNode: YAMLNode;
  options?: { dataSourceFileBrowseEnabled?: boolean };
}) {
  const [node, setNode] = useState(initialNode);

  return (
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        onNodeUpdate={(nodeId, updatedData) => {
          setNode(currentNode => (currentNode.id === nodeId ? { ...currentNode, data: updatedData } : currentNode));
        }}
        dataSourceFileBrowseEnabled={options.dataSourceFileBrowseEnabled}
      />
    </LanguageProvider>
  );
}

const dataSourceNode: YAMLNode = {
  id: 'data_source',
  type: 'data_source',
  name: 'Data Source',
  data: {
    type: 'csv',
    path: 'users.csv',
    variable_names: 'userIdentifier',
    mode: 'per_vu',
  },
};

const fileNode: YAMLNode = {
  id: 'file_upload',
  type: 'file',
  name: 'File Upload',
  data: {
    path: '',
    mime: '',
  },
};

describe('YAMLNodeDetails data source file browsing', () => {
  it('disables data source file browsing outside local Studio', () => {
    renderDetails(dataSourceNode);

    expect(screen.getByRole('button', { name: 'Browse' })).toBeDisabled();
    expect(screen.getByText(/Data source file browsing is only available when running Relampo Studio locally/)).toBeInTheDocument();
  });

  it('enables data source file browsing in local Studio', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ path: 'users.csv', lines: [], truncated: false }) }),
    );

    renderDetails(dataSourceNode, { dataSourceFileBrowseEnabled: true });

    expect(screen.getByRole('button', { name: 'Browse' })).toBeEnabled();
    expect(
      screen.queryByText(/Data source file browsing is only available when running Relampo Studio locally/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Local: in browser mode/)).not.toBeInTheDocument();
  });

  it('shows the data source mode helper in English by default', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ path: 'users.csv', lines: [], truncated: false }) }),
    );

    renderDetails(dataSourceNode, { dataSourceFileBrowseEnabled: true });

    expect(screen.getByText('Each VU cycles through the list from the beginning.')).toBeInTheDocument();
    expect(screen.queryByText('Cada VU cicla sobre la lista desde el inicio.')).not.toBeInTheDocument();
  });

  it('shows a local Studio data preview', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ path: 'users.csv', lines: ['alice', 'bob'], truncated: false }),
      }),
    );

    renderDetails(dataSourceNode, { dataSourceFileBrowseEnabled: true });

    expect(await screen.findByText('Data Preview')).toBeInTheDocument();
    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/studio/data-source-preview?path=users.csv',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('preserves data source edits while a file upload is pending', async () => {
    let resolveUpload: () => void = () => {};
    const uploadResponse = new Promise(resolve => {
      resolveUpload = () =>
        resolve({
          ok: true,
          json: async () => ({ name: 'users.txt', path: '/tmp/uploaded-users.txt' }),
        });
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(uploadResponse));

    render(<StatefulDetails initialNode={{ ...dataSourceNode, data: { ...dataSourceNode.data, path: '' } }} options={{ dataSourceFileBrowseEnabled: true }} />);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['alice'], 'users.txt', { type: 'text/plain' })] },
    });
    fireEvent.change(screen.getByLabelText('Variable Names (comma-separated)'), {
      target: { value: 'userIdentifier, tenant' },
    });
    resolveUpload();

    expect(await screen.findByDisplayValue('/tmp/uploaded-users.txt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('userIdentifier, tenant')).toBeInTheDocument();
  });
});

describe('YAMLNodeDetails file upload browsing', () => {
  it('keeps Browse enabled for multipart file upload nodes', () => {
    render(<StatefulDetails initialNode={fileNode} />);

    expect(screen.getByRole('button', { name: 'Browse' })).toBeEnabled();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['report'], 'report.pdf', { type: 'application/pdf' })] },
    });

    expect(screen.getByDisplayValue('report.pdf')).toBeInTheDocument();
  });
});
