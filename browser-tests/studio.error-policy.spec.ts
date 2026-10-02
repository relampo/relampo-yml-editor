import { expect, test } from '@playwright/test';
const studioURL = process.env.RELAMPO_STUDIO_URL;
test('real HTTP 400, 500 and timeout policies remain on their request (RLP-756)', async ({ page }) => {
  test.skip(!studioURL, 'Start real Studio with fixtures/error-policy.yaml and set RELAMPO_STUDIO_URL.');
  await page.goto(studioURL!);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Requests: 3. Filter execution timeline.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  for (const [path, label, key] of [['400', 'HTTP 400', 'on_4xx'], ['500', 'HTTP 500', 'on_5xx'], ['timeout', 'Timeout', 'on_timeout']]) {
    await page.getByRole('button', { name: new RegExp(`GET.*\\/${path}`) }).click();
    const card = page.getByLabel('Error policy decision');
    await expect(card.getByText(label, { exact: true })).toBeVisible();
    await expect(card.getByText(`${key} → continue`, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /ERROR_POLICY/ })).toHaveCount(0);
  await page.screenshot({ path: 'output/playwright/rlp756.png', fullPage: true });
});
