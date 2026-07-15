import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeNode } from './YAMLTreeNode';

describe('YAMLTreeNode redirected request presentation', () => {
  it('restores active icon and method colors when a redirected request is enabled', () => {
    const node: YAMLNode = {
      id: 'redirect-child',
      type: 'request',
      name: '[8] GET /landing',
      data: { request_id: 8, method: 'GET', url: '/landing', enabled: true },
    };

    render(
      <YAMLTreeNode
        node={node}
        depth={0}
        isSelected={false}
        selectedNodeIds={[]}
        redirectedRequestMap={{
          'redirect-child': {
            sourceNodeId: 'redirect-parent',
            sourceRequestLabel: '[7] GET /start',
            matchedLocation: '/landing',
          },
        }}
        onNodeSelect={vi.fn()}
        onNodeToggle={vi.fn()}
        onContextMenu={vi.fn()}
        onNodeMove={vi.fn()}
      />,
    );

    const treeItem = screen.getByRole('treeitem');
    expect(treeItem.querySelector('svg')?.parentElement).toHaveClass('text-emerald-400');
    expect(screen.getByText('GET')).toHaveClass('text-blue-400');
    expect(screen.getByText('Redirected')).toBeInTheDocument();
  });
});
