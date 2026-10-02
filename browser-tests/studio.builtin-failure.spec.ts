import { expect, test } from '@playwright/test';
const studioURL = process.env.RELAMPO_STUDIO_URL;
test('real runtime builtin failures belong to Built-ins (RLP-757)', async ({ page }) => {
  test.skip(!studioURL, 'Start real Studio with fixtures/builtin-failure.yaml.');
  await page.goto(studioURL!);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  await expect(page.getByText('Built-in evaluation failed. See Built-ins.')).toBeVisible();
  await page.getByRole('button', { name: 'Built-ins', exact: true }).click();
  const table = page.getByLabel('Built-in invocations');
  await expect(table.getByText('{{_randomInt({{lower}},{{upper}})}}', { exact: true })).toBeVisible();
  await expect(table.getByText('Failed', { exact: true })).toBeVisible();
  await expect(table.getByText(/minimum must/)).toBeVisible();
  await page.screenshot({ path: 'output/playwright/rlp757.png', fullPage: true });
});
