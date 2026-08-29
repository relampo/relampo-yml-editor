import { expect, test as base, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const baseYaml = `test:
  name: Browser smoke
scenarios:
  - name: smoke
    steps:
      - request:
          method: GET
          url: /health
          response:
            status: 200
            body: recorded
`;

const forwardYaml = `test:
  name: Forward browser
  future_test: keep
future_root:
  owner: backend
scenarios:
  - name: smoke
    steps:
      - get: /health
`;

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

async function mockStudioInfo(page: Page, yaml = baseYaml, studio = true) {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio,
        initialScript: studio ? { name: 'browser-smoke.yaml', yaml } : null,
        capabilities: { loadRun: studio, dataSourceFiles: studio, debug: studio },
      }),
    }),
  );
}

async function uploadYaml(page: Page, yaml: string, name = 'browser.yaml') {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
}

test('standalone open and upload preserves unknown fields and shows their paths', async ({ page }) => {
  await mockStudioInfo(page, baseYaml);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'RELAMPO' })).toBeVisible();

  await uploadYaml(page, forwardYaml, 'forward.yaml');

  await expect(page.getByText('This document contains unknown fields that will be preserved.')).toBeVisible();
  await expect(page.getByText(/future_root/)).toBeVisible();
  await expect(page.getByText(/test\.future_test/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloadPromise;
  const downloadedYaml = await readFile(await download.path(), 'utf8');
  expect(downloadedYaml).toContain('future_root:');
  expect(downloadedYaml).toContain('future_test: keep');
});

test('standalone upload input reaches the tree and tree edits reach read-only code', async ({ page }) => {
  await mockStudioInfo(page);
  await page.goto('/');
  await uploadYaml(page, baseYaml.replace('Browser smoke', 'Uploaded code edit'));
  await expect(page.getByText('Uploaded code edit', { exact: true }).first()).toBeVisible();

  await page.getByText('Uploaded code edit', { exact: true }).first().click();
  await page.getByLabel('Name').fill('Tree browser edit');
  await page.getByRole('button', { name: 'Code' }).click();
  await page.getByLabel('Search in YAML').fill('Tree browser edit');
  await expect(page.getByText('1/1', { exact: true })).toBeVisible();
});

test('standalone draft save restores content and identity from IndexedDB', async ({ page }) => {
  await mockStudioInfo(page, baseYaml, false);
  await page.goto('/');
  await uploadYaml(page, baseYaml.replace('Browser smoke', 'Restored browser draft'), 'restored-browser.yaml');
  await expect(page.getByText('Restored browser draft', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Control+S');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | null>((resolve, reject) => {
            const request = indexedDB.open('relampo-yaml-editor', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const get = db.transaction('drafts', 'readonly').objectStore('drafts').get('active');
              get.onerror = () => reject(get.error);
              get.onsuccess = () => {
                db.close();
                resolve(get.result?.fileName ?? null);
              };
            };
          }),
      ),
    )
    .toBe('restored-browser.yaml');

  await page.reload();

  await expect(page.getByText('Restored browser draft', { exact: true }).first()).toBeVisible();
  const restoredDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const restoredDownload = await restoredDownloadPromise;
  expect(restoredDownload.suggestedFilename()).toBe('restored-browser.yaml');
});

test('standalone downloads include or remove recorded responses from the newest revision', async ({ page }) => {
  await mockStudioInfo(page);
  await page.goto('/');
  await page.getByText('Browser smoke', { exact: true }).first().click();
  await page.getByLabel('Name').fill('Newest browser revision');

  const withResponsesPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const withResponses = await withResponsesPromise;
  const yamlWithResponses = await readFile(await withResponses.path(), 'utf8');
  expect(yamlWithResponses).toContain('name: Newest browser revision');
  expect(yamlWithResponses).toContain('response:');

  const withoutResponsesPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('menuitem', { name: /Save without responses/ }).click();
  const withoutResponses = await withoutResponsesPromise;
  const yamlWithoutResponses = await readFile(await withoutResponses.path(), 'utf8');
  expect(yamlWithoutResponses).toContain('name: Newest browser revision');
  expect(yamlWithoutResponses).not.toContain('response:');
});

test('standalone mocked Run and Debug streams render terminal states', async ({ page }) => {
  await mockStudioInfo(page);
  await page.route('**/api/run', route =>
    route.request().method() === 'POST'
      ? route.fulfill({ contentType: 'application/json', body: '{"id":"browser-run"}' })
      : route.continue(),
  );
  await page.route('**/api/run/browser-run/events**', route =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: [
        'event: state\ndata: {"status":"running","started_at":"2026-08-18T00:00:00Z","elapsed_ms":0}\n\n',
        'event: metrics\ndata: {"ts":1,"elapsed_ms":1000,"rps":1,"active_users":1,"avg_latency":2,"p95_latency":2,"total_requests":1,"total_failures":0,"errors":0}\n\n',
        'event: done\ndata: {"status":"completed","error":null,"summary":{"test_name":"browser","start_time":"2026-08-18T00:00:00Z","end_time":"2026-08-18T00:00:01Z","duration":1000000000,"total_requests":1,"total_failures":0,"executed_vus":1,"metadata":{"configured_vus":"2"},"transactions":[{"name":"Smoke","count":2,"failures":0}],"node_resources":[{"node":"local","mem_peak_mb":64,"cpu_peak":12.5,"go_peak":7}],"requests":[]}}\n\n',
      ].join(''),
    }),
  );
  await page.route('**/api/debug/runs', route =>
    route.fulfill({ contentType: 'application/json', body: '{"id":"browser-debug"}' }),
  );
  await page.route('**/api/debug/runs/browser-debug/events**', route =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'event: engine\ndata: {"ts":"2026-08-18T00:00:00Z","name":"Health","method":"GET","path":"/health","status":200,"latency_ms":2,"concurrency":1}\n\nevent: done\ndata: {}\n\n',
    }),
  );
  await page.goto('/');

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Run load test' }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Run summary', { exact: true })).toBeVisible();
  await expect(page.getByText('Total Requests', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
  await expect(page.getByText('TPS', { exact: true }).locator('..').getByText('2.0', { exact: true })).toBeVisible();
  await expect(page.getByText('MEM Peak', { exact: true }).locator('..').getByText('64 MB', { exact: true })).toBeVisible();
  await expect(page.getByText('CPU Peak', { exact: true }).locator('..').getByText('12.5%', { exact: true })).toBeVisible();
  await expect(page.getByText('Go', { exact: true }).locator('..').getByText('7', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Debug' }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByText('/health', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Requests: 1. Filter execution timeline.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
});
