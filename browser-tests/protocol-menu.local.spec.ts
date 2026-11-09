import { expect, test } from '@playwright/test';

test('protocol windows return to an interactive Studio and retain the gRPC draft', async ({ page }) => {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        studio: true,
        initialScript: {
          name: 'protocols.yaml',
          yaml: 'test: {name: Protocols}\nscenarios:\n- name: Original\n  steps: [{get: /health}]\n',
        },
        capabilities: { grpcAuthoring: true },
      }),
    }),
  );
  await page.route('**/api/grpc/recordings/current', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ active: false, calls: [] }),
    }),
  );
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Recorder', exact: true });
  await menu.click();
  await expect(page.getByRole('menuitem')).toHaveCount(2);
  await expect(page.getByRole('menuitem', { name: 'HTTP/HTTPS', exact: true })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: 'HTTP/HTTPS', exact: true })).toContainText('Coming soon');
  await expect(page.getByRole('menuitem', { name: 'WebSocket', exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'gRPC', exact: true }).click();
  await page.getByLabel('Server address', { exact: true }).fill('draft.example:443');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveClass(/bg-\[#0a0a0a\]/);
  for (const mode of ['Import contract', 'Record traffic', 'Discover']) {
    const tab = dialog.getByRole('button', { name: mode, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(tab).toHaveClass(/border-yellow-400/);
    await expect(page.getByLabel('Server address', { exact: true })).toHaveValue('draft.example:443');
  }
  await expect(dialog.getByRole('button', { name: 'Discover service', exact: true })).toHaveClass(/bg-yellow-400/);

  await page.getByRole('button', { name: 'Go to Studio', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
  await menu.click();
  await page.getByRole('menuitem', { name: 'gRPC', exact: true }).click();
  await expect(page.getByLabel('Server address', { exact: true })).toHaveValue('draft.example:443');
  await page.getByRole('button', { name: 'Go to Studio', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /Save with responses/ })).toBeVisible();
});
