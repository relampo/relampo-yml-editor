import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

const source = `test: {name: Mixed request labels}
scenarios:
  - name: Buyer
    steps:
      - request: {name: '[8] Homepage', method: GET, url: 'https://example.com/'}
      - parallel:
          name: Recorded concurrent traffic
          steps:
            - websocket:
                name: Auction updates
                url: wss://example.com/ws
                actions:
                  - send: {data: ping, delay_before: 21.809s}
            - group:
                name: HTTP during auction
                steps:
                  - request: {name: '[9] Refresh', method: GET, url: 'https://example.com/api'}
      - one_time:
          name: Prepare buyer
          steps:
            - request: {name: '[10] Login', method: POST, url: 'https://example.com/login'}
`;

test('controller labels identify custom names and mixed numbering survives collapse and export', async ({ page }) => {
  await page.route('**/api/studio/info', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    studio: true, initialScript: { name: 'mixed.yaml', yaml: source }, capabilities: { debug: false, loadRun: false },
  }) }));
  await page.goto('/');
  const tree = page.getByRole('tree');
  await expect(tree.getByText('[1] Homepage', { exact: true })).toBeVisible();
  await expect(tree.getByText('[2] Auction updates', { exact: true })).toBeVisible();
  await expect(tree.getByText('[3] Refresh', { exact: true })).toBeVisible();
  await expect(tree.getByText('[4] Login', { exact: true })).toBeVisible();
  const parallel = page.getByRole('treeitem', { name: /Recorded concurrent traffic/ });
  await expect(parallel.getByText('Parallel', { exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /HTTP during auction/ }).getByText('Group', { exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Prepare buyer/ }).getByText('One time', { exact: true })).toBeVisible();
  await parallel.getByRole('button', { name: 'Collapse', exact: true }).click();
  await expect(tree.getByText('[2] Auction updates', { exact: true })).not.toBeVisible();
  await expect(tree.getByText('[4] Login', { exact: true })).toBeVisible();
  await parallel.getByRole('button', { name: 'Expand', exact: true }).click();
  await expect(tree.getByText('[2] Auction updates', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const downloaded = await pending;
  const saved = yaml.load(await readFile((await downloaded.path())!, 'utf8')) as { scenarios: { steps: { request?: { name: string }; parallel?: { steps: { websocket: { name: string; actions: { send: { delay_before: string } }[] } }[] } }[] }[] };
  const steps = saved.scenarios[0].steps;
  expect(steps[0].request!.name).toBe('[8] Homepage');
  expect(steps[1].parallel!.steps[0].websocket.actions[0].send.delay_before).toBe('21.809s');
  expect(steps[1].parallel!.steps[0].websocket.name).toBe('Auction updates');
});
