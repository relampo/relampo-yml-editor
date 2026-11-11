import { expect, test } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the prepared local SaaS server.');

for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: create a repository from an empty account, recover errors and select it for a plan`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    page.setDefaultTimeout(10000);
    const base = new URL(saasURL!);
    expect(['localhost', '127.0.0.1']).toContain(base.hostname);
    const posts: any[] = [];
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    };
    const files = new Map<string, string>();
    let created = false;
    let structureCommits = 0;
    let initialTree: any[] = [];
    const blobs = new Map<string, string>();
    const binaryPaths = new Set<string>();
    await context.route(
      provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**',
      async route => {
        const request = route.request(),
          path = new URL(request.url()).pathname;
        const respond = (json: unknown, status = 200) => route.fulfill({ headers, json, status });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (
          ((provider === 'github' && path === '/user/repos') ||
            (provider === 'gitlab' && path === '/api/v4/projects')) &&
          request.method() === 'POST'
        ) {
          const body = request.postDataJSON();
          posts.push(body);
          if (body.name === 'blocked') return respond({ message: 'Not allowed' }, 403);
          if (body.name === 'taken') return respond({ message: 'Already exists' }, 422);
          expect(body.name).toBe('new-performance');
          expect(body.description).toBe('Performance repository');
          if (provider === 'github') {
            expect(body.private).toBe(true);
            expect(body.auto_init).toBe(true);
          } else {
            expect(body.visibility).toBe('public');
            expect(body.initialize_with_readme).toBe(true);
            expect(body.namespace_id).toBeUndefined();
          }
          created = true;
          return respond(
            { full_name: 'acme/new-performance', path_with_namespace: 'acme/new-performance', default_branch: 'main' },
            201,
          );
        }
        if (path.endsWith('/git/blobs') && request.method() === 'POST') {
          const id = 'c'.repeat(40);
          blobs.set(id, request.postDataJSON().content);
          return respond({ sha: id }, 201);
        }
        if (path.includes('/git/trees/') && request.method() === 'GET') {
          const folders = new Set<string>();
          for (const file of files.keys()) {
            const parts = file.split('/');
            for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/'));
          }
          return respond({ truncated: false, tree: [...folders].map(path => ({ path, type: 'tree' })) });
        }
        if (provider === 'github' && path.endsWith('/git/trees')) {
          initialTree = request.postDataJSON().tree;
          return respond({ sha: 'e'.repeat(40) }, 201);
        }
        if (provider === 'github' && path.endsWith('/git/commits') && request.method() === 'POST')
          return respond({ sha: 'b'.repeat(40) }, 201);
        if (provider === 'github' && path.includes('/git/refs/heads/')) {
          structureCommits++;
          for (const entry of initialTree) {
            files.set(entry.path, entry.sha ? blobs.get(entry.sha)! : entry.content);
            if (entry.sha) binaryPaths.add(entry.path);
          }
          if (structureCommits === 1)
            expect(initialTree.map(item => item.path).sort()).toEqual([
              'performance-tests/new-repository-plan/Data/.gitkeep',
              'performance-tests/new-repository-plan/Scripts/.gitkeep',
              'performance-tests/new-repository-plan/Utilities/.gitkeep',
              'performance-tests/new-repository-plan/test-plan.yaml',
            ]);
          return respond({ object: { sha: 'b'.repeat(40) } });
        }
        if (provider === 'gitlab' && path.endsWith('/repository/commits') && request.method() === 'POST') {
          structureCommits++;
          expect(request.postDataJSON().actions).toHaveLength(structureCommits === 1 ? 4 : 1);
          for (const entry of request.postDataJSON().actions) {
            files.set(entry.file_path, entry.content);
            if (entry.encoding === 'base64') binaryPaths.add(entry.file_path);
          }
          return respond({ id: 'b'.repeat(40) }, 201);
        }
        if (provider === 'github' && path.includes('/git/commits/')) return respond({ tree: { sha: 'f'.repeat(40) } });
        expect(request.method()).toBe('GET');
        if (path === '/user' || path === '/api/v4/user') return respond({ login: 'acme', username: 'acme' });
        if (path === '/user/repos' || path === '/api/v4/projects') return respond([]);
        if (path.endsWith('/git/ref/heads/main')) return respond({ object: { sha: 'a'.repeat(40) } });
        if (path.endsWith('/repository/branches/main')) return respond({ commit: { id: 'a'.repeat(40) } });
        if (path.includes('/contents/') || path.includes('/repository/files/')) {
          const name = decodeURIComponent(
            path.split(path.includes('/contents/') ? '/contents/' : '/repository/files/')[1]!,
          );
          return files.has(name)
            ? respond({
                type: 'file',
                encoding: 'base64',
                content: binaryPaths.has(name) ? files.get(name) : Buffer.from(files.get(name)!).toString('base64'),
              })
            : [...files.keys()].some(key => key.startsWith(name + '/'))
              ? respond([{ type: 'file' }])
              : respond({}, 404);
        }
        if (path.endsWith('/repository/tree')) {
          const url = new URL(request.url());
          if (url.searchParams.get('recursive') === 'true') {
            const folders = new Set<string>();
            for (const file of files.keys()) {
              const parts = file.split('/');
              for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/'));
            }
            return respond([...folders].map(path => ({ path, type: 'tree' })));
          }
          return [...files.keys()].some(key => key.startsWith(url.searchParams.get('path')! + '/'))
            ? respond([{ type: 'blob' }])
            : respond({}, 404);
        }
        if (path.endsWith('/branches')) return respond([{ name: 'main' }]);
        expect(created).toBe(true);
        return respond({ default_branch: 'main', permissions: { push: true } });
      },
    );
    await page.goto(base.origin);
    await page.evaluate(provider => {
      const user = `create-repo-${provider}@example.invalid`;
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
      localStorage.setItem('relampo-theme', provider === 'github' ? 'light' : 'dark');
    }, provider);
    await page.goto(`${base.origin}/projects`);
    await page.getByRole('button', { name: 'New Plan', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('status')).toContainText('Enter a Test Plan name above.');
    await expect(dialog.getByRole('button', { name: 'Create Test Plan', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Complete details', exact: true }).click();
    await expect(dialog.getByLabel('Test Plan name')).toBeFocused();
    await dialog.getByLabel('Test Plan name').fill('New Repository Plan');
    await expect(dialog.getByRole('status')).toContainText('Enter a description above.');
    await dialog.getByRole('button', { name: 'Complete details', exact: true }).click();
    await expect(dialog.getByLabel('Description')).toBeFocused();
    await dialog.getByLabel('Description').fill('Storage in a new repository');
    await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption(provider);
    await dialog.getByLabel('Access token').fill('test-only-create-token');
    await dialog
      .getByRole('button', { name: provider === 'github' ? 'Connect GitHub' : 'Connect GitLab', exact: true })
      .click();
    const repository = dialog.getByRole('combobox', { name: 'Repository', exact: true });
    await expect(repository).toBeDisabled();
    expect(posts).toEqual([]);
    await dialog.getByRole('button', { name: 'New repository', exact: true }).click();
    await expect(dialog.getByLabel('Visibility', { exact: true })).toHaveValue('private');
    const name = dialog.getByLabel('Repository name', { exact: true });
    await name.fill('../outside');
    await dialog.getByRole('button', { name: 'Create repository', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('without spaces or slashes');
    expect(posts).toHaveLength(0);
    await name.fill('blocked');
    await dialog.getByRole('button', { name: 'Create repository', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      provider === 'github' ? 'Administration' : 'denied project creation',
    );
    await expect(name).toHaveValue('blocked');
    expect(posts).toHaveLength(1);
    await name.fill('taken');
    await dialog.getByRole('button', { name: 'Create repository', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('name may already exist');
    await expect(name).toHaveValue('taken');
    expect(posts).toHaveLength(2);
    await name.fill('new-performance');
    await dialog.getByLabel('Repository description (optional)', { exact: true }).fill('Performance repository');
    if (provider === 'gitlab') await dialog.getByLabel('Visibility', { exact: true }).selectOption('public');
    await page.screenshot({ path: `/tmp/relampo-new-repository-${provider}.png` });
    await dialog.getByRole('button', { name: 'Create repository', exact: true }).click();
    await expect(repository).toHaveValue('acme/new-performance');
    await expect(dialog.getByLabel('Branch')).toHaveValue('main');
    await expect(
      dialog.getByRole('status').filter({ hasText: 'Repository created: acme/new-performance' }),
    ).toBeVisible();
    expect(posts).toHaveLength(3);
    await expect(dialog.getByRole('button', { name: 'Create Test Plan', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Open New Repository Plan in RelampoLab', exact: true }),
    ).toBeVisible();
    expect(posts).toHaveLength(3);
    expect(structureCommits).toBe(1);
    const manifest = files.get('performance-tests/new-repository-plan/test-plan.yaml')!;
    const planId = manifest.match(/^id: (.+)$/m)![1]!;
    await page.evaluate(async id => {
      const moduleURL = '/src/utils/gitPlanStorage.ts';
      const git = await import(moduleURL);
      await git.stageGitScript(id, 'pending-script', 'pending.yaml', 'test: pending draft');
    }, planId);
    const storageLink = page.getByRole('link', {
      name: `${provider === 'github' ? 'GitHub' : 'GitLab'}: acme/new-performance`,
    });
    await expect(storageLink).toHaveAttribute('href', `https://${provider}.com/acme/new-performance`);
    await expect(storageLink).toHaveAttribute('target', '_blank');
    const add = page.getByRole('button', { name: 'Add new file to New Repository Plan', exact: true });
    await add.click();
    const upload = page.getByRole('dialog', { name: 'Add new file', exact: true });
    const destination = upload.getByLabel('Destination folder', { exact: true });
    await expect(destination).toHaveValue('Scripts');
    expect(await destination.locator('option').allTextContents()).toEqual(['Data/', 'Scripts/', 'Utilities/']);
    const csv = { name: 'users.csv', mimeType: 'text/csv', buffer: Buffer.from('name,id\nAna,1\n') };
    await upload.getByLabel('File to upload', { exact: true }).setInputFiles(csv);
    await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(upload.getByRole('alert')).toContainText('Scripts must use');
    expect(structureCommits).toBe(1);
    await destination.selectOption('Data');
    await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(upload).toHaveCount(0);
    expect(files.get('performance-tests/new-repository-plan/Data/users.csv')).toBe('name,id\nAna,1\n');
    expect(structureCommits).toBe(2);
    await add.click();
    await expect(destination).toHaveValue('Scripts');
    await destination.selectOption('Data');
    await upload.getByLabel('File to upload', { exact: true }).setInputFiles(csv);
    await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(upload.getByRole('alert')).toContainText('already exists');
    expect(structureCommits).toBe(2);
    await upload.getByLabel('File to upload', { exact: true }).setInputFiles({
      name: 'sample.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([0, 255, 128, 1]),
    });
    await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(upload).toHaveCount(0);
    expect(files.get('performance-tests/new-repository-plan/Data/sample.bin')).toBe(
      Buffer.from([0, 255, 128, 1]).toString('base64'),
    );
    expect(structureCommits).toBe(3);
    await add.click();
    await expect(destination).toHaveValue('Scripts');
    await upload.getByLabel('File to upload', { exact: true }).setInputFiles({
      name: 'uploaded.yaml',
      mimeType: 'application/yaml',
      buffer: Buffer.from('test:\n  name: Uploaded test\nscenarios: []\n'),
    });
    await upload.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(upload).toHaveCount(0);
    expect(structureCommits).toBe(4);
    expect(files.has('performance-tests/new-repository-plan/Scripts/pending.yaml')).toBe(false);
    const status = await page.evaluate(async id => {
      const moduleURL = '/src/utils/gitPlanStorage.ts';
      return (await import(moduleURL)).gitPlanStatus(id);
    }, planId);
    expect(status.paths).toEqual(['performance-tests/new-repository-plan/Scripts/pending.yaml']);
    await page.getByRole('button', { name: 'Open New Repository Plan in RelampoLab', exact: true }).click();
    await expect(
      page.frameLocator('iframe[data-plan-editor]').getByRole('combobox', { name: 'Plan script', exact: true }),
    ).toHaveValue(/.+/);
    await expect(
      page
        .frameLocator('iframe[data-plan-editor]')
        .getByRole('combobox', { name: 'Plan script', exact: true })
        .locator('option:checked'),
    ).toHaveText('uploaded.yaml');
  });
}

test('repository creation targets the selected GitHub organization and GitLab subgroup', async ({ page, context }) => {
  const base = new URL(saasURL!);
  expect(['localhost', '127.0.0.1']).toContain(base.hostname);
  const writes: { path: string; body: any }[] = [];
  await context.route(/https:\/\/(api\.github\.com|gitlab\.com)\/.*/, route => {
    const request = route.request(),
      url = new URL(request.url());
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    const respond = (json: unknown) => route.fulfill({ headers, json });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      writes.push({ path: url.pathname, body });
      if (url.host === 'api.github.com') return respond({ full_name: 'team/new-tests' });
      expect(body.namespace_id).toBe(42);
      return respond({ path_with_namespace: 'team/subgroup/new-tests' });
    }
    if (url.pathname.endsWith('/user')) return respond({ login: 'acme', username: 'acme' });
    if (url.pathname.includes('/namespaces/')) return respond({ id: 42, full_path: 'team/subgroup' });
    return respond([
      { full_name: 'team/existing', path_with_namespace: 'team/subgroup/existing', permissions: { push: true } },
    ]);
  });
  await page.goto(base.origin);
  const result = await page.evaluate(async () => {
    const moduleURL = '/src/utils/gitAccount.ts';
    const git = await import(moduleURL);
    await git.connectGitAccount('github', 'test-only-token');
    const github = await git.createGitRepository('github', {
      owner: 'team',
      name: 'new-tests',
      description: '',
      visibility: 'private',
    });
    await git.connectGitAccount('gitlab', 'test-only-token');
    const gitlab = await git.createGitRepository('gitlab', {
      owner: 'team/subgroup',
      name: 'new-tests',
      description: '',
      visibility: 'private',
    });
    return { github, gitlab };
  });
  expect(result.github.fullName).toBe('team/new-tests');
  expect(result.gitlab.fullName).toBe('team/subgroup/new-tests');
  expect(writes.map(item => item.path)).toEqual(['/orgs/team/repos', '/api/v4/projects']);
});
