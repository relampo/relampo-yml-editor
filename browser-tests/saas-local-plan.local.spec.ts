import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('a plan requires a real directory, creates its structure and saves scripts without overwriting external edits', async ({
  page,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  // Exercise native directory/file handles and IndexedDB. Only the OS picker is
  // substituted with a disposable browser-owned directory; no personal folder is touched.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => {
        const root = await navigator.storage.getDirectory();
        return root.getDirectoryHandle('local-plans', { create: true });
      },
    });
  });
  await page.goto(base.origin);
  await page.evaluate(() => {
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', 'local-plan@example.invalid');
    localStorage.setItem('relampo-onboarding-local-plan@example.invalid', 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'light');
  });
  await page.goto(`${base.origin}/projects`);
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Test Plan name').fill('Checkout Local');
  await dialog.getByLabel('Description').fill('Local filesystem integration');
  await expect(dialog.getByRole('button', { name: 'Create Test Plan', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Select folder', exact: true }).click();
  await expect(dialog.locator('[data-plan-location]')).toHaveText('local-plans/checkout-local/');
  await page.screenshot({ path: '/tmp/relampo-create-local-plan.png' });
  await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const disk = async (file?: string) =>
    page.evaluate(async file => {
      const parent = await (await navigator.storage.getDirectory()).getDirectoryHandle('local-plans');
      const plan = await parent.getDirectoryHandle('checkout-local');
      if (file) {
        const dir = file === 'test-plan.yaml' ? plan : await plan.getDirectoryHandle('Scripts');
        return (await (await dir.getFileHandle(file)).getFile()).text();
      }
      const names: string[] = [];
      for await (const [name] of (plan as any).entries()) names.push(name);
      return names.sort().join(',');
    }, file);
  expect(await disk()).toBe('Data,Scripts,Utilities,test-plan.yaml');
  expect(await disk('test-plan.yaml')).toContain('name: Checkout Local');
  // The same location cannot silently replace an existing plan.
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  await dialog.getByLabel('Test Plan name').fill('Checkout Local');
  await dialog.getByLabel('Description').fill('A collision');
  await dialog.getByRole('button', { name: 'Select folder', exact: true }).click();
  await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('already exists');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  const row = page
    .locator('div')
    .filter({ has: page.getByText('Checkout Local', { exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Edit', exact: true }) })
    .last();
  await row.getByRole('button', { name: 'Open Checkout Local in RelampoLab' }).click();
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  const yaml = `test: {name: Local script}\nscenarios:\n- name: Checkout\n  load: {type: constant, users: 1, iterations: 1}\n  steps:\n  - request:\n      name: Get cart\n      method: GET\n      url: https://app.test/cart\n      response: {status: 200, body: sample}\n`;
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
  await (await chooser).setFiles({ name: 'checkout.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml) });
  await expect(editor.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option:checked')).toHaveText(
    'checkout.yaml',
  );
  await expect.poll(() => disk('checkout.yaml')).toContain('Local script');
  // Duplicate filenames fail before the new script is registered in the selector.
  const collision = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
  await (
    await collision
  ).setFiles({
    name: 'checkout.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(yaml.replace('Local script', 'Duplicate script')),
  });
  await expect(editor.getByRole('alert')).toContainText('already uses this filename');
  await expect(editor.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option')).toHaveCount(1);

  await page.getByRole('button', { name: 'Save YAML options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Save without responses', exact: true }).click();
  await expect.poll(() => disk('checkout.yaml')).not.toContain('response:');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save Script', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New script', exact: true }).click();
  await expect(editor.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await expect.poll(() => disk('script-2.yaml')).toContain('test:');
  await page
    .getByRole('dialog', { name: 'Script updated', exact: true })
    .getByRole('button', { name: 'Done', exact: true })
    .click();
  await editor.getByRole('combobox', { name: 'Plan script', exact: true }).selectOption('default');
  await expect(editor.getByText('Local script', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle('local-plans');
    const plan = await parent.getDirectoryHandle('checkout-local');
    const scripts = await plan.getDirectoryHandle('Scripts');
    const file = await scripts.getFileHandle('checkout.yaml');
    const stream = await file.createWritable();
    await stream.write('external edit');
    await stream.close();
  });
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('changed outside');
  await page
    .getByRole('dialog', { name: 'Update script', exact: true })
    .getByRole('button', { name: 'Done', exact: true })
    .click();
  expect(await disk('checkout.yaml')).toBe('external edit');
  // Settings remain reachable even when the current file cannot be saved.
  await page.getByRole('button', { name: 'Plan settings', exact: true }).click();
  await expect(dialog.locator('[data-plan-location]')).toHaveText('local-plans/checkout-local/');
  await page.evaluate(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => {
        const root = await navigator.storage.getDirectory();
        const parent = await root.getDirectoryHandle('local-plans');
        return parent.getDirectoryHandle('checkout-local');
      },
    });
  });
  await dialog.getByRole('button', { name: 'Reconnect folder', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Folder reconnected.');
  await dialog.getByLabel('Test Plan name').fill('Checkout Renamed');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await disk('test-plan.yaml')).toContain('name: Checkout Renamed');
  expect(await disk('checkout.yaml')).toBe('external edit');
});

test('local directory handles stay scoped to their account and script filenames cannot escape Scripts', async ({
  page,
}) => {
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  await page.goto(base.origin);
  const result = await page.evaluate(async () => {
    const moduleURL = '/src/utils/localPlanStorage.ts';
    const storage = await import(moduleURL);
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle('guard-plans', { create: true });
    localStorage.setItem('relampo-current-user', 'guard-a@example.invalid');
    await storage.createLocalPlan(parent, { id: 'tp-guard', name: 'Safe Plan', scope: 'Storage guard' });
    const rejected: string[] = [];
    for (const name of ['../escape.yaml', 'nested/escape.yaml', 'file.txt', '.hidden.yaml']) {
      try {
        await storage.saveLocalPlanScript('tp-guard', 'default', name, 'test: {}');
      } catch {
        rejected.push(name);
      }
    }
    localStorage.setItem('relampo-current-user', 'guard-b@example.invalid');
    let otherAccount = '';
    try {
      await storage.saveLocalPlanScript('tp-guard', 'default', 'script.yaml', 'test: {}');
    } catch (error) {
      otherAccount = (error as Error).message;
    }
    const scripts = await (await parent.getDirectoryHandle('safe-plan')).getDirectoryHandle('Scripts');
    const files: string[] = [];
    for await (const [name] of (scripts as any).entries()) files.push(name);
    return { rejected, otherAccount, files };
  });
  expect(result.rejected).toHaveLength(4);
  expect(result.otherAccount).toContain('local folder is unavailable');
  expect(result.files).toEqual([]);
});
