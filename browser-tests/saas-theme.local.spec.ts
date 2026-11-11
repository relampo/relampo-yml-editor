import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('all embedded Studio tools follow the host theme and keep document edits and Monaco state', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const base = new URL(saasURL!);
  expect(['127.0.0.1', 'localhost']).toContain(base.hostname);
  await page.setViewportSize({ width: 1700, height: 1000 });
  await context.route('**/api/studio/info', route =>
    route.fulfill({
      json: {
        studio: true,
        capabilities: { debug: true, loadRun: true, httpRecorder: true, correlate: true },
      },
    }),
  );
  await context.route('**/api/recorder/http/options', route =>
    route.fulfill({
      json: {
        directory: '/tmp/recordings',
        port: 8888,
        firefoxAvailable: false,
      },
    }),
  );
  await context.route('**/api/recorder/http/current', route =>
    route.fulfill({ json: { active: false, totalRequests: 0, requests: [] } }),
  );
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'theme-test@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
    localStorage.setItem('relampo-theme', 'light');
  });
  await page.goto(`${base.origin}/relampo-lab?plan=tp-01`);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'light');
  await editor
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'theme-script.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(`test: {name: Theme script}
scenarios:
- name: Checkout
  load: {type: constant, users: 2, iterations: 1}
  steps:
  - request: {name: Login, method: GET, url: 'https://app.test/login'}
`),
    });
  await expect(editor.getByText('Theme script', { exact: true })).toBeVisible();
  await editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Login' }).last().click();
  await editor.getByLabel('Path', { exact: true }).fill('/theme-edited');
  const contrast = await editor.getByLabel('Path', { exact: true }).evaluate(el => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const luminance = (color: string) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      const channels = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
        const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const background = luminance(style.backgroundColor);
    const ratio = (color: string) => {
      const foreground = luminance(color);
      return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
    };
    return { text: ratio(style.color), border: ratio(style.borderTopColor) };
  });
  expect(contrast.text).toBeGreaterThanOrEqual(4.5);
  expect(contrast.border).toBeGreaterThanOrEqual(3);

  const frame = page.frames().find(frame => frame.url().includes('/studio-editor/'))!;
  const iconColors = () => frame.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-node-icon]')]
    .filter(el => el.getBoundingClientRect().width > 0)
    .map(el => ({ type: el.dataset.nodeIcon, color: getComputedStyle(el).color })));
  const lightIcons = await iconColors();
  expect(lightIcons.length).toBeGreaterThan(3);

  await frame.evaluate(() => {
    (window as any).__themeProbe = 'same-document';
  });
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'dark');
  expect(await iconColors()).toEqual(lightIcons);
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/theme-edited');
  await editor.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(editor.locator('.monaco-editor.vs-dark').first()).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(editor.locator('.monaco-editor.vs').first()).toBeVisible();
  await expect(editor.locator('.monaco-editor-background').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await frame.evaluate(() => (window as any).__themeProbe)).toBe('same-document');
  await editor.getByRole('button', { name: 'Tree', exact: true }).click();

  for (const tab of ['Scripting', 'Correlation', 'Debug', 'Run', 'Record']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(editor.locator('[data-studio-workspace]')).toHaveAttribute('data-studio-workspace', tab.toLowerCase());
    const shadedSurfaces = () => frame.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter(el => {
          const r = el.getBoundingClientRect();
          if (r.width < 120 || r.height < 25 || !el.checkVisibility() || el.closest('.monaco-editor')) return false;
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = getComputedStyle(el).backgroundColor;
          ctx.fillRect(0, 0, 1, 1);
          const [red, green, blue, alpha] = ctx.getImageData(0, 0, 1, 1).data;
          const maximum = Math.max(red, green, blue);
          return alpha > 230 && maximum < 250 && maximum - Math.min(red, green, blue) < 8;
        })
        .map(el => el.className)
        .slice(0, 10);
    });
    await expect.poll(shadedSurfaces, { message: `${tab} should use white panels without opaque gray or dark blocks` }).toEqual([]);
    await page.screenshot({ path: `/tmp/relampo-theme-light-${tab.toLowerCase()}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'light');
  }
  await editor.getByRole('button', { name: 'Recording options', exact: true }).click();
  await expect(editor.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: '/tmp/relampo-theme-light-recorder-options.png', animations: 'disabled' });
  await editor.getByRole('dialog').press('Escape');
  await expect(editor.getByRole('dialog')).toHaveCount(0);
  await editor.getByRole('tab', { name: 'gRPC', exact: true }).click();
  await expect(editor.locator('[data-studio-tool="grpc-recorder"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/relampo-theme-light-grpc.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Scripting', exact: true }).click();
  await editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Login' }).last().click();
  await expect(editor.getByLabel('Path', { exact: true })).toHaveValue('/theme-edited');
  await page.getByRole('button', { name: 'Save Script', exact: true }).click();
  await page.reload();
  await expect(editor.locator('html')).toHaveAttribute('data-studio-theme', 'light');
  await expect(editor.getByText('Theme script', { exact: true })).toBeVisible();
});

test('standalone Studio preserves its dark appearance', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-studio-theme', 'light');
  await expect(page.locator('div.bg-\\[\\#0a0a0a\\]').first()).toHaveCSS('background-color', 'rgb(10, 10, 10)');
});
