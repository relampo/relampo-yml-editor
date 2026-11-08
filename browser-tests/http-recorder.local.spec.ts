import { expect, test } from '@playwright/test';
const original = 'test: {name: Original editor}\nscenarios:\n- name: Original\n  steps: [{get: /health}]\n';
const saved =
  'test: {name: Recorded booking}\nscenarios:\n- name: Booking\n  steps:\n  - request: {name: Login, method: POST, url: /login}\n';
test('HTTP Recorder opens a tab, configures Firefox, records prefixes and opens only the saved script', async ({
  page,
  context,
}) => {
  let state: any = { active: false, totalRequests: 0, requests: [] };
  let startBody: any;
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: { httpRecorder: true, grpcAuthoring: true, grpcRecorderTabs: true },
        initialScript: {
          name: 'booking.yaml',
          yaml: route.request().frame().page().url().includes('httpSaved=1') ? saved : original,
        },
      },
    }),
  );
  await context.route('**/api/recorder/http/options', route =>
    route.fulfill({ json: { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true } }),
  );
  await context.route('**/api/recorder/http/current', route => route.fulfill({ json: state }));
  await context.route('**/api/recorder/http/start', route => {
    startBody = route.request().postDataJSON();
    state = {
      active: true,
      proxyAddress: '127.0.0.1:8888',
      startedAt: new Date().toISOString(),
      prefix: startBody.prefix,
      firefoxRunning: true,
      certificateReady: true,
      responses: true,
      totalRequests: 1,
      requests: [
        {
          id: 0,
          name: 'Login - POST /login',
          method: 'POST',
          url: 'https://app.example.test/login',
          status: 200,
          durationMs: 123.5,
          time: new Date().toISOString(),
        },
      ],
    };
    return route.fulfill({ status: 200, json: { opened: true, certificateReady: true } });
  });
  await context.route('**/api/recorder/http/prefix', route => {
    state = { ...state, prefix: route.request().postDataJSON().prefix };
    return route.fulfill({ json: state });
  });
  await context.route('**/api/recorder/http/requests/0', route =>
    route.fulfill({
      json: {
        request: { body: { username: 'demo', password: '***MASKED***' } },
        response: { body: { eventId: 12, access_token: '***MASKED***' } },
      },
    }),
  );
  await context.route('**/api/recorder/http/stop', route => {
    state = { ...state, active: false, savedPath: '/private/tmp/recordings/booking.yaml' };
    return route.fulfill({ json: state });
  });
  await context.route('**/api/recorder/http/editor', route =>
    route.fulfill({ json: { editorUrl: 'http://127.0.0.1:4173/?httpSaved=1', savedPath: state.savedPath } }),
  );
  await page.goto('/');
  await expect(page.getByRole('treeitem', { name: /Original editor/ })).toBeVisible();
  await page.evaluate(() => {
    (window as any).httpRecorderMarker = 'keep original';
  });
  await page.getByRole('button', { name: 'Recorder', exact: true }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('menuitem', { name: 'HTTP/HTTPS', exact: true }).click();
  const recorder = await popup;
  await expect(recorder).toHaveURL(/\/recorder\/http/);
  await expect(recorder).toHaveTitle('Relampo Recorder · HTTP/HTTPS');
  await recorder.getByLabel('Application URL', { exact: true }).fill('https://app.example.test');
  await recorder.getByLabel('Output YAML file', { exact: true }).fill('/private/tmp/recordings/booking.yaml');
  await recorder.getByLabel('Initial prefix', { exact: true }).fill('Login');
  await recorder.getByText('Advanced settings', { exact: true }).click();
  await recorder.getByLabel('Exclude patterns').fill('png,jpg\n*.css');
  await recorder.getByLabel('Grouping', { exact: true }).selectOption('transaction');
  await recorder.getByRole('button', { name: 'Start recording and open Firefox', exact: true }).click();
  await expect(recorder.getByText('Firefox certificate ready', { exact: true })).toBeVisible();
  expect(startBody).toMatchObject({
    openFirefox: true,
    prefix: 'Login',
    responses: true,
    maskSensitive: true,
    grouping: 'transaction',
    exclude: ['png,jpg', '*.css'],
    baseUrls: 'https://app.example.test',
  });
  await expect(recorder.getByRole('cell', { name: '01', exact: true })).toBeVisible();
  await recorder.getByRole('button', { name: 'https://app.example.test/login', exact: true }).click();
  await recorder.getByRole('button', { name: 'Response', exact: true }).click();
  await expect(recorder.locator('pre')).toContainText('eventId');
  await recorder.getByLabel('Prefix', { exact: true }).fill('Select seats');
  await recorder.getByRole('button', { name: 'Apply prefix', exact: true }).click();
  await expect(recorder.getByText('Active prefix: Select seats', { exact: true })).toBeVisible();
  await recorder.getByRole('button', { name: 'Go to Relampo Studio', exact: true }).click();
  expect(await page.evaluate(() => (window as any).httpRecorderMarker)).toBe('keep original');
  await recorder.bringToFront();
  await recorder.getByRole('button', { name: 'Stop and save', exact: true }).click();
  await expect(recorder.getByRole('status')).toHaveText('/private/tmp/recordings/booking.yaml');
  const pending = recorder.waitForEvent('popup');
  await recorder.getByRole('button', { name: 'Open saved script in Studio', exact: true }).click();
  const editor = await pending;
  await expect(editor.getByRole('treeitem', { name: /Recorded booking/ })).toBeVisible();
  await recorder.screenshot({ path: '/private/tmp/relampo-http-recorder-screen.png', fullPage: true });
  await editor.close();
  await recorder.close();
});
