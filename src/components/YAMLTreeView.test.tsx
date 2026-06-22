import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeView } from './YAMLTreeView';

const originalInnerHeight = window.innerHeight;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

function renderTreeView({
  onContextMenuOpened = vi.fn(),
}: {
  onContextMenuOpened?: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
} = {}) {
  return render(
    <LanguageProvider>
      <YAMLTreeView
        tree={{
          id: 'scenario_steps',
          type: 'steps',
          name: 'Steps',
          expanded: true,
          children: [],
        }}
        selectedNode={null}
        selectedNodeIds={[]}
        redirectedRequestMap={{}}
        onSelectionChange={vi.fn()}
        onTreeChange={vi.fn()}
        onContextMenuOpened={onContextMenuOpened}
      />
    </LanguageProvider>,
  );
}

function findNodeById(tree: YAMLNode | null, targetId: string): YAMLNode | null {
  if (!tree) return null;
  if (tree.id === targetId) return tree;
  for (const child of tree.children ?? []) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}

function renderInteractiveTreeView({
  tree,
  selectedNodeIds = [],
  selectedNodeId = null,
  onTreeStateChange,
}: {
  tree: YAMLNode;
  selectedNodeIds?: string[];
  selectedNodeId?: string | null;
  onTreeStateChange?: (tree: YAMLNode, selectedNodeIds: string[]) => void;
}) {
  function Harness() {
    const [currentTree, setCurrentTree] = useState(tree);
    const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedNodeIds);
    const [currentSelectedNode, setCurrentSelectedNode] = useState<YAMLNode | null>(
      selectedNodeId ? findNodeById(tree, selectedNodeId) : null,
    );

    useEffect(() => {
      onTreeStateChange?.(currentTree, currentSelectedIds);
    }, [currentSelectedIds, currentTree]);

    return (
      <LanguageProvider>
        <YAMLTreeView
          tree={currentTree}
          selectedNode={currentSelectedNode}
          selectedNodeIds={currentSelectedIds}
          redirectedRequestMap={{}}
          onSelectionChange={(primaryNode, nodeIds) => {
            setCurrentSelectedNode(primaryNode);
            setCurrentSelectedIds(nodeIds);
          }}
          onTreeChange={(nextTree, nextSelection) => {
            setCurrentTree(nextTree);
            if (nextSelection) {
              setCurrentSelectedNode(nextSelection.primaryId ? findNodeById(nextTree, nextSelection.primaryId) : null);
              setCurrentSelectedIds(nextSelection.nodeIds);
            }
          }}
        />
      </LanguageProvider>
    );
  }

  return render(<Harness />);
}

describe('YAMLTreeView context menu', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('does not open the context menu on short viewports', () => {
    const onContextMenuOpened = vi.fn();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 640,
    });

    renderTreeView({ onContextMenuOpened });
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Steps/i }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onContextMenuOpened).not.toHaveBeenCalled();
  });

  it('tracks when the context menu opens', () => {
    const onContextMenuOpened = vi.fn();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    renderTreeView({ onContextMenuOpened });
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Steps/i }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(onContextMenuOpened).toHaveBeenCalledWith({
      nodeType: 'steps',
      selectionCount: 1,
      hasMultiSelection: false,
    });
  });
});

describe('YAMLTreeView search filtering', () => {
  it('keeps nodes visible when the search only matches request data', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'request-match',
            type: 'request',
            name: 'Matching request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/matching',
              body: {
                token: 'needle-token',
              },
            },
            children: [],
          },
          {
            id: 'request-other',
            type: 'request',
            name: 'Other request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/other',
            },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'needle-token' },
    });

    expect(screen.getByText('Matching request')).toBeInTheDocument();
    expect(screen.getByText('req')).toBeInTheDocument();
    expect(screen.queryByText('Other request')).not.toBeInTheDocument();
  });

  it('keeps request descendants hidden when the search only matches the request name', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'request-login',
            type: 'request',
            name: 'Login request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/login',
            },
            children: [
              {
                id: 'request-login-headers',
                type: 'headers',
                name: 'Headers',
                data: {
                  authorization: 'Bearer token',
                },
                children: [],
              },
            ],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'Login' },
    });

    expect(screen.getByRole('treeitem', { name: /Login request/i })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Headers/i })).not.toBeInTheDocument();
  });

  it('keeps HTTP Defaults visible when the search matches global headers', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'root',
        type: 'root',
        name: 'Test',
        expanded: true,
        children: [
          {
            id: 'http-defaults',
            type: 'http_defaults',
            name: 'HTTP Defaults',
            expanded: true,
            data: {
              base_url: 'https://api.example.com',
              headers: {
                Authorization: 'Bearer shared-token',
              },
            },
            children: [],
          },
          {
            id: 'request-other',
            type: 'request',
            name: 'Other request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/other',
            },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'Authorization' },
    });

    expect(screen.getByRole('treeitem', { name: /HTTP Defaults/i })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Other request/i })).not.toBeInTheDocument();
  });

  it('reveals request-local extract matches even when the request starts collapsed', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'request-with-extract',
            type: 'request',
            name: 'Request with extract',
            expanded: false,
            data: {
              method: 'GET',
              url: '/users',
              extract: {
                user_id: "jsonpath('$[0].id')",
              },
            },
            children: [
              {
                id: 'request-with-extract-child',
                type: 'extract',
                name: 'Extract: user_id',
                data: {
                  variable: 'user_id',
                  expression: "jsonpath('$[0].id')",
                },
                children: [],
              },
            ],
          },
          {
            id: 'request-other',
            type: 'request',
            name: 'Other request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/other',
            },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'user_id' },
    });

    expect(screen.getByRole('treeitem', { name: /Request with extract/i })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Extract: user_id/i })).toBeInTheDocument();
    expect(screen.queryByText('req')).not.toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Other request/i })).not.toBeInTheDocument();
  });

  it('keeps SQL extract mappings searchable on the SQL node', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'sql-query',
            type: 'sql',
            name: 'Fetch users',
            expanded: true,
            data: {
              dialect: 'postgres',
              query: 'SELECT id FROM users',
              extract: {
                user_id: "jsonpath('$[0].id')",
              },
            },
            children: [],
          },
          {
            id: 'request-other',
            type: 'request',
            name: 'Other request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/other',
            },
            children: [],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'user_id' },
    });

    expect(screen.getByRole('treeitem', { name: /Fetch users/i })).toBeInTheDocument();
    expect(screen.getByText('req')).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Other request/i })).not.toBeInTheDocument();
  });

  it('removes hidden selections from delete shortcuts while the tree is filtered', async () => {
    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'alpha',
            type: 'request',
            name: 'Alpha request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/alpha',
            },
            children: [],
          },
          {
            id: 'beta',
            type: 'request',
            name: 'Beta request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/beta',
            },
            children: [],
          },
        ],
      },
      selectedNodeIds: ['alpha', 'beta'],
      selectedNodeId: 'beta',
    });

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(searchInput, {
      target: { value: 'Alpha request' },
    });

    await waitFor(() => {
      expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    });

    fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' });
    fireEvent.change(searchInput, {
      target: { value: '' },
    });

    expect(screen.queryByText('Alpha request')).not.toBeInTheDocument();
    expect(screen.getByText('Beta request')).toBeInTheDocument();
  });

  it('preserves clipboard order when pasting multiple nodes at the root', async () => {
    let latestTree: YAMLNode | null = null;

    renderInteractiveTreeView({
      tree: {
        id: 'steps',
        type: 'steps',
        name: 'Steps',
        expanded: true,
        children: [
          {
            id: 'alpha',
            type: 'request',
            name: 'Alpha request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/alpha',
            },
            children: [],
          },
          {
            id: 'beta',
            type: 'request',
            name: 'Beta request',
            expanded: true,
            data: {
              method: 'GET',
              url: '/beta',
            },
            children: [],
          },
        ],
      },
      selectedNodeIds: ['alpha', 'beta'],
      selectedNodeId: 'beta',
      onTreeStateChange: tree => {
        latestTree = tree;
      },
    });

    const treeElement = screen.getByRole('tree');
    fireEvent.keyDown(treeElement, { key: 'c', ctrlKey: true });
    fireEvent.click(screen.getByRole('treeitem', { name: /Steps/i }));
    fireEvent.keyDown(treeElement, { key: 'v', ctrlKey: true });

    await waitFor(() => {
      expect(latestTree?.children?.map(node => node.name)).toEqual([
        'Alpha request (Copy)',
        'Beta request (Copy)',
        'Alpha request',
        'Beta request',
      ]);
    });
  });

  it('keeps request descendants hidden when a scenario only matches through duplicated request data', () => {
    renderInteractiveTreeView({
      tree: {
        id: 'scenarios',
        type: 'scenarios',
        name: 'Scenarios',
        expanded: true,
        children: [
          {
            id: 'scenario-1',
            type: 'scenario',
            name: 'Checkout flow',
            expanded: true,
            data: {
              name: 'Checkout flow',
              steps: [
                {
                  request: {
                    headers: {
                      authorization: 'Bearer needle-token',
                    },
                  },
                },
              ],
            },
            children: [
              {
                id: 'scenario-1-load',
                type: 'load',
                name: 'Load settings',
                expanded: true,
                data: {
                  users: 25,
                },
                children: [],
              },
              {
                id: 'scenario-1-steps',
                type: 'steps',
                name: 'Steps',
                expanded: true,
                children: [
                  {
                    id: 'scenario-1-request-match',
                    type: 'request',
                    name: 'Matching request',
                    expanded: true,
                    data: {
                      method: 'GET',
                      headers: {
                        authorization: 'Bearer needle-token',
                      },
                    },
                    children: [],
                  },
                  {
                    id: 'scenario-1-request-other',
                    type: 'request',
                    name: 'Other request',
                    expanded: true,
                    data: {
                      method: 'GET',
                      url: '/other',
                    },
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Search nodes...'), {
      target: { value: 'needle-token' },
    });

    expect(screen.getByText('Checkout flow')).toBeInTheDocument();
    expect(screen.queryByText('Matching request')).not.toBeInTheDocument();
    expect(screen.queryByText('Load settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Other request')).not.toBeInTheDocument();
  });
});
