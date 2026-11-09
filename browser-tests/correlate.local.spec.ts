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
    "      extractors: [{var: session_token, type: jsonpath, from: body, expression: '$.token'}]\n      response:",
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
  value: 'captured-session-value-123456',
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
  let analysisCalls = 0;
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
    analysisCalls++;
    lastAnalysis = route.request().postDataJSON().yaml;
    if (lastAnalysis.includes('extractors:'))
      return route.fulfill({ json: { digest: 'correlated-digest', requests: 2, responses: 1, candidates: [] } });
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
    return route.fulfill({
      json: {
        yaml: applied,
        applied: [
          {
            variable: 'session_token',
            placeholder: '{{session_token}}',
            type: 'jsonpath',
            from: 'body',
            pattern: '',
            expression: '$.token',
            header: '',
            configuration: 'type: jsonpath\nfrom: body\nvar: session_token\nexpression: $.token',
            source,
            targets: candidate.targets,
          },
        ],
      },
    });
  });
  await context.route('**/api/correlate/save', route =>
    route.fulfill({ json: { savedPath: route.request().postDataJSON().output, name: 'working.correlated.yaml' } }),
  );
  await context.route('**/api/correlate/open-saved', route =>
    route.fulfill({ json: { editorUrl: 'http://127.0.0.1:4173/?correlateSaved=1' } }),
  );
  return { count: () => analysisCalls, analyzed: () => lastAnalysis, applied: () => lastApply };
}
async function openCorrelate(page: Page) {
  const pending = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Correlate', exact: true }).click();
  const tab = await pending;
  await expect(tab).toHaveURL(/\/correlate/);
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  await tab.getByRole('button', { name: 'Analyze', exact: true }).click();
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
  await expect(tab.getByRole('button', { name: 'Correlate', exact: true })).toBeDisabled();
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
  await tab.getByRole('button', { name: 'Correlate', exact: true }).click();
  await expect(tab.getByRole('status')).toContainText('Selected correlations applied');
  expect(state.applied().selectedIds).toEqual(['1']);
  await expect(tab.getByRole('tab', { name: /Correlated/ })).toHaveAttribute('aria-selected', 'true');
  await expect(tab.getByRole('region', { name: 'Applied correlations' })).toContainText('$.token');
  await tab.getByText('View YAML configuration', { exact: true }).click();
  await expect(tab.getByRole('region', { name: 'Applied correlations' })).toContainText('expression: $.token');
  await tab.getByRole('tab', { name: /Candidates/ }).click();
  await expect(tab.getByRole('columnheader', { name: 'Value', exact: true })).toBeVisible();
  await tab
    .getByRole('treeitem', { name: /Login POST/ })
    .getByRole('button', { name: 'Expand', exact: true })
    .click();
  await expect(tab.getByRole('button', { name: 'Save and return to Studio', exact: true })).toBeEnabled();
  await tab.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(tab.getByRole('status')).toContainText('Analysis complete');
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  await expect(tab.getByRole('tab', { name: /Correlated/ })).toBeVisible();
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
  await expect(tab.getByRole('button', { name: 'Correlate', exact: true })).toBeDisabled();
  await tab
    .locator('input[type="file"]')
    .setInputFiles({ name: 'other.yaml', mimeType: 'text/yaml', buffer: Buffer.from(live) });
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  await tab.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(tab.getByLabel('Select candidate 1')).toBeVisible();
  await expect(tab.getByRole('button', { name: 'Save and open in Studio', exact: true })).toBeDisabled();
  await tab.getByLabel('Select candidate 1').check();
  await tab.getByRole('button', { name: 'Correlate', exact: true }).click();
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
  await tab.getByRole('button', { name: 'Correlate', exact: true }).click();
  await tab.getByRole('button', { name: 'Save and return to Studio', exact: true }).click();
  await expect(tab.getByRole('alert')).toContainText('The source script changed');
  await expect(tab.getByRole('button', { name: 'Open result in new Studio', exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Changed after analysis/ })).toBeVisible();
  await tab.close();
});
test('Value shows the captured value and later uses scroll after five visible entries', async ({ page, context }) => {
  await setup(context);
  const targets = Array.from({ length: 8 }, (_, i) => ({
    StepIndex: i + 1,
    RequestID: i + 2,
    Method: 'GET',
    URL: 'https://app.test/use/' + i,
    Location: 'request.headers',
    Path: 'Authorization',
  }));
  await context.route('**/api/correlate/analyze', route =>
    route.fulfill({
      json: { digest: 'current-digest', requests: 9, responses: 1, candidates: [{ ...candidate, targets }] },
    }),
  );
  await page.goto('/');
  const tab = await openCorrelate(page);
  await expect(tab.getByRole('columnheader', { name: 'Value', exact: true })).toBeVisible();
  await expect(tab.getByText('captured-session-value-123456', { exact: true })).toBeVisible();
  const uses = tab.getByRole('region', { name: 'Used in candidate 1' });
  await expect(uses).toHaveJSProperty('clientHeight', 200);
  expect(await uses.evaluate(element => element.scrollHeight)).toBe(320);
  await expect(uses.locator(':scope > div').last()).not.toBeInViewport();
  await uses.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(uses.locator(':scope > div').last()).toBeInViewport();
  await tab.screenshot({ path: '/private/tmp/relampo-correlate-value-scroll.png', fullPage: true });
  await tab.close();
});

test('loading from Studio or a file waits for Analyze and the right panel is wider', async ({ page, context }) => {
  const state = await setup(context);
  await page.goto('/');
  const pending = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Correlate', exact: true }).click();
  const tab = await pending;
  await expect(tab.getByText('original.yaml', { exact: true })).toBeVisible();
  await expect(tab.getByRole('button', { name: 'Analyze', exact: true })).toBeEnabled();
  expect(state.count()).toBe(0);
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  await tab.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(tab.getByLabel('Select candidate 1')).toBeVisible();
  expect(state.count()).toBe(1);
  await tab
    .locator('input[type="file"]')
    .setInputFiles({ name: 'second.yaml', mimeType: 'text/yaml', buffer: Buffer.from(live) });
  await expect(tab.getByText('second.yaml', { exact: true })).toBeVisible();
  expect(state.count()).toBe(1);
  await expect(tab.getByLabel('Select candidate 1')).toHaveCount(0);
  const left = await tab.getByRole('region', { name: 'Correlation script' }).boundingBox();
  const right = await tab.getByRole('region', { name: 'Correlation candidates' }).boundingBox();
  expect(right!.width).toBeGreaterThan(left!.width * 2);
  await tab.close();
});
