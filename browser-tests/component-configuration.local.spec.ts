import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
const features = [
  'http_defaults',
  'error_policy',
  'scoped_data_source',
  'think_time',
  'http_assertions',
  'sql_assertions',
  'http_state_usage',
];
const yaml = `component_configuration_version: 1
test:
  name: Component browser
http_defaults:
  base_url: http://example.test
defaults:
  http:
    timeout: 5s
    follow_redirects: true
    retrieve_embedded_resources: true
scenarios:
  - name: S
    steps:
      - group:
          name: Group browser
          defaults:
            http:
              assertions:
                - type: status
                  value: 200
          steps:
            - request:
                name: Local request
                method: GET
                url: /ok
                timeout: 30s
                follow_redirects: false
                retrieve_embedded_resources: false
                auth:
                  type: none
                assertions: []
                future:
                  keep: null
`;
test('scoped controls preserve authored overrides and child flows on download', async ({ page }) => {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: { name: 'components.yaml', yaml },
        capabilities: { debug: true, loadRun: true, componentConfiguration: { version: 1, features } },
      }),
    }),
  );
  await page.goto('/');
  await page.getByText('Local request', { exact: true }).first().click();
  await expect(page.getByLabel('http.timeout mode')).toHaveValue('local');
  await expect(page.getByLabel('http.timeout value')).toHaveValue('30s');
  await expect(page.getByLabel('http.auth mode')).toHaveValue('disable');
  await expect(page.getByLabel('http.assertions mode')).toHaveValue('disable');
  await page.getByLabel('http.timeout value').fill('12s');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloadPromise;
  const saved = load(await readFile((await download.path())!, 'utf8')) as any;
  const request = saved.scenarios[0].steps[0].group.steps[0].request;
  expect(saved.component_configuration_version).toBe(1);
  expect(request.timeout).toBe('12s');
  expect(request.follow_redirects).toBe(false);
  expect(request.retrieve_embedded_resources).toBe(false);
  expect(request.auth).toEqual({ type: 'none' });
  expect(request.assertions).toEqual([]);
  expect(request.future).toEqual({ keep: null });
});
test('an older backend blocks adopted Run and Debug before any POST', async ({ page }) => {
  const dispatched: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/(run|debug\/runs)/.test(request.url())) dispatched.push(request.url());
  });
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: { name: 'components.yaml', yaml },
        capabilities: { debug: true, loadRun: true },
      }),
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeDisabled();
  await expect(page.getByText(/does not support component configuration version 1/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run load test', exact: true })).toBeDisabled();
  expect(dispatched).toEqual([]);
});
