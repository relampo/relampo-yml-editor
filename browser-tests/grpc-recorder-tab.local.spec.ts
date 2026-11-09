import { expect, test } from '@playwright/test';

const original = 'test: {name: Original editor}\nscenarios:\n- name: Original scenario\n  steps: [{get: /health}]\n';
const generated =
  'test: {name: Saved gRPC recording}\nscenarios:\n- name: Recorded calls\n  steps:\n  - grpc: {name: Call, target: fixture.test:443, method: /demo.API/Call, message: {name: Ada}}\n';

test('Recorder opens in another tab, returns without reloading the editor, then saves before opening a script', async ({
  page,
  context,
}) => {
  await context.route('**/api/studio/info', route => {
    const saved = route.request().frame().page().url().includes('savedFixture=1');
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: { name: saved ? 'recording.yaml' : 'original.yaml', yaml: saved ? generated : original },
        capabilities: { grpcAuthoring: true, grpcBrowserRecording: true, grpcRecorderTabs: true },
      }),
    });
  });
  await context.route('**/api/grpc/recordings/current', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ active: false, calls: [] }) }),
  );
  await context.route('**/api/grpc/browser-recordings/current', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        active: false,
        detected: 'none',
        requests: [],
        counts: { http: 0, https: 0, grpcWeb: 0, grpcNative: 0 },
        totalRequests: 0,
        tlsFailures: 0,
        firefoxAvailable: true,
        firefoxCertificateManaged: true,
      }),
    }),
  );
  await context.route('**/api/grpc/schema', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'schema',
        catalog: {
          descriptorSet: '',
          messages: { Request: { name: 'Request', fields: [{ name: 'name', type: 'string' }] } },
          services: [
            {
              name: 'demo.API',
              methods: [
                {
                  name: 'Call',
                  path: '/demo.API/Call',
                  kind: 'unary',
                  input: 'Request',
                  output: 'Request',
                  template: { name: '' },
                },
              ],
            },
          ],
        },
      }),
    }),
  );
  await context.route('**/api/grpc/generate', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 'recording', yaml: generated, warnings: [] }),
    }),
  );
  await context.route('**/api/grpc/projects/save-options', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ directory: '/private/tmp/relampo-recordings' }),
    }),
  );
  let finishSave!: () => void;
  let saveRequested = false;
  await context.route('**/api/grpc/projects/recording/save', async route => {
    saveRequested = true;
    expect(route.request().postDataJSON()).toEqual({
      directory: '/private/tmp/relampo-recordings',
      name: 'My recording',
    });
    await new Promise<void>(resolve => {
      finishSave = resolve;
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        savedPath: '/private/tmp/relampo-recordings/project/My recording.yaml',
        editorUrl: 'http://127.0.0.1:4173/?savedFixture=1',
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('treeitem', { name: /Original editor/ })).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { recorderOriginalMarker: string }).recorderOriginalMarker = 'keep unsaved state';
  });
  await page.getByRole('button', { name: 'Recorder', exact: true }).click();
  const opened = page.waitForEvent('popup');
  await page.getByRole('menuitem', { name: 'gRPC', exact: true }).click();
  const recorder = await opened;
  await expect(recorder).toHaveURL(/\/recorder\/grpc/);
  await expect(recorder).toHaveTitle('Relampo Recorder · gRPC');
  await expect(recorder.getByRole('heading', { name: 'gRPC Recorder', exact: true })).toBeVisible();
  await expect(recorder.getByRole('dialog')).toHaveCount(0);
  await expect(recorder.getByRole('button', { name: 'Record traffic', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await recorder.getByRole('button', { name: 'Go to Relampo Studio', exact: true }).click();
  expect(
    await page.evaluate(() => (window as unknown as { recorderOriginalMarker: string }).recorderOriginalMarker),
  ).toBe('keep unsaved state');
  await expect(page.getByRole('treeitem', { name: /Original editor/ })).toBeVisible();
  await recorder.bringToFront();
  await recorder.getByRole('button', { name: 'Discover', exact: true }).click();
  await recorder.getByLabel('Server address', { exact: true }).fill('fixture.test:443');
  await recorder.getByRole('button', { name: 'Discover service', exact: true }).click();
  await recorder.getByLabel('Select Call').check();
  await recorder.getByLabel('name', { exact: true }).fill('Ada');
  await recorder.getByRole('button', { name: 'Generate scenario', exact: true }).click();
  await expect(recorder.getByLabel('Save folder')).toHaveValue('/private/tmp/relampo-recordings');
  await recorder.getByLabel('Script name').fill('My recording');
  const pending = recorder.waitForEvent('popup');
  await recorder.getByRole('button', { name: 'Save and open in editor', exact: true }).click();
  const savedEditor = await pending;
  await expect.poll(() => saveRequested).toBe(true);
  expect(savedEditor.url()).toBe('about:blank');
  finishSave();
  await expect(savedEditor).toHaveURL(/savedFixture=1/);
  await expect(savedEditor.getByRole('treeitem', { name: /Saved gRPC recording/ })).toBeVisible();
  await expect(recorder.getByRole('status')).toContainText('My recording.yaml');
  await expect(page.getByRole('treeitem', { name: /Original editor/ })).toBeVisible();
  await savedEditor.close();
  await recorder.close();
});
