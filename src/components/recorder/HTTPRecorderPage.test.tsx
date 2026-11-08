import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
