import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

const source = `test: {name: WebSocket headers}
scenarios:
  - name: Buyer
    steps:
      - websocket:
          name: Auction stream
          url: wss://example.com:8443/ws?token={{token}}
          headers: {Authorization: 'Bearer {{token}}', Origin: 'https://example.com'}
          timeout: 30s
          future_field: preserve
          recorded_close_code: 1005
          actions:
            - send: {type: text, data: '{"action":"bid","auction_id":"{{auction_id}}"}', delay_before: 21.809s, recorded_data: original}
            - receive:
                type: text
                response: {data: '{"type":"bid_accepted","id":"b1"}', time_ms: 8}
                extractors: [{type: jsonpath, expression: $.id, var: bid_id}]
            - close: {code: 1000, delay_before: 9.223s}
`;

test('QA edits handshake headers and HTTP-style WS details without changing recorded data or pauses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    studio: true, initialScript: { name: 'ws-layout.yaml', yaml: source }, capabilities: { debug: false, loadRun: false },
  }) }));
  await page.goto('/');
  const step = page.getByRole('treeitem', { name: /Auction stream/ });
  await step.getByRole('button', { name: 'Expand', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Headers', exact: true }).click();
  await page.locator('input[value="Bearer {{token}}"]').fill('Bearer {{new_token}}');
  await step.click();
  await expect(page.getByRole('tab', { name: 'Connection', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Base URL', { exact: true })).toHaveValue('example.com:8443');
  await expect(page.getByLabel('Path', { exact: true })).toHaveValue('/ws?token={{token}}');
  await expect(page.getByLabel('Step name', { exact: true })).toHaveCount(0);
  await page.getByLabel('Base URL', { exact: true }).fill('other.example:9443');
  await page.getByRole('tab', { name: 'Messages', exact: true }).click();
  await page.getByRole('button', { name: 'Edit message 1', exact: true }).click();
  await expect(page.getByLabel('Delay before 1', { exact: true })).toHaveValue('21.809s');
  await expect(page.getByLabel('Message payload 1', { exact: true })).toHaveCSS('height', '300px');
  await page.getByRole('button', { name: 'Edit message 2', exact: true }).click();
  await expect(page.getByLabel('Recorded message 2', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Save as 2.1', { exact: true })).toHaveValue('bid_id');
  await page.getByRole('button', { name: 'Wait for type = bid_accepted', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const downloaded = await pending;
  const saved = yaml.load(await readFile((await downloaded.path())!, 'utf8')) as { scenarios: { steps: { websocket: Record<string, unknown> }[] }[] };
  const expected = yaml.load(source) as typeof saved;
  const ws = expected.scenarios[0].steps[0].websocket;
  ws.url = 'wss://other.example:9443/ws?token={{token}}';
  (ws.headers as Record<string, string>).Authorization = 'Bearer {{new_token}}';
  ((ws.actions as Record<string, unknown>[])[1].receive as Record<string, unknown>).match = { jsonpath: '$.type', equals: 'bid_accepted' };
  expect(saved).toEqual(expected);
  expect(errors).toEqual([]);
  if (process.env.WS_LAYOUT_SCREENSHOT) {
    await page.getByRole('tab', { name: 'Connection', exact: true }).click();
    await page.screenshot({ path: process.env.WS_LAYOUT_SCREENSHOT, fullPage: true });
  }
});
