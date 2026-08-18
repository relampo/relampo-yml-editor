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

const httpDefaultsNode: YAMLNode = {
  id: 'http_defaults',
  type: 'http_defaults',
  name: 'HTTP Defaults',
  data: {
    base_url: 'https://primary.example.com',
  },
};

describe('YAMLNodeDetails data source file browsing', () => {
  it('disables data source file browsing outside local Studio', () => {
    renderDetails(dataSourceNode);

    expect(screen.getByRole('button', { name: 'Browse' })).toBeDisabled();
    expect(screen.getByText(/Data source file browsing is only available when running Relampo Studio locally/)).toBeInTheDocument();
  });

  it('enables data source file browsing in local Studio', async () => {
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
    expect(await screen.findByText('No rows found.')).toBeInTheDocument();
  });

  it('shows the data source mode helper in English by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ path: 'users.csv', lines: [], truncated: false }) }),
    );

    renderDetails(dataSourceNode, { dataSourceFileBrowseEnabled: true });

    expect(screen.getByText('Each VU cycles through the list from the beginning.')).toBeInTheDocument();
    expect(screen.queryByText('Cada VU cicla sobre la lista desde el inicio.')).not.toBeInTheDocument();
    expect(await screen.findByText('No rows found.')).toBeInTheDocument();
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

describe('YAMLNodeDetails HTTP Defaults hosts', () => {
  it('renders and commits a secondary host edit', () => {
    const onRenameHost = vi.fn();

    render(
      <LanguageProvider>
        <YAMLNodeDetails
          node={httpDefaultsNode}
          hosts={['https://primary.example.com', 'https://secondary.example.com']}
          onRenameHost={onRenameHost}
        />
      </LanguageProvider>,
    );

    const secondaryHost = screen.getByLabelText('Secondary host');
    expect(secondaryHost).toHaveValue('secondary.example.com');

    fireEvent.change(secondaryHost, { target: { value: 'replacement.example.com' } });
    fireEvent.blur(secondaryHost);

    expect(onRenameHost).toHaveBeenCalledWith('https://secondary.example.com', 'replacement.example.com');
  });

  it('renders an independent remove action for every secondary host', () => {
    const onRemoveHost = vi.fn();

    render(
      <LanguageProvider>
        <YAMLNodeDetails
          node={httpDefaultsNode}
          // collectScenarioHosts yields bare authorities, never scheme-prefixed
          // values — this is the shape production actually passes down.
          hosts={['primary.example.com', 'secondary.example.com', 'tertiary.example.com']}
          onRemoveHost={onRemoveHost}
        />
      </LanguageProvider>,
    );

    // Each button names the row it deletes; a shared "Remove host" label left a
    // screen-reader user unable to tell which host an irreversible bulk rewrite
    // was about to hit.
    const first = screen.getByRole('button', { name: 'Remove base_url1' });
    const second = screen.getByRole('button', { name: 'Remove base_url2' });

    fireEvent.click(first);
    fireEvent.click(second);

    expect(onRemoveHost).toHaveBeenNthCalledWith(1, 'secondary.example.com');
    expect(onRemoveHost).toHaveBeenNthCalledWith(2, 'tertiary.example.com');
  });

  it('offers no host removal when http_defaults has no base_url to fall back on', () => {
    // Removal makes the host's requests relative so they inherit the primary
    // base_url. With no primary stored there is nothing to inherit, and the
    // requests would be left with no host at all — nothing validates that.
    render(
      <LanguageProvider>
        <YAMLNodeDetails
          node={{ id: 'http_defaults', type: 'http_defaults', name: 'HTTP Defaults', data: { headers: {} } }}
          hosts={['a.example.com', 'b.example.com']}
          onRemoveHost={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.queryByRole('button', { name: /^Remove base_url/ })).not.toBeInTheDocument();
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
