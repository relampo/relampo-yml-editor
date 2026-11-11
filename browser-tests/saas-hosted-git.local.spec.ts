import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const dist = process.env.RELAMPO_SAAS_DIST;
test.skip(!dist, 'Set RELAMPO_SAAS_DIST to a compiled SaaS directory.');

for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: static hosting connects without calling the local credential service`, async ({
    page,
    context,
  }) => {
    const origin = 'https://relampo-hosted.example.invalid';
    const token = 'test-only-hosted-connection-secret';
    let sessionCalls = 0;
    await context.route(`${origin}/**`, async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith('/__relampo/git-session/')) {
        sessionCalls++;
        return route.abort('failed'); // Reproduces the Amplify route failure.
      }
      const root = resolve(dist!);
      const file = resolve(root, '.' + path);
      if (file !== root && !file.startsWith(root + sep)) return route.abort();
      const mime: Record<string, string> = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
      };
      try {
        return await route.fulfill({ body: await readFile(file), contentType: mime[extname(file)] || 'text/html' });
      } catch {
        return route.fulfill({ body: await readFile(resolve(root, 'index.html')), contentType: 'text/html' });
      }
    });
    await context.route(provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**', route => {
      const request = route.request();
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      expect(request.headers()[provider === 'github' ? 'authorization' : 'private-token']).toBe(
        provider === 'github' ? `Bearer ${token}` : token,
      );
      const path = new URL(request.url()).pathname;
      const json = path.endsWith('/user')
        ? { login: 'acme', username: 'acme' }
        : path.endsWith('/user/repos') || path.endsWith('/projects')
          ? [{ full_name: 'acme/performance', path_with_namespace: 'acme/performance', permissions: { push: true } }]
          : path.endsWith('/branches')
            ? [{ name: 'main' }]
            : { default_branch: 'main', permissions: { push: true } };
      return route.fulfill({ headers, json });
    });
    await page.goto(origin);
    await page.evaluate(() => {
      const user = 'hosted-check@example.invalid';
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
    });
    await page.goto(origin + '/projects');
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await expect(dialog.getByText('The connection is available during this session.', { exact: false })).toBeVisible();
    await dialog.getByLabel('Access token').fill(token);
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    await expect(dialog.getByText('Connected as', { exact: false })).toContainText('@acme');
    await dialog.getByLabel('Repository').selectOption('acme/performance');
    await expect(dialog.getByLabel('Branch')).toHaveValue('main');
    expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain(
      token,
    );
    await dialog.getByRole('button', { name: 'Disconnect account', exact: true }).click();
    await expect(dialog.getByLabel('Access token')).toBeVisible();
    expect(sessionCalls).toBe(0);
    await expect(dialog.getByText('Failed to fetch', { exact: true })).toHaveCount(0);
  });
}
