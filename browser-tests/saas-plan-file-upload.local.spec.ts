import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('plan row opens its local folder and uploads only into existing plan folders, preserving files and registering scripts', async ({
  page,
}) => {
  test.setTimeout(60000);
  const base = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(base.hostname);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async (options: any) => {
        (window as any).lastFolderPicker = { id: options.id, startIn: options.startIn?.name };
        return (await navigator.storage.getDirectory()).getDirectoryHandle('upload-plans', { create: true });
      },
    });
  });
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'upload-local@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'light');
  });
  await page.goto(`${base.origin}/projects`);
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const create = page.getByRole('dialog');
  await create.getByLabel('Test Plan name').fill('Upload Local');
  await create.getByLabel('Description').fill('Upload destination checks');
  await create.getByRole('button', { name: 'Select folder', exact: true }).click();
  await create.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
  await expect(create).toHaveCount(0);
  await page.evaluate(async () => {
    const parent = await (await navigator.storage.getDirectory()).getDirectoryHandle('upload-plans');
    const plan = await parent.getDirectoryHandle('upload-local');
    await (await plan.getDirectoryHandle('Data')).getDirectoryHandle('fixtures', { create: true });
    await parent.getDirectoryHandle('outside-plan', { create: true });
  });
  await page.getByRole('button', { name: 'Local: upload-plans/upload-local', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).lastFolderPicker))
    .toEqual({
      id: 'relampo-open-plan',
      startIn: 'upload-local',
    });
  const add = page.getByRole('button', { name: 'Add new file to Upload Local', exact: true });
  await add.click();
  const upload = page.getByRole('dialog', { name: 'Add new file', exact: true });
  const destination = upload.getByLabel('Destination folder', { exact: true });
  await expect(destination).toHaveValue('Scripts');
  expect(await destination.locator('option').allTextContents()).toEqual([
    'Data/',
    'Data/fixtures/',
    'Scripts/',
    'Utilities/',
  ]);
  await destination.selectOption('Data/fixtures');
  const csv = { name: 'users.csv', mimeType: 'text/csv', buffer: Buffer.from('name,id\nAna,1\n') };
  await upload.getByLabel('File to upload', { exact: true }).setInputFiles(csv);
  await page.screenshot({ path: '/tmp/relampo-plan-upload-local.png' });
  await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
  await expect(upload).toHaveCount(0);
  const read = (folder: string, name: string) =>
    page.evaluate(
      async ({ folder, name }) => {
        const parent = await (await navigator.storage.getDirectory()).getDirectoryHandle('upload-plans');
        let directory = await parent.getDirectoryHandle('upload-local');
        for (const part of folder.split('/')) directory = await directory.getDirectoryHandle(part);
        return [...new Uint8Array(await (await (await directory.getFileHandle(name)).getFile()).arrayBuffer())];
      },
      { folder, name },
    );
  expect(Buffer.from(await read('Data/fixtures', 'users.csv')).toString()).toBe('name,id\nAna,1\n');
  await expect(page.locator('.relampo-table-row').filter({ hasText: 'Upload Local' })).not.toContainText('Uploaded to');
  await expect(page.getByRole('status')).toContainText('Uploaded to Data/fixtures/users.csv');
  await add.click();
  await expect(destination).toHaveValue('Scripts');
  await destination.selectOption('Data/fixtures');
  await upload.getByLabel('File to upload', { exact: true }).setInputFiles(csv);
  await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
  await expect(upload.getByRole('alert')).toContainText('already exists');
  await upload.getByLabel('File to upload', { exact: true }).setInputFiles({
    name: 'payload.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([0, 255, 128, 1]),
  });
  await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
  await expect(upload).toHaveCount(0);
  expect(await read('Data/fixtures', 'payload.bin')).toEqual([0, 255, 128, 1]);
  await add.click();
  await expect(destination).toHaveValue('Scripts');
  const yaml = 'test:\n  name: Uploaded script\nscenarios: []\n';
  await upload
    .getByLabel('File to upload', { exact: true })
    .setInputFiles({ name: 'uploaded.yaml', mimeType: 'application/yaml', buffer: Buffer.from(yaml) });
  await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
  await expect(upload).toHaveCount(0);
  expect(Buffer.from(await read('Scripts', 'uploaded.yaml')).toString()).toBe(yaml);
  await page.getByRole('button', { name: 'Open Upload Local in RelampoLab', exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[data-plan-editor]')
      .getByRole('combobox', { name: 'Plan script', exact: true })
      .locator('option:checked'),
  ).toHaveText('uploaded.yaml');
});
