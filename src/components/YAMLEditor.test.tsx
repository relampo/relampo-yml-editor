import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLProvider } from '../contexts/YAMLContext';
import { getActiveDraft } from '../utils/yamlDraftStorage';
import { parseYAMLToTree } from '../utils/yamlParser';
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
  YAMLTreeView: (props: { tree: { name?: string } | null }) => (
    <div data-testid="tree-view">{props.tree?.name ?? 'empty tree'}</div>
  ),
}));

vi.mock('./YAMLNodeDetails', () => ({
  YAMLNodeDetails: () => <div data-testid="node-details" />,
}));

const getActiveDraftMock = vi.mocked(getActiveDraft);
const parseYAMLToTreeMock = vi.mocked(parseYAMLToTree);

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
  });

  afterEach(() => {
    cleanup();
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
});
