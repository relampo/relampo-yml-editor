import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: a Test Plan registers only after its folders exist and retries a lost acknowledgement safely`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    page.setDefaultTimeout(10000);
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    };
    const files = new Map<string, string>();
    let head = 'a'.repeat(40),
      denied = true,
      commits = 0,
      tree: any[] = [];
    await context.route(provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**', route => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname;
      const respond = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (path === '/user' || path === '/api/v4/user') return respond({ login: 'acme', username: 'acme' });
      if (path === '/user/repos' || path === '/api/v4/projects')
        return respond([
          { full_name: 'acme/performance', path_with_namespace: 'acme/performance', permissions: { push: true } },
        ]);
      if (path.endsWith('/branches')) return respond([{ name: 'main' }]);
      if (path.includes('/git/ref/heads/')) return respond({ object: { sha: head } });
      if (path.includes('/repository/branches/')) return respond({ commit: { id: head } });
      if (path.includes('/contents/')) {
        const name = decodeURIComponent(path.split('/contents/')[1]!);
        return files.has(name)
          ? respond({ type: 'file', encoding: 'base64', content: Buffer.from(files.get(name)!).toString('base64') })
          : [...files.keys()].some(key => key.startsWith(name + '/'))
            ? respond([{ type: 'file' }])
            : respond({}, 404);
      }
      if (path.endsWith('/repository/tree')) return files.size ? respond([{ type: 'blob' }]) : respond({}, 404);
      if (path.includes('/repository/files/')) {
        const name = decodeURIComponent(path.split('/repository/files/')[1]!);
        return files.has(name)
          ? respond({ encoding: 'base64', content: Buffer.from(files.get(name)!).toString('base64') })
          : respond({}, 404);
      }
      if (path.includes('/git/commits/') && request.method() === 'GET')
        return respond({ tree: { sha: 'f'.repeat(40) } });
      if (path.endsWith('/git/trees')) {
        if (denied) return respond({}, 403);
        tree = request.postDataJSON().tree;
        return respond({ sha: 'e'.repeat(40) }, 201);
      }
      if (path.endsWith('/git/commits') && request.method() === 'POST') return respond({ sha: 'b'.repeat(40) }, 201);
      if (path.includes('/git/refs/heads/')) {
        for (const entry of tree) files.set(entry.path, entry.content);
        head = 'b'.repeat(40);
        commits++;
        return respond({ message: 'Reply lost after successful ref update' }, 503);
      }
      if (path.endsWith('/repository/commits')) {
        if (denied) return respond({}, 403);
        for (const action of request.postDataJSON().actions) files.set(action.file_path, action.content);
        head = 'b'.repeat(40);
        commits++;
        return respond({ message: 'Reply lost after successful commit' }, 503);
      }
      return respond({ default_branch: 'main', permissions: { push: true } });
    });
    await page.goto(base.origin);
    await page.evaluate(provider => {
      const user = `initialize-${provider}@example.invalid`;
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
    }, provider);
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Test Plan name').fill('Reliable Plan');
    await dialog.getByLabel('Description').fill('Initialize folders');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await dialog.getByLabel('Access token').fill('test-only-init-token');
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    await dialog.getByLabel('Repository').selectOption('acme/performance');
    await expect(dialog.getByLabel('Branch')).toHaveValue('main');
    const create = dialog.getByRole('button', { name: 'Create Test Plan', exact: true });
    await create.click();
    await expect(dialog.getByRole('alert')).toContainText('403');
    expect(commits).toBe(0);
    expect(files.size).toBe(0);
    await expect(page.getByRole('button', { name: 'Open Reliable Plan in RelampoLab', exact: true })).toHaveCount(0);
    denied = false;
    await create.click();
    await expect(dialog.getByRole('alert')).toContainText('503');
    expect(commits).toBe(1);
    expect(files.size).toBe(4);
    const manifest = files.get('performance-tests/reliable-plan/test-plan.yaml');
    await expect(page.getByRole('button', { name: 'Open Reliable Plan in RelampoLab', exact: true })).toHaveCount(0);
    await create.click();
    await expect(dialog).toHaveCount(0);
    expect(commits).toBe(1);
    expect(files.get('performance-tests/reliable-plan/test-plan.yaml')).toBe(manifest);
    await expect(page.getByRole('button', { name: 'Open Reliable Plan in RelampoLab', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    await dialog.getByLabel('Test Plan name').fill('Reliable Plan');
    await dialog.getByLabel('Description').fill('Another plan');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await dialog.getByLabel('Repository').selectOption('acme/performance');
    await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('already exists');
    expect(commits).toBe(1);
  });
}
