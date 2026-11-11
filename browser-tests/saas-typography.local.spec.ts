import { expect, test, type Locator } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('Scripting, Debug and Run use the compact typography of Record and Correlation', async ({ page, context }) => {
  const base = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(base.hostname);
  await page.setViewportSize({ width: 1700, height: 1000 });
  await context.route('**/api/studio/info', route => route.fulfill({ json: {
    studio: true, capabilities: { debug: true, loadRun: true, httpRecorder: true, correlate: true },
  } }));
  await context.route('**/api/recorder/http/options', route => route.fulfill({ json: { port: 8888, firefoxAvailable: false } }));
  await context.route('**/api/recorder/http/current', route => route.fulfill({ json: { active: false, totalRequests: 0, requests: [] } }));
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'typography@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'light');
  });
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  const visit = async (tab: string) => {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', tab.toLowerCase());
  };
  const metrics = (element: Locator) => element.evaluate(el => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily, size: s.fontSize, lineHeight: s.lineHeight, height: el.getBoundingClientRect().height };
  });
  await visit('Record');
  const record = await metrics(editor.getByRole('button', { name: 'Clear', exact: true }));
  expect(record.size).toBe('12px');
  expect(record.height).toBe(28);
  await visit('Correlation');
  const correlationTree = await metrics(editor.getByRole('button', { name: 'Tree', exact: true }));
  await visit('Scripting');
  expect(await metrics(editor.getByRole('button', { name: 'Tree', exact: true }))).toEqual(correlationTree);
  await expect(editor.locator('[data-editor-panel-heading] > span')).toHaveCSS('font-size', '10px');
  for (const [tab, action] of [['Debug', 'Run Debug'], ['Run', 'Run load test']]) {
    await visit(tab);
    expect(await metrics(editor.getByRole('button', { name: action, exact: true }))).toEqual(record);
    expect(await metrics(editor.getByRole('button', { name: 'Tree', exact: true }))).toEqual(correlationTree);
    await page.screenshot({ path: `/tmp/relampo-compact-type-${tab.toLowerCase()}.png`, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'dark');
  expect(await metrics(editor.getByRole('button', { name: 'Run load test', exact: true }))).toEqual(record);
});
