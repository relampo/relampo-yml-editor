import { expect, test } from '@playwright/test';
const studioURL = process.env.RELAMPO_STUDIO_URL;
test('real declared variables and functions remain distinct (RLP-758, RLP-760)', async ({ page }) => {
  test.skip(!studioURL, 'Start real Studio with fixtures/declared-builtin.yaml and the RLP-760 backend.');
  await page.goto(studioURL!);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Requests: 2. Filter execution timeline.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  for (const path of ['unused', '37']) {
    await page.getByRole('button', { name: new RegExp(`GET.*\\/${path}`) }).click();
    await page.getByRole('button', { name: 'variables', exact: true }).click();
    await expect(page.getByText(new RegExp(`product \\((VAR|REQ)\\)`))).toBeVisible();
    await expect(page.getByText('37', { exact: true })).toBeVisible();
    await expect(page.getByText('separate-test-token', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Built-ins', exact: true }).click();
    const table = page.getByLabel('Built-in invocations');
    await expect(table.getByText('{{_randomInt(37,37)}}', { exact: true })).toBeVisible();
    await expect(table.getByText('Variables.product', { exact: true })).toBeVisible();
    await expect(table.getByText('37', { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: 'output/playwright/rlp758-760.png', fullPage: true });
});
