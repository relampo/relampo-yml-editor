import { expect, test, type BrowserContext, type Page } from '@playwright/test';
const original = `test: {name: Original script}
scenarios:
- name: Flow
  steps:
  - request:
      name: Login
      method: POST
      url: https://app.test/login
      response: {status: 200, body: '{"token":"captured-session-value-123456"}'}
  - request: {name: Events, method: GET, url: 'https://app.test/events', headers: {Authorization: 'Bearer captured-session-value-123456'}}
`;
const live = original.replace('Original script', 'Current working script');
const applied = live
  .replace(
    '      response:',
    "      extractors: [{var: session_token, type: jsonpath, from: body, expr: '$.token'}]\n      response:",
  )
  .replace("Authorization: 'Bearer captured-session-value-123456'", "Authorization: 'Bearer {{session_token}}'");
const source = {
  StepIndex: 0,
  RequestID: 1,
  Method: 'POST',
  URL: 'https://app.test/login',
  Location: 'response.body.json',
  Path: '$.token',
};
const candidate = {
  id: '1',
  variable: 'session_token',
  type: 'auth_token',
  kind: 'auto',
  applicable: true,
  source,
  targets: [
    {
      StepIndex: 1,
      RequestID: 2,
      Method: 'GET',
      URL: 'https://app.test/events',
      Location: 'request.headers',
      Path: 'Authorization',
    },
  ],
};
async function setup(context: BrowserContext) {
  let lastAnalysis = '',
    lastApply: any;
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: { correlate: true },
        initialScript: {
          name: 'original.yaml',
          yaml: route.request().frame().page().url().includes('correlateSaved=1') ? applied : original,
        },
      },
    }),
  );
  await context.route('**/api/correlate/options', route =>
    route.fulfill({ json: { directory: '/private/tmp/relampo-correlate' } }),
  );
  await context.route('**/api/correlate/analyze', route => {
    lastAnalysis = route.request().postDataJSON().yaml;
    return route.fulfill({
      json: {
        digest: 'current-digest',
        requests: 2,
        responses: 1,
        candidates: [
          candidate,
          { ...candidate, id: '2', variable: 'signature', type: 'signature', kind: 'manual', applicable: false },
        ],
      },
    });
  });
  await context.route('**/api/correlate/apply', route => {
    lastApply = route.request().postDataJSON();
    return route.fulfill({ json: { yaml: applied } });
  });
  await context.route('**/api/correlate/save', route =>
    route.fulfill({ json: { savedPath: route.request().postDataJSON().output, name: 'working.correlated.yaml' } }),
  );
  await context.route('**/api/correlate/open-saved', route =>
    route.fulfill({ json: { editorUrl: 'http://127.0.0.1:4173/?correlateSaved=1' } }),
  );
  return { analyzed: () => lastAnalysis, applied: () => lastApply };
}
async function openCorrelate(page: Page) {
  const pending = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Correlate', exact: true }).click();
  const tab = await pending;
  await expect(tab).toHaveURL(/\/correlate/);
  await expect(tab.getByLabel('Select candidate 1')).toBeVisible();
  return tab;
}
test('Correlate analyzes the current script, applies selected rows, saves and updates the source before closing', async ({
  page,
  context,
}) => {
  const state = await setup(context);
  await page.goto('/');
  await expect(page.getByRole('treeitem', { name: /Original script/ })).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'working.yaml', mimeType: 'text/yaml', buffer: Buffer.from(live) });
  await expect(page.getByRole('treeitem', { name: /Current working script/ })).toBeVisible();
  const tab = await openCorrelate(page);
  expect(state.analyzed()).toContain('Current working script');
  expect(state.analyzed()).toContain('captured-session-value-123456');
  await expect(tab.getByRole('button', { name: 'Apply selected', exact: true })).toBeDisabled();
  await expect(tab.getByRole('columnheader', { name: /confidence|explanation/i })).toHaveCount(0);
  await expect(tab.getByLabel('Select candidate 2')).toBeDisabled();
  const controls = await tab.getByRole('region', { name: 'Correlation controls' }).boundingBox();
  expect(controls!.height).toBeLessThan(150);
  const tree = await tab.getByRole('region', { name: 'Correlation script' }).boundingBox();
  const table = await tab.getByRole('region', { name: 'Correlation candidates' }).boundingBox();
  expect(table!.width).toBeGreaterThan(tree!.width);
  expect(tree!.x + tree!.width).toBeLessThanOrEqual(table!.x);
  await tab.screenshot({ path: '/private/tmp/relampo-correlate-screen.png', fullPage: true });
  await tab.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(tab.locator('.monaco-editor')).toBeVisible();
  await tab.getByRole('button', { name: 'Tree', exact: true }).click();
  await tab.getByLabel('Select candidate 1').check();
  await tab.getByRole('button', { name: 'Apply selected', exact: true }).click();
  await expect(tab.getByRole('status')).toContainText('Selected correlations applied');
  expect(state.applied().selectedIds).toEqual(['1']);
  await tab
    .getByRole('treeitem', { name: /Login POST/ })
    .getByRole('button', { name: 'Expand', exact: true })
    .click();
  await expect(tab.getByRole('button', { name: 'Save and return to Studio', exact: true })).toBeEnabled();
  const closed = tab.waitForEvent('close');
  await tab.getByRole('button', { name: 'Save and return to Studio', exact: true }).click();
  await closed;
  await expect(page).toHaveURL(/editor=/);
  await page
    .getByRole('treeitem', { name: /Login POST/ })
    .getByRole('button', { name: 'Expand', exact: true })
    .click();
  await expect(page.getByRole('treeitem', { name: /session_token/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('treeitem', { name: /Current working script/ })).toBeVisible();
  await page
    .getByRole('treeitem', { name: /Login POST/ })
    .getByRole('button', { name: 'Expand', exact: true })
    .click();
  await expect(page.getByRole('treeitem', { name: /session_token/ })).toBeVisible();
});
test('Clear resets the workbench and importing another script leaves the source alone', async ({ page, context }) => {
  await setup(context);
  await page.goto('/');
  const tab = await openCorrelate(page);
  await tab.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  await expect(tab.getByRole('treeitem')).toHaveCount(0);
  await expect(tab.getByRole('button', { name: 'Apply selected', exact: true })).toBeDisabled();
  await tab
    .locator('input[type="file"]')
    .setInputFiles({ name: 'other.yaml', mimeType: 'text/yaml', buffer: Buffer.from(live) });
  await expect(tab.getByLabel('Select candidate 1')).toBeVisible();
  await expect(tab.getByRole('button', { name: 'Save and open in Studio', exact: true })).toBeDisabled();
  await tab.getByLabel('Select candidate 1').check();
  await tab.getByRole('button', { name: 'Apply selected', exact: true }).click();
  const opened = tab.waitForEvent('popup'),
    closed = tab.waitForEvent('close');
  await tab.getByRole('button', { name: 'Save and open in Studio', exact: true }).click();
  const editor = await opened;
  await closed;
  await expect(editor.getByRole('treeitem', { name: /Current working script/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Original script/ })).toBeVisible();
  await editor.close();
});
test('a changed source is preserved and the saved result remains available', async ({ page, context }) => {
  await setup(context);
  await page.goto('/');
  const tab = await openCorrelate(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'changed.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(original.replace('Original script', 'Changed after analysis')),
  });
  await expect(page.getByRole('treeitem', { name: /Changed after analysis/ })).toBeVisible();
  await tab.getByLabel('Select candidate 1').check();
  await tab.getByRole('button', { name: 'Apply selected', exact: true }).click();
  await tab.getByRole('button', { name: 'Save and return to Studio', exact: true }).click();
  await expect(tab.getByRole('alert')).toContainText('The source script changed');
  await expect(tab.getByRole('button', { name: 'Open result in new Studio', exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Changed after analysis/ })).toBeVisible();
  await tab.close();
});
