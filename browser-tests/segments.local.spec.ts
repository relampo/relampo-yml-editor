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
    await expect(first).toHaveText('Ramp down (invalid for first segment)');
    await first.click();
    await expect(page.getByRole('option', { name: /Ramp down/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    const issue = page.getByText('Segment 1 cannot use Ramp down as the first segment.', { exact: true }).first();
    await expect(issue).toBeVisible();
    await first.click();
    await page.getByRole('option', { name: transition === 'constant' ? 'Constant' : 'Ramp up', exact: true }).click();
    await expect(first).toHaveText(transition === 'constant' ? 'Constant' : 'Ramp up');
    await first.click();
    await expect(page.getByRole('option')).toHaveText(['Constant', 'Ramp up']);
    await page.keyboard.press('Escape');
    await expect(issue).not.toBeVisible();
    await page.getByLabel('Transition for segment 3').click();
    await expect(page.getByRole('option', { name: 'Ramp down', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
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
  await page.getByLabel('Transition for segment 2').click();
  await expect(page.getByRole('option')).toHaveText(['Constant', 'Ramp up', 'Ramp down']);
  await page.keyboard.press('Escape');

  await page.getByLabel('Target type for segment 2').click();
  await page.getByRole('option', { name: 'RPS', exact: true }).click();
  await expect(page.getByLabel('Transition for segment 2')).toHaveText('Constant');
  await page.getByLabel('Transition for segment 2').click();
  await expect(page.getByRole('option')).toHaveText(['Constant']);
  await page.keyboard.press('Escape');
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

test('RLP-806 preserves segment edits through model changes, save, reload and reimport', async ({ page }) => {
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: false }) }));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({ name: 'persist.yaml', mimeType: 'text/yaml', buffer: Buffer.from(segmentYaml) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await page.getByLabel('Target for segment 2', { exact: true }).fill('7');
  await page.getByLabel('Duration for segment 2', { exact: true }).fill('40s');
  await page.getByRole('button', { name: 'Linear', exact: true }).click();
  await page.getByRole('button', { name: 'Segments', exact: true }).click();
  await expect(page.getByLabel('Target for segment 2', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Duration for segment 2', { exact: true })).toHaveValue('40s');
  await expect(page.getByLabel('Transition for segment 2', { exact: true })).toHaveText('Ramp up');
  await page.keyboard.press('ControlOrMeta+s');
  await expect.poll(() => page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('relampo-yaml-editor');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction('drafts').objectStore('drafts').get('active');
      read.onsuccess = () => { db.close(); resolve(read.result?.yaml || ''); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }))).toContain('duration: 40s');
  await page.reload();
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Target for segment 2', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('220s');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const output = await readFile(await (await downloaded).path(), 'utf8');
  expect(output).not.toContain('__segmentsProfile');
  const parsed = load(output) as { scenarios: Array<{ load: { segments: Array<Record<string, unknown>> } }> };
  expect(parsed.scenarios[0].load.segments).toEqual([
    { name: 'pause', duration: '1m', target_vus: 0, transition: 'constant' },
    { name: 'ramp', duration: '40s', target_vus: '7', transition: 'ramp_up' },
    { name: 'recovery', duration: '2m', target_vus: 0, transition: 'ramp_down' },
  ]);
  await page.locator('input[type="file"]').setInputFiles({ name: 'saved.yaml', mimeType: 'text/yaml', buffer: Buffer.from(output) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Duration for segment 2', { exact: true })).toHaveValue('40s');
});

test('RLP-806 switches an imported profile without root duration before editing any segment', async ({ page }) => {
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: false }) }));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({ name: 'no-root-duration.yaml', mimeType: 'text/yaml', buffer: Buffer.from(segmentYaml) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('200s');
  // No segment field is edited before switching models.
  await page.getByRole('button', { name: 'Linear', exact: true }).click();
  await page.getByRole('button', { name: 'Segments', exact: true }).click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('200s');
  await expect(page.getByText(/Segments Duration total must equal load Duration/)).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const output = await readFile(await (await downloaded).path(), 'utf8');
  const parsed = load(output) as { scenarios: Array<{ load: Record<string, unknown> }> };
  const original = load(segmentYaml) as typeof parsed;
  expect(parsed.scenarios[0].load).toEqual(original.scenarios[0].load);
  expect(parsed.scenarios[0].load).not.toHaveProperty('duration');
  expect(output).not.toContain('__segmentsProfile');
  await page.locator('input[type="file"]').setInputFiles({ name: 'saved.yaml', mimeType: 'text/yaml', buffer: Buffer.from(output) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('200s');
  await expect(page.getByText(/Segments Duration total must equal load Duration/)).toHaveCount(0);
});

test('RLP-803 uses shared dropdowns for segment fields and exact scenario results', async ({ page }, testInfo) => {
  const yaml = segmentYaml.replace('  name: Segments browser\n', '  name: Dropdown proof\n  scenario_mode: sequential\n').replace('  - name: segments\n', '  - name: scenario:global\n') + `  - name: global
    load: {type: constant, users: 1, iterations: 1}
    steps: [{get: /health}]
`;
  const result = (name: string, count: number) => ({ test_name: name, status: 'completed', start_time: '', end_time: '', duration: 1e9, total_requests: count, total_failures: 0, requests: [], history: [] });
  const summary = { ...result('all', 3), complete: true, scenarios: [
    { name: 'scenario:global', outcome: 'completed', complete: true, result: result('scenario:global', 1) },
    { name: 'global', outcome: 'completed', complete: true, result: result('global', 2) },
  ] };
  await page.route('**/api/studio/info', route => route.fulfill({ json: {
    studio: true, initialScript: { name: 'dropdowns.yaml', yaml }, capabilities: { loadRun: true, multiScenarioRun: true },
  } }));
  await page.route('**/api/run', route => route.fulfill({ json: { id: 'dropdowns' } }));
  await page.route('**/api/run/dropdowns/events**', route => route.fulfill({ contentType: 'text/event-stream', body: `event: done\ndata: ${JSON.stringify({ status: 'completed', summary })}\n\n` }));
  await page.goto('/');
  await page.getByText('Load: Segments', { exact: true }).first().click();
  const target = page.getByRole('combobox', { name: 'Target type for segment 2' });
  const transition = page.getByRole('combobox', { name: 'Transition for segment 2' });
  await expect(target).toHaveAttribute('data-slot', 'select-trigger');
  await expect(transition).toHaveAttribute('data-slot', 'select-trigger');
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toHaveAttribute('data-slot', 'select-content');
  await page.screenshot({ path: testInfo.outputPath('target-menu.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(target).toBeFocused();
  await transition.click();
  await page.screenshot({ path: testInfo.outputPath('transition-menu.png'), fullPage: true });
  await page.getByRole('option', { name: 'Constant', exact: true }).click();
  await expect(transition).toHaveText('Constant');

  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Run load test', exact: true }).click();
  const scope = page.getByRole('combobox', { name: 'Result scope', exact: true });
  await expect(scope).toHaveAttribute('data-slot', 'select-trigger');
  await expect(scope).toHaveText('Global');
  const count = page.getByText('Total Requests', { exact: true }).locator('..');
  await expect(count).toContainText('3');
  await scope.click();
  await expect(page.getByRole('option')).toHaveText(['Global', 'scenario:global', 'global']);
  await page.screenshot({ path: testInfo.outputPath('result-scope-menu.png'), fullPage: true });
  await page.getByRole('option', { name: 'global', exact: true }).click();
  await expect(count).toContainText('2');
  await scope.click();
  await page.getByRole('option', { name: 'scenario:global', exact: true }).click();
  await expect(count).toContainText('1');
  await scope.click();
  await page.getByRole('option', { name: 'Global', exact: true }).click();
  await expect(count).toContainText('3');
});
