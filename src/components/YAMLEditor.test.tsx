import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLProvider } from '../contexts/YAMLContext';
import type { YAMLNode } from '../types/yaml';
import { logStatsigEvent } from '../utils/analytics';
import { clearActiveDraft, getActiveDraft } from '../utils/yamlDraftStorage';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { YAMLEditor } from './YAMLEditor';

vi.mock('../utils/analytics', () => ({
  logStatsigEvent: vi.fn(),
}));

vi.mock('../utils/yamlDraftStorage', () => ({
  getActiveDraft: vi.fn(),
  clearActiveDraft: vi.fn(),
}));

vi.mock('../utils/yamlDocumentLimits', () => ({
  getDocumentMetrics: (text: string) => ({
    chars: text.length,
    lines: text === '' ? 0 : text.split('\n').length,
    large: text.includes('LARGE_DRAFT'),
  }),
}));

vi.mock('../utils/yamlParser', () => ({
  parseYAMLToTree: vi.fn((yaml: string) => ({
    id: 'root',
    name: yaml.includes('LARGE_DRAFT') ? 'Large restored plan' : 'Restored plan',
    type: 'root',
    data: {},
    children: [],
  })),
  treeToYAML: vi.fn(() => 'serialized: true\n'),
}));

vi.mock('../utils/yamlSemanticValidation', () => ({
  validateYAMLSemantics: vi.fn(() => []),
}));

vi.mock('./YAMLEditorHeader', () => ({
  YAMLEditorHeader: (props: {
    hasDocumentActivity: boolean;
    isDirty: boolean;
    lastSavedAt: string | null;
    isDocumentEmpty: boolean;
    onNew: () => void;
  }) => (
    <div
      data-testid="editor-header"
      data-activity={String(props.hasDocumentActivity)}
      data-dirty={String(props.isDirty)}
      data-saved-at={props.lastSavedAt ?? ''}
    >
      {!props.isDocumentEmpty && (
        <button onClick={props.onNew}>New</button>
      )}
    </div>
  ),
}));

vi.mock('./YAMLCodeEditor', () => ({
  YAMLCodeEditor: (props: { value: string; largeFileMode: boolean }) => (
    <textarea
      data-testid="code-editor"
      data-large-file-mode={String(props.largeFileMode)}
      readOnly
      value={props.value}
    />
  ),
}));

vi.mock('./YAMLTreeView', () => ({
  YAMLTreeView: (props: {
    tree: YAMLNode | null;
    onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
    onTreeChange: (tree: YAMLNode, nextSelection?: { primaryId: string | null; nodeIds: string[] }) => void;
    onContextMenuOpened?: (metadata: { nodeType: string; selectionCount: number; hasMultiSelection: boolean }) => void;
  }) => {
    const tree = props.tree;
    return (
      <div data-testid="tree-view">
        <span>{tree?.name ?? 'empty tree'}</span>
        {tree && (
          <>
            <button onClick={() => props.onSelectionChange(tree, [tree.id])}>select tree root</button>
            <button
              onClick={() =>
                props.onTreeChange({
                  ...tree,
                  name: 'Tree changed plan',
                })
              }
            >
              change from tree
            </button>
            <button
              onClick={() =>
                props.onContextMenuOpened?.({
                  nodeType: tree.type,
                  selectionCount: 1,
                  hasMultiSelection: false,
                })
              }
            >
              open context menu
            </button>
          </>
        )}
      </div>
    );
  },
}));

vi.mock('./YAMLNodeDetails', () => ({
  YAMLNodeDetails: (props: {
    node: YAMLNode | null;
    onNodeUpdate?: (nodeId: string, updatedData: Record<string, unknown>) => void;
    onAddChildNode?: (parentId: string, nodeType: 'variables') => void;
    onAddChildAction?: (metadata: { parentNodeType: string; childNodeType: 'variables' }) => void;
  }) => (
    <div data-testid="node-details">
      <span>{props.node?.name ?? 'no selected node'}</span>
      {props.node && (
        <button onClick={() => props.onNodeUpdate?.(props.node!.id, { __name: 'Details changed plan' })}>
          change from details
        </button>
      )}
      {props.node && (
        <button
          onClick={() => {
            props.onAddChildAction?.({ parentNodeType: props.node!.type, childNodeType: 'variables' });
            props.onAddChildNode?.(props.node!.id, 'variables');
          }}
        >
          add from details
        </button>
      )}
    </div>
  ),
}));

const getActiveDraftMock = vi.mocked(getActiveDraft);
const clearActiveDraftMock = vi.mocked(clearActiveDraft);
const logStatsigEventMock = vi.mocked(logStatsigEvent);
const parseYAMLToTreeMock = vi.mocked(parseYAMLToTree);
const treeToYAMLMock = vi.mocked(treeToYAML);

function renderEditor() {
  return render(
    <LanguageProvider>
      <YAMLProvider>
        <YAMLEditor />
      </YAMLProvider>
    </LanguageProvider>,
  );
}

describe('YAMLEditor draft restoration', () => {
  beforeEach(() => {
    getActiveDraftMock.mockResolvedValue(null);
    logStatsigEventMock.mockClear();
    parseYAMLToTreeMock.mockClear();
    treeToYAMLMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('restores the active IndexedDB draft on mount', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    expect(await screen.findByText('Restored plan')).toBeInTheDocument();
    expect(parseYAMLToTreeMock).toHaveBeenCalledWith('test:\n  name: restored\n', 'restored');
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-activity', 'true');
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-dirty', 'false');
    await waitFor(() => expect(screen.getByTestId('editor-header').getAttribute('data-saved-at')).not.toBe(''));
  });

  it('starts empty when IndexedDB has no active draft', async () => {
    renderEditor();

    await waitFor(() => expect(getActiveDraftMock).toHaveBeenCalled());

    expect(screen.getByTestId('tree-view')).toHaveTextContent('empty tree');
    expect(parseYAMLToTreeMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-activity', 'false');
  });

  it('serializes and marks dirty when the tree view changes the tree', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'change from tree' }));

    expect(treeToYAMLMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'Tree changed plan',
      }),
    );
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-dirty', 'true');
  });

  it('refreshes details immediately and debounces serialization when the details panel updates a node', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));

    vi.useFakeTimers();
    treeToYAMLMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'change from details' }));

    expect(screen.getAllByText('Details changed plan')).toHaveLength(2);
    expect(treeToYAMLMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(treeToYAMLMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'Details changed plan',
      }),
    );
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-dirty', 'true');
  });

  it('serializes and selects the created node when details adds a child', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));
    fireEvent.click(screen.getByRole('button', { name: 'add from details' }));

    expect(await screen.findByText('Variables')).toBeInTheDocument();
    expect(treeToYAMLMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            type: 'variables',
          }),
        ]),
      }),
    );
    expect(screen.getByTestId('editor-header')).toHaveAttribute('data-dirty', 'true');
  });

  it('logs detail-panel add as discovery friction before the tree context menu is opened', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));
    fireEvent.click(screen.getByRole('button', { name: 'add from details' }));

    expect(logStatsigEventMock).toHaveBeenCalledWith('detail_panel_add_clicked', {
      parent_node_type: 'root',
      child_node_type: 'variables',
      context_menu_discovered: false,
      is_discovery_friction: true,
    });
  });

  describe('new document dialog', () => {
    it('clears the document and calls clearActiveDraft when New is confirmed', async () => {
      getActiveDraftMock.mockResolvedValueOnce({
        yaml: 'test:\n  name: restored\n',
        fileName: 'restored.yaml',
        updatedAt: '2026-04-23T10:00:00.000Z',
      });

      renderEditor();

      await screen.findByText('Restored plan');

      fireEvent.click(screen.getByRole('button', { name: 'New' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(screen.getByTestId('tree-view')).toHaveTextContent('empty tree');
      expect(clearActiveDraftMock).toHaveBeenCalled();
      expect(screen.getByTestId('editor-header')).toHaveAttribute('data-saved-at', '');
      expect(screen.getByTestId('editor-header')).toHaveAttribute('data-activity', 'false');
    });

    it('hides the New button when the document is empty', async () => {
      renderEditor();

      await waitFor(() => expect(getActiveDraftMock).toHaveBeenCalled());

      expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    });
  });

  it('logs detail-panel add without friction after the tree context menu is opened', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));
    fireEvent.click(screen.getByRole('button', { name: 'open context menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'add from details' }));

    expect(logStatsigEventMock).toHaveBeenCalledWith('tree_context_menu_opened', {
      node_type: 'root',
      selection_count: 1,
      has_multi_selection: false,
    });
    expect(logStatsigEventMock).toHaveBeenCalledWith('detail_panel_add_clicked', {
      parent_node_type: 'root',
      child_node_type: 'variables',
      context_menu_discovered: true,
      is_discovery_friction: false,
    });
  });
});
