import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLProvider } from '../contexts/YAMLContext';
import type { YAMLNode } from '../types/yaml';
import { getActiveDraft } from '../utils/yamlDraftStorage';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { YAMLEditor } from './YAMLEditor';

vi.mock('../utils/yamlDraftStorage', () => ({
  getActiveDraft: vi.fn(),
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
  YAMLEditorHeader: (props: { hasDocumentActivity: boolean; isDirty: boolean; lastSavedAt: string | null }) => (
    <div
      data-testid="editor-header"
      data-activity={String(props.hasDocumentActivity)}
      data-dirty={String(props.isDirty)}
      data-saved-at={props.lastSavedAt ?? ''}
    />
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
  }) => (
    <div data-testid="node-details">
      <span>{props.node?.name ?? 'no selected node'}</span>
      {props.node && (
        <button onClick={() => props.onNodeUpdate?.(props.node!.id, { __name: 'Details changed plan' })}>
          change from details
        </button>
      )}
      <button onClick={() => props.onAddChildNode?.('root', 'variables')}>add from details</button>
    </div>
  ),
}));

const getActiveDraftMock = vi.mocked(getActiveDraft);
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
    expect(parseYAMLToTreeMock).toHaveBeenCalledWith('test:\n  name: restored\n');
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

  it('keeps the tree available after restoring a large draft', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: '# LARGE_DRAFT\ntest:\n  name: large restored\n',
      fileName: 'large-restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    expect(await screen.findByText('Large restored plan')).toBeInTheDocument();
    expect(
      screen.getByText('Large file mode is active: the tree is available with optimizations.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tree current')).toBeInTheDocument();
  });

  it('allows dismissing the large file mode alert', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: '# LARGE_DRAFT\ntest:\n  name: large restored\n',
      fileName: 'large-restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    const alertText = await screen.findByText('Large file mode is active: the tree is available with optimizations.');
    expect(alertText).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide large file alert' }));

    expect(screen.queryByText('Large file mode is active: the tree is available with optimizations.')).not.toBeInTheDocument();
    expect(screen.getByTestId('tree-view')).toHaveTextContent('Large restored plan');
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
});
