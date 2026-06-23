import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLNodeDetails } from './YAMLNodeDetails';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderDetails(
  node: YAMLNode,
  onAddChildNode = vi.fn(),
  onAddChildAction = vi.fn(),
  options: { dataSourceFileBrowseEnabled?: boolean } = {},
) {
  render(
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        onAddChildNode={onAddChildNode}
        onAddChildAction={onAddChildAction}
        dataSourceFileBrowseEnabled={options.dataSourceFileBrowseEnabled}
      />
    </LanguageProvider>,
  );
  return { onAddChildNode, onAddChildAction };
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

describe('YAMLNodeDetails add actions', () => {
  //TODO - re-enable this test when the add child node functionality is implemented
  it.skip('renders add actions for steps nodes', () => {
    renderDetails({
      id: 'scenario_steps',
      type: 'steps',
      name: 'Steps',
      children: [],
    });

    expect(screen.getByRole('button', { name: 'Add HTTP Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add SQL Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Think Time' })).toBeInTheDocument();
  });
  it.skip('adds a child node to the selected parent from details', () => {
    const { onAddChildNode, onAddChildAction } = renderDetails({
      id: 'scenario_steps',
      type: 'steps',
      name: 'Steps',
      children: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add HTTP Request' }));

    expect(onAddChildNode).toHaveBeenCalledWith('scenario_steps', 'request');
    expect(onAddChildAction).toHaveBeenCalledWith({
      parentNodeType: 'steps',
      childNodeType: 'request',
    });
  });
});

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

    renderDetails(dataSourceNode, vi.fn(), vi.fn(), { dataSourceFileBrowseEnabled: true });

    expect(screen.getByRole('button', { name: 'Browse' })).toBeEnabled();
    expect(
      screen.queryByText(/Data source file browsing is only available when running Relampo Studio locally/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Local: in browser mode/)).not.toBeInTheDocument();
  });

  it('shows a local Studio data preview', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ path: 'users.csv', lines: ['alice', 'bob'], truncated: false }),
      }),
    );

    renderDetails(dataSourceNode, vi.fn(), vi.fn(), { dataSourceFileBrowseEnabled: true });

    expect(await screen.findByText('Data Preview')).toBeInTheDocument();
    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/studio/data-source-preview?path=users.csv',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
