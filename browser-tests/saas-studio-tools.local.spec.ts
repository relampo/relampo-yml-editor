import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const original = `test: {name: Current plan script}
scenarios:
- name: Flow
  steps:
  - request:
      name: Login
      method: POST
      url: https://app.test/login
      response: {status: 200, body: '{"token":"captured-session-value-123456"}'}
  - request: {name: Events, method: GET, url: 'https://app.test/events', headers: {Authorization: 'Bearer captured-session-value-123456'}}
`;
const correlated = original
  .replace('Current plan script', 'Correlated plan script')
  .replace('Bearer captured-session-value-123456', 'Bearer {{session_token}}');
const recorded = original.replace('Current plan script', 'Recorded plan script');
const source = {
  StepIndex: 0,
  RequestID: 1,
  Method: 'POST',
  URL: 'https://app.test/login',
  Location: 'response.body.json',
  Path: '$.token',
};

test('RelampoLab menus use the live Studio tools and keep the same plan and editor session', async ({
  page,
  context,
}) => {
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  let analysisInput = '';
  let recording: Record<string, unknown> = { active: false, totalRequests: 0, requests: [] };
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: { httpRecorder: true, grpcAuthoring: true, correlate: true },
        ...(route.request().headers()['x-relampo-studio-token'] === 'saved-recording'
          ? { initialScript: { name: 'recorded.yaml', yaml: recorded } }
          : {}),
      },
    }),
  );
  await context.route('**/api/recorder/http/options', route =>
    route.fulfill({ json: { directory: '/tmp/recordings', port: 8888, firefoxAvailable: false } }),
  );
  await context.route('**/api/recorder/http/current', route => route.fulfill({ json: recording }));
  await context.route('**/api/recorder/http/editor', route =>
    route.fulfill({ json: { editorUrl: `${base.origin}/?token=saved-recording` } }),
  );
  await context.route('**/api/grpc/**', route =>
    route.fulfill({ status: 503, json: { error: 'No gRPC capture in this integration fixture.' } }),
  );
  await context.route('**/api/correlate/analyze', route => {
    analysisInput = route.request().postDataJSON().yaml;
    return route.fulfill({
      json: {
        digest: 'current-plan',
        requests: 2,
        responses: 1,
        candidates: [
          {
            id: '1',
            variable: 'session_token',
            value: 'captured-session-value-123456',
            type: 'auth_token',
            kind: 'auto',
            applicable: true,
            source,
            targets: [],
          },
        ],
      },
    });
  });
  await context.route('**/api/correlate/apply', route => route.fulfill({ json: { yaml: correlated, applied: [] } }));
  await page.goto(base.origin);
  await page.evaluate(() => {
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', 'tools-test@example.invalid');
    localStorage.setItem('relampo-onboarding-tools-test@example.invalid', 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'dark');
  });
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const frameElement = page.locator('iframe[data-plan-editor]');
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
  await (await chooserPromise).setFiles({ name: 'current.yaml', mimeType: 'text/yaml', buffer: Buffer.from(original) });
  await expect(editor.getByText('Current plan script', { exact: true })).toBeVisible();
  await expect(editor.locator('header.editor-header')).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Recorder', exact: true })).toHaveCount(0);
  const session = await frameElement.getAttribute('src');

  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(editor.locator('[data-studio-tool="http-recorder"]')).toBeVisible();
  await expect(editor.getByRole('group', { name: 'Recording configuration' })).toBeVisible();
  await editor.getByRole('tab', { name: 'gRPC', exact: true }).click();
  await expect(editor.locator('[data-studio-tool="grpc-recorder"]')).toBeVisible();
  await editor.getByRole('tab', { name: 'HTTP/HTTPS', exact: true }).click();
  recording = { active: true, recording: true, totalRequests: 0, requests: [], startedAt: new Date().toISOString() };
  await expect(editor.getByText('Recording', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await expect(editor.getByText('Current plan script', { exact: true })).toBeVisible();
  await expect(frameElement).toHaveAttribute('src', session!);
  await page.getByRole('button', { name: 'Project', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Search and Catalog Journey' }).click();
  await expect(editor.getByRole('alert').filter({ hasText: 'Stop the recording' })).toBeVisible();
  await expect(page).toHaveURL(/plan=tp-01/);
  recording = { active: false, totalRequests: 0, requests: [] };
  await expect(editor.getByText('Ready to record', { exact: true })).toHaveCount(1);

  await page.getByRole('button', { name: 'Correlation', exact: true }).click();
  await expect(editor.locator('[data-studio-tool="correlation"]')).toBeVisible();
  await editor.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(editor.getByLabel('Select candidate 1', { exact: true })).toBeVisible();
  expect(analysisInput).toContain('Current plan script');
  await editor.getByLabel('Select candidate 1', { exact: true }).check();
  await editor.getByRole('button', { name: 'Correlate', exact: true }).click();
  await editor.getByRole('button', { name: 'Apply to test plan', exact: true }).click();
  await expect(editor.getByText('Correlated plan script', { exact: true })).toBeVisible();
  await expect(frameElement).toHaveAttribute('src', session!);
  await expect(page).toHaveURL(/plan=tp-01/);
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Script saved' })).toBeVisible();

  await page.getByRole('button', { name: 'Export YAML options', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export with responses', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(readFileSync(downloadPath!, 'utf8')).toContain('Correlated plan script');

  await page.getByRole('button', { name: 'Record', exact: true }).click();
  recording = { active: false, totalRequests: 1, requests: [], savedPath: '/tmp/recordings/recorded.yaml' };
  const openSaved = editor.getByRole('button', { name: 'Open saved script in Studio', exact: true });
  await expect(openSaved).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await openSaved.click();
  await expect(editor.getByText('Recorded plan script', { exact: true })).toBeVisible();
  await expect(frameElement).toHaveAttribute('src', session!);
  expect(context.pages()).toHaveLength(1);
  await page.screenshot({ path: '/tmp/relampo-studio-tools-integrated.png', animations: 'disabled' });
  expect(pageErrors).toEqual([]);
});
