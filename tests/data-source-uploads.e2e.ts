import { beforeEach, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const fixture = (name: string) => `tests/fixtures/data-source-uploads/${name}`;
const sourceInput = 'input[type="file"][accept=".csv,.txt"]';
const formatError = 'only .csv and .txt data source files are supported';

beforeEach(async ({ app, screen }) => {
  await app.open('/');
  await screen.getByRole('button', 'Tree').tap();
  await screen.getByRole('treeitem', /Data Source/).tap();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
});

test('CSV upload still sets the file path, previews rows, and downloads YAML', async ({ app, screen, browser }) => {
  let uploads = 0;
  await browser.route('**/api/studio/data-source-files', async route => {
    uploads += 1;
    await route.continue();
  });
  await browser.locator(sourceInput).setInputFiles(fixture('users.csv'));

  const pathInput = screen.getByPlaceholder('path/to/file.csv');
  await expect(pathInput).toHaveValue(/(?:^|\/)users\.csv$/);
  await expect(screen.getByRole('cell', 'csv-alice')).toBeVisible();
  await expect(screen.getByRole('cell', 'csv-bob')).toBeVisible();
  await expect(screen.getByRole('columnheader', 'username')).toBeVisible();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  expect(uploads).toBe(1);

  const download = await browser.waitForDownload(async () => {
    await screen.getByRole('button', 'Save').tap();
    await screen.getByRole('menuitem', /Save with responses/).tap();
  });
  expect(download.suggestedFilename).toBe('upload.yaml');
  expect(download.path).toMatch(/\.yaml$/);
  await app.screenshot('csv-upload-preview');
});

test('TXT upload still previews one value per row', async ({ app, screen, browser }) => {
  await screen.getByLabel('Type').tap();
  await screen.getByRole('option', 'TXT').tap();
  await browser.locator(sourceInput).setInputFiles(fixture('users.txt'));

  await expect(screen.getByPlaceholder('path/to/file.csv')).toHaveValue(/(?:^|\/)users\.txt$/);
  await expect(screen.getByRole('cell', 'txt-alice')).toBeVisible();
  await expect(screen.getByRole('cell', 'txt-bob')).toBeVisible();
  await expect(screen.getByRole('columnheader')).toHaveCount(2);
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  await app.screenshot('txt-upload-preview');
});

test('uppercase CSV extensions still upload and preview', async ({ app, screen, browser }) => {
  await browser.locator(sourceInput).setInputFiles(fixture('UPPER.CSV'));

  await expect(screen.getByPlaceholder('path/to/file.csv')).toHaveValue(/(?:^|\/)UPPER\.CSV$/);
  await expect(screen.getByRole('cell', 'csv-upper')).toBeVisible();
  await expect(screen.getByRole('cell', 'admin')).toBeVisible();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  await app.screenshot('uppercase-csv-preview');
});

test('an invalid extension preserves the existing path and supports a valid retry', async ({ app, screen, browser }) => {
  let uploads = 0;
  await browser.route('**/api/studio/data-source-files', async route => {
    uploads += 1;
    await route.continue();
  });
  await browser.locator(sourceInput).setInputFiles(fixture('users.csv'));
  const pathInput = screen.getByPlaceholder('path/to/file.csv');
  await expect(screen.getByRole('cell', 'csv-alice')).toBeVisible();
  const originalPath = await pathInput.inputValue();

  await browser.locator(sourceInput).setInputFiles(fixture('users.json'));

  await expect(screen.getByText(formatError)).toBeVisible();
  await expect(pathInput).toHaveValue(originalPath);
  await expect(screen.getByRole('cell', 'csv-alice')).toBeVisible();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  expect(uploads).toBe(1);
  await app.screenshot('invalid-extension-preserves-preview');

  await browser.locator(sourceInput).setInputFiles(fixture('UPPER.CSV'));
  await expect(screen.getByRole('cell', 'csv-upper')).toBeVisible();
  await expect(pathInput).toHaveValue(/(?:^|\/)UPPER\.CSV$/);
  await expect(screen.getByText(formatError)).toBeHidden();
  expect(uploads).toBe(2);
});

test('uploading the same filename again refreshes the preview', async ({ app, screen, browser }) => {
  await browser.locator(sourceInput).setInputFiles(fixture('users.csv'));
  const pathInput = screen.getByPlaceholder('path/to/file.csv');
  await expect(screen.getByRole('cell', 'csv-alice')).toBeVisible();
  const originalPath = await pathInput.inputValue();

  await browser.locator(sourceInput).setInputFiles(fixture('replacement/users.csv'));

  await expect(pathInput).toHaveValue(originalPath);
  await expect.poll(async () => {
    const preview = await fetch(new URL(`/api/studio/data-source-preview?${new URLSearchParams({ path: originalPath })}`, app.baseUrl));
    return (await preview.json()).lines;
  }).toEqual(['csv-replaced,owner']);
  await expect(screen.getByRole('cell', 'csv-replaced')).toBeVisible();
  await expect(screen.getByRole('cell', 'csv-alice')).toBeHidden();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  await app.screenshot('replacement-upload-preview');
});

test('replacing a TXT file with the same name refreshes the preview', async ({ app, screen, browser }) => {
  await screen.getByLabel('Type').tap();
  await screen.getByRole('option', 'TXT').tap();
  await browser.locator(sourceInput).setInputFiles(fixture('users.txt'));
  const pathInput = screen.getByPlaceholder('path/to/file.csv');
  await expect(screen.getByRole('cell', 'txt-alice')).toBeVisible();
  const originalPath = await pathInput.inputValue();

  await browser.locator(sourceInput).setInputFiles(fixture('replacement/users.txt'));

  await expect(pathInput).toHaveValue(originalPath);
  await expect(screen.getByRole('cell', 'txt-replaced')).toBeVisible();
  await expect(screen.getByRole('cell', 'txt-alice')).toBeHidden();
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();
  await app.screenshot('replacement-txt-upload-preview');
});

test('a backend upload error is shown and the same file can be retried', async ({ app, screen, browser }) => {
  let uploads = 0;
  await browser.route('**/api/studio/data-source-files', async route => {
    uploads += 1;
    if (uploads === 1) {
      await route.fulfill({ status: 503, json: { error: 'Storage temporarily unavailable' } });
    } else {
      await route.continue();
    }
  });
  await browser.locator(sourceInput).setInputFiles(fixture('users.csv'));

  await expect(screen.getByText('Storage temporarily unavailable')).toBeVisible();
  await expect(screen.getByPlaceholder('path/to/file.csv')).toHaveValue('');
  await expect(screen.getByRole('button', 'Browse')).toBeEnabled();

  await browser.locator(sourceInput).setInputFiles(fixture('users.csv'));
  await expect(screen.getByRole('cell', 'csv-alice')).toBeVisible();
  await expect(screen.getByText('Storage temporarily unavailable')).toBeHidden();
  expect(uploads).toBe(2);
  await app.screenshot('backend-error-retry-preview');
});
