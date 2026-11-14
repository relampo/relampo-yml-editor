import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const yaml = (name: string) => `test: {name: '${name}'}
scenarios:
- name: '${name} scenario'
  load: {type: constant, users: 1, iterations: 1}
  steps:
  - request: {name: '${name} request', method: GET, url: 'https://app.test/${name}'}
`;

test('multiple plan scripts persist and all tools use the script selected in Scripting', async ({ page, context }) => {
  test.setTimeout(60000);
  page.setDefaultTimeout(10000);
  const base = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(base.hostname);
  await page.setViewportSize({ width: 1700, height: 1000 });
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: { studio: true, capabilities: { debug: true, loadRun: true, correlate: true, httpRecorder: true } },
    }),
  );
  let debugYaml = '',
    runYaml = '',
    correlateYaml = '';
  await context.route('**/api/debug/runs', route => {
    debugYaml = route.request().postDataJSON().yaml;
    return route.fulfill({ json: { id: 'script-debug' } });
  });
  await context.route('**/api/debug/runs/script-debug/events**', route =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'event: done\ndata: {}\n\n',
    }),
  );
  await context.route('**/api/run', route => {
    runYaml = route.request().postDataJSON().yaml;
    return route.fulfill({ json: { id: 'script-run' } });
  });
  await context.route('**/api/run/script-run/events**', route =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: 'event: done\ndata: {"status":"completed"}\n\n',
    }),
  );
  await context.route('**/api/correlate/analyze', route => {
    correlateYaml = route.request().postDataJSON().yaml;
    return route.fulfill({ json: { digest: 'selected', requests: 1, responses: 0, candidates: [] } });
  });
  await page.goto(base.origin);
  await page.evaluate(() => {
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', 'scripts@example.invalid');
    localStorage.setItem('relampo-onboarding-scripts@example.invalid', 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'dark');
  });
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  const selector = editor.getByRole('combobox', { name: 'Plan script', exact: true });
  const upload = async (name: string) => {
    await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
    await (await chooser).setFiles({ name: `${name}.yaml`, mimeType: 'text/yaml', buffer: Buffer.from(yaml(name)) });
    await expect(editor.getByText(name, { exact: true })).toBeVisible();
    await expect(selector.locator('option:checked')).toHaveText(`${name}.yaml`);
  };
  const saveGroup = page.getByRole('group', { name: 'Save Script', exact: true });
  await expect(saveGroup.getByRole('button')).toHaveCount(2);
  const saveBox = await saveGroup.getByRole('button', { name: 'Save Script', exact: true }).boundingBox();
  const exportBox = await saveGroup.getByRole('button', { name: 'Save YAML options', exact: true }).boundingBox();
  expect(Math.abs(saveBox!.x + saveBox!.width - exportBox!.x)).toBeLessThan(1);
  await upload('Alpha');
  const alpha = await selector.inputValue();
  await upload('Beta');
  const beta = await selector.inputValue();
  expect(beta).not.toBe(alpha);
  await expect(selector.locator('option')).toHaveCount(2);

  // Save immediately after an inspector edit, before its debounced serialization/autosave.
  await editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Beta request' }).last().click();
  await editor.getByLabel('Path', { exact: true }).fill('/edited-beta');
  await selector.selectOption(alpha);
  await expect(editor.getByText('Alpha', { exact: true })).toBeVisible();
  await page.reload();
  await expect(selector).toHaveValue(alpha);
  await expect(selector.locator('option')).toHaveCount(2);

  const tree = await editor.getByRole('button', { name: 'Tree', exact: true }).boundingBox();
  const select = await selector.boundingBox();
  expect(select!.y).toBeGreaterThan(tree!.y);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(selector).toBeDisabled();
  await editor.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect.poll(() => debugYaml).toContain('Alpha');
  expect(debugYaml).not.toContain('Beta');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await editor.getByRole('button', { name: 'Run load test', exact: true }).click();
  await expect.poll(() => runYaml).toContain('Alpha');
  expect(runYaml).not.toContain('Beta');
  await page.getByRole('button', { name: 'Correlation', exact: true }).click();
  await editor.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect.poll(() => correlateYaml).toContain('Alpha');
  await expect(selector).toHaveValue(alpha);
  await expect(selector.locator('option')).toHaveCount(2);
  await selector.selectOption(beta);
  await expect(editor.getByRole('region', { name: 'Correlation script' }).getByText('Beta', { exact: true })).toBeVisible();
  await expect(selector).toHaveValue(beta);
  await editor.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect.poll(() => correlateYaml).toContain('Beta');
  expect(correlateYaml).not.toContain('Alpha');
  await page.screenshot({ path: '/tmp/relampo-correlation-script-selector.png', animations: 'disabled' });


  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'scripting');
  await selector.selectOption(beta);
  await expect(editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Beta' }).first()).toBeVisible();
  await editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Beta request' }).last().click();
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/edited-beta');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await editor.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect.poll(() => debugYaml).toContain('Beta');
  expect(debugYaml).not.toContain('Alpha');

  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'scripting');
  await page.getByRole('button', { name: 'New script', exact: true }).click();
  await expect(selector.locator('option')).toHaveCount(3);
  await expect(selector.locator('option:checked')).toHaveText('script-3.yaml');
  await selector.selectOption(alpha);
  await expect(editor.getByText('Alpha', { exact: true })).toBeVisible();

  // A failed save cannot change selection or lose the current script.
  const frame = page.frames().find(frame => frame.url().includes('/studio-editor/'))!;
  await frame.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    };
  });
  await selector.selectOption(beta);
  await expect(editor.getByRole('alert').first()).toBeVisible();
  await expect(selector).toHaveValue(alpha);
  await expect(editor.getByText('Alpha', { exact: true })).toBeVisible();
  await page.reload();
  await expect(selector).toHaveValue(alpha);

  await page.getByRole('button', { name: 'Project', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Search and Catalog Journey' }).click();
  await expect(selector.locator('option')).toHaveCount(1);
  await expect(editor.getByText('Alpha', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Project', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Checkout Critical Path' }).click();
  await expect(selector.locator('option')).toHaveCount(3);
  await expect(selector).toHaveValue(alpha);
  await expect(editor.getByText('Alpha', { exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/relampo-plan-script-selector.png', animations: 'disabled' });
});

test('existing single-script plans migrate intact and recording locks script selection', async ({ page, context }) => {
  test.setTimeout(60000);
  const base = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(base.hostname);
  let recording = false;
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: { studio: true, capabilities: { httpRecorder: true } },
    }),
  );
  await context.route('**/api/recorder/http/options', route =>
    route.fulfill({
      json: { directory: '/tmp/recordings', port: 8888, firefoxAvailable: false },
    }),
  );
  await context.route('**/api/recorder/http/current', route =>
    route.fulfill({
      json: { active: recording, recording, totalRequests: 0, requests: [] },
    }),
  );
  await page.goto(base.origin);
  await page.evaluate(async legacyYaml => {
    const user = 'legacy-scripts@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem(`relampo-editor-account:${encodeURIComponent(user)}`, 'legacy-user');
    localStorage.setItem('relampo-language', 'en');
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('relampo-yaml-editor', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put({
          id: 'saas-plan:legacy-user:tp-01',
          yaml: legacyYaml,
          fileName: 'existing.yaml',
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => {
          request.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, yaml('Legacy'));
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  const selector = editor.getByRole('combobox', { name: 'Plan script', exact: true });
  await expect(editor.getByText('Legacy', { exact: true })).toBeVisible();
  await expect(selector.locator('option:checked')).toHaveText('existing.yaml');
  await page.getByRole('button', { name: 'New script', exact: true }).click();
  await expect(selector.locator('option')).toHaveCount(2);
  const second = await selector.inputValue();
  await selector.selectOption('default');
  await expect(editor.getByText('Legacy', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(editor.getByRole('group', { name: 'Recording configuration', exact: true })).toBeVisible();
  recording = true;
  await expect(editor.getByText('Recording', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', 'scripting');
  await selector.selectOption(second);
  await expect(
    editor.getByRole('alert').filter({ hasText: 'Stop the recording before switching scripts.' }),
  ).toBeVisible();
  await expect(selector).toHaveValue('default');
  await expect(editor.getByText('Legacy', { exact: true })).toBeVisible();
  recording = false;
  await expect(editor.getByText('Recording', { exact: true })).toHaveCount(0);
  await selector.selectOption(second);
  await expect(selector).toHaveValue(second);
  await expect(editor.getByText('New Test', { exact: true })).toBeVisible();
});
