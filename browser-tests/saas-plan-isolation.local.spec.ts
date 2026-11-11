import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('test plans keep separate documents across switches, reloads, renaming and accounts', async ({ page }) => {
  const baseURL = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(baseURL.hostname);
  await page.goto(baseURL.origin);
  await page.evaluate(() => {
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', 'plan-test@example.invalid');
    localStorage.setItem('relampo-onboarding-plan-test@example.invalid', 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'dark');
  });
  await page.goto(`${baseURL.origin}/relampo-lab?plan=tp-01`);
  const editor = () => page.frameLocator('iframe[data-plan-editor]');
  const sample = readFileSync('examples/simple-test.yaml', 'utf8');
  const upload = async (name: string) => {
    await expect(editor().getByRole('button', { name: 'Upload YAML' })).toBeEnabled();
    await editor()
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: `${name}.yaml`,
        mimeType: 'text/yaml',
        buffer: Buffer.from(sample.replace('Simple Test', name)),
      });
    await expect(editor().getByText(name, { exact: true })).toBeVisible();
  };
  const selectPlan = async (current: string, next: string) => {
    await page.getByRole('button').filter({ hasText: current }).first().click();
    await page.getByRole('menuitem').filter({ hasText: next }).click();
    await expect(page.getByRole('button').filter({ hasText: next }).first()).toBeVisible();
  };

  await upload('Plan A Draft');
  // Switch immediately, before the normal autosave debounce expires.
  await selectPlan('Checkout Critical Path', 'Search and Catalog Journey');
  await expect(editor().getByRole('button', { name: 'Upload YAML' })).toBeVisible();
  await expect(editor().getByText('Plan A Draft', { exact: true })).toHaveCount(0);
  await upload('Plan B Draft');
  await selectPlan('Search and Catalog Journey', 'Checkout Critical Path');
  await expect(editor().getByText('Plan A Draft', { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor().getByText('Plan A Draft', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Test Plan', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open Checkout Critical Path in RelampoLab', exact: true })
    .locator('..')
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await page.getByPlaceholder('e.g. Checkout Reliability').fill('Renamed Checkout');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Open Renamed Checkout in RelampoLab', exact: true }).click();
  await expect(page).toHaveURL(/plan=tp-01/);
  await expect(editor().getByText('Plan A Draft', { exact: true })).toBeVisible();

  // A failed durable save must keep the current plan and document mounted.
  await editor()
    .locator('body')
    .evaluate(() => {
      indexedDB.open = () => {
        throw new Error('Simulated storage failure');
      };
    });
  await page.getByRole('button').filter({ hasText: 'Renamed Checkout' }).first().click();
  await page.getByRole('menuitem').filter({ hasText: 'Search and Catalog Journey' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'could not be saved' })).toBeVisible();
  await expect(page).toHaveURL(/plan=tp-01/);
  await expect(editor().getByText('Plan A Draft', { exact: true })).toBeVisible();

  // A second prototype account in the same browser must not inherit the first draft.
  await page.evaluate(() => {
    localStorage.setItem('relampo-current-user', 'other-plan-test@example.invalid');
    localStorage.setItem('relampo-onboarding-other-plan-test@example.invalid', 'true');
  });
  await page.reload();
  await expect(editor().getByRole('button', { name: 'Upload YAML' })).toBeVisible();
  await expect(editor().getByText('Plan A Draft', { exact: true })).toHaveCount(0);
});
