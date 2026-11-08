import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
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
test('New Studio isolates documents and drafts, and tree copy/paste works in both directions', async ({
  page,
  context,
}) => {
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: { grpcAuthoring: true },
        initialScript: { name: 'source.yaml', yaml: source },
      },
    }),
  );
  await page.goto('/');
  const originalTransaction = page.getByRole('treeitem', { name: /Checkout$/ });
  await expect(originalTransaction).toBeVisible();
  await originalTransaction.click({ button: 'right' });
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  const pending = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'New Studio', exact: true }).click();
  const second = await pending;
  await expect(second).toHaveURL(/editor=/);
  await expect(second.getByRole('button', { name: 'Upload YAML', exact: true })).toBeVisible();
  await expect(second.getByRole('treeitem', { name: /Source script/ })).toHaveCount(0);
  await second
    .locator('input[type="file"]')
    .setInputFiles({ name: 'target.yaml', mimeType: 'text/yaml', buffer: Buffer.from(target) });
  await expect(second.getByRole('treeitem', { name: /Target health/ })).toBeVisible();
  await second.getByRole('treeitem', { name: /Steps$/ }).click({ button: 'right' });
  await second.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(second.getByRole('treeitem', { name: /Checkout \(Copy\)/ })).toBeVisible();
  await expect(second.getByRole('treeitem', { name: /Reserve seats \(Copy\)/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Checkout \(Copy\)/ })).toHaveCount(0);
  await second.getByRole('treeitem', { name: /Target health/ }).click();
  await second.getByRole('tree').press('ControlOrMeta+c');
  await page.bringToFront();
  await page.getByRole('treeitem', { name: /Steps$/ }).click();
  await page.getByRole('tree').press('ControlOrMeta+v');
  await expect(page.getByRole('treeitem', { name: /Target health \(Copy\)/ })).toBeVisible();
  await expect(second.getByRole('treeitem', { name: /Target health \(Copy\)/ })).toHaveCount(0);
  const downloading = second.waitForEvent('download');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await second.getByRole('menuitem', { name: /Save with responses/ }).click();
  const download = await downloading;
  const yaml = await readFile((await download.path())!, 'utf8');
  expect(yaml).toContain('/demo.API/Reserve');
  expect(yaml).toContain('Bearer {{token}}');
  expect(yaml).toContain('eventId: 12');
  expect(yaml).toContain('username: demo');
  // Wait for the independent IndexedDB draft rather than a fixed autosave delay.
  await expect
    .poll(() =>
      second.evaluate(async () => {
        const id = new URLSearchParams(location.search).get('editor');
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open('relampo-yaml-editor');
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        try {
          return await new Promise<string>(resolve => {
            const r = db
              .transaction('drafts')
              .objectStore('drafts')
              .get('active:' + id);
            r.onsuccess = () => resolve(r.result?.yaml || '');
          });
        } finally {
          db.close();
        }
      }),
    )
    .toContain('Checkout (Copy)');
  await second.reload();
  await expect(second.getByRole('treeitem', { name: /Target script/ })).toBeVisible();
  await expect(second.getByRole('treeitem', { name: /Checkout \(Copy\)/ })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /Target health \(Copy\)/ })).toBeVisible();
  const thirdPending = second.waitForEvent('popup');
  await second.getByRole('button', { name: 'New Studio', exact: true }).click();
  const third = await thirdPending;
  await expect(third.getByRole('button', { name: 'Upload YAML', exact: true })).toBeVisible();
  expect(new URL(third.url()).searchParams.get('editor')).not.toBe(new URL(second.url()).searchParams.get('editor'));
  await expect(third.getByRole('treeitem')).toHaveCount(0);
  await second.screenshot({ path: '/private/tmp/relampo-multi-studio.png', fullPage: true });
  await third.close();
  await second.close();
});
