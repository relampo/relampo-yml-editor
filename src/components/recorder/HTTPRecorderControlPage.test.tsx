import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HTTPRecorderControlPage } from './HTTPRecorderControlPage';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
import { advance, lostAnswer } from '../../test/lostFrames';
vi.mock('../../utils/httpRecorderApi', () => ({ httpRecorderRequest: vi.fn() }));
it('changes prefix and transaction independently and stops from the popup', async () => {
  let state: any = {
    active: true,
    requests: [],
    totalRequests: 2,
    prefixEnabled: true,
    transactionsEnabled: true,
    prefix: 'A',
    transaction: { id: 0, name: '' },
  };
  vi.mocked(httpRecorderRequest).mockImplementation(async (path, body: any) => {
    if (path === 'prefix') state = { ...state, prefix: body.prefix };
    if (path === 'transaction')
      state = { ...state, transaction: body.action === 'start' ? { id: 1, name: body.name } : { id: 0, name: '' } };
    if (path === 'stop') state = { ...state, active: false, savedPath: '/private/tmp/control.yaml' };
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderControlPage />
    </LanguageProvider>,
  );
  fireEvent.change(await screen.findByLabelText('Prefix'), { target: { value: 'P2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply prefix' }));
  await waitFor(() => expect(httpRecorderRequest).toHaveBeenCalledWith('prefix', { prefix: 'P2' }));
  fireEvent.change(screen.getByLabelText('Transaction name'), { target: { value: 'Checkout' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start transaction' }));
  expect(await screen.findByText('Active transaction: Checkout')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End transaction' }));
  await waitFor(() => expect(httpRecorderRequest).toHaveBeenCalledWith('transaction', { action: 'end' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stop and save' }));
  expect(await screen.findByText('/private/tmp/control.yaml')).toBeInTheDocument();
});

it('keeps startup traffic empty until the tester presses Start recording', async () => {
  let state: any = {
    active: true,
    recording: false,
    requests: [],
    totalRequests: 0,
    prefixEnabled: true,
    transactionsEnabled: false,
    prefix: '',
    transaction: { id: 0, name: '' },
  };
  vi.mocked(httpRecorderRequest).mockImplementation(async path => {
    if (path === 'record') state = { ...state, recording: true };
    return state;
  });
  render(
    <LanguageProvider>
      <HTTPRecorderControlPage />
    </LanguageProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }));
  await waitFor(() => expect(httpRecorderRequest).toHaveBeenCalledWith('record', {}));
  expect(screen.getByText(/Recording · 0 requests/)).toBeInTheDocument();
});

it('gives up a state read after 10 seconds and reads again at the next tick', async () => {
  vi.useFakeTimers();
  try {
    let reads = 0;
    vi.mocked(httpRecorderRequest).mockImplementation((_path, _body, signal) =>
      ++reads === 2
        ? lostAnswer(signal)
        : Promise.resolve({
            active: true,
            requests: [],
            totalRequests: reads,
            transaction: { id: 0, name: '' },
          } as any),
    );
    render(
      <LanguageProvider>
        <HTTPRecorderControlPage />
      </LanguageProvider>,
    );
    await advance(500);
    expect(reads).toBe(2);

    await advance(10_000);
    expect(screen.getByRole('alert')).toHaveTextContent('The machine did not answer in time.');

    await advance(500);
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
