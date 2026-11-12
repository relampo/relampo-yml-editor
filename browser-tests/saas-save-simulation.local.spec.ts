import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the local SaaS.');
test('the current script previews four simulated QA updates and applies only selected ones without repository access', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  let providerRequests = 0;
  await context.route(/https:\/\/(api.github.com|gitlab.com)\//, route => {
    providerRequests++;
    return route.abort();
  });
  await context.route('**/api/studio/info', route => route.fulfill({ json: { studio: false, capabilities: {} } }));
  const origin = new URL(saasURL!).origin;
  await page.goto(origin);
  await page.evaluate(() => {
    const user = 'simulation-preview@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'es');
    localStorage.setItem('relampo-theme', 'dark');
  });
  await page.goto(origin + '/relampo-lab?plan=tp-01');
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await editor
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'orders.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(
        'test: {name: Orders}\nscenarios:\n- name: Checkout\n  steps:\n  - grpc: {name: Get Order, target: "localhost:50051", method: /orders.Get}\n',
      ),
    });
  await expect(editor.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  await page.goto(origin + '/relampo-lab?plan=tp-01&simulateShared=1');
  const popup = page.getByRole('dialog');
  await expect(popup).toContainText('Simulación');
  await expect(popup.locator('article')).toHaveCount(4);
  await expect(popup.getByRole('radio', { name: /Tomar cambio/ })).toHaveCount(4);
  await expect(popup.locator('article').first().locator('[data-script-component=grpc]')).toBeVisible();
  const watch = popup.locator('article').filter({ has: page.getByText('Watch Order', { exact: true }) });
  await watch.getByRole('radio', { name: /Dejar cambio/ }).check();
  await page.screenshot({ path: '/private/tmp/relampo-save-simulation-popup.png' });
  await popup.getByRole('button', { name: 'Aplicar al borrador', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Simulación aplicada', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(editor.getByRole('treeitem', { name: /Order lookup · QA review/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Order status · QA/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Watch Order/ })).toHaveCount(0);
  expect(providerRequests).toBe(0);
});
