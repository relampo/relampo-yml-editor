import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

async function importYaml(page: import('@playwright/test').Page, yaml: string) {
  await page.locator('input[type="file"]').setInputFiles({ name: 'load.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: true, initialScript: { name: 'ready.yaml', yaml: 'test: {name: initial-ready}\nscenarios: [{name: ready, steps: [{get: /}]}]\n' }, capabilities: { loadRun: false, dataSourceFiles: false, debug: false } }) }));
  await page.goto('/');
  await expect(page.getByText('initial-ready', { exact: true }).first()).toBeVisible();
});

test('RLP-801 RLP-802 selects one model and retains the inactive profile across export and import', async ({ page }) => {
  await importYaml(page, 'scenarios:\n  - name: models\n    load: {type: constant, users: 7, iterations: 3, ramp_up: 10s}\n    steps: [{get: /health}]\n');
  await page.getByRole('treeitem', { name: /Load: Constant/ }).click();
  await expect(page.getByLabel('Ramp Up', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Linear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Linear', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const output = await readFile(await (await downloadPromise).path(), 'utf8');
  const parsed = load(output) as { scenarios: Array<{load: {type: string}; 'x-studio-load-profiles': unknown }> };
  expect(parsed.scenarios[0].load.type).toBe('ramp');
  expect(parsed.scenarios[0]['x-studio-load-profiles']).toBeDefined();
  await importYaml(page, output);
  await page.getByText('Load: Linear', { exact: true }).first().click();
  await expect(page.getByText('This document contains unknown fields that will be preserved.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Constant', exact: true }).click();
  await expect(page.getByLabel('Virtual Users', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Iterations', { exact: true })).toHaveValue('3');
  await page.getByLabel('Virtual Users', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Constant', exact: true }).click();
  await expect(page.getByLabel('Virtual Users', { exact: true })).toHaveValue('9');
});

for (const type of ['ramp_up_down', 'intent']) {
  test(`RLP-804 RLP-805 validates the combined ${type} phases before download`, async ({ page }) => {
    const fields = type === 'intent' ? 'target_unit: rps, target_value: 2, min_vus: 1, max_vus: 5, warmup: 10s, ramp_up: 10s, ramp_down: 10s' : 'users: 2, ramp_up: 10s, ramp_down: 20s';
    await importYaml(page, `scenarios:\n  - name: phases\n    load: {type: ${type}, duration: 29s, ${fields}}\n    steps: [{get: /health}]\n`);
    await page.getByText(type === 'intent' ? 'Load: Intent' : 'Load: Ramp', { exact: true }).first().click();
    await expect(page.getByText(/cannot exceed Duration/).first()).toBeVisible();
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('menuitem', { name: /Save with responses/ }).click();
    await expect(page.getByText(/cannot exceed Duration/).first()).toBeVisible();
    expect(downloaded).toBe(false);
    await page.getByLabel('Duration', { exact: true }).fill('30s');
    await expect(page.getByText(/cannot exceed Duration/)).toHaveCount(0);
  });
}

test('RLP-803 RLP-807 accepts constant steps and terminal zero with matching select styles', async ({ page }) => {
  await importYaml(page, `scenarios:\n  - name: steps\n    load:\n      type: segments\n      segments:\n        - {name: first, transition: constant, target_vus: 5, duration: 1m}\n        - {name: step, transition: constant, target_vus: 10, duration: 1m}\n        - {name: stop, transition: constant, target_vus: 0, duration: 0s}\n    steps: [{get: /health}]\n`);
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('2m');
  await expect(page.getByText(/Transition must be|must define a positive Duration/)).toHaveCount(0);
  const target = page.getByLabel('Target type for segment 1');
  const transition = page.getByLabel('Transition for segment 1');
  await expect(target).toHaveAttribute('class', await transition.getAttribute('class') ?? '');
  await expect(page.getByLabel('Duration for segment 3')).toHaveValue('0s');
  await page.getByLabel('Target for segment 3').fill('0.0');
  await expect(page.getByText(/must define a positive Duration/)).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const parsed = load(await readFile(await (await downloaded).path(), 'utf8')) as { scenarios: Array<{ load: { segments: Array<{ target_vus: unknown }> } }> };
  expect(parsed.scenarios[0].load.segments[2].target_vus).toBe(0);
});
