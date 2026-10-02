import { expect, test } from '@playwright/test';

// Start a real Studio server with the built editor and the RLP-742 two-request
// scenario in fixtures/spark-logs.yaml, then provide its session URL. This test never mocks engine events.
const studioURL = process.env.RELAMPO_STUDIO_URL;
test('real Studio Spark logs stay inside the owning request Logs tab (RLP-742)', async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(!studioURL, 'Set RELAMPO_STUDIO_URL for the real Studio integration test.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(studioURL!);
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Requests: 2. Filter execution timeline.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /SPARK/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'logs', exact: true }).click();
  await expect(page.getByText(/Spark before:.*before second plain text/)).toBeVisible();
  await expect(page.getByText(/Spark after:.*after second status 200/)).toBeVisible();
  await expect(page.getByText(/first plain text/)).toHaveCount(0);
  await page.getByRole('button', { name: /GET.*\/first/ }).click();
  await expect(page.getByText(/Spark before:.*before first plain text/)).toBeVisible();
  await expect(page.getByText(/Spark after:.*after first status 200/)).toBeVisible();
  await expect(page.getByText(/second plain text/)).toHaveCount(0);
  await expect(page.locator('p').filter({ hasText: /Spark before:.*before first plain text/ })).toHaveCount(1);
  // A fresh two-VU run resets prior logs and keeps the timeline request-only.
  await page.getByRole('button', { name: '2 VUs', exact: true }).click();
  await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Requests: 4. Filter execution timeline.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Debug', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'logs', exact: true }).click();
  await expect(page.getByText(/Spark after:.*after second status 200/)).toHaveCount(1);
  await expect(page.getByRole('button', { name: /SPARK/ })).toHaveCount(0);
  await page.screenshot({ path: process.env.RELAMPO_E2E_SCREENSHOT || 'output/playwright/spark-logs.png', fullPage: true });
  expect(errors).toEqual([]);
});
