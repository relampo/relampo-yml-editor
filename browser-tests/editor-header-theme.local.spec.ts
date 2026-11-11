import { expect, test } from '@playwright/test';

test('header and portalled menus follow the SaaS host theme without remounting', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('header.editor-header');
  await expect(header).toBeVisible();

  // The host owns these shared tokens and changes its .dark class at runtime.
  await page.addStyleTag({
    content: `
    :root {
      --card: #ffffff;
      --foreground: #171b26;
      --muted-foreground: #626774;
      --border: #e5e7eb;
      --accent: #f5f6f8;
    }
    :root.dark {
      --card: #18181b;
      --foreground: #fafafa;
      --muted-foreground: #a1a1aa;
      --border: #3f3f46;
      --accent: #27272a;
    }
  `,
  });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(header).toHaveCSS('color', 'rgb(23, 27, 38)');

  for (const name of ['Recorder', 'Save']) {
    await page.getByRole('button', { name, exact: true }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(header).toHaveCSS('background-color', 'rgb(24, 24, 27)');
    await expect(header).toHaveCSS('color', 'rgb(250, 250, 250)');
    await expect(menu).toHaveCSS('background-color', 'rgb(24, 24, 27)');
    await expect(menu).toHaveCSS('color', 'rgb(250, 250, 250)');
    await expect(header.locator('.editor-header-save')).toHaveCSS('color', 'rgb(23, 27, 38)');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.keyboard.press('Escape');
  }
});
