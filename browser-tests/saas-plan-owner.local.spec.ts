import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
const photo =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=';
for (const withPhoto of [false, true]) {
  test(`creator is an active owner with ${withPhoto ? 'their profile photo' : 'a default user icon'}, including after reload`, async ({
    page,
  }) => {
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: async () => (await navigator.storage.getDirectory()).getDirectoryHandle('owner-plans', { create: true }),
      });
    });
    await page.goto(base.origin);
    await page.evaluate(
      ({ withPhoto, photo }) => {
        const user = 'delvis.owner@example.invalid';
        localStorage.setItem('relampo-auth', 'true');
        localStorage.setItem('relampo-current-user', user);
        localStorage.setItem(`relampo-onboarding-${user}`, 'true');
        localStorage.setItem('relampo-language', 'en');
        localStorage.setItem(
          `relampo-profile-${user}`,
          JSON.stringify({ name: 'Delvis Echeverria', profileImage: withPhoto ? photo : null }),
        );
      },
      { withPhoto, photo },
    );
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Test Plan name').fill('Owner Example');
    await form.getByLabel('Description').fill('Creator membership');
    await form.getByRole('button', { name: 'Select folder', exact: true }).click();
    await form.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
    await expect(form).toHaveCount(0);
    const row = page.locator('.relampo-table-row').filter({ hasText: 'Owner Example' });
    const members = row.getByRole('button', { name: 'Members: Owner Example', exact: true });
    await expect(members).toContainText('Members (1)');
    const avatar = members.getByRole('img', { name: 'Delvis Echeverria', exact: true });
    if (withPhoto) await expect(avatar.locator('img')).toHaveAttribute('src', photo);
    else {
      await expect(avatar.locator('svg')).toBeVisible();
      await expect(avatar.locator('img')).toHaveCount(0);
    }
    await members.click();
    const dialog = page.getByRole('dialog', { name: 'Members', exact: true });
    await expect(dialog.getByText('delvis.owner@example.invalid', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Owner', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await expect(members).toContainText('Members (1)');
    await expect(avatar).toBeVisible();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('relampo-test-plans:delvis.owner%40example.invalid')!).find(
        (plan: any) => plan.name === 'Owner Example',
      ),
    );
    expect(stored.members).toEqual([
      {
        id: 'owner',
        name: 'Delvis Echeverria',
        email: 'delvis.owner@example.invalid',
        role: 'owner',
        status: 'active',
      },
    ]);
    if (withPhoto) {
      await page.evaluate(() =>
        localStorage.setItem(
          'relampo-profile-delvis.owner@example.invalid',
          JSON.stringify({ name: 'Delvis Echeverria', profileImage: 'data:image/png;base64,invalid' }),
        ),
      );
      await page.reload();
      await expect(avatar.locator('svg')).toBeVisible();
    }
    await page.screenshot({ path: `/tmp/relampo-plan-owner-${withPhoto ? 'photo' : 'default'}.png` });
  });
}
