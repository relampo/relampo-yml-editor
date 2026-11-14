import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HTTPRecorderPage } from './HTTPRecorderPage';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';

// Inside the web app (contract sections 8 and 9): no popup, no output file,
// and the agent returns the script in place of the address of another Studio.
vi.mock('../../utils/httpRecorderApi', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/httpRecorderApi')>()),
  httpRecorderRequest: vi.fn(),
}));
vi.mock('../../utils/debugApi', () => ({
  probeStudio: vi.fn(async () => ({ studio: true, capabilities: { httpRecorder: true } })),
}));

const idle = { active: false, totalRequests: 0, requests: [] };
let state: any;
let calls: [path: string, body: unknown][];
let script: unknown;
let polls: number;

beforeEach(() => {
  state = idle;
  calls = [];
  polls = 0;
  script = { name: 'checkout.yaml', yaml: 'test:\n  name: checkout\n' };
  vi.spyOn(window, 'open');
  vi.mocked(httpRecorderRequest).mockReset();
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (body !== undefined) calls.push([path, body]);
    if (path === 'current') polls++;
    if (path === 'options')
      return { directory: '/home/user/recordings', port: 8888, firefoxAvailable: true, firefoxConfigured: true } as any;
    if (path === 'editor') return script as any;
    if (path === 'start')
      state = {
        ...idle,
        active: true,
        recording: false,
        prefixEnabled: true,
        transactionsEnabled: true,
        startedAt: '2026-11-14T06:00:00Z',
      };
    if (path === 'record') state = { ...state, recording: true };
    if (path === 'prefix') state = { ...state, prefix: body.prefix };
    // The real agent keeps `startedAt` of the recording after `stop`.
    if (path === 'stop') state = { ...idle, totalRequests: 3, startedAt: state.startedAt };
    return state;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function start(onImport = vi.fn(async () => undefined)) {
  render(
    <LanguageProvider>
      <HTTPRecorderPage
        embedded
        onImport={onImport}
      />
    </LanguageProvider>,
  );
  fireEvent.change(await screen.findByLabelText('Base URL'), { target: { value: 'https://app.example.test' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Firefox' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Open Firefox' }));
  await screen.findByRole('button', { name: 'Start recording' });
  return onImport;
}

it('starts with no output file and shows the recording controls inside the frame', async () => {
  await start();

  expect(screen.queryByLabelText('Output YAML file')).not.toBeInTheDocument();
  const [, body] = calls.find(([path]) => path === 'start')!;
  expect(body).not.toHaveProperty('output');
  expect(body).not.toHaveProperty('force');
  expect(body).toMatchObject({ applicationUrl: 'https://app.example.test', port: 8888 });
  expect(window.open).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Open recording controls' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
  await waitFor(() => expect(calls).toContainEqual(['record', {}]));
  fireEvent.change(screen.getByLabelText('Prefix', { selector: '#recording-prefix' }), { target: { value: 'login' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply prefix' }));
  await waitFor(() => expect(calls).toContainEqual(['prefix', { prefix: 'login' }]));
  expect(await screen.findByText(/Active prefix: login/)).toBeInTheDocument();
});

it('stops with no output and adds the script of the agent to the test plan', async () => {
  const onImport = await start();

  fireEvent.click(screen.getAllByRole('button', { name: 'Stop recording' })[0]);
  const add = await screen.findByRole('button', { name: 'Add recording to the test plan' });
  expect(calls).toContainEqual(['stop', {}]);
  expect(screen.queryByText('Retry saving')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Recording ready');

  fireEvent.click(add);

  await waitFor(() => expect(onImport).toHaveBeenCalledWith('test:\n  name: checkout\n', 'checkout.yaml'));
  expect(calls).toContainEqual(['editor', {}]);
  expect(window.open).not.toHaveBeenCalled();
});

it('does not trust the file name of the agent', async () => {
  script = { name: '../../etc/passwd', yaml: 'test: {}\n' };
  const onImport = await start();
  fireEvent.click(screen.getAllByRole('button', { name: 'Stop recording' })[0]);

  fireEvent.click(await screen.findByRole('button', { name: 'Add recording to the test plan' }));

  await waitFor(() => expect(onImport).toHaveBeenCalledWith('test: {}\n', 'recording.yaml'));
});

it('reports an answer with no script', async () => {
  script = { editorUrl: 'http://127.0.0.1:4321/?token=saved' };
  const onImport = await start();
  fireEvent.click(screen.getAllByRole('button', { name: 'Stop recording' })[0]);

  fireEvent.click(await screen.findByRole('button', { name: 'Add recording to the test plan' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('The agent returned no recording.');
  expect(onImport).not.toHaveBeenCalled();
});

it('shows the recorded traffic one time after stop, also after more state polls', async () => {
  await start();
  fireEvent.click(screen.getAllByRole('button', { name: 'Stop recording' })[0]);
  await screen.findByRole('button', { name: 'Add recording to the test plan' });
  const seen = polls;

  // The page asks for the state each second. Every answer draws the page again.
  await waitFor(() => expect(polls).toBeGreaterThanOrEqual(seen + 3), { timeout: 8000 });

  expect(screen.getAllByRole('region', { name: 'Recorded traffic' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Add recording to the test plan' })).toHaveLength(1);
}, 12_000);
