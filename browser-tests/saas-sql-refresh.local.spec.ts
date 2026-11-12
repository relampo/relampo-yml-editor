import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const yaml = `test: {name: SQL integration preview}
sql_defaults:
  default_connection: tickets
  connections:
    tickets:
      dialect: postgres
      connection: {host: localhost, port: 5432, database: tickets, user: reader, password: '{{db_password}}'}
    archive:
      dialect: postgres
      connection: {host: localhost, port: 5432, database: archive, user: reader}
scenarios:
- name: Database checks
  load: {type: constant, users: 1, iterations: 1}
  steps:
  - sql:
      name: Read tickets
      connection_ref: tickets
      query: SELECT id, title FROM tickets LIMIT 10
      params: []
`;

test('SaaS keeps SQL connections, selection and native execution panels across save and themes', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  await context.route('**/api/studio/info', route => route.fulfill({ json: { studio: false, capabilities: {} } }));
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'sql-preview@example.invalid';
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
    .setInputFiles({ name: 'sql-preview.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
  await editor.getByRole('treeitem', { name: /SQL Defaults/ }).click();
  await expect(editor.getByLabel('Database', { exact: true })).toHaveValue('tickets');
  await editor.getByRole('treeitem', { name: /Read tickets/ }).click();
  await editor.getByLabel('Connection', { exact: true }).selectOption('archive');
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
  await page.reload();
  await editor.getByRole('treeitem', { name: /Read tickets/ }).click();
  await expect(editor.getByLabel('Connection', { exact: true })).toHaveValue('archive');
  for (const tab of ['Debug', 'Run']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await editor.getByRole('treeitem', { name: /Read tickets/ }).click();
    await expect(editor.getByLabel('Connection', { exact: true })).toHaveValue('archive');
  }
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await editor.getByRole('tab', { name: 'Distributed', exact: true }).click();
  await expect(editor.locator('#run-panel-distributed')).toBeVisible();
  await page.screenshot({ path: '/private/tmp/relampo-saas-refresh-run-dark.png' });
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'light');
  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await editor.getByRole('treeitem', { name: /SQL Defaults/ }).click();
  await page.screenshot({ path: '/private/tmp/relampo-saas-refresh-sql-light.png' });
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await page.screenshot({ path: '/private/tmp/relampo-saas-refresh-sql-dark.png' });
  expect(errors).toEqual([]);
});
