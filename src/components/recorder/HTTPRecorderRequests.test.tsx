import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { HTTPRecorderRequests } from './HTTPRecorderRequests';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
vi.mock('../../utils/httpRecorderApi', () => ({ httpRecorderRequest: vi.fn() }));
beforeEach(() => {
  vi.mocked(httpRecorderRequest).mockReset();
});
const rows = [
  {
    id: 0,
    name: '01 - Login - POST /login',
    method: 'POST',
    url: 'https://app.test/login',
    status: 200,
    durationMs: 25,
    time: 'now',
  },
  {
    id: 1,
    name: 'Events - GET /events',
    method: 'GET',
    url: 'https://api.test/events',
    status: 500,
    durationMs: 12,
    time: 'now',
  },
];
it('filters only the view and inspects the selected request and response', async () => {
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    request: { body: { username: 'demo' } },
    response: { body: { eventId: 12 } },
  });
  render(
    <HTTPRecorderRequests
      rows={rows}
      total={600}
      responses
      language="en"
    />,
  );
  expect(screen.getByText(/latest 2 of 600/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Recorded traffic' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Request details' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '01 - Login' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search requests'), { target: { value: 'login' } });
  expect(screen.queryByRole('button', { name: 'https://api.test/events' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search requests'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Method filter'), { target: { value: 'GET' } });
  expect(screen.queryByRole('button', { name: 'https://app.test/login' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Method filter'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'success' } });
  expect(screen.queryByRole('button', { name: 'https://api.test/events' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'errors' } });
  fireEvent.change(screen.getByLabelText('Domain filter'), { target: { value: 'api.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'https://api.test/events' }));
  expect(await screen.findByText(/username/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByText(/eventId/)).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenCalledExactlyOnceWith('requests/1', undefined, expect.any(AbortSignal));
});
it('explains uncaptured responses and reports request preview errors', async () => {
  vi.mocked(httpRecorderRequest).mockRejectedValue(new Error('Request unavailable'));
  render(
    <HTTPRecorderRequests
      rows={rows}
      total={2}
      responses={false}
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Request unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByText(/Response bodies were not captured/)).toBeInTheDocument();
});
