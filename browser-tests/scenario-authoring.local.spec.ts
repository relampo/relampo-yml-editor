import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

const sourceYaml = `test: {name: Scenario authoring, future_test: keep}
variables: {user: global}
data_source: {type: csv, file: global.csv, variable_names: user, mode: shared}
scenarios:
- name: Source
  data_source: {type: csv, file: own.csv, variable_names: user, mode: per_vu}
  load: {type: constant, users: 2, iterations: 3}
  cookies: {persist_across_iterations: true}
  steps:
  - request:
      name: Health
      method: GET
      url: /health
      enabled: true
      response: {status: 200, body: recorded}
`;

async function downloadYaml(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await pending;
  return readFile(await download.path(), 'utf8');
}

async function draftYaml(page: Page) {
  return page.evaluate(() => new Promise<string | null>((resolve, reject) => {
    const request = indexedDB.open('relampo-yaml-editor', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const get = db.transaction('drafts', 'readonly').objectStore('drafts').get('active');
      get.onerror = () => reject(get.error);
      get.onsuccess = () => { db.close(); resolve(get.result?.yaml ?? null); };
    };
  }));
}

for (const studio of [false, true]) {
  for (const mode of ['parallel', 'sequential']) {
    test(`${studio ? 'Studio' : 'standalone'} authors and persists ${mode} scenarios`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/studio/info', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          studio,
          initialScript: studio ? { name: 'scenarios.yaml', yaml: sourceYaml } : null,
          capabilities: { debug: studio, loadRun: studio, multiScenarioDebug: studio, multiScenarioRun: studio },
        }),
      }));
      const probe = page.waitForResponse('**/api/studio/info');
      await page.goto('/');
      await probe;
      if (!studio) {
        await page.getByRole('button', { name: 'Add a performance test plan' }).click();
        await expect(page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Test Plan$/ })).toBeVisible();
        await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Scenarios$/ }).click({ button: 'right' });
        await page.getByRole('button', { name: 'Scenario New load scenario' }).click();
        await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Test Plan$/ }).click();
        await page.getByLabel('Scenario scheduling').selectOption(mode);
        const freshPlan = yaml.load(await downloadYaml(page)) as any;
        expect(freshPlan.test.scenario_mode).toBe(mode);
        expect(freshPlan.scenarios.map((item: any) => item.name)).toEqual(['New Scenario', 'New Scenario 2']);
        await page.locator('input[type="file"]').setInputFiles({
          name: 'scenarios.yaml', mimeType: 'text/yaml', buffer: Buffer.from(sourceYaml),
        });
      }
      const scenarios = page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Scenarios$/ });
      const source = page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Source$/ });
      await expect(source).toBeVisible();
      await scenarios.click({ button: 'right' });
      await page.getByRole('button', { name: 'Scenario New load scenario' }).click();
      await expect(page.getByLabel('Name', { exact: true })).toHaveValue('New Scenario');
      await expect(page.getByText('Choose sequential or parallel scenario scheduling for multiple scenarios.', { exact: true }).first()).toBeVisible();
      for (let copy = 0; copy < 2; copy += 1) {
        await source.click({ button: 'right' });
        await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
      }
      await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Source (Copy) 2');
      await page.getByLabel('Name', { exact: true }).fill('Renamed');
      // Export immediately after the debounced name edit to verify the saved revision.
      expect((yaml.load(await downloadYaml(page)) as any).scenarios.map((item: any) => item.name)).toEqual([
        'Source', 'Renamed', 'Source (Copy)', 'New Scenario',
      ]);

      await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Scenario authoring$/ }).click();
      await page.getByLabel('Scenario scheduling').selectOption(mode);
      await expect(page.getByText('Choose sequential or parallel scenario scheduling for multiple scenarios.', { exact: true })).toHaveCount(0);
      await source.click({ button: 'right' });
      await page.getByRole('button', { name: 'Copy', exact: true }).click();
      await scenarios.click({ button: 'right' });
      await page.getByRole('button', { name: 'Paste', exact: true }).click();
      await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Source (Copy) 2');
      await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?New Scenario$/ }).click({ button: 'right' });
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?New Scenario$/ })).toHaveCount(0);

      const exported = await downloadYaml(page);
      const parsed = yaml.load(exported) as any;
      expect(parsed.test).toMatchObject({ scenario_mode: mode, future_test: 'keep' });
      expect(parsed.variables).toEqual({ user: 'global' });
      expect(parsed.data_source.file).toBe('global.csv');
      expect(parsed.scenarios.map((item: any) => item.name)).toEqual(['Source', 'Renamed', 'Source (Copy)', 'Source (Copy) 2']);
      const original = (yaml.load(sourceYaml) as any).scenarios[0];
      for (const scenario of parsed.scenarios) expect({ ...scenario, name: 'Source' }).toEqual(original);
      await page.keyboard.press('Control+s');
      await expect.poll(() => draftYaml(page)).toBe(exported);
      if (!studio) {
        await page.reload();
        await expect(page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Renamed$/ })).toBeVisible();
        expect(yaml.load(await downloadYaml(page))).toEqual(parsed);
      }
      await page.locator('input[type="file"]').setInputFiles({
        name: 'round-trip.yaml', mimeType: 'text/yaml', buffer: Buffer.from(exported),
      });
      await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Scenario authoring$/ }).click();
      await expect(page.getByLabel('Scenario scheduling')).toHaveValue(mode);
      expect(yaml.load(await downloadYaml(page))).toEqual(parsed);
      expect(errors).toEqual([]);
    });
  }
}
