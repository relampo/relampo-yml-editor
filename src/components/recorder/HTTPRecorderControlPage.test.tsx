import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HTTPRecorderControlPage } from './HTTPRecorderControlPage';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
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
