import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dump, load } from 'js-yaml';

type Segment = { name: string; duration: string; transition: string; target_vus?: number; target_rps?: number; min_vus?: number; max_vus?: number };
const a: Segment = { name: 'A', duration: '125ms', transition: 'constant', target_vus: 50 };
const b: Segment = { name: 'B', duration: '250ms', transition: 'ramp_down', target_vus: 20 };
const c: Segment = { name: 'C', duration: '500ms', transition: 'constant', target_rps: 500, min_vus: 10, max_vus: 40 };
const d: Segment = { name: 'D', duration: '125ms', transition: 'constant', target_vus: 40 };

async function openSegments(page: Page, segments: Segment[]) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const yaml = dump({ test: { name: 'RLP-768 reorder' }, scenarios: [{ name: 'reorder', load: { type: 'segments', segments }, steps: [{ get: '/health' }] }] });
  // Load through initialization so its asynchronous empty-document restore
  // cannot race a file upload. The export test separately exercises reimport.
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ studio: true, initialScript: { name: 'reorder.yaml', yaml }, capabilities: { loadRun: false, dataSourceFiles: false, debug: false } }) }));
  await page.goto('/');
  await page.getByText('Load: Segments', { exact: true }).first().click();
  return errors;
}

async function drag(page: Page, from: number, to: number) {
  await page.getByRole('button', { name: `Drag segment ${from}`, exact: true }).dragTo(page.locator('[data-segment-row]').nth(to - 1));
}

// The validation banner appends (+N) when more than one segment is invalid.
const issue = (page: Page, text: string) => page.getByText(text, { exact: false }).first();

async function save(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloaded;
  return await readFile(await download.path(), 'utf8');
}

test('RLP-768 native drag revalidates every neighbor, moves exact RPS interval and exports order', async ({ page }, testInfo) => {
  const errors = await openSegments(page, [a, b, c, d]);
  const identity = page.getByLabel('Name for segment 3', { exact: true });
  await identity.evaluate(input => Object.assign(input, { reorderIdentity: 'C' }));
  await drag(page, 3, 2);
  await expect(page.getByLabel('Name for segment 2', { exact: true })).toHaveValue('C');
  expect(await page.getByLabel('Name for segment 2', { exact: true }).evaluate(input => (input as HTMLInputElement & { reorderIdentity?: string }).reorderIdentity)).toBe('C');
  await expect(page.getByLabel('Name for segment 3', { exact: true })).toHaveValue('B');
  await expect(issue(page, 'Segment 4 Transition must be Ramp up from 20 VUs to 40 VUs.')).toBeVisible();
  await expect(page.getByLabel('Transition for segment 4')).toHaveValue('constant');
  await expect(page.getByLabel('Transition for segment 3')).toHaveValue('ramp_down');
  await expect(page.getByLabel('VUs Max for segment 2')).toHaveValue('40');
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('1s');
  const target = page.locator('line[data-segment-rps-target="500"]');
  await expect(target).toHaveAttribute('x1', '82.5');
  await expect(target).toHaveAttribute('x2', '252.5');
  await expect(target).toHaveAttribute('stroke-dasharray', '6 5');
  // A manually selected invalid transition exposes the new configured RPS predecessor.
  await page.getByLabel('Transition for segment 3').selectOption('constant');
  await expect(issue(page, 'Segment 3 Transition must be Ramp down from 40 VUs to 20 VUs.')).toBeVisible();
  await expect(issue(page, 'Segment 3 Transition must be Ramp down from 40 VUs to 20 VUs.')).toContainText('(+1)');
  await page.getByLabel('Transition for segment 3').selectOption('ramp_down');
  await page.getByLabel('Transition for segment 4').selectOption('ramp_up');
  await expect(issue(page, 'Segment 4 Transition must be Ramp up from 20 VUs to 40 VUs.')).not.toBeVisible();
  const output = await save(page);
  const parsed = load(output) as { scenarios: Array<{ load: { duration: string; segments: Segment[] } }> };
  expect(parsed.scenarios[0].load.duration).toBe('1s');
  expect(parsed.scenarios[0].load.segments).toEqual([a, c, b, { ...d, transition: 'ramp_up' }]);
  expect(output).not.toContain('rowKey');
  await page.locator('input[type="file"]').setInputFiles({ name: 'saved-order.yaml', mimeType: 'text/yaml', buffer: Buffer.from(output) });
  await page.getByText('Load: Segments', { exact: true }).first().click();
  await expect(page.getByLabel('Name for segment 2', { exact: true })).toHaveValue('C');
  await expect(page.getByLabel('Name for segment 4', { exact: true })).toHaveValue('D');
  await page.screenshot({ path: testInfo.outputPath('RLP-768-reordered.png'), fullPage: true });
  await page.locator('svg').filter({ has: page.locator('line[data-segment-rps-target]') }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('RLP-768-timeline.png'), fullPage: true });
  await testInfo.attach('exported-order.yaml', { body: output, contentType: 'text/yaml' });
  expect(errors).toEqual([]);
});

test('RLP-768 first VUs retains invalid Ramp down, allows Constant/Ramp up from zero, and first RPS keeps its bounds', async ({ page }) => {
  const errors = await openSegments(page, [a, b, c]);
  await drag(page, 2, 1);
  await expect(page.getByLabel('Transition for segment 1')).toHaveValue('ramp_down');
  await expect(issue(page, 'Segment 1 cannot use Ramp down as the first segment.')).toBeVisible();
  await expect(issue(page, 'Segment 1 cannot use Ramp down as the first segment.')).toContainText('(+1)');
  await page.getByLabel('Transition for segment 1').selectOption('constant');
  await expect(issue(page, 'Segment 1 cannot use Ramp down as the first segment.')).not.toBeVisible();
  await page.getByLabel('Transition for segment 1').selectOption('ramp_up');
  await expect(page.locator('polyline[stroke-width="3"]')).toHaveAttribute('points', /^40,170 /);
  await drag(page, 3, 1);
  await expect(page.getByLabel('Target type for segment 1')).toHaveValue('rps');
  await expect(page.getByLabel('Target for segment 1')).toHaveValue('500');
  await expect(page.getByLabel('VUs Min for segment 1')).toHaveValue('10');
  await expect(page.getByLabel('VUs Max for segment 1')).toHaveValue('40');
  await expect(page.getByLabel('Transition for segment 1')).toHaveValue('constant');
  await expect(issue(page, 'Segment 2 Transition must be Ramp down from 40 VUs to 20 VUs.')).toBeVisible();
  await expect(page.getByLabel('Transition for segment 2')).toHaveValue('ramp_up');
  await expect(page.getByLabel('Total Duration', { exact: true })).toHaveValue('875ms');
  expect(errors).toEqual([]);
});

test('RLP-768 cancels native drag with Escape, ignores self drop, repeats moves and supports keyboard buttons', async ({ page }) => {
  const errors = await openSegments(page, [a, c]);
  const handle = await page.getByRole('button', { name: 'Drag segment 2', exact: true }).boundingBox();
  const target = await page.locator('[data-segment-row]').first().boundingBox();
  expect(handle).not.toBeNull();
  expect(target).not.toBeNull();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target!.x + 20, target!.y + target!.height / 2, { steps: 10 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByLabel('Name for segment 1', { exact: true })).toHaveValue('A');
  await drag(page, 1, 1);
  await expect(page.getByLabel('Name for segment 1', { exact: true })).toHaveValue('A');
  await drag(page, 2, 1);
  await drag(page, 1, 2);
  await expect(page.getByLabel('Name for segment 1', { exact: true })).toHaveValue('A');
  const move = page.getByRole('button', { name: 'Move segment 2 up', exact: true });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Name for segment 1', { exact: true })).toHaveValue('C');
  await expect(page.getByRole('status')).toHaveText('C moved to position 1.');
  await expect(page.getByRole('button', { name: 'Move segment 1 up', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
