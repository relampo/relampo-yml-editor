import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLProvider } from '../contexts/YAMLContext';
import type { YAMLNode } from '../types/yaml';
import { logStatsigEvent } from '../utils/analytics';
import { probeStudio, startDebugRun } from '../utils/debugApi';
import { clearActiveDraft, getActiveDraft, saveActiveDraft } from '../utils/yamlDraftStorage';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import { YAMLEditor } from './YAMLEditor';

vi.mock('../utils/analytics', () => ({
  logStatsigEvent: vi.fn(),
}));

vi.mock('../utils/debugApi', () => ({
  probeStudio: vi.fn(() => Promise.resolve(null)),
  startDebugRun: vi.fn(),
  streamDebugRun: vi.fn(),
}));

vi.mock('../utils/yamlDraftStorage', () => ({
  getActiveDraft: vi.fn(),
  clearActiveDraft: vi.fn(),
  saveActiveDraft: vi.fn(() => Promise.resolve()),
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
    name: yaml.includes('LARGE_DRAFT') ? 'Large restored plan' : yaml.includes('New Test') ? 'New Test' : 'Restored plan',
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
    isDocumentEmpty: boolean;
    onNew: () => void;
  }) => (
    <div
      data-testid="editor-header"
    >
      {!props.isDocumentEmpty && (
        <button onClick={props.onNew}>New</button>
      )}
    </div>
  ),
}));

vi.mock('./YAMLCodeEditor', () => ({
  YAMLCodeEditor: (props: { value: string; largeFileMode: boolean; onChange?: (value: string) => void }) => (
    <>
      <textarea
        data-testid="code-editor"
        data-large-file-mode={String(props.largeFileMode)}
        readOnly
        value={props.value}
      />
      <button onClick={() => props.onChange?.('test: [')}>make invalid YAML</button>
      <button onClick={() => props.onChange?.('')}>clear YAML</button>
    </>
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
    dataSourceFileBrowseEnabled?: boolean;
    onNodeUpdate?: (nodeId: string, updatedData: Record<string, unknown>) => void;
  }) => (
    <div
      data-testid="node-details"
      data-source-file-browse-enabled={String(props.dataSourceFileBrowseEnabled)}
    >
      <span>{props.node?.name ?? 'no selected node'}</span>
      {props.node && (
        <button onClick={() => props.onNodeUpdate?.(props.node!.id, { __name: 'Details changed plan' })}>
          change from details
        </button>
      )}
    </div>
  ),
}));

const getActiveDraftMock = vi.mocked(getActiveDraft);
const clearActiveDraftMock = vi.mocked(clearActiveDraft);
const logStatsigEventMock = vi.mocked(logStatsigEvent);
const probeStudioMock = vi.mocked(probeStudio);
const parseYAMLToTreeMock = vi.mocked(parseYAMLToTree);
const treeToYAMLMock = vi.mocked(treeToYAML);
const startDebugRunMock = vi.mocked(startDebugRun);
const saveActiveDraftMock = vi.mocked(saveActiveDraft);

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
    probeStudioMock.mockResolvedValue(null);
    logStatsigEventMock.mockClear();
    probeStudioMock.mockClear();
    parseYAMLToTreeMock.mockClear();
    treeToYAMLMock.mockClear();
    startDebugRunMock.mockClear();
    saveActiveDraftMock.mockClear();
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
  });

  it('keeps large restored documents in large-file Code view mode', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'LARGE_DRAFT\ntest:\n  name: restored\n',
      fileName: 'large.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Large restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));

    expect(screen.getByTestId('code-editor')).toHaveAttribute('data-large-file-mode', 'true');
  });

  it('starts empty when IndexedDB has no active draft', async () => {
    renderEditor();

    await waitFor(() => expect(getActiveDraftMock).toHaveBeenCalled());

    expect(screen.getByTestId('tree-view')).toHaveTextContent('empty tree');
    expect(parseYAMLToTreeMock).not.toHaveBeenCalled();
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
  });

  it('switches to Tree details when selecting a node from the tree shown in Debug', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });
    probeStudioMock.mockResolvedValueOnce({ studio: true, capabilities: { dataSourceFiles: true, debug: true } });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(await screen.findByRole('button', { name: 'Debug' }));

    expect(screen.getByText('Debug Session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));

    expect(screen.getByText('Element details')).toBeInTheDocument();
    expect(screen.getByTestId('node-details')).toHaveTextContent('Restored plan');
    expect(screen.getByTestId('node-details')).toHaveAttribute('data-source-file-browse-enabled', 'true');
    expect(screen.queryByText('Debug Session')).not.toBeInTheDocument();
  });

  it('opens the default Studio view advertised by the CLI', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });
    probeStudioMock.mockResolvedValueOnce({ studio: true, capabilities: { debug: true }, defaultView: 'debug' });

    renderEditor();

    expect(await screen.findByText('Debug Session')).toBeInTheDocument();
  });

  it('keeps capability-gated data source browsing disabled when Studio omits the capability', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });
    probeStudioMock.mockResolvedValueOnce({ studio: true });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));

    expect(screen.getByTestId('node-details')).toHaveAttribute('data-source-file-browse-enabled', 'false');
  });

  it('keeps a user-selected view when the Studio default arrives later', async () => {
    let resolveStudioProbe: ((value: { studio: true; defaultView: 'debug' }) => void) | undefined;
    const studioProbe = new Promise<{ studio: true; defaultView: 'debug' }>(resolve => {
      resolveStudioProbe = resolve;
    });
    probeStudioMock.mockReturnValueOnce(studioProbe);

    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();

    await act(async () => {
      resolveStudioProbe?.({ studio: true, defaultView: 'debug' });
      await studioProbe;
    });

    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.queryByText('Debug Session')).not.toBeInTheDocument();
  });

  it('blocks Debug while a code edit is waiting for the document parse', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });
    probeStudioMock.mockResolvedValueOnce({ studio: true, capabilities: { debug: true } });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'make invalid YAML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Debug' }));

    expect(screen.getByRole('button', { name: 'Run Debug' })).toBeDisabled();
    expect(startDebugRunMock).not.toHaveBeenCalled();
  });

  it('does not serialize the previous tree when a code edit clears the document', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    treeToYAMLMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'clear YAML' }));
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => expect(saveActiveDraftMock).toHaveBeenCalled());
    expect(saveActiveDraftMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ yaml: '' }),
    );
    expect(treeToYAMLMock).not.toHaveBeenCalled();
  });

  it('keeps data source file browsing disabled when the editor is not served by Studio', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');

    expect(screen.getByTestId('node-details')).toHaveAttribute('data-source-file-browse-enabled', 'false');
  });

  describe('new document dialog', () => {
    it('creates the default baseline and calls clearActiveDraft when New is confirmed', async () => {
      getActiveDraftMock.mockResolvedValueOnce({
        yaml: 'test:\n  name: restored\n',
        fileName: 'restored.yaml',
        updatedAt: '2026-04-23T10:00:00.000Z',
      });

      renderEditor();

      await screen.findByText('Restored plan');

      fireEvent.click(screen.getByRole('button', { name: 'New' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(screen.getByTestId('tree-view')).toHaveTextContent('New Test');
      expect(parseYAMLToTreeMock).toHaveBeenCalledWith(expect.stringContaining('name: New Test'), 'relampo-script');
      expect(clearActiveDraftMock).toHaveBeenCalled();
    });

    it('hides the New button when the document is empty', async () => {
      renderEditor();

      await waitFor(() => expect(getActiveDraftMock).toHaveBeenCalled());

      expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    });
  });

  it('logs tree context menu discovery', async () => {
    getActiveDraftMock.mockResolvedValueOnce({
      yaml: 'test:\n  name: restored\n',
      fileName: 'restored.yaml',
      updatedAt: '2026-04-23T10:00:00.000Z',
    });

    renderEditor();

    await screen.findByText('Restored plan');
    fireEvent.click(screen.getByRole('button', { name: 'select tree root' }));
    fireEvent.click(screen.getByRole('button', { name: 'open context menu' }));

    expect(logStatsigEventMock).toHaveBeenCalledWith('tree_context_menu_opened', {
      node_type: 'root',
      selection_count: 1,
      has_multi_selection: false,
    });
  });
});
