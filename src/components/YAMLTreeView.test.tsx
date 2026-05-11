import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLTreeView } from './YAMLTreeView';

const originalInnerHeight = window.innerHeight;

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
