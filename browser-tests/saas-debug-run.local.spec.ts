import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const yaml = `test: {name: Plan execution}
scenarios:
- name: Checkout
  load: {type: constant, users: 2, iterations: 1}
  steps:
  - request: {name: Health, method: GET, url: 'https://app.test/health'}
`;

for (const connected of [false, true]) {
  test(`RelampoLab Debug and Run show native Studio panels with runtime ${connected ? 'connected' : 'unavailable'}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    let debugYaml = '',
      runYaml = '';
    await context.route('**/api/studio/info', route =>
      route.fulfill({ json: { studio: connected, capabilities: { debug: connected, loadRun: connected } } }),
    );
    await context.route('**/api/debug/runs', route => {
      debugYaml = route.request().postDataJSON().yaml;
      return route.fulfill({ json: { id: 'plan-debug' } });
    });
    await context.route('**/api/debug/runs/plan-debug/events**', route =>
      route.fulfill({
        contentType: 'text/event-stream',
        body: 'event: engine\ndata: {"ts":"2026-11-10T00:00:00Z","name":"Health","method":"GET","path":"/health","status":200,"latency_ms":2,"concurrency":1}\n\nevent: done\ndata: {}\n\n',
      }),
    );
    await context.route('**/api/run', route => {
      runYaml = route.request().postDataJSON().yaml;
      return route.fulfill({ json: { id: 'plan-run' } });
    });
    await context.route('**/api/run/plan-run/events**', route =>
      route.fulfill({
        contentType: 'text/event-stream',
        body: `event: done\ndata: ${JSON.stringify({ status: 'completed', summary: { test_name: 'Plan execution', status: 'completed', start_time: '', end_time: '', duration: 1000000000, total_requests: 1, total_failures: 0, requests: [] } })}\n\n`,
      }),
    );
    await page.goto(base.origin);
    await page.evaluate(() => {
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', 'execution@example.invalid');
      localStorage.setItem('relampo-onboarding-execution@example.invalid', 'true');
      localStorage.setItem('relampo-language', 'en');
      localStorage.setItem('relampo-theme', 'dark');
    });
    await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
    const editor = page.frameLocator('iframe[data-plan-editor]');
    await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
    await editor
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: 'plan.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
    await expect(editor.getByText('Plan execution', { exact: true })).toBeVisible();
    const session = await page.locator('iframe[data-plan-editor]').getAttribute('src');
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    const debug = editor.getByRole('button', { name: 'Run Debug', exact: true });
    await expect(debug).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Tree', exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Code', exact: true }).click();
    await expect(editor.locator('.monaco-editor').first()).toBeVisible();
    await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'debug');
    await expect(debug).toBeVisible();
    await editor.getByRole('button', { name: 'Tree', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'Debug', exact: true })).toHaveCount(0);
    if (connected) {
      await expect(debug).toBeEnabled();
      await debug.click();
      await expect.poll(() => debugYaml).toContain('Plan execution');
    } else {
      await expect(debug).toBeDisabled();
      await expect(
        editor.getByText('Connect a compatible Relampo Studio to execute this plan. You can review its configuration.'),
      ).toBeVisible();
    }
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Load Generation', exact: true })).toHaveCount(0);
    await expect(editor.getByRole('button', { name: 'Tree', exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Code', exact: true }).click();
    await expect(editor.locator('.monaco-editor').first()).toBeVisible();
    await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'run');
    await expect(editor.getByRole('button', { name: 'Run load test', exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Load configuration', exact: true }).click();
    const configuration = editor.getByRole('region', { name: 'Load configuration', exact: true });
    await expect(configuration).toBeVisible();
    await configuration.getByLabel('Virtual Users', { exact: true }).fill('3');
    const run = editor.getByRole('button', { name: 'Run load test', exact: true });
    await expect(run).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Run', exact: true })).toHaveCount(0);
    if (connected) {
      await expect(run).toBeEnabled();
      await run.click();
      await expect.poll(() => runYaml).toContain('Plan execution');
      expect(Number((load(runYaml) as any).scenarios[0].load.users)).toBe(3);
    } else {
      await expect(run).toBeDisabled();
      expect(debugYaml).toBe('');
      expect(runYaml).toBe('');
    }
    await page.getByRole('button', { name: 'Save plan', exact: true }).click();
    await page.getByRole('button', { name: 'Export YAML options', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export with responses', exact: true }).click();
    const downloaded = await downloadPromise;
    expect(Number((load(readFileSync((await downloaded.path())!, 'utf8')) as any).scenarios[0].load.users)).toBe(3);
    await expect(page.locator('iframe[data-plan-editor]')).toHaveAttribute('src', session!);
    await editor.getByRole('button', { name: 'Tree', exact: true }).click();
    await page.screenshot({
      path: `/tmp/relampo-saas-run-${connected ? 'connected' : 'offline'}.png`,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Scripting', exact: true }).click();
    await expect(editor.getByText('Plan execution', { exact: true })).toBeVisible();
    await editor.getByText('Load: Constant', { exact: true }).first().click();
    await expect(editor.getByRole('region', { name: 'Load configuration', exact: true })).toBeVisible();
    await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'run');
    expect(context.pages()).toHaveLength(1);
  });
}
