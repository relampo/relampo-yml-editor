import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeView } from './YAMLTreeView';

function renderInteractiveTreeView({
  tree,
  onTreeStateChange,
}: {
  tree: YAMLNode;
  onTreeStateChange?: (tree: YAMLNode) => void;
}) {
  function Harness() {
    const [currentTree, setCurrentTree] = useState(tree);

    useEffect(() => {
      onTreeStateChange?.(currentTree);
    }, [currentTree]);

    return (
      <LanguageProvider>
        <YAMLTreeView
          tree={currentTree}
          selectedNode={null}
          selectedNodeIds={[]}
          redirectedRequestMap={{}}
          onSelectionChange={() => undefined}
          onTreeChange={setCurrentTree}
        />
      </LanguageProvider>
    );
  }

  return render(<Harness />);
}

describe('YAMLTreeView replacement', () => {
  it('uses the same case-insensitive matching as tree search', async () => {
    let latestTree: YAMLNode | null = null;

    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'request',
            type: 'request',
            name: 'Request',
            data: { method: 'GET', url: '/securityToken', enabled: true },
            children: [],
          },
        ],
      },
      onTreeStateChange: tree => {
        latestTree = tree;
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByLabelText('Find text to replace')).toHaveValue('token');
    fireEvent.change(screen.getByLabelText('Replacement text'), { target: { value: 'token1' } });

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 1');

    fireEvent.click(screen.getByRole('button', { name: 'Replace all' }));

    await waitFor(() => {
      expect(latestTree?.children?.[0].data?.url).toBe('/securitytoken1');
    });
    expect(screen.getByText('1 replacement')).toBeInTheDocument();
  });

  it('navigates active replaceable matches without changing the tree', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'request-one',
            type: 'request',
            name: 'Request one',
            data: { url: '/one/token', response: { body: 'token' } },
            children: [],
          },
          {
            id: 'request-two',
            type: 'request',
            name: 'Request two',
            data: { url: '/two/token' },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('treeitem', { name: /Request one/i })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('res')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next replace match' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('2 / 2');
    expect(screen.getByRole('treeitem', { name: /Request two/i })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('treeitem', { name: /Request one/i })).not.toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Previous replace match' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('treeitem', { name: /Request one/i })).toHaveAttribute('aria-current', 'true');
  });

  it('keeps response-only results visible but not replaceable', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'response-only-request',
            type: 'request',
            name: 'Response-only request',
            data: { url: '/health', response: { body: 'token' } },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(screen.getByRole('treeitem', { name: /Response-only request/i })).toBeInTheDocument();
    expect(screen.getByText('res')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('0 / 0');
    expect(screen.getByRole('button', { name: 'Replace selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
  });

  it('keeps the executed search stable until Search is selected again', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          { id: 'token', type: 'request', name: 'Token request', data: { url: '/token' }, children: [] },
          { id: 'other', type: 'request', name: 'Other request', data: { url: '/other' }, children: [] },
        ],
      },
    });

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(screen.getByRole('treeitem', { name: /Token request/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Other request/ })).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'other' } });
    expect(screen.getByRole('treeitem', { name: /Token request/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Other request/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    expect(screen.queryByRole('treeitem', { name: /Token request/ })).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Other request/ })).toBeInTheDocument();
  });

  it('resets the active replacement match when a new search is executed', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          { id: 'request-one', type: 'request', name: 'Token one', data: { url: '/one/token?term=other' }, children: [] },
          { id: 'request-two', type: 'request', name: 'Token two', data: { url: '/two/token?term=other' }, children: [] },
        ],
      },
    });

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next replace match' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('2 / 2');
    expect(screen.getByRole('treeitem', { name: /Token two/i })).toHaveAttribute('aria-current', 'true');

    fireEvent.change(searchInput, { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));

    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('treeitem', { name: /Token one/i })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('treeitem', { name: /Token two/i })).not.toHaveAttribute('aria-current', 'true');
  });

  it('keeps encoded URL values visible to Tree search and replacement', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'encoded-request',
            type: 'request',
            name: 'Encoded request',
            data: { url: '/search?q=hello%20world' },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'hello world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));

    expect(screen.getByRole('treeitem', { name: /Encoded request/ })).toBeInTheDocument();
    expect(screen.getByText('req')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByLabelText('Replace match position')).toHaveTextContent('1 / 1');
  });

  it('clears the executed search and replace controls', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [{ id: 'request', type: 'request', name: 'Token request', data: { url: '/token' }, children: [] }],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByLabelText('Find text to replace')).toHaveValue('token');

    fireEvent.click(screen.getByTitle('Close search'));

    expect(screen.getByPlaceholderText('Search nodes...')).toHaveValue('');
    expect(screen.queryByLabelText('Find text to replace')).not.toBeInTheDocument();
    expect(screen.getByText('Token request')).toBeInTheDocument();
  });

  it('blocks an empty replacement after an executed search', () => {
    let latestTree: YAMLNode | null = null;

    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [{ id: 'request', type: 'request', name: 'Token request', data: { url: '/token' }, children: [] }],
      },
      onTreeStateChange: tree => {
        latestTree = tree;
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), { target: { value: 'token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(screen.getByRole('button', { name: 'Replace selected' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeDisabled();
    expect((latestTree as YAMLNode | null)?.children?.[0].data?.url).toBe('/token');
  });
});
