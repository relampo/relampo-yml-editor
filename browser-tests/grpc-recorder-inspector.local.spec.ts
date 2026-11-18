import { expect, test } from '@playwright/test';
test('native gRPC inspector shows captured messages, metadata and trailers while protecting the pending recording', async ({
  page,
}) => {
  await page.route('**/api/grpc/recordings/calls/0', route =>
    route.fulfill({
      json: {
        method: '/orders.Order/Watch',
        type: 'server_streaming',
        status: 'OK',
        durationMs: 20,
        request: { metadata: { 'x-client': ['qa'] }, body: { orderId: 12 } },
        response: {
          metadata: { 'x-server': ['recorded'] },
          trailers: { 'x-finish': ['complete'] },
          body: { status: 'ready' },
        },
        messages: [
          { direction: 'server_to_client', sequence: 1, atMs: 10, message: { state: 'delivered' }, sizeBytes: 20 },
        ],
      },
    }),
  );
  await page.goto('/browser-tests/fixtures/grpc-recorder-inspector.html');
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeDisabled();
  await page.getByRole('button', { name: /orders.Order/ }).click();
  await expect(page.locator('pre').filter({ hasText: 'orderId' })).toBeVisible();
  await expect(page.locator('pre').filter({ hasText: 'x-client' })).toBeVisible();
  await page.getByRole('button', { name: 'Response', exact: true }).click();
  await expect(page.locator('pre').filter({ hasText: 'x-finish' })).toContainText('complete');
  await expect(page.locator('pre').filter({ hasText: 'state' })).toContainText('delivered');
});
