import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

test('RLP-822 adds and saves Cache Manager without unsupported fields', async ({ page }) => {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: {
          name: 'cache.yaml',
          yaml: 'test: {name: Cache QA}\nscenarios:\n- name: Flow\n  steps: [{get: /health}]\n',
        },
        capabilities: {},
      }),
    }),
  );
  await page.goto('/');
  await page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Flow$/ }).click({ button: 'right' });
  await page.getByRole('button', { name: 'Cache Manager Cache manager', exact: true }).click();
  const cache = page.getByRole('treeitem', { name: /^(?:Collapse |Expand )?Cache Manager$/ });
  await expect(cache).toBeVisible();
  await cache.click();
  await expect(page.getByText(/unrecognized field/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Enabled|Disabled)$/ })).toHaveCount(0);
  await page.locator('#ops-max-elements').fill('250');
  await cache.click({ button: 'right' });
  await expect(page.getByRole('button', { name: /^(Enable|Disable)$/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await pending;
  const saved = load(await readFile((await download.path())!, 'utf8')) as { scenarios: { cache_manager: unknown }[] };
  expect(saved.scenarios[0].cache_manager).toEqual({ clear_each_iteration: true, max_elements: 250 });
});
