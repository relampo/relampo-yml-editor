import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { persistEmbeddedScript } from '../utils/embeddedFileStorage';
import type { EmbeddedStudioController } from '../utils/embeddedStudioController';
import { addPlanScript, loadPlanScripts, type PlanScripts } from '../utils/planScriptStorage';
import { EmbeddedStudioWorkspace } from './EmbeddedStudioWorkspace';

// Contract 0.13, section 9: a recording becomes a new script of the test
// plan. It does not replace the script that is open.

const RECORDING = 'test:\n  name: recording\n';
let controller: EmbeddedStudioController;
let open: { yaml: string; fileName: string };

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
vi.mock('./recorder/HTTPRecorderPage', () => ({
  HTTPRecorderPage: ({ onImport }: any) => (
    <button
      type="button"
      onClick={() => void onImport(RECORDING, 'recording.yaml')}
    >
      add http recording
    </button>
  ),
}));
vi.mock('./grpc/GRPCRecorderPage', () => ({ GRPCRecorderPage: () => null }));
vi.mock('./correlate/CorrelatePage', () => ({ CorrelatePage: () => null }));
vi.mock('../utils/planScriptStorage', () => ({
  loadPlanScripts: vi.fn(),
  addPlanScript: vi.fn(),
  selectPlanScript: vi.fn(),
  renamePlanScript: vi.fn(async () => undefined),
}));
vi.mock('../utils/embeddedFileStorage', () => ({ persistEmbeddedScript: vi.fn(async () => undefined) }));

function catalog(...fileNames: string[]): PlanScripts {
  return {
    id: 'plan',
    activeScriptId: 's1',
    scripts: fileNames.map((fileName, index) => ({ id: `s${index + 1}`, fileName })),
  };
}

async function addRecording(scripts: PlanScripts) {
  vi.mocked(loadPlanScripts).mockResolvedValue(scripts);
  vi.mocked(addPlanScript).mockResolvedValue({ ...scripts, activeScriptId: 'new' });
  render(
    <LanguageProvider>
      <EmbeddedStudioWorkspace />
    </LanguageProvider>,
  );
  // The web app opens the Record view when Studio is ready.
  await waitFor(() => {
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          source: window.parent,
          data: { type: 'relampo:workspace-view', view: 'record' },
        }),
      );
    });
    expect(screen.getByRole('button', { name: 'add http recording' })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole('button', { name: 'add http recording' }));
}

beforeEach(() => {
  open = { yaml: 'test:\n  name: checkout\n', fileName: 'checkout.yaml' };
  controller = {
    document: () => ({ ...open, revision: 1 }),
    replace: vi.fn(async (yaml: string, fileName: string) => {
      open = { yaml, fileName };
    }),
    save: vi.fn(async () => undefined),
    upload: vi.fn(),
    download: vi.fn(),
    newDocument: vi.fn(),
    view: vi.fn(),
  };
  vi.spyOn(window, 'confirm');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('adds the recording as a new script and keeps the open script', async () => {
  // After this, the frame loads again with the new script. jsdom has no navigation.
  await addRecording(catalog('checkout.yaml'));

  await waitFor(() => expect(addPlanScript).toHaveBeenCalledTimes(1));
  const document = { yaml: RECORDING, fileName: 'recording.yaml' };
  expect(vi.mocked(addPlanScript).mock.calls[0][0]).toMatchObject(document);
  const newId = vi.mocked(addPlanScript).mock.calls[0][1];
  expect(newId).not.toBe('s1');
  // The web app gets the new script with the message that it already knows.
  expect(persistEmbeddedScript).toHaveBeenCalledWith(newId, document);
  expect(controller.replace).not.toHaveBeenCalled();
  expect(open.fileName).toBe('checkout.yaml');
  expect(window.confirm).not.toHaveBeenCalled();
});

it('gives the recording a free file name when the plan already has that name', async () => {
  await addRecording(catalog('checkout.yaml', 'recording.yaml', 'Recording-2.yaml'));

  await waitFor(() => expect(addPlanScript).toHaveBeenCalledTimes(1));
  expect(vi.mocked(addPlanScript).mock.calls[0][0]).toMatchObject({ yaml: RECORDING, fileName: 'recording-3.yaml' });
});

it('uses the open script when it is empty, and asks nothing', async () => {
  open = { yaml: '', fileName: 'script-1.yaml' };

  await addRecording(catalog('script-1.yaml'));

  await waitFor(() => expect(controller.replace).toHaveBeenCalledWith(RECORDING, 'recording.yaml'));
  expect(persistEmbeddedScript).toHaveBeenCalledWith('s1', { yaml: RECORDING, fileName: 'recording.yaml' });
  expect(addPlanScript).not.toHaveBeenCalled();
  expect(window.confirm).not.toHaveBeenCalled();
});
