import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
const source = `test: {name: WebSocket QA}
scenarios:
 - name: Buyer
   steps:
    - websocket:
        name: Live auctions
        url: wss://example.com/ws
        vendor_field: preserve
        actions:
         - send: {type: text, data: '{"action":"subscribe","auction_id":"example"}'}
         - receive:
             type: text
             response: {data: '{"type":"subscribed","id":"s1"}', size_bytes: 31, time_ms: 8}
         - close: {code: 1000}
`;
test('QA imports a recording, configures matching and extraction, and exports executable YAML', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: { name: 'websocket.yaml', yaml: source },
        capabilities: { debug: false, loadRun: false },
      }),
    }),
  );
  await page.goto('/');
  const step = page.getByRole('treeitem', { name: /Live auctions/ });
  await expect(step).toBeVisible();
  await step.click();
  await expect(page.getByRole('heading', { name: 'WebSocket conversation' })).toBeVisible();
  await expect(page.getByText('Client → Server')).toBeVisible();
  await expect(page.getByText('Server → Client')).toBeVisible();
  await page.getByRole('button', { name: 'Wait for type = subscribed' }).click();
  await expect(page.getByLabel('Expected value 2')).toHaveValue('subscribed');
  await page.getByRole('button', { name: '+ Extract a value', exact: true }).click();
  await page.getByLabel('Extract field 2.1').fill('$.id');
  await page.getByLabel('Save as 2.1').fill('subscription_id');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await pending;
  const saved = yaml.load(await readFile(await download.path(), 'utf8')) as {
    scenarios: { steps: { websocket: Record<string, unknown> }[] }[];
  };
  const ws = saved.scenarios[0].steps[0].websocket;
  expect(ws.vendor_field).toBe('preserve');
  expect((ws.actions as Record<string, unknown>[])[1].receive).toMatchObject({
    match: { jsonpath: '$.type', equals: 'subscribed' },
    extractors: [{ type: 'jsonpath', expression: '$.id', var: 'subscription_id' }],
  });
  expect(errors).toEqual([]);
});
