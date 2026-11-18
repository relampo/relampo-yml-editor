import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { persistEmbeddedScript } from '../utils/embeddedFileStorage';
import { addPlanScript, loadPlanScripts } from '../utils/planScriptStorage';
import { EmbeddedStudioWorkspace } from './EmbeddedStudioWorkspace';

let open: { yaml: string; fileName: string; revision: number };
let failure = '';
let rerenderWorkspace: () => void;
const correlated = 'test:\n  name: correlated\n';
const controller = {
  document: () => open,
  replace: vi.fn(async (yaml: string, fileName: string) => {
    open = { yaml, fileName, revision: open.revision + 1 };
  }),
  save: vi.fn(async () => {}),
  view: vi.fn(),
};
vi.mock('./YAMLEditor', async () => {
  const { useEffect } = await import('react');
  return {
    YAMLEditor: ({ controllerRef, onReady }: any) => {
      useEffect(() => {
        controllerRef.current = controller;
        onReady(true);
      }, [controllerRef, onReady]);
      return null;
    },
  };
});
vi.mock('./correlate/CorrelatePage', async () => {
  const { useImperativeHandle, useEffect } = await import('react');
  return {
    CorrelatePage: ({ onSave, onCommit, onDraftChange, saveRef }: any) => {
      useEffect(() => onDraftChange({ yaml: correlated, fileName: 'checkout.yaml', changed: true }), [onDraftChange]);
      useImperativeHandle(saveRef, () => ({ save: () => onCommit(correlated, 'checkout.yaml') }));
      const save = (asNew: boolean) =>
        onSave(correlated, 'checkout.yaml', asNew).catch((e: Error) => {
          failure = e.message;
        });
      return (
        <>
          <button onClick={() => void save(false)}>overwrite</button>
          <button onClick={() => void save(true)}>copy</button>
        </>
      );
    },
  };
});
vi.mock('./recorder/HTTPRecorderPage', () => ({ HTTPRecorderPage: () => null }));
vi.mock('./grpc/GRPCRecorderPage', () => ({ GRPCRecorderPage: () => null }));
vi.mock('../utils/planScriptStorage', () => ({
  loadPlanScripts: vi.fn(),
  addPlanScript: vi.fn(),
  selectPlanScript: vi.fn(),
  renamePlanScript: vi.fn(async () => {}),
}));
vi.mock('../utils/embeddedFileStorage', () => ({ persistEmbeddedScript: vi.fn(async () => undefined) }));
function message(data: object) {
  act(() =>
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window.parent, data })),
  );
}
beforeEach(async () => {
  failure = '';
  open = { yaml: 'test:\n  name: original\n', fileName: 'checkout.yaml', revision: 1 };
  vi.mocked(loadPlanScripts).mockResolvedValue({
    id: 'plan',
    activeScriptId: 's1',
    scripts: [{ id: 's1', fileName: open.fileName }],
  });
  const workspace = render(
    <LanguageProvider>
      <EmbeddedStudioWorkspace />
    </LanguageProvider>,
  );
  rerenderWorkspace = () =>
    workspace.rerender(
      <LanguageProvider>
        <EmbeddedStudioWorkspace />
      </LanguageProvider>,
    );
  await waitFor(() => {
    message({ type: 'relampo:workspace-view', view: 'correlation' });
    expect(screen.getByText('overwrite')).toBeVisible();
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
it('persists correlated YAML to the same script and supports another save after rerender', async () => {
  fireEvent.click(screen.getByText('overwrite'));
  await waitFor(() => expect(persistEmbeddedScript).toHaveBeenCalledTimes(1));
  expect(persistEmbeddedScript).toHaveBeenLastCalledWith(
    's1',
    expect.objectContaining({ yaml: correlated, fileName: 'checkout.yaml' }),
    true,
  );
  message({ type: 'relampo:save-plan', requestId: 'again', reason: 'save' });
  await waitFor(() => expect(persistEmbeddedScript).toHaveBeenCalledTimes(2));
  rerenderWorkspace();
  fireEvent.click(screen.getByText('overwrite'));
  await waitFor(() => expect(persistEmbeddedScript).toHaveBeenCalledTimes(3));
  expect(addPlanScript).not.toHaveBeenCalled();
  expect(failure).toBe('');
});
it('publishes a correlated copy with a new identity without replacing the original', async () => {
  const original = { ...open };
  fireEvent.click(screen.getByText('copy'));
  await waitFor(() => expect(addPlanScript).toHaveBeenCalledTimes(1));
  const id = vi.mocked(addPlanScript).mock.calls[0][1];
  expect(id).not.toBe('s1');
  expect(persistEmbeddedScript).toHaveBeenCalledWith(
    id,
    { yaml: correlated, fileName: 'checkout.correlated.yaml' },
    true,
    true,
  );
  expect(open).toEqual(original);
  expect(controller.replace).not.toHaveBeenCalled();
});
it('keeps the original and correlation draft when publishing a copy fails', async () => {
  vi.mocked(persistEmbeddedScript).mockRejectedValueOnce(new Error('Repository denied save'));
  fireEvent.click(screen.getByText('copy'));
  await waitFor(() => expect(failure).toBe('Repository denied save'));
  expect(addPlanScript).not.toHaveBeenCalled();
  expect(open.yaml).toContain('original');
  expect(screen.getByText('copy')).toBeVisible();
});
it('rejects an existing correlated filename without publishing or replacing it', async () => {
  vi.mocked(loadPlanScripts).mockResolvedValue({
    id: 'plan',
    activeScriptId: 's1',
    scripts: [{ id: 's1', fileName: 'checkout.correlated.yaml' }],
  });
  fireEvent.click(screen.getByText('copy'));
  await waitFor(() => expect(failure).toContain('already exists'));
  expect(persistEmbeddedScript).not.toHaveBeenCalled();
  expect(controller.replace).not.toHaveBeenCalled();
});
