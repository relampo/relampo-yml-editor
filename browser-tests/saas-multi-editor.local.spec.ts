import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the local SaaS.');
const source = `test: {name: Source script}
scenarios:
- name: Source flow
  steps:
  - transaction:
      name: Checkout
      steps:
      - request: {name: Source login, method: POST, url: 'https://app.test/login', body: {username: demo}}
      - grpc: {name: Reserve seats, target: 'fixture.test:443', method: /demo.API/Reserve, message: {eventId: 12}, metadata: {authorization: 'Bearer {{token}}'}}
`;
const target = `test: {name: Target script}
scenarios:
- name: Target flow
  steps:
  - request: {name: Target health, method: GET, url: 'https://other.test/health'}
`;

test('SaaS New editor retains independent selections and copies complete components between tabs', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1900, height: 1050 });
  await context.route('**/api/studio/info', route =>
    route.fulfill({ json: { studio: true, capabilities: { grpcAuthoring: true } } }),
  );
  await page.goto(new URL(saasURL!).origin);
  await page.evaluate(
    async ({ source, target }) => {
      const user = 'multi-editor@example.invalid';
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
      localStorage.setItem(`relampo-editor-account:${encodeURIComponent(user)}`, 'multi-editor');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('relampo-yaml-editor', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        const store = tx.objectStore('drafts');
        const prefix = 'saas-plan:multi-editor:tp-01';
        store.put({ id: prefix, yaml: source, fileName: 'source.yaml', updatedAt: new Date().toISOString() });
        store.put({
          id: `${prefix}:script:target`,
          yaml: target,
          fileName: 'target.yaml',
          updatedAt: new Date().toISOString(),
        });
        store.put({
          id: `${prefix}:scripts`,
          activeScriptId: 'default',
          scripts: [
            { id: 'default', fileName: 'source.yaml' },
            { id: 'target', fileName: 'target.yaml' },
          ],
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { source, target },
  );
  await page.goto(`${new URL(saasURL!).origin}/relampo-lab?plan=tp-01`);
  const first = page.frameLocator('iframe[data-plan-editor]');
  await expect(first.getByRole('treeitem', { name: /Checkout(?: Transaction)?$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New editor', exact: true })).toBeEnabled();
  expect(
    await page
      .getByRole('button', { name: 'New script', exact: true })
      .evaluate(button => button.nextElementSibling?.textContent),
  ).toContain('New editor');
  await expect.poll(() => new URL(page.url()).searchParams.get('script')).toBe('default');
  await first.getByRole('treeitem', { name: /Checkout(?: Transaction)?$/ }).click({ button: 'right' });
  await first.getByRole('button', { name: 'Copy', exact: true }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'New editor', exact: true }).click();
  const second = await popup;
  await second.setViewportSize({ width: 1900, height: 1050 });
  await expect(second).toHaveURL(/editor=/);
  expect(new URL(second.url()).origin).toBe(new URL(saasURL!).origin);
  expect(await second.evaluate(() => window.opener)).toBeNull();
  const other = second.frameLocator('iframe[data-plan-editor]');
  await other.getByRole('combobox', { name: 'Plan script', exact: true }).selectOption('target');
  await expect(other.getByRole('treeitem', { name: /Target health/ })).toBeVisible();
  await expect.poll(() => new URL(second.url()).searchParams.get('script')).toBe('target');
  await other.getByRole('treeitem', { name: /Steps$/ }).click({ button: 'right' });
  await other.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(other.getByRole('treeitem', { name: /Checkout \(Copy\)/ })).toBeVisible();
  await expect(other.getByRole('treeitem', { name: /Reserve seats \(Copy\)/ })).toBeVisible();
  await expect(first.getByRole('treeitem', { name: /Checkout \(Copy\)/ })).toHaveCount(0);
  await other.getByRole('treeitem', { name: /Target health/ }).click();
  await other.getByRole('tree').press('ControlOrMeta+c');
  await page.bringToFront();
  await first.getByRole('treeitem', { name: /Steps$/ }).click();
  await first.getByRole('tree').press('ControlOrMeta+v');
  await expect(first.getByRole('treeitem', { name: /Target health \(Copy\)/ })).toBeVisible();
  await expect(other.getByRole('treeitem', { name: /Target health \(Copy\)/ })).toHaveCount(0);
  // Flush local drafts only; these fixtures have no repository or folder connection.
  for (const tab of [page, second])
    await tab.evaluate(async () => {
      const host = await import(/* @vite-ignore */ '/src/utils/studioFrame.ts');
      await host.saveMountedPlanEditor('navigate');
    });
  await page.reload();
  await expect(first.getByRole('combobox', { name: 'Plan script', exact: true })).toHaveValue('default');
  await expect(first.getByRole('treeitem', { name: /Target health/ })).toBeVisible();
  await second.reload();
  await expect(other.getByRole('combobox', { name: 'Plan script', exact: true })).toHaveValue('target');
  await expect(other.getByRole('treeitem', { name: /Checkout/ })).toBeVisible();
  await expect(other.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option')).toHaveCount(2);
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('relampo-yaml-editor');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<{ source: string; target: string }>((resolve, reject) => {
        const tx = db.transaction('drafts');
        const store = tx.objectStore('drafts');
        const a = store.get('saas-plan:multi-editor:tp-01'),
          b = store.get('saas-plan:multi-editor:tp-01:script:target');
        tx.oncomplete = () => resolve({ source: a.result.yaml, target: b.result.yaml });
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
  expect(stored.source).toContain('Source flow');
  expect(stored.source).toContain('https://other.test/health');
  for (const value of ['/demo.API/Reserve', 'eventId: 12', 'username: demo', 'Bearer {{token}}'])
    expect(stored.target).toContain(value);

  const popup3 = second.waitForEvent('popup');
  await second.getByRole('button', { name: 'New editor', exact: true }).click();
  const third = await popup3;
  await expect(third).toHaveURL(/editor=/);
  expect(new URL(third.url()).searchParams.get('editor')).not.toBe(new URL(second.url()).searchParams.get('editor'));
  const thirdEditor = third.frameLocator('iframe[data-plan-editor]');
  await expect(third.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  const chooser = third.waitForEvent('filechooser');
  await third.getByRole('button', { name: 'Import YAML', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'imported.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(target.replaceAll('Target', 'Imported')),
  });
  await expect(thirdEditor.getByRole('treeitem', { name: /Imported health/ })).toBeVisible();
  await expect(first.getByRole('treeitem', { name: /Imported health/ })).toHaveCount(0);
  await expect(other.getByRole('treeitem', { name: /Imported health/ })).toHaveCount(0);
  await expect(first.getByRole('combobox', { name: 'Plan script', exact: true })).toHaveValue('default');
  await expect(thirdEditor.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option')).toHaveCount(
    3,
  );
  await page.screenshot({ path: '/private/tmp/relampo-saas-new-editor.png', fullPage: true });
  await third.close();
  await second.close();
});

test('blocked New editor reports failure without replacing the current page', async ({ page }) => {
  await page.goto(new URL(saasURL!).origin);
  const result = await page.evaluate(async () => {
    const old = window.open;
    window.open = () => null;
    try {
      const host = await import(/* @vite-ignore */ '/src/utils/studioFrame.ts');
      return { opened: host.openNewSaasEditor('tp-01'), url: window.location.href };
    } finally {
      window.open = old;
    }
  });
  expect(result.opened).toBe(false);
  expect(new URL(result.url).pathname).not.toBe('/relampo-lab');
});
