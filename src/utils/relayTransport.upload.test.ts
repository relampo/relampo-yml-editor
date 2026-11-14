// @vitest-environment node
// jsdom has its own FormData and Blob, which the Request of Node cannot read.
// A browser has one of each, so this test runs without jsdom.
import { expect, it } from 'vitest';
import { FakeRelay } from '../test/fakeRelay';
import { createRelayTransport } from './relayTransport';

it('sends an upload as multipart with the boundary in the content type', async () => {
  const relay = new FakeRelay();
  const transport = createRelayTransport({ getTicket: relay.issueTicket, createSocket: relay.createSocket });
  const form = new FormData();
  form.append('file', new File(['id\n1\n'], 'users.csv', { type: 'text/csv' }));

  const response = await transport.request('/api/studio/data-source-files', { method: 'POST', body: form });

  expect(response.status).toBe(200);
  const [request] = relay.agent!.requests;
  expect(request.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
  const text = new TextDecoder().decode(request.body);
  expect(text).toContain('filename="users.csv"');
  expect(text).toContain('id\n1\n');
  expect(relay.agent!.violations).toEqual([]);
});
