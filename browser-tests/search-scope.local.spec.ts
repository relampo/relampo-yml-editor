import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';

const source = `test:
  name: Scoped browser test
variables:
  value: needle
scenarios:
  - name: Main
    steps:
      - request:
          name: editable-needle
          method: GET
          url: /needle/needle
          headers:
            X-Test: needle
          response:
            status: 200
            body: response-only needle
      - request:
          name: Second response
          method: GET
          url: /health
          response:
            status: 200
            body: response-only
`;

test('explicit search scopes isolate responses and preserve replacements after save and reopen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ studio: false, initialScript: null, capabilities: {} }),
    }),
  );
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'scoped.yaml', mimeType: 'text/yaml', buffer: Buffer.from(source) });
  const search = page.getByRole('textbox', { name: 'Search nodes', exact: true });
  const requests = page.getByRole('radio', { name: 'Requests', exact: true });
  const responses = page.getByRole('radio', { name: 'Responses', exact: true });
  const searchPanel = page.getByRole('search', { name: 'Search tree' });
  const replace = searchPanel.getByRole('button', { name: 'Replace', exact: true });
  await expect(requests).not.toBeChecked();
  await expect(responses).not.toBeChecked();
  await search.fill('needle');
  await search.press('Enter');
  await expect(page.getByRole('button', { name: 'Search tree' })).toBeDisabled();
  await expect(replace).toBeDisabled();

  await requests.check();
  await page.getByRole('button', { name: 'Search tree' }).click();
  await expect(page.getByLabel('Search result count')).toHaveText('5 matches · 3 nodes');
  await expect(page.getByRole('treeitem', { name: /Second response/ })).toBeVisible();
  await replace.click();
  await searchPanel.getByRole('textbox', { name: 'Replacement text', exact: true }).fill('changed');
  await responses.check();
  await expect(search).toHaveValue('needle');
  await expect(page.getByLabel('Search result count')).toHaveText('1 match · 1 node');
  await expect(replace).toBeDisabled();
  await expect(page.getByRole('tree').locator('mark')).toHaveCount(0);
  await expect(searchPanel.getByRole('textbox', { name: 'Replacement text', exact: true })).toHaveCount(0);
  await page.getByRole('treeitem', { name: /editable-needle/ }).click();
  await expect(page.getByRole('button', { name: 'Response', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/search-scope-responses.png' });

  await requests.check();
  await page.getByRole('button', { name: 'Search tree' }).click();
  await replace.click();
  await searchPanel.getByRole('textbox', { name: 'Replacement text', exact: true }).fill('changed');
  await searchPanel.getByRole('button', { name: 'Replace all', exact: true }).click();
  await expect(page.getByText('5 replacements', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Search result count')).toHaveText('0 matches · 0 nodes');
  await expect(page.getByRole('treeitem', { name: /editable-changed/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Second response/ })).toBeVisible();
  await search.fill('changed');
  await page.getByRole('button', { name: 'Search tree' }).click();
  await expect(page.getByLabel('Search result count')).toHaveText('5 matches · 3 nodes');
  await page.screenshot({ path: 'output/playwright/search-scope-requests.png' });

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloadEvent;
  const saved = await readFile(await download.path(), 'utf8');
  const parsed = yaml.load(saved) as {
    variables: { value: string };
    scenarios: Array<{ steps: Array<{ request: { name: string; url: string; response: { body: string } } }> }>;
  };
  expect(parsed.variables.value).toBe('changed');
  expect(parsed.scenarios[0].steps[0].request.name).toBe('editable-changed');
  expect(parsed.scenarios[0].steps[0].request.url).toBe('/changed/changed');
  expect(parsed.scenarios[0].steps[0].request.response.body).toBe('response-only needle');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'reopened.yaml', mimeType: 'text/yaml', buffer: Buffer.from(saved) });
  await expect(requests).not.toBeChecked();
  await responses.check();
  await search.fill('needle');
  await page.getByRole('button', { name: 'Search tree' }).click();
  await expect(page.getByLabel('Search result count')).toHaveText('1 match · 1 node');
  expect(errors).toEqual([]);
});

test('replacement updates component names, URLs, extractor labels and assertion labels in the visible tree', async ({
  page,
}) => {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ studio: false, initialScript: null, capabilities: {} }),
    }),
  );
  await page.goto('/');
  const content = `test:
  name: Labels
scenarios:
  - name: Main
    steps:
      - group:
          name: needle group
          steps:
            - request:
                name: needle request
                method: GET
                url: /needle
                extractors:
                  - type: regex
                    var: needle
                    pattern: id=([0-9]+)
                assertions:
                  - type: contains
                    value: needle
`;
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'labels.yaml', mimeType: 'text/yaml', buffer: Buffer.from(content) });
  const panel = page.getByRole('search', { name: 'Search tree' });
  const input = panel.getByRole('textbox', { name: 'Search nodes' });
  await panel.getByRole('radio', { name: 'Requests' }).check();
  await input.fill('needle');
  await panel.getByRole('button', { name: 'Search tree' }).click();
  await expect(page.getByRole('treeitem', { name: /needle group/ }).locator('mark')).toHaveText('needle');
  await expect(page.getByRole('treeitem', { name: /Extract: needle/ }).locator('mark')).toHaveText('needle');
  await panel.getByRole('button', { name: 'Replace', exact: true }).click();
  await panel.getByRole('textbox', { name: 'Replacement text' }).fill('updated');
  await panel.getByRole('button', { name: 'Replace all', exact: true }).click();
  await expect(panel.getByText('6 replacements', { exact: true })).toBeVisible();
  await input.fill('updated');
  await panel.getByRole('button', { name: 'Search tree' }).click();
  await expect(page.getByRole('treeitem', { name: /updated group/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /updated request/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Extract: updated/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Assert: contains = updated/ })).toBeVisible();
  await expect(page.getByRole('tree').getByText(/needle/)).toHaveCount(0);
  await page.screenshot({ path: 'output/playwright/search-scope-updated-labels.png' });
});
