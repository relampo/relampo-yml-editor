import { expect, test } from '@playwright/test';

const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

test('the compact type scale covers every SaaS page, account screens and dialogs in both themes', async ({ page }) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  await page.setViewportSize({ width: 1700, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'site-typography@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
  });
  let family = '';
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('relampo-theme', theme), theme);
    for (const path of ['/dashboard', '/projects', '/billing-plans', '/profile-settings', '/help', '/relampo-lab?plan=tp-01']) {
      await page.goto(base.origin + path);
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      const body = await page.locator('body').evaluate(el => {
        const s = getComputedStyle(el); return { size: s.fontSize, family: s.fontFamily };
      });
      expect(body.size).toBe('12px');
      const background = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(10, 10, 10)';
      await expect(page.locator('body')).toHaveCSS('background-color', background);
      for (const surface of await page.locator('.relampo-page, .relampo-app-shell').all()) {
        await expect(surface).toHaveCSS('background-color', background);
        await expect(surface).toHaveCSS('background-image', 'none');
      }
      if (!family) family = body.family;
      expect(body.family).toBe(family);
      await expect(page.getByRole('button', { name: 'Change language', exact: true })).toHaveCSS('font-size', '12px');
      if (['/dashboard', '/projects', '/billing-plans', '/profile-settings'].includes(path)) {
        await expect(page.locator('main .relampo-page-title')).toHaveCSS('font-size', '20px');
      }
      if (path.startsWith('/relampo-lab')) {
        const editor = page.frameLocator('iframe[data-plan-editor]');
        await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
        await expect(editor.locator('body')).toHaveCSS('font-family', family);
      }
      if (theme === 'light') {
        for (const label of await page.locator('button.text-primary, span.text-primary, p.text-primary, .badge-warning').all()) {
          await expect(label).toHaveCSS('color', 'rgb(32, 32, 32)');
        }
      }
      const content = page.locator('main > .relampo-page');
      if (await content.count()) {
        await content.evaluate(el => { el.scrollTop = el.scrollHeight; });
        await content.evaluate(el => { el.scrollTop = 0; });
      }
      await page.screenshot({ path: `/tmp/relampo-site-type-${theme}-${path.split('?')[0].slice(1)}.png`, animations: 'disabled' });
    }

    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    await expect(page.getByPlaceholder('e.g. Checkout Reliability')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Checkout Reliability')).toHaveCSS('font-size', '12px');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.getByPlaceholder('e.g. Checkout Reliability')).toHaveCSS('font-family', family);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Invite Member', exact: true }).first().click();
    await expect(page.locator('input[type="email"]').first()).toHaveCSS('font-size', '12px');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }

  await page.evaluate(() => { localStorage.removeItem('relampo-auth'); });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('relampo-theme', theme), theme);
    for (const path of ['/login', '/signup', '/forgot-password', '/accept-invitation']) {
      await page.goto(base.origin + path);
      await expect(page.locator('body')).toHaveCSS('font-family', family);
      await expect(page.locator('body')).toHaveCSS('font-size', '12px');
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('.relampo-auth-page')).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(10, 10, 10)');
      await expect(page.locator('.relampo-auth-page')).toHaveCSS('background-image', 'none');
      for (const control of await page.locator('input:visible, button:visible').all()) {
        await expect(control).toHaveCSS('font-size', '12px');
      }
      await page.screenshot({ path: `/tmp/relampo-site-type-${theme}-${path.slice(1)}.png`, animations: 'disabled' });
    }
  }
  await page.evaluate(() => {
    const user = localStorage.getItem('relampo-current-user');
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem(`relampo-onboarding-${user}`, 'false');
  });
  await page.goto(`${base.origin}/onboarding`);
  await expect(page.locator('body')).toHaveCSS('font-family', family);
  await expect(page.locator('input:visible').first()).toHaveCSS('font-size', '12px');
  expect(errors).toEqual([]);
});
