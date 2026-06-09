import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
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
}: {
  tree: YAMLNode;
  selectedNodeIds?: string[];
  selectedNodeId?: string | null;
}) {
  function Harness() {
    const [currentTree, setCurrentTree] = useState(tree);
    const [currentSelectedIds, setCurrentSelectedIds] = useState(selectedNodeIds);
    const [currentSelectedNode, setCurrentSelectedNode] = useState<YAMLNode | null>(
      selectedNodeId ? findNodeById(tree, selectedNodeId) : null,
    );

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
  it('filters children by node name and path, keeping only matching nodes visible', () => {
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
      target: { value: 'Matching' },
    });

    expect(screen.getByText('Matching request')).toBeInTheDocument();
    expect(screen.queryByText('Other request')).not.toBeInTheDocument();
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
});
