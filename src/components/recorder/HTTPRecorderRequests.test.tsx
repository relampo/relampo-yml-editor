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
it('masks each request by default and reveals HTML as text only on demand', async () => {
  vi.mocked(httpRecorderRequest).mockImplementation(async path => ({
    masked: !path.includes('showSensitive=true'),
    url: 'https://app.test/login?tag=one&tag=two',
    method: 'GET',
    status: 200,
    request: { headers: { 'X-Request': ['captured-request'] }, body: '' },
    response: {
      headers: { 'Content-Type': ['text/html'] },
      body: path.includes('showSensitive=true')
        ? '<script>window.captured=true</script><b>Captured HTML</b>'
        : '[Non-JSON body hidden while sensitive-data masking is enabled]',
    },
  }));
  const { container } = render(
    <HTTPRecorderRequests
      rows={rows}
      total={2}
      responses
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  expect(await screen.findByText('captured-request')).toBeInTheDocument();
  expect(screen.getByText('one')).toBeInTheDocument();
  expect(screen.getByText('two')).toBeInTheDocument();
  expect(screen.getByText('This request has no body.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByText('text/html')).toBeInTheDocument();
  expect(screen.getByText(/Non-JSON body hidden/)).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenLastCalledWith('requests/0', undefined, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: 'Show full content' }));
  expect(await screen.findByText(/<script>window.captured=true/)).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('b')).toBeNull();
  expect(httpRecorderRequest).toHaveBeenLastCalledWith(
    'requests/0?showSensitive=true',
    undefined,
    expect.any(AbortSignal),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Mask sensitive data' }));
  expect(screen.queryByText(/Captured HTML/)).not.toBeInTheDocument();
  expect(await screen.findByText(/Non-JSON body hidden/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show full content' }));
  await screen.findByText(/Captured HTML/);
  fireEvent.click(screen.getByRole('button', { name: 'https://api.test/events' }));
  expect(screen.queryByText(/Captured HTML/)).not.toBeInTheDocument();
  expect(await screen.findByText(/Non-JSON body hidden/)).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenLastCalledWith('requests/1', undefined, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  expect(await screen.findByText(/Non-JSON body hidden/)).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenLastCalledWith('requests/0', undefined, expect.any(AbortSignal));
});
it('shows the full preview when the recording disabled masking', async () => {
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    masked: false,
    request: { body: 'Recorded body' },
  });
  render(
    <HTTPRecorderRequests
      rows={rows}
      total={2}
      responses
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  expect(await screen.findByText('Recorded body')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Show full content' })).not.toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenCalledExactlyOnceWith('requests/0', undefined, expect.any(AbortSignal));
});
it('keeps response headers visible even when response bodies were not captured', async () => {
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    request: { body: '' },
    response: { headers: { Server: ['test-server'] }, body: '' },
  });
  render(
    <HTTPRecorderRequests
      rows={rows}
      total={2}
      responses={false}
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  await screen.findByText('This request has no body.');
  fireEvent.click(screen.getByRole('button', { name: 'Response' }));
  expect(screen.getByText('test-server')).toBeInTheDocument();
  expect(screen.getByText(/Response bodies were not captured/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Headers' }));
  expect(screen.getByText('test-server')).toBeInTheDocument();
});
it('loads older recorded requests and preserves distinct query URLs', async () => {
  const recent = [{ ...rows[0], id: 500, url: 'https://app.test/product?id=501' }];
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    requests: [{ ...rows[0], id: 0, url: 'https://app.test/product?id=1' }],
  });
  render(
    <HTTPRecorderRequests
      rows={recent}
      total={501}
      responses
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load earlier requests' }));
  expect(await screen.findByRole('button', { name: 'https://app.test/product?id=1' })).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenCalledWith('requests?before=500&limit=500');
  expect(screen.getByRole('button', { name: 'https://app.test/product?id=501' })).toHaveAttribute(
    'title',
    'https://app.test/product?id=501',
  );
});
it('shows recorded WebSocket messages rather than only the upgrade response', async () => {
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    request: { body: '' },
    response: { body: '' },
    webSocket: {
      messages: [
        { direction: 'server_to_client', type: 'text', payload: 'order-confirmed', sizeBytes: 15, timestamp: 'now' },
      ],
      subprotocol: 'orders',
      closeCode: 1000,
      closeReason: 'done',
    },
  });
  render(
    <HTTPRecorderRequests
      rows={rows}
      total={2}
      responses
      language="en"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'https://app.test/login' }));
  expect(await screen.findByText('order-confirmed')).toBeInTheDocument();
  expect(screen.getByText(/Received.*text/)).toBeInTheDocument();
});
