import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HTTPRecorderPage } from './HTTPRecorderPage';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';

// Inside the web app (contract sections 8 and 9): floating controls, no output file,
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
let popup: Window;
function floatingControls() {
  return within(popup.document.body);
}

beforeEach(() => {
  state = idle;
  calls = [];
  polls = 0;
  script = { name: 'checkout.yaml', yaml: 'test:\n  name: checkout\n' };
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  popup = frame.contentWindow!;
  vi.spyOn(popup, 'close').mockImplementation(() => undefined);
  vi.spyOn(popup, 'focus').mockImplementation(() => undefined);
  vi.spyOn(window, 'open').mockReturnValue(popup);
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
    if (path === 'acknowledge') state = { ...state, pending: false };
    if (path === 'record') state = { ...state, recording: true };
    if (path === 'prefix') state = { ...state, prefix: body.prefix };
    if (path === 'transaction')
      state = { ...state, transaction: body.action === 'start' ? { id: 1, name: body.name } : { id: 0, name: '' } };
    // The real agent keeps `startedAt` of the recording after `stop`.
    if (path === 'stop') state = { ...idle, totalRequests: 3, startedAt: state.startedAt };
    return state;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function start(onImport: (yaml: string, name: string) => Promise<void> = vi.fn(async () => undefined)) {
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
  await floatingControls().findByRole('button', { name: 'Start recording' });
  return onImport;
}

it('starts with no output file and shows the recording controls in a separate window', async () => {
  await start();

  expect(screen.queryByLabelText('Output YAML file')).not.toBeInTheDocument();
  const [, body] = calls.find(([path]) => path === 'start')!;
  expect(body).not.toHaveProperty('output');
  expect(body).not.toHaveProperty('force');
  expect(body).toMatchObject({ applicationUrl: 'https://app.example.test', port: 8888 });
  expect(window.open).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Open recording controls' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Prefix', { selector: '#recording-prefix' })).not.toBeInTheDocument();

  fireEvent.click(floatingControls().getByRole('button', { name: 'Start recording' }));
  await waitFor(() => expect(calls).toContainEqual(['record', {}]));
  fireEvent.change(floatingControls().getByLabelText('Prefix', { selector: '#recording-prefix' }), {
    target: { value: 'login' },
  });
  fireEvent.click(floatingControls().getByRole('button', { name: 'Apply prefix' }));
  await waitFor(() => expect(calls).toContainEqual(['prefix', { prefix: 'login' }]));
  expect(await floatingControls().findByText(/Active prefix: login/)).toBeInTheDocument();
  fireEvent.change(floatingControls().getByLabelText('Transaction name'), { target: { value: 'Checkout' } });
  fireEvent.click(floatingControls().getByRole('button', { name: 'Start transaction' }));
  await floatingControls().findByText('Active transaction: Checkout');
  fireEvent.click(floatingControls().getByRole('button', { name: 'End transaction' }));
  await waitFor(() => expect(calls).toContainEqual(['transaction', { action: 'end' }]));
});

it('closing and reopening controls preserves the recording', async () => {
  await start();
  fireEvent(popup, new Event('pagehide'));
  expect(calls.some(([path]) => path === 'stop')).toBe(false);
  expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open recording controls' }));
  await floatingControls().findByRole('button', { name: 'Start recording' });
  expect(window.open).toHaveBeenCalledTimes(2);
  expect(calls.filter(([path]) => path === 'start')).toHaveLength(1);
});

it('continues state polling while controls are open and the SaaS tab is hidden', async () => {
  await start();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  fireEvent(document, new Event('visibilitychange'));
  const seen = polls;
  await waitFor(() => expect(polls).toBeGreaterThan(seen + 1), { timeout: 4000 });
});

it('reports blocked popups before opening Firefox', async () => {
  vi.mocked(window.open).mockReturnValue(null);
  render(
    <LanguageProvider>
      <HTTPRecorderPage embedded />
    </LanguageProvider>,
  );
  fireEvent.change(await screen.findByLabelText('Base URL'), { target: { value: 'app.test' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Firefox' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Open Firefox' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allow the recording control popup.');
  expect(calls.some(([path]) => path === 'start')).toBe(false);
});

it('sends a bare domain for detection and displays the HTTP address selected by the agent', async () => {
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (path === 'options') return { port: 8888, firefoxAvailable: true, firefoxConfigured: true } as any;
    if (path === 'start') {
      expect(body.applicationUrl).toBe('app.test/login?q=keep');
      expect(body.baseUrls).toBe('app.test/login?q=keep');
      state = { ...idle, active: true, recording: false, protocol: 'HTTP', baseUrls: 'http://app.test' };
    }
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderPage embedded />
    </LanguageProvider>,
  );
  const input = await screen.findByLabelText('Base URL');
  fireEvent.change(input, { target: { value: 'app.test/login?q=keep' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('app.test/login?q=keep');
  expect(screen.getByText('AUTO')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open Firefox' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Open Firefox' }));
  await waitFor(() => expect(input).toHaveValue('http://app.test/login?q=keep'));
  expect(screen.queryByText('AUTO')).not.toBeInTheDocument();
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
  expect(window.open).toHaveBeenCalledOnce();
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

it('shows a recording only when the state says recording: true', async () => {
  // Contract 0.16. An answer with no `recording` is not a recording.
  await start();
  state = { ...state, recording: undefined };
  const seen = polls;
  await waitFor(() => expect(polls).toBeGreaterThan(seen + 1), { timeout: 4000 });

  expect(screen.getByText('Browser ready · not recording')).toBeInTheDocument();
  expect(floatingControls().getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  expect(screen.queryByText('Recording')).not.toBeInTheDocument();

  state = { ...state, recording: true };
  await waitFor(() => expect(screen.getByText('Recording')).toBeInTheDocument(), { timeout: 4000 });
  expect(floatingControls().queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument();
});
it('acknowledges a stopped capture only after the Test Plan accepts its script', async () => {
  script = { name: 'checkout.yaml', yaml: 'test:\n  name: checkout\n', files: [], captureId: 'capture-fixture' };
  let accept: () => void = () => {};
  const imported = vi.fn(
    () =>
      new Promise<void>(resolve => {
        accept = resolve;
      }),
  );
  await start(imported);
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add recording to the test plan' }));
  await waitFor(() => expect(imported).toHaveBeenCalledOnce());
  expect(calls.some(([path]) => path === 'acknowledge')).toBe(false);
  accept();
  await waitFor(() => expect(calls).toContainEqual(['acknowledge', { captureId: 'capture-fixture' }]));
});
