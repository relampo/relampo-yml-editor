import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');
for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: creation authorization survives reload and Save Script restores it without user interaction`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    const token = 'test-only-retained-provider-secret';
    const user = `retained-${provider}@example.invalid`;
    let authorized = false,
      account = '',
      remembered = 0,
      direct = 0,
      proxied = 0,
      commits = 0;
    let head = 'a'.repeat(40),
      tree: any[] = [];
    const files = new Map<string, string>();
    const upstream = (url: URL, method: string, body: any) => {
      const path = url.pathname;
      const ok = (json: any, status = 200) => ({ json, status });
      if (path === '/user' || path === '/api/v4/user') return ok({ login: 'acme', username: 'acme' });
      if (path === '/user/repos' || path === '/api/v4/projects')
        return ok([
          { full_name: 'acme/performance', path_with_namespace: 'acme/performance', permissions: { push: true } },
        ]);
      if (path.endsWith('/branches')) return ok([{ name: 'main' }]);
      if (path.includes('/git/ref/heads/')) return ok({ object: { sha: head } });
      if (path.includes('/repository/branches/')) return ok({ commit: { id: head } });
      if (path.includes('/contents/') || path.includes('/repository/files/')) {
        const name = decodeURIComponent(
          path.split(path.includes('/contents/') ? '/contents/' : '/repository/files/')[1]!,
        );
        return files.has(name)
          ? ok({ type: 'file', encoding: 'base64', content: Buffer.from(files.get(name)!).toString('base64') })
          : [...files.keys()].some(key => key.startsWith(name + '/'))
            ? ok([{ type: 'file' }])
            : ok({}, 404);
      }
      if (path.endsWith('/repository/tree'))
        return [...files.keys()].some(key => key.startsWith(url.searchParams.get('path')! + '/'))
          ? ok([{ type: 'blob' }])
          : ok({}, 404);
      if (path.includes('/git/commits/') && method === 'GET') return ok({ tree: { sha: 'f'.repeat(40) } });
      if (path.endsWith('/git/trees')) {
        tree = body.tree;
        return ok({ sha: 'e'.repeat(40) }, 201);
      }
      if (path.endsWith('/git/commits')) return ok({ sha: String(commits + 1).repeat(40) }, 201);
      if (path.includes('/git/refs/heads/')) {
        head = body.sha;
        for (const item of tree) files.set(item.path, item.content);
        commits++;
        return ok({ object: { sha: head } });
      }
      if (path.endsWith('/repository/commits')) {
        head = String(commits + 1).repeat(40);
        for (const item of body.actions) files.set(item.file_path, item.content);
        commits++;
        return ok({ id: head }, 201);
      }
      return ok({ default_branch: 'main', permissions: { push: true } });
    };
    await context.route(provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**', route => {
      const request = route.request();
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      direct++;
      expect(request.headers()[provider === 'github' ? 'authorization' : 'private-token']).toBe(
        provider === 'github' ? `Bearer ${token}` : token,
      );
      return route.fulfill({
        ...upstream(new URL(request.url()), request.method(), request.postData() ? request.postDataJSON() : undefined),
        headers,
      });
    });
    await context.route('**/__relampo/git-session/**', route => {
      const request = route.request(),
        input = request.postDataJSON();
      const action = new URL(request.url()).pathname.split('/').at(-1);
      expect(request.headers()['x-relampo-session']).toBe('1');
      if (action === 'remember') {
        remembered++;
        expect(input.token).toBe(token);
        authorized = true;
        account = input.account;
        return route.fulfill({
          json: { ok: true },
          headers: {
            'Set-Cookie': 'relampo_git_session=test-session; Path=/__relampo/git-session/; HttpOnly; SameSite=Strict',
          },
        });
      }
      const valid =
        authorized &&
        input.account === account &&
        request.headers().cookie?.includes('relampo_git_session=test-session');
      if (action === 'restore') return route.fulfill({ json: { available: !!valid } });
      if (action === 'disconnect') {
        if (valid) authorized = false;
        return route.fulfill({ json: { ok: true } });
      }
      expect(action).toBe('request');
      expect(valid).toBeTruthy();
      expect(JSON.stringify(input)).not.toContain(token);
      proxied++;
      return route.fulfill(upstream(new URL(input.url), input.method, input.body));
    });
    await page.goto(base.origin);
    await page.evaluate(user => {
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
    }, user);
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Test Plan name').fill('Retained Session');
    await dialog.getByLabel('Description').fill('One authorization, automatic reuse');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await dialog.getByLabel('Access token').fill(token);
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    await expect(dialog.getByLabel('Access token')).toHaveCount(0);
    expect(remembered).toBe(1);
    await dialog.getByLabel('Repository').selectOption('acme/performance');
    await expect(dialog.getByLabel('Branch')).toHaveValue('main');
    await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(commits).toBe(1);
    const directBeforeReload = direct;
    const cookie = (await context.cookies()).find(value => value.name === 'relampo_git_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain('relampo_git_session');
    await page.getByRole('button', { name: 'Open Retained Session in RelampoLab', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
    await (
      await chooser
    ).setFiles({
      name: 'retained.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(
        'test: {name: Retained script}\nscenarios:\n- name: Checkout\n  load: {type: constant, users: 1, iterations: 1}\n  steps:\n  - request: {name: Cart, method: GET, url: https://app.test/cart}\n',
      ),
    });
    const editor = page.frameLocator('iframe[data-plan-editor]');
    await expect(editor.getByText('Retained script', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Save Script', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect.poll(() => commits).toBe(2);
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reconnect (GitHub|GitLab)/ })).toHaveCount(0);
    expect(files.get('performance-tests/retained-session/Scripts/retained.yaml')).toContain('Retained script');
    expect(remembered).toBe(1);
    expect(direct).toBe(directBeforeReload);
    expect(proxied).toBeGreaterThan(0);
    const stored = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('relampo-git-plans');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction('plans');
        const request = tx.objectStore('plans').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + JSON.stringify(records);
    });
    expect(stored).not.toContain(token);
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await expect(dialog.getByText('Connected as', { exact: false })).toContainText('@acme');
    await expect(dialog.getByLabel('Access token')).toHaveCount(0);
    expect(remembered).toBe(1);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.evaluate(async kind => {
      const moduleURL = '/src/utils/gitAccount.ts';
      await (await import(moduleURL)).disconnectGitAccount(kind);
    }, provider);
    expect(authorized).toBe(false);
  });
}
