import { fireEvent, render as baseRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeNode } from './YAMLTreeNode';

const render = (ui: ReactElement) => baseRender(<LanguageProvider>{ui}</LanguageProvider>);

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

  it('supports tree keyboard expansion semantics', () => {
    const onNodeToggle = vi.fn();
    const node: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      expanded: false,
      children: [{ id: 'request', type: 'get', name: 'GET /', data: { url: '/' } }],
    };

    render(
      <YAMLTreeNode
        node={node}
        depth={1}
        isSelected={false}
        selectedNodeIds={[]}
        redirectedRequestMap={{}}
        onNodeSelect={vi.fn()}
        onNodeToggle={onNodeToggle}
        onContextMenu={vi.fn()}
        onNodeMove={vi.fn()}
      />,
    );

    const treeItem = screen.getByRole('treeitem', { name: 'Steps' });
    expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    expect(treeItem).toHaveAttribute('aria-level', '2');

    treeItem.focus();
    fireEvent.keyDown(treeItem, { key: 'ArrowRight' });

    expect(onNodeToggle).toHaveBeenCalledWith('steps');
  });

  it('keeps a disabled YAML node selectable while exposing semantic errors', () => {
    const onNodeSelect = vi.fn();
    const node: YAMLNode = {
      id: 'disabled-load',
      type: 'load',
      name: 'Load Config',
      data: { enabled: false },
    };

    render(
      <YAMLTreeNode
        node={node}
        depth={0}
        isSelected={false}
        selectedNodeIds={[]}
        issueMarkers={{
          'disabled-load': {
            severity: 'error',
            issues: [{ id: 'configuration-0', kind: 'configuration', severity: 'error', nodeId: 'disabled-load', message: 'Duration is required.' }],
          },
        }}
        redirectedRequestMap={{}}
        onNodeSelect={onNodeSelect}
        onNodeToggle={vi.fn()}
        onContextMenu={vi.fn()}
        onNodeMove={vi.fn()}
      />,
    );

    const treeItem = screen.getByRole('treeitem', { name: /Load Config/ });
    expect(treeItem).not.toHaveAttribute('aria-disabled');
    expect(treeItem).toHaveAttribute('aria-invalid', 'true');
    expect(treeItem).toHaveClass('focus-visible:ring-2');
    expect(treeItem).toHaveAccessibleDescription('Duration is required.');

    fireEvent.click(treeItem);
    expect(onNodeSelect).toHaveBeenCalledWith(node, expect.anything());
  });
});

describe('controller labels and mixed request numbering', () => {
  it.each([
    ['group', 'Group'], ['parallel', 'Parallel'], ['one_time', 'One time'],
    ['transaction', 'Transaction'], ['simple', 'Simple'], ['balanced', 'Balanced'],
    ['if', 'If'], ['loop', 'Loop'], ['retry', 'Retry'], ['on_error', 'On error'],
  ] as const)('identifies a custom-named %s controller', (type, label) => {
    render(<YAMLTreeNode node={{ id: 'controller', type, name: 'Custom flow' }} depth={0}
      isSelected={false} selectedNodeIds={[]} redirectedRequestMap={{}}
      onNodeSelect={vi.fn()} onNodeToggle={vi.fn()} onContextMenu={vi.fn()} onNodeMove={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders HTTP and WS in one sequence without mutating recorded names', () => {
    const node: YAMLNode = { id: 'steps', type: 'steps', name: 'Steps', children: [
      { id: 'http', type: 'get', name: '[8] GET /', data: { url: '/' } },
      { id: 'parallel', type: 'parallel', name: 'Recorded concurrent traffic', children: [
        { id: 'ws', type: 'websocket', name: 'Auction updates' },
        { id: 'last', type: 'post', name: '[9] POST /logout' },
      ] },
    ] };
    render(<YAMLTreeNode node={node} depth={0} isSelected={false} selectedNodeIds={[]} redirectedRequestMap={{}}
      onNodeSelect={vi.fn()} onNodeToggle={vi.fn()} onContextMenu={vi.fn()} onNodeMove={vi.fn()} />);
    expect(screen.getByText('[1] GET /')).toBeInTheDocument();
    expect(screen.getByText('[2] Auction updates')).toBeInTheDocument();
    expect(screen.getByText('[3] POST /logout')).toBeInTheDocument();
    expect(node.children![0].name).toBe('[8] GET /');
  });
});
