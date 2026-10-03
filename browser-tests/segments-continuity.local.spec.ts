import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

const yaml = `test:
  name: RLP-767 continuity
scenarios:
  - name: continuity
    load:
      type: segments
      segments:
        - name: initial
          duration: 125ms
          transition: constant
          target_vus: 20
        - name: rps-one
          duration: 125ms
          transition: constant
          target_rps: 500
          min_vus: 10
          max_vus: 40
        - name: next-vus
          duration: 250ms
          transition: constant
          target_vus: 60
        - name: rps-two
          duration: 500ms
          transition: constant
          target_rps: 200
          min_vus: 2
          max_vus: 30
        - name: rps-three
          duration: 125ms
          transition: constant
          target_rps: 100
          min_vus: 1
          max_vus: 15
    steps:
      - get: /health
`;

test('RLP-767 revalidates configured continuity and exports exact independent targets', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: false, initialScript: null, capabilities: { loadRun: false, dataSourceFiles: false, debug: false } }) }));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({ name: 'continuity.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('1.125s');
  const issue = (message: string) => page.getByText(message, { exact: true }).first();
  await expect(issue('Segment 3 Transition must be Ramp up from 40 VUs to 60 VUs.')).toBeVisible();
  await page.getByLabel('Transition for segment 3').selectOption('ramp_up');
  await expect(issue('Segment 3 Transition must be Ramp up from 40 VUs to 60 VUs.')).not.toBeVisible();
  await page.getByLabel('Target for segment 3').fill('20');
  await expect(issue('Segment 3 Transition must be Ramp down from 40 VUs to 20 VUs.')).toBeVisible();
  await page.getByLabel('Transition for segment 3').selectOption('ramp_down');
  await page.getByLabel('Target for segment 3').fill('40');
  await expect(issue('Segment 3 Transition must be Constant from 40 VUs to 40 VUs.')).toBeVisible();
  await page.getByLabel('Transition for segment 3').selectOption('constant');
  await page.getByLabel('VUs Max for segment 2').fill('50');
  await expect(issue('Segment 3 Transition must be Ramp down from 50 VUs to 40 VUs.')).toBeVisible();
  await page.getByLabel('Transition for segment 3').selectOption('ramp_down');
  const targets = page.locator('line[data-segment-rps-target]');
  await expect(targets).toHaveCount(3);
  for (const [index, target] of ['500', '200', '100'].entries()) {
    await expect(targets.nth(index)).toHaveAttribute('data-segment-rps-target', target);
    await expect(targets.nth(index)).toHaveAttribute('stroke-dasharray', '6 5');
  }
  const bounds = await targets.evaluateAll(lines => lines.map(line => [Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))]));
  for (const [index, [start, end]] of [[0.125, 0.25], [0.5, 1], [1, 1.125]].entries()) {
    expect(bounds[index][0]).toBeCloseTo(40 + start / 1.125 * 340, 6);
    expect(bounds[index][1]).toBeCloseTo(40 + end / 1.125 * 340, 6);
  }
  await page.locator('svg').filter({ has: page.locator('line[data-segment-rps-target]') }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('RLP-767-continuity.png'), fullPage: true });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloaded;
  const parsed = load(await readFile(await download.path(), 'utf8')) as { scenarios: Array<{ load: { duration: string; segments: Array<Record<string, unknown>> } }> };
  expect(parsed.scenarios[0].load.duration).toBe('1.125s');
  expect(parsed.scenarios[0].load.segments[1]).toMatchObject({ target_rps: 500, min_vus: 10 });
  expect(Number(parsed.scenarios[0].load.segments[1].max_vus)).toBe(50);
  expect(Number(parsed.scenarios[0].load.segments[2].target_vus)).toBe(40);
  expect(parsed.scenarios[0].load.segments[2].transition).toBe('ramp_down');
  expect(parsed.scenarios[0].load.segments[3]).toMatchObject({ target_rps: 200, min_vus: 2, max_vus: 30 });
  expect(parsed.scenarios[0].load.segments[4]).toMatchObject({ target_rps: 100, min_vus: 1, max_vus: 15 });
  expect(errors).toEqual([]);
});
