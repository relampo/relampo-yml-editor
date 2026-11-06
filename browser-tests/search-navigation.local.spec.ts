import { expect, test } from '@playwright/test';

const requestBody = Array.from({ length: 260 }, (_, i) =>
  i === 90 || i === 220 ? `line ${i} needle body` : `line ${i}`,
).join('\n');
const responseBody = Array.from({ length: 260 }, (_, i) =>
  i === 100 || i === 240 ? `line ${i} needle response` : `line ${i}`,
).join('\n');
const content = `test:
  name: Navigation sample
variables:
  first: needle variable
scenarios:
  - name: needle scenario
    steps:
      - group:
          name: needle group
          steps:
            - request:
                name: needle needle request
                method: POST
                url: /path/needle?next=needle
                headers:
                  X-Test: needle header
                body_raw: |-
${requestBody
  .split('\n')
  .map(line => `                  ${line}`)
  .join('\n')}
                response:
                  status: 200
                  body: |-
${responseBody
  .split('\n')
  .map(line => `                    ${line}`)
  .join('\n')}
      - get: /unrelated
`;

test('navigates each occurrence, scrolls actual fields and keeps the full tree', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ studio: false, initialScript: null, capabilities: {} }),
    }),
  );
  await page.goto('/');
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'navigation.yaml', mimeType: 'text/yaml', buffer: Buffer.from(content) });
  const bar = page.getByRole('search', { name: 'Search tree' });
  await bar.getByRole('radio', { name: 'Requests' }).check();
  await bar.getByRole('textbox', { name: 'Search nodes' }).fill('needle');
  await bar.getByRole('button', { name: 'Search tree' }).click();
  const expected = [
    [/Variables/, 'first'],
    [/needle scenario/, 'name'],
    [/needle group/, 'name'],
    [/needle needle request/, 'name'],
    [/needle needle request/, 'name'],
    [/needle needle request/, 'url'],
    [/needle needle request/, 'url'],
    [/needle needle request/, 'body_raw'],
    [/needle needle request/, 'body_raw'],
    [/Headers/, 'X-Test'],
  ] as const;
  for (let i = 0; i < expected.length; i++) {
    if (i) await bar.getByRole('button', { name: 'Next search match' }).click();
    await expect(bar.getByLabel('Search match position')).toHaveText(`${i + 1} / 10`);
    await expect(page.getByRole('treeitem', { name: expected[i][0], selected: true })).toBeVisible();
    const preview = page.locator('[data-search-location]');
    await expect(preview).toHaveAttribute('data-search-path', expected[i][1]);
    await expect(preview).toBeHidden();
    const control = page.locator('[data-node-details] [data-search-active="true"]');
    await expect(control).toHaveCount(1);
    await expect
      .poll(() =>
        control.evaluate((element: HTMLInputElement | HTMLTextAreaElement) =>
          element.value.slice(element.selectionStart ?? 0, element.selectionEnd ?? 0),
        ),
      )
      .toBe('needle');
    if (i === 3 || i === 4) {
      await expect(control).toHaveJSProperty('selectionStart', i === 3 ? 0 : 7);
      await expect(page.getByRole('tree').locator('mark[data-active-match="true"]')).toHaveCount(1);
    }
    if (i === 7 || i === 8)
      await expect
        .poll(() => control.evaluate(element => (element as HTMLTextAreaElement).scrollTop))
        .toBeGreaterThan(0);
    await expect(page.getByRole('treeitem', { name: /unrelated/ })).toBeVisible();
  }
  await bar.getByRole('button', { name: 'Previous search match' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('9 / 10');
  await page.screenshot({ path: 'output/playwright/search-navigation-request.png' });

  await bar.getByRole('radio', { name: 'Responses' }).check();
  await bar.getByRole('button', { name: 'Search tree' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('1 / 2');
  await expect(page.locator('[data-search-location]')).toHaveAttribute('data-search-path', 'response.body');
  await bar.getByRole('button', { name: 'Next search match' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('2 / 2');
  await expect(bar.getByRole('button', { name: 'Replace', exact: true })).toBeDisabled();
  await bar.getByRole('button', { name: 'Previous search match' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('1 / 2');
  await page.screenshot({ path: 'output/playwright/search-navigation-response.png' });
  await expect(page.locator('[data-search-preview]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('extractor navigation preserves values and renders a single aligned highlight', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'extractor.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(`test:
  name: Extractor navigation
scenarios:
  - name: Main
    steps:
      - request:
          method: GET
          url: /login
          extractors:
            - type: regex
              var: securitytoken1
              pattern: securitytoken1=(.*)
              default: 'Not found: securitytoken1'
`),
  });
  const bar = page.getByRole('search', { name: 'Search tree' });
  await bar.getByRole('radio', { name: 'Requests' }).check();
  await bar.getByRole('textbox', { name: 'Search nodes' }).fill('token');
  await bar.getByRole('button', { name: 'Search tree' }).click();
  const values = () =>
    page
      .locator('[data-node-details] input')
      .evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  const before = await values();
  for (let i = 0; i < 3; i++) {
    if (i) await bar.getByRole('button', { name: 'Next search match' }).click();
    const control = page.locator('[data-node-details] input[data-search-active="true"]');
    await expect(control).toHaveCount(1);
    await expect(page.locator('[data-search-location]')).toBeHidden();
    await expect(page.locator('[data-node-details] mark[data-active-match="true"]')).toHaveCount(1);
    await expect
      .poll(() =>
        control.evaluate(input => {
          const overlay = input.parentElement!.querySelector('[aria-hidden="true"]')!;
          return {
            selection: getComputedStyle(input, '::selection').color,
            inputFont: getComputedStyle(input).font,
            overlayFont: getComputedStyle(overlay).font,
          };
        }),
      )
      .toMatchObject({ selection: 'rgba(0, 0, 0, 0)' });
    const fonts = await control.evaluate(input => [
      getComputedStyle(input).font,
      getComputedStyle(input.parentElement!.querySelector('[aria-hidden="true"]')!).font,
    ]);
    expect(fonts[0]).toBe(fonts[1]);
    const defaultMark = page.locator('#validation-regex-default-value').locator('..').locator('mark');
    await expect(defaultMark).toHaveText('token');
    await expect(defaultMark).toHaveClass(i === 2 ? /bg-green-300/ : /bg-yellow-400\/35/);
    expect(await values()).toEqual(before);
  }
});


test('only the current response header or body occurrence is green', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'response-matches.yaml', mimeType: 'text/yaml', buffer: Buffer.from(`test:
  name: Response navigation
scenarios:
  - name: Main
    steps:
      - request:
          method: GET
          url: /login
          response:
            status: 301
            headers:
              Location: https://example.com/demo/
            body: '<a href="https://example.com/demo/">here</a>'
`),
  });
  const bar = page.getByRole('search', { name: 'Search tree' });
  await bar.getByRole('radio', { name: 'Responses' }).check();
  await bar.getByRole('textbox', { name: 'Search nodes' }).fill('demo');
  await bar.getByRole('button', { name: 'Search tree' }).click();
  const green = page.locator('[data-node-details] mark.bg-green-300');
  const yellow = page.locator('[data-node-details] mark.bg-yellow-300\\/20');
  await expect(bar.getByLabel('Search match position')).toHaveText('1 / 2');
  await expect(green).toHaveCount(1);
  await expect(green).toHaveAttribute('data-header-match-index', '0');
  await expect(page.locator('[data-node-details] textarea[data-search-active]')).toHaveCount(0);
  await expect(yellow).toHaveCount(1);
  await bar.getByRole('button', { name: 'Next search match' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('2 / 2');
  await expect(green).toHaveCount(1);
  await expect(green).toHaveAttribute('data-match-index', '0');
  await expect(yellow).toHaveCount(1);
  await bar.getByRole('button', { name: 'Previous search match' }).click();
  await expect(green).toHaveCount(1);
  await expect(green).toHaveAttribute('data-header-match-index', '0');
  await expect(page.locator('[data-search-preview]')).toHaveCount(0);
});


test('Requests counts and navigates the Load component name', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'load-search.yaml', mimeType: 'text/yaml', buffer: Buffer.from(`test:
  name: Component search
scenarios:
  - name: Main
    load:
      type: constant
      users: 1
      duration: 1m
    steps:
      - get: /login
`),
  });
  const bar = page.getByRole('search', { name: 'Search tree' });
  await bar.getByRole('radio', { name: 'Requests' }).check();
  await bar.getByRole('textbox', { name: 'Search nodes' }).fill('load');
  await bar.getByRole('button', { name: 'Search tree' }).click();
  await expect(bar.getByLabel('Search match position')).toHaveText('1 / 1');
  await expect(page.getByRole('treeitem', { name: /Load: Constant/, selected: true })).toBeVisible();
  const control = page.locator('#nodedetails-node-name');
  await expect(control).toHaveAttribute('data-search-active', 'true');
  await expect(page.locator('[data-node-details] mark[data-active-match="true"]')).toHaveText('Load');
  await expect(page.locator('[data-search-preview]')).toHaveCount(0);
});


test('disabled request fields keep the current occurrence green without receiving focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'disabled-search.yaml', mimeType: 'text/yaml', buffer: Buffer.from(`test:
  name: Disabled search
scenarios:
  - name: Main
    steps:
      - request:
          enabled: false
          method: POST
          url: /login
          headers:
            Content-Type: application/x-www-form-urlencoded
          body:
            securityToken: '{{securitytoken1}}'
`),
  });
  const bar = page.getByRole('search', { name: 'Search tree' });
  await bar.getByRole('radio', { name: 'Requests' }).check();
  await bar.getByRole('textbox', { name: 'Search nodes' }).fill('token');
  await bar.getByRole('button', { name: 'Search tree' }).click();
  const control = page.locator('[data-node-details] input[data-search-active="true"]');
  await expect(control).toBeDisabled();
  await expect(control).not.toBeFocused();
  const active = page.locator('[data-node-details] mark[data-active-match="true"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveClass(/bg-green-300/);
  await expect(active).toHaveText('token');
  await expect(page.locator('[data-node-details] fieldset')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-search-preview]')).toHaveCount(0);
});


for (const representation of ['encoded', 'array'] as const) {
  test(`navigates repeated form fields individually (${representation})`, async ({ page }) => {
    const formBody = representation === 'encoded'
      ? "'securityToken=%7B%7Bsecuritytoken1%7D%7D&email_address=user%40example.com&securityToken=%7B%7Bsecuritytoken1%7D%7D'"
      : "\n            - securityToken: '{{securitytoken1}}'\n            - email_address: user@example.com\n            - securityToken: '{{securitytoken1}}'";
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'repeated-form.yaml', mimeType: 'text/yaml', buffer: Buffer.from(`test:
  name: Repeated form
scenarios:
  - name: Main
    steps:
      - request:
          enabled: false
          method: POST
          url: /login
          headers:
            Content-Type: application/x-www-form-urlencoded
          body: ${formBody}
`),
    });
    const bar = page.getByRole('search', { name: 'Search tree' });
    await bar.getByRole('radio', { name: 'Requests' }).check();
    await bar.getByRole('textbox', { name: 'Search nodes' }).fill('token');
    await bar.getByRole('button', { name: 'Search tree' }).click();
    const fields = page.locator('[data-search-form-field]');
    const indexes = representation === 'encoded' ? [0, 1, 4, 5] : [1, 5];
    for (let i = 0; i < indexes.length; i++) {
      if (i) await bar.getByRole('button', { name: 'Next search match' }).click();
      await expect(bar.getByLabel('Search match position')).toHaveText(`${i + 1} / ${indexes.length}`);
      await expect(fields.nth(indexes[i])).toHaveAttribute('data-search-active', 'true');
      await expect(page.locator('[data-node-details] [data-search-active="true"]')).toHaveCount(1);
      await expect(page.locator('[data-node-details] mark[data-active-match="true"]')).toHaveCount(1);
      await expect(fields.nth(indexes[i]).locator('..').locator('mark[data-active-match="true"]')).toHaveClass(/bg-green-300/);
    }
    await bar.getByRole('button', { name: 'Previous search match' }).click();
    await expect(fields.nth(indexes[indexes.length - 2])).toHaveAttribute('data-search-active', 'true');
  });
}
