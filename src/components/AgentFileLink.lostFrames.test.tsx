import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FakeRelay, type RelayFrame } from '../test/fakeRelay';
import { advance } from '../test/lostFrames';
import { createRelayTransport, type RelayTransport } from '../utils/relayTransport';
import { AgentFileLink } from './AgentFileLink';

// Contract 0.18, section 8, "Lost frames": the user waits for a report. After
// a lost frame Studio reads the report once more before it shows the error.

let relay: FakeRelay;
let transport: RelayTransport;
let reportDocument: Document;

vi.mock('../utils/agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/agentTransport')>()),
  agentFileUrl: () => null,
  agentRequest: (path: string, init?: RequestInit) => transport.request(path, init),
}));

const reads = () => relay.sent('req').length;

async function openReport() {
  render(
    <LanguageProvider>
      <AgentFileLink path="/api/run/7/report?lang=en">Open report</AgentFileLink>
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open report' }));
  await advance(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  reportDocument = document.implementation.createHTMLDocument('Report');
  vi.spyOn(window, 'open').mockReturnValue({
    document: reportDocument,
    opener: null,
    closed: false,
    close: vi.fn(),
  } as unknown as Window);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:studio/1'), revokeObjectURL: vi.fn() }));
  relay = new FakeRelay();
  transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  relay.agent!.handle = () => ({ headers: { 'Content-Type': 'text/html' }, body: '<h1>Report</h1>' });
});

afterEach(() => {
  expect(relay.agent?.violations ?? []).toEqual([]);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reads the report once more when a data frame is lost', async () => {
  let lost = false;
  relay.drop = (frame: RelayFrame, to) => {
    if (lost || to !== 'web' || frame.t !== 'data') return false;
    lost = true;
    return true;
  };

  await openReport();
  // The frame is still missing 5 seconds after `end`.
  await advance(4_900);
  expect(reads()).toBe(1);
  await advance(100);

  expect(reads()).toBe(2);
  expect(reportDocument.querySelector('iframe')?.getAttribute('src')).toBe('blob:studio/1');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('shows the error when the second read fails too', async () => {
  relay.drop = (frame: RelayFrame, to) => to === 'web' && frame.t === 'data';

  await openReport();
  await advance(5_000);
  expect(reads()).toBe(2);
  expect(screen.queryByRole('alert')).toBeNull();

  await advance(5_000);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not read the file from your machine.');
  await advance(60_000);
  expect(reads()).toBe(2);
});
