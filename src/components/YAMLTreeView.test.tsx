import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLTreeView } from './YAMLTreeView';

const originalInnerHeight = window.innerHeight;

function renderTreeView() {
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
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 640,
    });

    renderTreeView();
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Steps/i }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
