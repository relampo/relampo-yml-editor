import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

const segmentYaml = `test:
  name: Segments browser
scenarios:
  - name: segments
    load:
      type: segments
      segments:
        - name: pause
          duration: 1m
          target_vus: 0
          transition: constant
        - name: ramp
          duration: 20s
          target_vus: 5
          transition: ramp_up
        - name: recovery
          duration: 2m
          target_vus: 0
          transition: ramp_down
    steps:
      - get: /health
`;

for (const transition of ['constant', 'ramp_up']) {
  test(`RLP-766 rejects an imported initial Ramp down and corrects it to ${transition}`, async ({ page }, testInfo) => {
    await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: false, initialScript: null, capabilities: { loadRun: false, dataSourceFiles: false, debug: false } }) }));
    await page.goto('/');
    const invalidYaml = segmentYaml.replace('transition: constant', 'transition: ramp_down');
    await page.locator('input[type="file"]').setInputFiles({ name: 'invalid-initial-ramp.yaml', mimeType: 'text/yaml', buffer: Buffer.from(invalidYaml) });
    await page.getByText('Load: Segments', { exact: true }).first().click();
    const first = page.getByLabel('Transition for segment 1');
    await expect(first).toHaveValue('ramp_down');
    await expect(first.locator('option[value="ramp_down"]')).toBeDisabled();
    const issue = page.getByText('Segment 1 cannot use Ramp down as the first segment.', { exact: true }).first();
    await expect(issue).toBeVisible();
    await first.selectOption(transition);
    await expect(first).toHaveValue(transition);
    await expect(first.locator('option')).toHaveText(['Select transition', 'Constant', 'Ramp up']);
    await expect(issue).not.toBeVisible();
    await expect(page.getByLabel('Transition for segment 3').locator('option[value="ramp_down"]')).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`first-${transition}.png`), fullPage: true });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('menuitem', { name: /Save with responses/ }).click();
    const download = await downloadPromise;
    const output = await readFile(await download.path(), 'utf8');
    const parsed = load(output) as { scenarios: Array<{ load: { segments: Array<{ target_vus: number; transition: string }> } }> };
    expect(parsed.scenarios[0].load.segments[0]).toMatchObject({ target_vus: 0, transition });
    expect(output).toContain('transition: ramp_down');
  });
}

test('RLP-765 edits segment targets, transitions, bounds and total duration in Chromium', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: false, initialScript: null, capabilities: { loadRun: false, dataSourceFiles: false, debug: false } }) }));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({ name: 'segments.yaml', mimeType: 'text/yaml', buffer: Buffer.from(segmentYaml) });
  await page.getByText('Load: Segments', { exact: true }).first().click();

  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('200s');
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('VUs Min for segment 1')).toBeDisabled();
  await expect(page.getByLabel('VUs Max for segment 1')).toBeDisabled();
  await expect(page.getByLabel('Target for segment 1')).toHaveValue('0');
  await expect(page.getByLabel('Transition for segment 2').locator('option')).toHaveText(['Select transition', 'Constant', 'Ramp up', 'Ramp down']);

  await page.getByLabel('Target type for segment 2').selectOption('rps');
  await expect(page.getByLabel('Transition for segment 2')).toHaveValue('constant');
  await expect(page.getByLabel('Transition for segment 2').locator('option')).toHaveText(['Select transition', 'Constant']);
  await expect(page.getByLabel('VUs Min for segment 2')).toBeEnabled();
  await expect(page.getByLabel('VUs Max for segment 2')).toBeEnabled();
  await page.getByLabel('VUs Min for segment 2').fill('2');
  await page.getByLabel('VUs Max for segment 2').fill('2');
  await expect(page.getByText('Segment 2 Max VUs must be greater than Min VUs.', { exact: true }).first()).toBeVisible();
  await page.getByLabel('VUs Min for segment 2').fill('0');
  await page.getByLabel('VUs Max for segment 2').fill('10');
  await page.getByLabel('Duration for segment 2').fill('40s');
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('220s');
  await page.getByRole('button', { name: 'Add Segment' }).click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('280s');
  await page.getByRole('button', { name: 'Remove segment 4' }).click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('220s');
  await page.screenshot({ path: testInfo.outputPath('segments.png'), fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloadPromise;
  const output = await readFile(await download.path(), 'utf8');
  expect(output).toContain('target_vus: 0');
  expect(output).toContain('target_rps:');
  expect(output).toContain('min_vus:');
  expect(output).toContain('transition: constant');
  expect(output).toContain('transition: ramp_down');
  expect(output).toContain('duration: 220s');
  expect(errors).toEqual([]);
});
