import { expect, test } from './saas-git-fixture';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: save scripts directly to Git, retain other drafts, reconnect and protect remote edits`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(10000);
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    const token = `test-only-${provider}-not-a-real-token`;
    let head = 'a'.repeat(40),
      commits = 0;
    const files = new Map<string, { text: string; commit: string }>([
      ['README.md', { text: 'untouched', commit: head }],
    ]);
    let tree: any[] = [];
    const mutations: string[] = [];
    let denyScriptWrites = false;
    await context.route(
      provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**',
      async route => {
        const request = route.request(),
          url = new URL(request.url()),
          path = url.pathname;
        const headers = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*',
        };
        const respond = (json: unknown, status = 200) => route.fulfill({ status, json, headers });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        expect(request.headers()[provider === 'github' ? 'authorization' : 'private-token']).toBe(
          provider === 'github' ? `Bearer ${token}` : token,
        );
        if (request.method() !== 'GET') {
          mutations.push(request.method() + ' ' + path);
          if (denyScriptWrites) return respond({ message: 'Write denied' }, 403);
        }
        if (path === '/user' || path === '/api/v4/user') return respond({ login: 'acme', username: 'acme' });
        if (path === '/user/repos' || path === '/api/v4/projects')
          return respond([
            { full_name: 'acme/performance', path_with_namespace: 'acme/performance', permissions: { push: true } },
            { full_name: 'team/shared', path_with_namespace: 'team/shared', permissions: { push: true } },
            { full_name: 'acme/readonly', path_with_namespace: 'acme/readonly', permissions: { push: false } },
          ]);
        if (provider === 'github') {
          if (path === '/repos/acme/performance')
            return respond({ default_branch: 'main', permissions: { push: true } });
          if (path.endsWith('/branches')) return respond([{ name: 'main' }]);
          if (path.includes('/git/ref/heads/')) return respond({ object: { sha: head } });
          if (path.includes('/contents/')) {
            const name = decodeURIComponent(path.split('/contents/')[1]!);
            const file = files.get(name);
            if (file)
              return respond({ type: 'file', encoding: 'base64', content: Buffer.from(file.text).toString('base64') });
            if ([...files.keys()].some(key => key.startsWith(name + '/'))) return respond([{ type: 'file' }]);
            return respond({ message: 'Not Found' }, 404);
          }
          if (path.includes('/git/commits/') && request.method() === 'GET')
            return respond({ tree: { sha: 'f'.repeat(40) } });
          if (path.endsWith('/git/trees')) {
            const body = request.postDataJSON();
            expect(body.base_tree).toBe('f'.repeat(40));
            tree = body.tree;
            return respond({ sha: 'e'.repeat(40) }, 201);
          }
          if (path.endsWith('/git/commits')) {
            expect(request.postDataJSON().parents).toEqual([head]);
            return respond({ sha: String(commits + 1).repeat(40) }, 201);
          }
          if (path.includes('/git/refs/heads/')) {
            expect(request.postDataJSON().force).toBe(false);
            head = request.postDataJSON().sha;
            for (const entry of tree) {
              expect(entry.path).toMatch(/^performance-tests\/git-checkout\//);
              if (entry.sha === null) files.delete(entry.path);
              else files.set(entry.path, { text: entry.content, commit: head });
            }
            commits++;
            return respond({ object: { sha: head } });
          }
        } else {
          if (!path.includes('/repository/')) return respond({ default_branch: 'main' });
          if (path.endsWith('/repository/branches')) return respond([{ name: 'main' }]);
          if (path.includes('/repository/branches/')) return respond({ commit: { id: head } });
          if (path.endsWith('/repository/tree')) {
            const folder = url.searchParams.get('path')!;
            return respond(
              [...files.keys()].some(key => key.startsWith(folder + '/')) ? [{ type: 'blob' }] : [],
              [...files.keys()].some(key => key.startsWith(folder + '/')) ? 200 : 404,
            );
          }
          if (path.includes('/repository/files/')) {
            const name = decodeURIComponent(path.split('/repository/files/')[1]!);
            const file = files.get(name);
            return file
              ? respond({
                  encoding: 'base64',
                  content: Buffer.from(file.text).toString('base64'),
                  last_commit_id: file.commit,
                })
              : respond({ message: 'Not Found' }, 404);
          }
          if (path.endsWith('/repository/commits')) {
            const body = request.postDataJSON();
            expect(body.branch).toBe('main');
            expect(body.force).toBe(false);
            head = String(commits + 1).repeat(40);
            for (const action of body.actions) {
              expect(action.file_path).toMatch(/^performance-tests\/git-checkout\//);
              if (action.action === 'create') expect(files.has(action.file_path)).toBe(false);
              else expect(action.last_commit_id).toBe(files.get(action.file_path)?.commit);
              if (action.action === 'delete') files.delete(action.file_path);
              else files.set(action.file_path, { text: action.content, commit: head });
            }
            commits++;
            return respond({ id: head }, 201);
          }
        }
        throw new Error(`Unexpected fixture request: ${request.method()} ${path}`);
      },
    );
    // An already-open editor from before the publication feature omits the flag.
    // The explicit Save button must still publish, while background flushes do not.
    await context.addInitScript(() => {
      if (window.parent === window) return;
      const post = window.parent.postMessage;
      window.parent.postMessage = function (message: any, targetOrigin: any, transfer?: any) {
        if (message?.type === 'relampo:persist-script') {
          const legacy = { ...message };
          delete legacy.publish;
          return post.call(window.parent, legacy, targetOrigin, transfer);
        }
        return post.call(window.parent, message, targetOrigin, transfer);
      };
    });
    await page.goto(base.origin);
    await page.evaluate(provider => {
      const user = `git-${provider}@example.invalid`;
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
      localStorage.setItem('relampo-theme', provider === 'github' ? 'light' : 'dark');
    }, provider);
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Test Plan name').fill('Git Checkout');
    await dialog.getByLabel('Description').fill('Versioned performance plan');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await expect(dialog.getByLabel('Repository')).toHaveCount(0);
    await dialog.getByLabel('Access token').fill(token);
    await expect(dialog.getByRole('button', { name: 'Create Test Plan', exact: true })).toBeDisabled();
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    await expect(dialog.getByRole('status').filter({ hasText: 'Connected as @acme' })).toBeVisible();
    await expect(dialog.getByLabel('Account or organization')).toHaveValue('acme');
    await expect(dialog.getByLabel('Repository').locator('option')).toHaveText(['Select a repository', 'performance']);
    await dialog.getByLabel('Account or organization').selectOption('team');
    await expect(dialog.getByLabel('Repository').locator('option')).toHaveText(['Select a repository', 'shared']);
    await dialog.getByLabel('Account or organization').selectOption('acme');
    await dialog.getByLabel('Repository').selectOption('acme/performance');
    await expect(dialog.getByLabel('Branch')).toHaveValue('main');
    await expect(dialog.getByLabel('Access token')).toHaveCount(0);
    await expect(dialog.locator('[data-plan-location]')).toContainText('performance-tests/git-checkout');
    await page.screenshot({ path: `/tmp/relampo-create-${provider}-plan.png` });
    await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(commits).toBe(1);
    expect(files.has('performance-tests/git-checkout/test-plan.yaml')).toBe(true);
    for (const directory of ['Scripts', 'Data', 'Utilities'])
      expect(files.has(`performance-tests/git-checkout/${directory}/.gitkeep`)).toBe(true);
    const initializationWrites = mutations.length;

    await page.getByRole('button', { name: 'Open Git Checkout in RelampoLab', exact: true }).click();
    const editor = page.frameLocator('iframe[data-plan-editor]');
    await expect(page.getByRole('button', { name: 'Import YAML', exact: true })).toBeEnabled();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import YAML', exact: true }).click();
    await (
      await chooser
    ).setFiles({
      name: 'checkout.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(
        `test: {name: Git script}\nscenarios:\n- name: Checkout\n  load: {type: constant, users: 1, iterations: 1}\n  steps:\n  - request: {name: Cart, method: GET, url: https://app.test/cart}\n`,
      ),
    });
    await expect(editor.getByText('Git script', { exact: true })).toBeVisible();
    expect(mutations).toHaveLength(initializationWrites); // Import retains a draft, without publishing.
    denyScriptWrites = true;
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '403' }).first()).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Update script', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    expect(commits).toBe(1);
    const planId = new URL(page.url()).searchParams.get('plan')!;
    await page.evaluate(async id => {
      const moduleURL = '/src/utils/gitPlanStorage.ts';
      const storage = await import(moduleURL);
      await storage.stageGitScript(id, 'other-draft', 'other.yaml', 'test: other pending script');
    }, planId);
    denyScriptWrites = false;
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect.poll(() => commits).toBe(2);
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Script updated', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    expect(files.get('performance-tests/git-checkout/Scripts/checkout.yaml')?.text).toContain('Git script');
    expect(files.has('performance-tests/git-checkout/Scripts/other.yaml')).toBe(false);
    expect(files.get('README.md')?.text).toBe('untouched');
    // Saving unchanged content is acknowledged without another commit.
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Script updated', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    expect(commits).toBe(2);
    await page.getByRole('button', { name: 'Plan settings', exact: true }).click();
    await expect(dialog.getByText('Pending changes (1)', { exact: true })).toBeVisible();
    expect(commits).toBe(2); // Opening settings does not publish drafts.
    await dialog.getByRole('button', { name: 'Disconnect account', exact: true }).click();
    await dialog.getByLabel('Access token').fill(token);
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    await expect(dialog.getByLabel('Access token')).toHaveCount(0);
    await dialog.getByLabel('Commit message', { exact: true }).fill('feat(tests): publish other draft');
    await dialog.getByRole('button', { name: 'Commit & Push', exact: true }).click();
    await expect(dialog.getByText('No pending changes.', { exact: true })).toBeVisible();
    expect(commits).toBe(3);
    expect(files.get('performance-tests/git-checkout/Scripts/other.yaml')?.text).toContain('other pending');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    // Losing a repository binding must recover through the already-authorized account.
    await page.evaluate(async kind => {
      const providerURL = '/src/utils/gitProvider.ts';
      (await import(providerURL)).disconnectGitProvider(kind);
    }, provider);
    const autoRequest = editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Cart' }).last();
    await autoRequest.click();
    await editor.getByLabel('Path', { exact: true }).fill('/silent-recovery');
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect.poll(() => commits).toBe(4);
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Script updated', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: provider === 'github' ? 'Reconnect GitHub' : 'Reconnect GitLab', exact: true }),
    ).toHaveCount(0);
    expect(files.get('performance-tests/git-checkout/Scripts/checkout.yaml')?.text).toContain('/silent-recovery');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Save Script', exact: true })).toBeEnabled();
    const request = editor.locator('[role="treeitem"]:visible').filter({ hasText: 'Cart' }).last();
    await request.click();
    await editor.getByLabel('Path', { exact: true }).fill('/after-reconnect');
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    const reconnect = page.getByRole('button', {
      name: provider === 'github' ? 'Reconnect GitHub' : 'Reconnect GitLab',
      exact: true,
    });
    await page
      .getByRole('dialog', { name: 'Update script', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    await reconnect.click();
    const connection = page.getByRole('dialog', {
      name: provider === 'github' ? 'Reconnect GitHub' : 'Reconnect GitLab',
      exact: true,
    });
    await expect(connection.getByLabel('Access token')).toBeVisible();
    await expect(connection.getByLabel('Test Plan name')).toHaveCount(0);
    await expect(connection.getByLabel('Commit message')).toHaveCount(0);
    await expect(connection).toContainText('acme/performance');
    expect(commits).toBe(4);
    const studioURL = page.url();
    await connection.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(connection).toHaveCount(0);
    expect(commits).toBe(4);
    await reconnect.click();
    await connection.getByLabel('Access token').fill(token);
    await page.screenshot({ path: `/tmp/relampo-reconnect-in-studio-${provider}.png`, animations: 'disabled' });
    await connection
      .getByRole('button', { name: `Connect ${provider === 'github' ? 'GitHub' : 'GitLab'} and save`, exact: true })
      .click();
    await expect(connection).toHaveCount(0);
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Script updated', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(page.url()).toBe(studioURL);
    expect(commits).toBe(5);
    expect(files.get('performance-tests/git-checkout/Scripts/checkout.yaml')?.text).toContain('/after-reconnect');
    await editor.getByLabel('Path', { exact: true }).fill('/edited');
    head = 'd'.repeat(40); // An unrelated remote commit can be incorporated safely.
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect.poll(() => commits).toBe(6);
    await expect(page.getByText('Script saved', { exact: true })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Script updated', exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    expect(files.get('performance-tests/git-checkout/Scripts/checkout.yaml')?.text).toContain('/edited');
    // A denied rename retains both the new file and old-path deletion for retry.
    const renamedContent = files.get('performance-tests/git-checkout/Scripts/checkout.yaml')!.text;
    denyScriptWrites = true;
    const renameError = await page.evaluate(
      async ({ id, yaml }) => {
        const moduleURL = '/src/utils/gitPlanStorage.ts';
        try {
          await (await import(moduleURL)).saveGitScript(id, 'default', 'renamed.yaml', yaml);
          return '';
        } catch (cause) {
          return String(cause);
        }
      },
      { id: planId, yaml: renamedContent },
    );
    expect(renameError).toContain('403');
    expect(commits).toBe(6);
    denyScriptWrites = false;
    await page.evaluate(
      async ({ id, yaml }) => {
        const moduleURL = '/src/utils/gitPlanStorage.ts';
        const storage = await import(moduleURL);
        await storage.saveGitScript(id, 'default', 'renamed.yaml', yaml);
      },
      { id: planId, yaml: renamedContent },
    );
    expect(commits).toBe(7);
    expect(files.has('performance-tests/git-checkout/Scripts/checkout.yaml')).toBe(false);
    expect(files.get('performance-tests/git-checkout/Scripts/renamed.yaml')?.text).toBe(renamedContent);
    await page.evaluate(
      async ({ id, yaml }) => {
        const moduleURL = '/src/utils/gitPlanStorage.ts';
        await (await import(moduleURL)).saveGitScript(id, 'default', 'checkout.yaml', yaml);
      },
      { id: planId, yaml: renamedContent },
    );
    expect(commits).toBe(8);
    expect(files.has('performance-tests/git-checkout/Scripts/renamed.yaml')).toBe(false);
    await editor.getByLabel('Path', { exact: true }).fill('/another-edit');
    head = 'e'.repeat(40);
    files.set('performance-tests/git-checkout/Scripts/checkout.yaml', { text: 'remote edit', commit: head });
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Update script', exact: true }).getByRole('radio', { name: /Use mine/ }),
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Keep editing', exact: true }).click();
    expect(commits).toBe(8);
    expect(files.get('performance-tests/git-checkout/Scripts/checkout.yaml')?.text).toBe('remote edit');
    await page.getByRole('button', { name: 'Plan settings', exact: true }).click();
    await expect(dialog.getByText('Pending changes (1)', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Refresh branch', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Remote file changed');
    const staleReview = await page.evaluate(async () => {
      const storageURL = '/src/utils/gitPlanStorage.ts';
      const storage = await import(storageURL);
      const providerURL = '/src/utils/gitProvider.ts';
      const git = await import(providerURL);
      const id = new URL(window.location.href).searchParams.get('plan')!;
      const status = await storage.gitPlanStatus(id);
      let message = '';
      try {
        await storage.commitGitPlan(id, 'test-only stale review', status.revision - 1);
      } catch (error) {
        message = (error as Error).message;
      }
      const user = localStorage.getItem('relampo-current-user')!;
      localStorage.setItem('relampo-current-user', 'another-account@example.invalid');
      const other = await storage.gitPlanStatus(id);
      const connected = git.gitConnected({
        kind: user.includes('github') ? 'github' : 'gitlab',
        repository: 'acme/performance',
      });
      localStorage.setItem('relampo-current-user', user);
      return { message, other: other.paths, connected };
    });
    expect(staleReview.message).toContain('Pending files changed');
    expect(staleReview.other).toEqual([]);
    expect(staleReview.connected).toBe(false);
    expect(commits).toBe(8);
    const persistent = await page.evaluate(async () => {
      const raw = JSON.stringify(localStorage);
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open('relampo-git-plans');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('plans');
          const all = tx.objectStore('plans').getAll();
          all.onsuccess = () => resolve(all.result);
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
      });
      return raw + JSON.stringify(records);
    });
    expect(persistent).not.toContain(token);
  });
}

test('Git connections reject untrusted hosts, unsafe paths and read-only access without writing remotely', async ({
  page,
  context,
}) => {
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  const requests: string[] = [];
  await context.route('https://api.github.com/**', route => {
    requests.push(route.request().method() + ' ' + route.request().url());
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { default_branch: 'main', permissions: { push: false } },
    });
  });
  await page.goto(base.origin);
  const result = await page.evaluate(async () => {
    const moduleURL = '/src/utils/gitProvider.ts';
    const git = await import(moduleURL);
    const rejected: string[] = [];
    for (const input of [
      'https://github.com.evil.example/org/repo',
      'https://token@github.com/org/repo',
      'https://github.com/org/repo?token=secret',
      'https://gitlab.com/org/repo',
    ]) {
      try {
        await git.connectGit('github', input, 'test-only-secret');
      } catch {
        rejected.push(input);
      }
    }
    const folders = ['../outside', '.git', 'base/../outside', 'base//folder'].map(path => {
      try {
        git.gitFolder(path);
        return false;
      } catch {
        return true;
      }
    });
    let permission = '';
    try {
      await git.connectGit('github', 'acme/readonly', 'test-only-secret');
    } catch (error) {
      permission = (error as Error).message;
    }
    return {
      rejected,
      folders,
      permission,
      connected: git.gitConnected({ kind: 'github', repository: 'acme/readonly' }),
      nested: git.repositoryName('gitlab', 'group/subgroup/repo'),
      invalidBranches: ['../main', 'a.lock', '/main', 'a b', 'a..b'].map(branch => git.validBranch(branch)),
    };
  });
  expect(result.rejected).toHaveLength(4);
  expect(result.folders).toEqual([true, true, true, true]);
  expect(result.invalidBranches).toEqual([false, false, false, false, false]);
  expect(result.nested).toBe('group/subgroup/repo');
  expect(result.connected).toBe(false);
  expect(result.permission).toContain('no write access');
  expect(requests).toEqual(['GET https://api.github.com/repos/acme/readonly']);
});

test('account discovery paginates repositories, keeps the detected owner and invalidates an expired connection', async ({
  page,
  context,
}) => {
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  const pages: string[] = [];
  let expired = false;
  await context.route('https://api.github.com/**', route => {
    const url = new URL(route.request().url());
    expect(route.request().method()).toBe('GET');
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (url.pathname === '/user') return route.fulfill({ headers, json: { login: 'detected-user' } });
    if (url.pathname === '/user/repos') {
      pages.push(url.searchParams.get('page')!);
      const names =
        url.searchParams.get('page') === '1'
          ? Array.from({ length: 100 }, (_, index) => `repo-${index}`)
          : ['last-repository'];
      return route.fulfill({
        headers,
        json: names.map(name => ({ full_name: `detected-user/${name}`, permissions: { push: true } })),
      });
    }
    expired = true;
    return route.fulfill({ status: 401, headers, json: { message: 'Expired token' } });
  });
  await page.goto(base.origin);
  await page.evaluate(() => {
    const user = 'git-pages@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
  });
  await page.goto(`${base.origin}/projects`);
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption('github');
  await expect(dialog.getByLabel('Repository')).toHaveCount(0);
  await dialog.getByLabel('Access token').fill('test-only-pagination-token');
  await dialog.getByRole('button', { name: 'Connect GitHub', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'Connected as @detected-user' })).toBeVisible();
  await expect(dialog.getByLabel('Account or organization')).toHaveValue('detected-user');
  await expect(dialog.getByLabel('Repository').locator('option')).toHaveCount(101);
  await dialog.getByRole('button', { name: 'Load more repositories', exact: true }).click();
  await expect(dialog.getByLabel('Repository').locator('option')).toHaveCount(102);
  await expect(dialog.getByRole('button', { name: 'Load more repositories', exact: true })).toHaveCount(0);
  expect(pages).toEqual(['1', '2']);
  await dialog.getByLabel('Repository').selectOption('detected-user/last-repository');
  await expect(dialog.getByLabel('Access token')).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('401');
  await expect(dialog.getByRole('button', { name: 'Create Test Plan', exact: true })).toBeDisabled();
  expect(expired).toBe(true);
});
