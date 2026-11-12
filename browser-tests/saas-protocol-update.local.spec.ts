import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const yaml = `component_configuration_version: 1
test: {name: Updated protocols}
scenarios:
- name: Buyer
  load: {type: constant, users: 1, iterations: 1}
  steps:
  - parallel:
      name: Mixed protocols
      steps:
      - request: {name: Health, method: GET, url: 'https://example.test/health'}
      - websocket:
          name: Live updates
          url: wss://example.test/socket
          headers: {Authorization: 'Bearer {{token}}'}
          actions:
          - send: {type: text, data: ping}
`;

test('embedded Studio supports WebSocket authoring, node widgets and persisted protocol edits', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: {
          debug: true,
          loadRun: true,
          componentConfiguration: {
            version: 1,
            features: [
              'http_defaults',
              'error_policy',
              'scoped_data_source',
              'think_time',
              'http_assertions',
              'sql_assertions',
              'http_state_usage',
            ],
          },
        },
      },
    }),
  );
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'protocol-update@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'dark');
  });
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  await editor
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'protocols.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
  const parallel = editor.getByRole('treeitem', { name: /Mixed protocols/ });
  await parallel.click();
  await expect(parallel.getByText('Parallel', { exact: true })).toBeVisible();
  await expect(editor.getByLabel('http.timeout mode', { exact: true })).toBeEnabled();
  await editor.getByLabel('http.timeout mode', { exact: true }).selectOption('local');
  await editor.getByLabel('http.timeout value', { exact: true }).fill('17s');
  const socket = editor.getByRole('treeitem', { name: /Live updates/ });
  await socket.click();
  await expect(socket.getByText('WS', { exact: true })).toBeVisible();
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/socket');
  await editor.getByLabel('Path', { exact: true }).fill('/updated-socket');
  await editor.getByRole('tab', { name: 'Messages', exact: true }).click();
  await editor.getByRole('button', { name: 'Edit message 1', exact: true }).click();
  await expect(editor.getByLabel('Message payload 1', { exact: true })).toHaveValue('ping');
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save Script', exact: true })).toBeEnabled();
  await editor.getByRole('treeitem', { name: /Live updates/ }).click();
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/updated-socket');
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'light');
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/updated-socket');
  await page.screenshot({ path: '/private/tmp/relampo-saas-websocket-updated-light.png' });
  for (const tab of ['Debug', 'Run']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await editor.getByRole('treeitem', { name: /Live updates/ }).click();
    await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/updated-socket');
  }
  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  const steps = editor.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Steps$/ }).first();
  await steps.click({ button: 'right' });
  await expect(editor.getByRole('menu').getByRole('button', { name: /WebSocket/ })).toBeVisible();
  await editor
    .getByRole('menu')
    .getByRole('button', { name: /WebSocket/ })
    .click();
  await expect(editor.getByRole('treeitem', { name: /WebSocket conversation/ })).toBeVisible();
  expect(errors).toEqual([]);
});
