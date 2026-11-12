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
  await expect(popup.locator('tbody tr')).toHaveCount(4);
  await expect(popup.getByRole('columnheader', { name: 'Tu n.º', exact: true })).toBeVisible();
  await expect(popup.locator('tbody tr').first().getByRole('cell').first()).toHaveText('[1]');
  await expect(popup.locator('tbody tr').nth(1).getByRole('cell').first()).toHaveText('[1]');
  await expect(popup.locator('tbody tr').nth(1)).toContainText('Se agregó un extractor');
  await expect(popup.locator('tbody tr').nth(1)).toContainText('Variable');
  await expect(popup.getByText('Ana Torres', { exact: true })).toHaveCount(4);

  await expect(popup.getByRole('button', { name: /Aceptar cambio/ })).toHaveCount(4);
  await expect(popup.locator('tbody tr').first().locator('[data-script-component=grpc]')).toBeVisible();
  const watch = popup.locator('tbody tr').filter({ has: page.getByText('Watch Order', { exact: true }) });
  await expect(popup.getByRole('button', { name: 'Guardar script', exact: true })).toBeDisabled();
  await watch.getByRole('button', { name: /Descartar cambio/ }).click();
  for (const index of [0, 1, 3])
    await popup
      .locator('tbody tr')
      .nth(index)
      .getByRole('button', { name: /Aceptar cambio/ })
      .click();
  await expect(editor.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Order lookup · QA review/ })).toHaveCount(0);
  await popup.getByRole('tab', { name: 'Historial', exact: true }).click();
  const versions = popup.getByLabel('Versiones guardadas', { exact: true });
  await expect(versions.getByRole('button')).toHaveCount(1);
  await expect(popup.getByLabel('Contenido de la versión')).toHaveCount(0);
  await page.screenshot({ path: '/private/tmp/relampo-history-list.png' });
  await expect(versions).toContainText('Primera versión guardada');
  await expect(editor.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  await popup.getByRole('tab', { name: 'Cambios', exact: true }).click();
  await expect(watch.getByRole('button', { name: /Descartar cambio/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: '/private/tmp/relampo-save-simulation-popup.png' });
  await popup.getByRole('button', { name: 'Guardar script', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Simulación aplicada', exact: true })).toBeVisible();
  await popup.getByRole('tab', { name: 'Historial', exact: true }).click();
  await expect(versions.getByRole('button')).toHaveCount(2);
  await expect(versions.getByRole('columnheader', { name: 'Qué cambió' })).toBeVisible();
  await versions.getByRole('button').last().click();
  await expect(popup).toHaveCount(0);
  const historical = page.frameLocator('iframe[data-script-history-preview]');
  await expect(historical.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  await expect(historical.getByRole('treeitem', { name: /Order lookup · QA review/ })).toHaveCount(0);
  await expect(page.locator('iframe[data-plan-editor]')).toBeHidden();
  await historical.getByRole('treeitem', { name: /Get Order/ }).click();
  await expect(historical.locator('input').first()).toHaveAttribute('readonly', '');
  await page.screenshot({ path: '/private/tmp/relampo-script-history-native.png' });
  await page.getByRole('button', { name: 'Volver a mi borrador' }).click();
  await expect(page.locator('iframe[data-script-history-preview]')).toHaveCount(0);
  await expect(editor.getByRole('treeitem', { name: /Order lookup · QA review/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Order status · QA/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Watch Order/ })).toHaveCount(0);
  await expect(page.getByRole('note')).toHaveCount(0);
  const dimensions = await page.locator('iframe[data-plan-editor]').evaluate(frame => ({
    width: frame.getBoundingClientRect().width,
    parent: frame.parentElement!.getBoundingClientRect().width,
  }));
  expect(Math.abs(dimensions.parent - dimensions.width)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Guardar script', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Script actualizado', exact: true })).toBeVisible();
  await popup.getByRole('tab', { name: 'Historial', exact: true }).click();
  await versions.getByRole('button').last().click();
  await expect(historical.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  const filename = page.getByRole('textbox', { name: 'Nombre del nuevo script' });
  await filename.fill('orders.yaml');
  await page.getByRole('button', { name: 'Guardar como nuevo script', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'filename already exists' })).toBeVisible();
  await expect(page.locator('iframe[data-script-history-preview]')).toBeVisible();
  await filename.fill('orders-history-copy.yaml');
  await page.getByRole('button', { name: 'Guardar como nuevo script', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Script actualizado', exact: true })).toBeVisible();
  await popup.getByRole('tab', { name: 'Historial', exact: true }).click();
  await expect(versions).toContainText('Nuevo script a partir');
  await popup.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(editor.getByRole('treeitem', { name: /Get Order/ })).toBeVisible();
  const selector = editor.getByRole('combobox', { name: 'Script del plan', exact: true });
  await expect(selector.locator('option:checked')).toHaveText('orders-history-copy.yaml');
  await expect(selector.locator('option')).toHaveCount(2);
  await selector.selectOption({ label: 'orders.yaml' });
  await expect(editor.getByRole('treeitem', { name: /Order lookup · QA review/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Order status · QA/ })).toBeVisible();
  expect(providerRequests).toBe(0);
});

test('cart simulation previews domain and full-request deletion using current local numbers', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const origin = new URL(saasURL!).origin;
  let providerRequests = 0;
  await context.route(/https:\/\/(api.github.com|gitlab.com)\//, route => {
    providerRequests++;
    return route.abort();
  });
  await context.route('**/api/studio/info', route => route.fulfill({ json: { studio: false, capabilities: {} } }));
  await page.goto(origin);
  await page.evaluate(() => {
    const user = 'cart-simulation@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'es');
    localStorage.setItem('relampo-theme', 'light');
  });
  await page.goto(origin + '/relampo-lab?plan=tp-01');
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await editor
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'cart.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(
        'test: {name: Cart}\nscenarios:\n- name: Checkout\n  steps:\n  - grpc: {name: GetOrder, target: "localhost:50051", method: /orders.Get}\n  - request: {name: Health, method: GET, url: https://example.test/health}\n  - grpc: {name: CreateCart, target: "localhost:50051", method: /cart.Create, extractors: [{type: jsonpath, var: cart_id, expression: $.id}]}\n',
      ),
    });
  await expect(editor.getByRole('treeitem', { name: /CreateCart/ })).toBeVisible();
  await page.goto(origin + '/relampo-lab?plan=tp-01&simulateShared=1&simulationCase=cart');
  const popup = page.getByRole('dialog');
  const rows = popup.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1).getByRole('cell').first()).toHaveText('[1]');
  await expect(rows.nth(2).getByRole('cell').first()).toHaveText('[3]');
  await expect(rows.nth(2)).toContainText('Se eliminó la petición completa');
  await expect(rows.nth(2)).toContainText('Petición eliminada');
  await expect(rows.nth(1)).toContainText('Dominio: localhost');
  await expect(popup).not.toContainText('steps.');
  await expect(popup).not.toContainText('target');
  await expect(popup.getByRole('button', { name: 'Guardar script', exact: true })).toBeDisabled();
  await rows
    .first()
    .getByRole('button', { name: /Descartar cambio/ })
    .click();
  await expect(rows.first().getByRole('button', { name: /Descartar cambio/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(rows.first().getByRole('button', { name: /Aceptar cambio/ })).toHaveAttribute('aria-pressed', 'false');
  await rows
    .nth(1)
    .getByRole('button', { name: /Aceptar cambio/ })
    .click();
  await rows
    .nth(2)
    .getByRole('button', { name: /Aceptar cambio/ })
    .click();
  await expect(editor.getByRole('treeitem', { name: /CreateCart/ })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Guardar script', exact: true })).toBeEnabled();
  await page.screenshot({ path: '/private/tmp/relampo-cart-review-compact.png' });
  await popup.getByRole('button', { name: 'Guardar script', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Simulación aplicada', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(editor.getByRole('treeitem', { name: /CreateCart/ })).toHaveCount(0);
  await expect(editor.getByRole('treeitem', { name: /Cart status · QA/ })).toHaveCount(0);
  await expect(editor.getByRole('treeitem', { name: /GetOrder/ })).toBeVisible();
  await expect(editor.getByRole('treeitem', { name: /Health/ })).toBeVisible();
  await expect(page.getByRole('note')).toHaveCount(0);
  expect(providerRequests).toBe(0);
});
