import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FakeRelay } from '../test/fakeRelay';
import { advance } from '../test/lostFrames';
import { loadPlanScripts } from '../utils/planScriptStorage';
import { createRelayTransport, type RelayTransport } from '../utils/relayTransport';
import { EmbeddedStudioWorkspace } from './EmbeddedStudioWorkspace';

// Contract 0.18, section 8, "Lost frames": Studio reads on a timer only while
// the view that shows the result is in front. Studio keeps the Record view
// mounted and hidden. A hidden view sends no frame; when it comes to the
// front, it reads at once.

let relay: FakeRelay;
let transport: RelayTransport;
/** The frames of requests, in both directions. `ping` and `pong` are about the connection. */
let frames: number;

vi.mock('../utils/agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/agentTransport')>()),
  usesRelay: () => true,
  agentRequest: (path: string, init?: RequestInit) => transport.request(path, init),
}));
vi.mock('../utils/debugApi', () => ({
  probeStudio: vi.fn(async () => ({ studio: true, capabilities: { httpRecorder: true } })),
}));
vi.mock('./YAMLEditor', async () => {
  const { useEffect } = await import('react');
  return {
    YAMLEditor: ({ controllerRef, onReady }: any) => {
      useEffect(() => {
        controllerRef.current = { view: vi.fn(), document: () => ({ yaml: '', fileName: 'a.yaml', revision: 1 }) };
        onReady(true);
      }, [controllerRef, onReady]);
      return null;
    },
  };
});
vi.mock('./grpc/GRPCRecorderPage', () => ({ GRPCRecorderPage: () => null }));
vi.mock('./correlate/CorrelatePage', () => ({ CorrelatePage: () => null }));
vi.mock('../utils/planScriptStorage', () => ({
  loadPlanScripts: vi.fn(),
  addPlanScript: vi.fn(),
  selectPlanScript: vi.fn(),
  renamePlanScript: vi.fn(async () => undefined),
}));
vi.mock('../utils/embeddedFileStorage', () => ({ persistEmbeddedScript: vi.fn(async () => undefined) }));

/** The web app shows a view of Studio. */
async function show(view: string) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        source: window.parent,
        data: { type: 'relampo:workspace-view', view },
      }),
    );
  });
  await advance(0);
}

async function showTab(state: 'visible' | 'hidden') {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
  await advance(0);
}

const reads = () => relay.sent('req').filter(frame => frame.path === '/api/recorder/http/current').length;

beforeEach(async () => {
  vi.useFakeTimers();
  frames = 0;
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  relay.agent!.handle = ({ path }) => ({
    body: JSON.stringify(
      path.endsWith('/options')
        ? { port: 8888, firefoxAvailable: true }
        : { active: false, totalRequests: 0, requests: [] },
    ),
  });
  relay.drop = frame => {
    if (frame.t !== 'ping' && frame.t !== 'pong') frames++;
    return false;
  };
  vi.mocked(loadPlanScripts).mockResolvedValue({
    id: 'plan',
    activeScriptId: 's1',
    scripts: [{ id: 's1', fileName: 'a.yaml' }],
  });
  render(
    <LanguageProvider>
      <EmbeddedStudioWorkspace />
    </LanguageProvider>,
  );
  await advance(0);
  await show('record');
  expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  // The Record view is in front: it reads the state each second.
  const before = reads();
  await advance(3_000);
  expect(reads()).toBe(before + 3);
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('sends no frame while the Record view is hidden, and reads at once when it is in front again', async () => {
  await show('run');
  frames = 0;
  await advance(60_000);
  expect(frames).toBe(0);

  const before = reads();
  await show('record');
  expect(reads()).toBe(before + 1);
  await advance(2_000);
  expect(reads()).toBe(before + 3);
});

it('sends no frame while the browser tab is hidden', async () => {
  await showTab('hidden');
  frames = 0;
  await advance(60_000);
  expect(frames).toBe(0);

  const before = reads();
  await showTab('visible');
  expect(reads()).toBe(before + 1);
});
