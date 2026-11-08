import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HTTPRecorderPage } from './HTTPRecorderPage';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
vi.mock('../../utils/httpRecorderApi', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/httpRecorderApi')>()),
  httpRecorderRequest: vi.fn(),
}));
vi.mock('../../utils/debugApi', () => ({
  probeStudio: vi.fn(async () => ({ studio: true, capabilities: { httpRecorder: true } })),
}));
beforeEach(() => {
  vi.mocked(httpRecorderRequest).mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});
const idle = { active: false, totalRequests: 0, requests: [] };
it('starts with automatic Firefox and applies prefixes only to upcoming requests', async () => {
  let state: any = idle;
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (path === 'options') return { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any;
    if (path === 'start') {
      state = {
        ...idle,
        active: true,
        proxyAddress: '127.0.0.1:8888',
        prefix: '',
        firefoxRunning: true,
        certificateReady: true,
      };
      return state;
    }
    if (path === 'prefix') {
      state = { ...state, prefix: body.prefix };
      return state;
    }
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  await screen.findByDisplayValue('/private/tmp/recordings/recording.yaml');
  fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://app.example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start recording and open Firefox' }));
  await screen.findByText('127.0.0.1:8888');
  expect(httpRecorderRequest).toHaveBeenCalledWith(
    'start',
    expect.objectContaining({
      openFirefox: true,
      responses: true,
      applicationUrl: 'https://app.example.test',
      baseUrls: 'https://app.example.test',
    }),
  );
  fireEvent.change(screen.getByLabelText('Prefix'), { target: { value: 'Select seats' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply prefix' }));
  await waitFor(() => expect(httpRecorderRequest).toHaveBeenCalledWith('prefix', { prefix: 'Select seats' }));
  expect(await screen.findByText('Active prefix: Select seats')).toBeInTheDocument();
});
it('saves when stopping and offers opening the saved script only after success', async () => {
  let state: any = { ...idle, active: true, proxyAddress: '127.0.0.1:8888' };
  vi.mocked(httpRecorderRequest).mockImplementation(async path => {
    if (path === 'options') return { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any;
    if (path === 'stop') state = { ...idle, totalRequests: 1, savedPath: '/private/tmp/recordings/flow.yaml' };
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  expect(await screen.findByRole('button', { name: 'Stop and save' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open saved script in Studio' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Stop and save' }));
  expect(await screen.findByText('/private/tmp/recordings/flow.yaml')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open saved script in Studio' })).toBeInTheDocument();
});

it('retains a failed save and retries with another output without starting a new capture', async () => {
  let state: any = { ...idle, active: true, proxyAddress: '127.0.0.1:8888' };
  let attempts = 0;
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (path === 'options') return { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any;
    if (path === 'stop') {
      state = { ...state, active: false };
      attempts++;
      if (attempts === 1) throw new Error('Output was created during recording');
      state = { ...state, savedPath: body.output };
    }
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Stop and save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Output was created during recording');
  fireEvent.change(screen.getByLabelText('Retry output path'), {
    target: { value: '/private/tmp/recordings/recovered.yaml' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  expect(await screen.findByRole('status')).toHaveTextContent('recovered.yaml');
  expect(httpRecorderRequest).toHaveBeenCalledWith('stop', {
    output: '/private/tmp/recordings/recovered.yaml',
    force: false,
  });
  expect(httpRecorderRequest).not.toHaveBeenCalledWith('start', expect.anything());
});

it('does not request a saved editor if its browser tab is blocked', async () => {
  vi.mocked(httpRecorderRequest).mockImplementation(async path =>
    path === 'options'
      ? ({ directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any)
      : ({ ...idle, savedPath: '/private/tmp/recordings/saved.yaml' } as any),
  );
  vi.spyOn(window, 'open').mockReturnValue(null);
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Open saved script in Studio' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allow opening Studio');
  expect(httpRecorderRequest).not.toHaveBeenCalledWith('editor', expect.anything());
});

it('passes every configured CLI option to the recorder and opens only the saved result', async () => {
  let state: any = idle;
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (path === 'options') return { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any;
    if (path === 'start')
      state = {
        ...idle,
        active: true,
        proxyAddress: '127.0.0.1:1234',
        startedAt: new Date().toISOString(),
        prefix: body.prefix,
      };
    if (path === 'firefox') state = { ...state, firefoxRunning: true, certificateReady: true };
    if (path === 'stop') state = { ...state, active: false, savedPath: '/private/tmp/recordings/flow.yaml' };
    if (path === 'editor') return { editorUrl: 'http://127.0.0.1:4321/?token=saved' } as any;
    return state;
  });
  const editor = {
    opener: window,
    closed: false,
    document: { title: '', body: { textContent: '' } },
    location: { replace: vi.fn() },
    close: vi.fn(),
  };
  vi.spyOn(window, 'open').mockReturnValue(editor as unknown as Window);
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  await screen.findByDisplayValue('/private/tmp/recordings/recording.yaml');
  fireEvent.change(screen.getByLabelText('Application URL'), { target: { value: 'https://app.test/home' } });
  fireEvent.change(screen.getByLabelText('Initial prefix'), { target: { value: 'Login' } });
  fireEvent.click(screen.getByText('Advanced settings'));
  fireEvent.change(screen.getByLabelText('Proxy port'), { target: { value: '1234' } });
  fireEvent.change(screen.getByLabelText('Test name (optional)'), { target: { value: 'Booking' } });
  fireEvent.change(screen.getByLabelText(/Base URLs \/ domains/), {
    target: { value: 'https://app.test,https://api.test' },
  });
  fireEvent.change(screen.getByLabelText('Include URL containing'), { target: { value: '/api/' } });
  fireEvent.change(screen.getByLabelText('Exclude patterns'), { target: { value: 'png,jpg\n*.css' } });
  fireEvent.change(screen.getByLabelText('Grouping'), { target: { value: 'transaction' } });
  fireEvent.change(screen.getByLabelText('Redirect handling'), { target: { value: 'legacy' } });
  fireEvent.click(screen.getByLabelText('Mask sensitive values in YAML and previews'));
  fireEvent.click(screen.getByLabelText('Keep original compressed response bodies (legacy)'));
  fireEvent.click(screen.getByLabelText('Overwrite the output YAML if it already exists'));
  fireEvent.click(screen.getByLabelText('Capture responses for correlation'));
  fireEvent.click(screen.getByLabelText('Configure and open Firefox automatically'));
  fireEvent.click(screen.getByRole('button', { name: 'Start recording' }));
  await screen.findByText('127.0.0.1:1234');
  expect(httpRecorderRequest).toHaveBeenCalledWith('start', {
    applicationUrl: 'https://app.test/home',
    baseUrls: 'https://app.test,https://api.test',
    port: 1234,
    output: '/private/tmp/recordings/recording.yaml',
    name: 'Booking',
    responses: false,
    maskSensitive: false,
    include: '/api/',
    exclude: ['png,jpg', '*.css'],
    prefix: 'Login',
    grouping: 'transaction',
    redirectMode: 'legacy',
    redirectDisabling: false,
    preserveCompressedResponses: true,
    force: true,
    openFirefox: false,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open Firefox' }));
  await screen.findByText('Firefox certificate ready');
  fireEvent.click(screen.getByRole('button', { name: 'Stop and save' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Open saved script in Studio' }));
  await waitFor(() => expect(editor.location.replace).toHaveBeenCalledWith('http://127.0.0.1:4321/?token=saved'));
  expect(editor.opener).toBeNull();
});

it('reports a blocked return to Studio and lets the user change the UI language', async () => {
  vi.mocked(httpRecorderRequest).mockImplementation(async path =>
    path === 'options'
      ? ({ directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } as any)
      : (idle as any),
  );
  vi.spyOn(window, 'open').mockReturnValue(null);
  render(
    <LanguageProvider>
      <HTTPRecorderPage />
    </LanguageProvider>,
  );
  await screen.findByDisplayValue('/private/tmp/recordings/recording.yaml');
  fireEvent.click(screen.getByRole('button', { name: 'Go to Relampo Studio' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allow opening Studio');
  fireEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(screen.getByRole('button', { name: 'Ir a Relampo Studio' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ES' }));
});
