import { expect, test } from '@playwright/test';

test('browser gRPC-Web messages generate a portable project and retain transport when imported', async ({ page }) => {
  const yaml =
    'test: {name: Browser orders}\ngrpc_defaults: {transport: grpc_web, protoset: browser.protoset}\nscenarios:\n- name: Orders\n  steps:\n  - grpc: {name: WatchOrder, method: /orders.API/WatchOrder, message: {id: 12}, response: {message: {state: delivered}}}\n';
  const portable = yaml.replace('browser.protoset', '../Utilities/browser.protoset');
  await page.route('**/api/grpc/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown;
    if (path.endsWith('/recordings/current')) body = { active: false, calls: [] };
    else if (path.endsWith('/browser-recordings/current'))
      body = {
        active: false,
        captureSupported: true,
        recordingPayloads: true,
        capturedCalls: 1,
        pendingCalls: 0,
        detected: 'grpc_web',
        counts: { http: 0, https: 1, grpcWeb: 1, grpcNative: 0 },
        totalRequests: 1,
        requests: [],
        tlsFailures: 0,
        grpcWebReplaySupported: true,
        firefoxAvailable: true,
      };
    else if (path.endsWith('/schema'))
      body = { id: 'orders-contract', catalog: { services: [], messages: {}, descriptorSet: '' } };
    else if (path.endsWith('/browser-recordings/generate')) {
      expect(route.request().postDataJSON()).toEqual({ schemaId: 'orders-contract' });
      body = { id: 'orders-project', yaml, warnings: [], privateEvidence: true };
    } else if (path.endsWith('/projects/orders-project/recording-files'))
      body = {
        yaml: portable,
        files: [{ path: 'Utilities/browser.protoset', data: 'ZGVzY3JpcHRvcg==' }],
      };
    else throw Error('Unexpected route: ' + path);
    await route.fulfill({ json: body });
  });
  await page.goto('/browser-tests/fixtures/grpc-web-project.html');
  const generate = page.getByRole('button', { name: 'Generate recorded scenario' });
  await expect(generate).toBeDisabled();
  await page.getByLabel('Recording contract', { exact: true }).setInputFiles({
    name: 'orders.proto',
    mimeType: 'text/plain',
    buffer: Buffer.from('syntax="proto3";'),
  });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByRole('heading', { name: 'Recorded response', exact: true })).toBeVisible();
  await expect(page.getByLabel('Captured messages').locator('pre').last()).toContainText('delivered');
  await page.getByRole('button', { name: 'Add to scenario', exact: true }).click();
  await expect(page.locator('#imported')).toHaveText(portable);
});
