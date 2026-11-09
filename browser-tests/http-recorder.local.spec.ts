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
    route.fulfill({
      json: { directory: '/private/tmp/recordings', port: 8888, firefoxAvailable: true, firefoxConfigured: false },
    }),
  );
  await context.route('**/api/recorder/http/configure-firefox', route =>
    route.fulfill({ json: { configured: true, port: 8888 } }),
  );
  await context.route('**/api/recorder/http/choose-output', route =>
    route.fulfill({ json: { cancelled: false, output: '/private/tmp/recordings/booking.yaml' } }),
  );
  await context.route('**/api/recorder/http/current', route => route.fulfill({ json: state }));
  await context.route('**/api/recorder/http/start', route => {
    startBody = route.request().postDataJSON();
    state = {
      active: true,
      proxyAddress: '127.0.0.1:8888',
      startedAt: new Date().toISOString(),
      prefix: startBody.prefix,
      prefixEnabled: startBody.prefixEnabled,
      transactionsEnabled: startBody.transactionsEnabled,
      transaction: { id: 0, name: '' },
      firefoxRunning: true,
      certificateReady: true,
      responses: true,
      recording: false,
      totalRequests: 0,
      requests: [],
    };
    return route.fulfill({ status: 200, json: { opened: true, certificateReady: true } });
  });
  await context.route('**/api/recorder/http/record', route => {
    state = { ...state, recording: true };
    return route.fulfill({ json: state });
  });
  await context.route('https://app.example.test/**', route => {
    if (route.request().url().endsWith('/login')) {
      if (state.recording)
        state = {
          ...state,
          totalRequests: 1,
          requests: [
            {
              id: 0,
              name: state.prefix + ' - POST /login',
              method: 'POST',
              url: 'https://app.example.test/login',
              status: 200,
              durationMs: 123.5,
              time: new Date().toISOString(),
            },
          ],
        };
      return route.fulfill({ json: { eventId: 12 } });
    }
    return route.fulfill({
      contentType: 'text/html',
      body: "<button onclick=\"fetch('/login', {method: 'POST'})\">Login</button>",
    });
  });
  await context.route('**/api/recorder/http/prefix', route => {
    state = { ...state, prefix: route.request().postDataJSON().prefix };
    return route.fulfill({ json: state });
  });
  await context.route('**/api/recorder/http/transaction', route => {
    const body = route.request().postDataJSON();
    state = { ...state, transaction: body.action === 'start' ? { id: 1, name: body.name } : { id: 0, name: '' } };
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
  await context.route('**/api/recorder/http/clear', route => {
    state = { active: false, totalRequests: 0, requests: [] };
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
  await recorder.getByLabel('Base URL', { exact: true }).fill('https://app.example.test');
  await expect(recorder.getByRole('button', { name: 'Open Firefox', exact: true })).toBeDisabled();
  await recorder.getByRole('button', { name: 'Config Firefox', exact: true }).click();
  await expect(recorder.getByRole('button', { name: 'Config Firefox', exact: true })).toHaveAttribute(
    'title',
    /Firefox configured: localhost:8888/,
  );
  await recorder.getByRole('button', { name: 'Browse…', exact: true }).click();
  await expect(recorder.getByLabel('Output YAML file')).toHaveValue('/private/tmp/recordings/booking.yaml');
  await recorder.getByLabel('Enable prefix').check();
  await recorder.getByLabel('Enable transactions').check();
  await expect(recorder.getByLabel('Exclude patterns')).toHaveValue(
    String.raw`(?i).*\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)(\?.*)?$`,
  );
  await expect(recorder.getByText('Advanced settings', { exact: true })).toHaveCount(0);
  const configBounds = await recorder.getByRole('group', { name: 'Recording configuration' }).boundingBox();
  expect(configBounds!.height).toBeLessThan(175);
  await recorder.screenshot({ path: '/private/tmp/relampo-http-setup.png', fullPage: true });
  const controlOpened = recorder.waitForEvent('popup');
  await recorder.getByRole('button', { name: 'Open Firefox', exact: true }).click();
  const controls = await controlOpened;
  await expect(controls).toHaveURL(/\/recorder\/http\/control/);
  const application = await context.newPage();
  await application.goto('https://app.example.test/');
  await controls.setViewportSize({ width: 420, height: 390 });
  await expect(controls.getByText('Browser ready · 0 requests', { exact: true })).toBeVisible();
  expect(
    await controls.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await expect(controls.getByRole('button', { name: 'Stop and save', exact: true })).toBeInViewport();
  await controls.screenshot({ path: '/private/tmp/relampo-compact-popup-ready.png' });
  await expect(recorder.getByRole('cell', { name: '01', exact: true })).toHaveCount(0);
  await controls.getByLabel('Prefix', { exact: true }).fill('Login');
  await controls.getByRole('button', { name: 'Apply prefix', exact: true }).click();
  await controls.getByLabel('Transaction name', { exact: true }).fill('Reserve seats');
  await controls.getByRole('button', { name: 'Start transaction', exact: true }).click();
  await expect(controls.getByText('Active transaction: Reserve seats', { exact: true })).toBeVisible();
  await expect(recorder.getByText('Firefox certificate ready', { exact: true })).toBeVisible();
  expect(startBody).toMatchObject({
    openFirefox: true,
    paused: true,
    prefix: '',
    prefixEnabled: true,
    transactionsEnabled: true,
    responses: true,
    maskSensitive: true,
    grouping: 'none',
    exclude: [String.raw`(?i).*\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)(\?.*)?$`],
    baseUrls: 'https://app.example.test',
  });
  await controls.getByRole('button', { name: 'Start recording', exact: true }).click();
  await expect(controls.getByText('Recording · 0 requests', { exact: true })).toBeVisible();
  await application.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(recorder.getByRole('cell', { name: '01', exact: true })).toBeVisible();
  await expect(recorder.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
  await recorder.getByRole('button', { name: 'https://app.example.test/login', exact: true }).click();
  await recorder.getByRole('button', { name: 'Response', exact: true }).click();
  await expect(recorder.locator('pre')).toContainText('eventId');
  const traffic = await recorder.getByRole('region', { name: 'Recorded traffic' }).boundingBox();
  const details = await recorder.getByRole('region', { name: 'Request details' }).boundingBox();
  expect(traffic!.x + traffic!.width).toBeLessThanOrEqual(details!.x);
  expect(Math.abs(traffic!.y - details!.y)).toBeLessThan(2);
  expect(details!.height).toBeGreaterThan(250);
  await recorder.screenshot({ path: '/private/tmp/relampo-compact-recorder.png', fullPage: true });

  await controls.getByLabel('Prefix', { exact: true }).fill('Select seats');
  await controls.getByRole('button', { name: 'Apply prefix', exact: true }).click();
  await expect(controls.getByText('Active prefix: Select seats', { exact: true })).toBeVisible();
  await expect(controls.getByText('Active transaction: Reserve seats', { exact: true })).toBeVisible();
  await controls.screenshot({ path: '/private/tmp/relampo-recording-control.png', fullPage: true });
  await controls.getByRole('button', { name: 'End transaction', exact: true }).click();
  await recorder.getByRole('button', { name: 'Go to Relampo Studio', exact: true }).click();
  expect(await page.evaluate(() => (window as any).httpRecorderMarker)).toBe('keep original');
  await recorder.bringToFront();
  await controls.getByRole('button', { name: 'Stop and save', exact: true }).click();
  await expect(recorder.getByRole('status')).toHaveText('/private/tmp/recordings/booking.yaml');
  const pending = recorder.waitForEvent('popup');
  await recorder.getByRole('button', { name: 'Open saved script in Studio', exact: true }).click();
  const editor = await pending;
  await expect(editor.getByRole('treeitem', { name: /Recorded booking/ })).toBeVisible();
  await recorder.screenshot({ path: '/private/tmp/relampo-http-recorder-screen.png', fullPage: true });
  await recorder.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(recorder.getByRole('button', { name: 'https://app.example.test/login', exact: true })).toHaveCount(0);
  await expect(recorder.getByRole('region', { name: 'Request details' })).toContainText('Select a recorded request');
  await expect(controls.getByText('No recording active', { exact: true })).toBeVisible();
  await expect(recorder.getByLabel('Base URL')).toHaveValue('https://app.example.test');
  await expect(recorder.getByLabel('Output YAML file')).toHaveValue('/private/tmp/recordings/booking.yaml');
  await expect(editor.getByRole('treeitem', { name: /Recorded booking/ })).toBeVisible();
  await application.close();
  await editor.close();
  await controls.close();
  await recorder.close();
});
