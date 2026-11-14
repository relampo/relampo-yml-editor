import { expect, test } from './saas-git-fixture';
import type { Page, BrowserContext } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL.');
async function fixture(
  page: Page,
  context: BrowserContext,
  options: {
    denyBootstrap?: boolean;
    lostBootstrapReply?: boolean;
    denyFinal?: boolean;
    nonEmptyConflict?: boolean;
    emptyBranches409?: boolean;
    initializeDuringCreation?: boolean;
  } = {},
) {
  let head: string | null = options.nonEmptyConflict ? 'a'.repeat(40) : null;
  const files = new Map<string, string>();
  if (head) files.set('README.md', 'Keep this collaborator file.');
  let pendingTree: Array<{ path: string; content: string }> = [];
  let bootstrapWrites = 0,
    treeWrites = 0,
    refWrites = 0,
    branchQueries = 0;
  const bootstrapBodies: any[] = [];
  const state = { ...options };
  await context.route('https://api.github.com/**', async route => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    };
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status, headers });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    expect(req.headers().authorization).toBe('Bearer test-only-empty-repo-token');
    if (path === '/user') return respond({ login: 'collaborator' });
    if (path === '/user/repos') return respond([{ full_name: 'friend/empty', permissions: { push: true } }]);
    expect(path.startsWith('/repos/friend/empty')).toBe(true);
    if (path === '/repos/friend/empty')
      return respond({ default_branch: 'main', permissions: { push: true }, size: head ? 1 : 0 });
    if (path.endsWith('/branches')) {
      branchQueries++;
      if (!head && state.initializeDuringCreation && branchQueries > 1) {
        head = 'a'.repeat(40);
        files.set('README.md', 'Keep this collaborator file.');
      }
      if (!head && state.emptyBranches409) return respond({ message: 'Git Repository is empty.' }, 409);
      return respond(head ? [{ name: 'main' }] : []);
    }
    if (path.includes('/git/ref/heads/')) {
      if (state.nonEmptyConflict) return respond({ message: 'Reference update conflict' }, 409);
      return head ? respond({ object: { sha: head } }) : respond({ message: 'Git Repository is empty.' }, 409);
    }
    if (path.includes('/contents/')) {
      const name = decodeURIComponent(path.split('/contents/')[1]!);
      if (req.method() === 'PUT') {
        bootstrapWrites++;
        const body = req.postDataJSON();
        bootstrapBodies.push(body);
        expect(name).toBe('performance-tests/shared-empty/test-plan.yaml');
        expect(body.branch).toBe('main');
        expect(body.sha).toBeUndefined();
        expect(body.author).toBeUndefined();
        expect(body.committer).toBeUndefined();
        if (state.denyBootstrap) return respond({ message: 'Resource not accessible by personal access token' }, 403);
        if (files.has(name)) return respond({ message: 'sha is required for updating an existing file' }, 422);
        files.set(name, Buffer.from(body.content, 'base64').toString('utf8'));
        head = '1'.repeat(40);
        if (state.lostBootstrapReply) {
          state.lostBootstrapReply = false;
          return route.abort('failed');
        }
        return respond({ commit: { sha: head }, content: { path: name } }, 201);
      }
      if (files.has(name))
        return respond({ type: 'file', encoding: 'base64', content: Buffer.from(files.get(name)!).toString('base64') });
      if ([...files.keys()].some(key => key.startsWith(name + '/'))) return respond([{ type: 'dir' }]);
      return respond({ message: 'Not Found' }, 404);
    }
    if (path.includes('/git/commits/') && req.method() === 'GET') return respond({ tree: { sha: 'f'.repeat(40) } });
    if (path.includes('/git/trees/') && req.method() === 'GET')
      return respond({ tree: [...files.keys()].map(path => ({ path, type: 'blob' })), truncated: false });
    if (path.endsWith('/git/trees')) {
      treeWrites++;
      expect(head).not.toBeNull();
      const body = req.postDataJSON();
      expect(body.base_tree).toBe('f'.repeat(40));
      pendingTree = body.tree;
      return respond({ sha: 'e'.repeat(40) }, 201);
    }
    if (path.endsWith('/git/commits')) {
      expect(req.postDataJSON().parents).toEqual([head]);
      return respond({ sha: '2'.repeat(40) }, 201);
    }
    if (path.includes('/git/refs/heads/') && req.method() === 'PATCH') {
      refWrites++;
      expect(req.postDataJSON().force).toBe(false);
      if (state.denyFinal) return respond({ message: 'Protected branch update failed' }, 403);
      for (const item of pendingTree) files.set(item.path, item.content);
      head = req.postDataJSON().sha;
      return respond({ object: { sha: head } });
    }
    throw new Error('Unhandled synthetic GitHub request: ' + req.method() + ' ' + path);
  });
  await page.goto(new URL(saasURL!).origin);
  await page.evaluate(() => {
    const user = 'empty-collaborator@example.invalid';
    localStorage.setItem('relampo-auth', 'true');
    localStorage.setItem('relampo-current-user', user);
    localStorage.setItem(`relampo-onboarding-${user}`, 'true');
    localStorage.setItem('relampo-language', 'en');
  });
  await page.goto(new URL('/projects', saasURL!).href);
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Test Plan name').fill('Shared Empty');
  await dialog.getByLabel('Description').fill('Prueba compartida: ejecución con Unicode.');
  await dialog.getByRole('combobox', { name: 'Save in', exact: true }).selectOption('github');
  await dialog.getByLabel('Access token').fill('test-only-empty-repo-token');
  await dialog.getByRole('button', { name: 'Connect GitHub', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'Connected as @collaborator' })).toBeVisible();
  await dialog.getByLabel('Repository').selectOption('friend/empty');
  await expect(dialog.getByLabel('Branch')).toHaveValue('main');
  if (!options.nonEmptyConflict)
    await expect(dialog.getByRole('status').filter({ hasText: 'Empty repository.' })).toBeVisible();
  return {
    dialog,
    files,
    state,
    bootstrapBodies,
    counts: () => ({ bootstrapWrites, treeWrites, refWrites }),
    create: () => dialog.getByRole('button', { name: 'Create Test Plan', exact: true }).click(),
  };
}

test('initializes an empty collaborator repository with the Test Plan and all three folders', async ({
  page,
  context,
}) => {
  const f = await fixture(page, context);
  await f.create();
  await expect(f.dialog).toHaveCount(0);
  expect(f.counts()).toEqual({ bootstrapWrites: 1, treeWrites: 1, refWrites: 1 });
  const prefix = 'performance-tests/shared-empty';
  for (const name of ['test-plan.yaml', 'Scripts/.gitkeep', 'Data/.gitkeep', 'Utilities/.gitkeep'])
    expect(f.files.has(`${prefix}/${name}`)).toBe(true);
  expect(f.files.get(`${prefix}/test-plan.yaml`)).toContain('ejecución con Unicode');
  expect(f.files.has('README.md')).toBe(false);
});

test('retains the form after denied bootstrap and succeeds without reconnecting when write access is restored', async ({
  page,
  context,
}) => {
  const f = await fixture(page, context, { denyBootstrap: true });
  await f.create();
  await expect(f.dialog.getByRole('alert')).toContainText('403');
  await expect(f.dialog.getByLabel('Test Plan name')).toHaveValue('Shared Empty');
  expect(f.files.size).toBe(0);
  f.state.denyBootstrap = false;
  await f.create();
  await expect(f.dialog).toHaveCount(0);
  expect(f.counts().bootstrapWrites).toBe(2);
});

for (const lost of [true, false])
  test(`resumes a matching partial Test Plan after ${lost ? 'a lost initial reply' : 'a denied folder commit'}`, async ({
    page,
    context,
  }) => {
    const f = await fixture(page, context, { lostBootstrapReply: lost, denyFinal: !lost });
    await f.create();
    await expect(f.dialog.getByRole('alert')).toBeVisible();
    expect(f.files.size).toBe(1);
    const manifest = f.files.get('performance-tests/shared-empty/test-plan.yaml');
    f.state.denyFinal = false;
    await f.create();
    await expect(f.dialog).toHaveCount(0);
    expect(f.files.size).toBe(4);
    expect(f.files.get('performance-tests/shared-empty/test-plan.yaml')).toBe(manifest);
    expect(f.counts().bootstrapWrites).toBe(1);
  });

test('does not adopt or overwrite a different plan after a partial initialization', async ({ page, context }) => {
  const f = await fixture(page, context, { denyFinal: true });
  await f.create();
  await expect(f.dialog.getByRole('alert')).toBeVisible();
  f.files.set('performance-tests/shared-empty/test-plan.yaml', 'version: 1\nid: another-plan\n');
  const before = f.counts();
  f.state.denyFinal = false;
  await f.create();
  await expect(f.dialog.getByRole('alert')).toContainText('already exists');
  expect(f.counts()).toEqual(before);
  expect(f.files.get('performance-tests/shared-empty/test-plan.yaml')).toContain('another-plan');
});

test('a normal conflict does not initialize the repository or incorrectly blame the access token', async ({
  page,
  context,
}) => {
  const f = await fixture(page, context, { nonEmptyConflict: true });
  await f.create();
  const error = f.dialog.getByRole('alert').last();
  await expect(error).toContainText('409');
  await expect(error).not.toContainText('Check the token');
  expect(f.counts()).toEqual({ bootstrapWrites: 0, treeWrites: 0, refWrites: 0 });
  expect(f.files.get('README.md')).toBe('Keep this collaborator file.');
});

test('initializes when GitHub also reports 409 while listing empty branches', async ({ page, context }) => {
  const f = await fixture(page, context, { emptyBranches409: true });
  await f.create();
  await expect(f.dialog).toHaveCount(0);
  expect(f.files.size).toBe(4);
  expect(f.counts().bootstrapWrites).toBe(1);
});

test('uses a collaborator first commit if the repository is initialized during creation', async ({ page, context }) => {
  const f = await fixture(page, context, { initializeDuringCreation: true });
  await f.create();
  await expect(f.dialog).toHaveCount(0);
  expect(f.counts()).toEqual({ bootstrapWrites: 0, treeWrites: 1, refWrites: 1 });
  expect(f.files.get('README.md')).toBe('Keep this collaborator file.');
  expect(f.files.size).toBe(5);
});

test('does not initialize an empty repository on an unrelated branch', async ({ page, context }) => {
  const f = await fixture(page, context);
  await f.dialog.getByLabel('Branch').fill('release/test');
  await f.create();
  await expect(f.dialog.getByRole('alert')).toContainText('default branch (main)');
  expect(f.counts()).toEqual({ bootstrapWrites: 0, treeWrites: 0, refWrites: 0 });
  expect(f.files.size).toBe(0);
});
