import { expect, test } from './saas-git-fixture';
import type { Page, BrowserContext } from '@playwright/test';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL.');
const head = 'a'.repeat(40);
const base = 'performance-tests/team-checkout';
const yaml =
  'test: {name: Shared checkout}\nscenarios:\n- name: Team flow\n  steps:\n  - request: {name: Shared health, method: GET, url: "https://example.invalid/health"}\n';
const manifest = (id = 'tp-team-existing', name = 'Team Checkout') =>
  `version: 1\nid: ${id}\nname: ${name}\ndescription: Shared QA plan\ndirectories: {scripts: Scripts, data: Data, utilities: Utilities}\n`;
async function fixture(
  page: Page,
  context: BrowserContext,
  options: {
    gitlab?: boolean;
    missing?: boolean;
    invalid?: boolean;
    stale?: boolean;
    duplicate?: boolean;
    readOnly?: boolean;
    draft?: boolean;
  } = {},
) {
  const files = new Map<string, string>([
    [`${base}/test-plan.yaml`, options.invalid ? 'not: a-relampo-plan' : manifest()],
    [`${base}/Scripts/health.yaml`, yaml],
    [`${base}/Scripts/login.yaml`, yaml.replace('Shared health', 'Team login')],
    [`${base}/Data/.gitkeep`, ''],
    [`${base}/Utilities/.gitkeep`, ''],
    ['README.md', 'Do not modify'],
    ['another/plan/test-plan.yaml', manifest('tp-team-other', 'Other plan')],
    ['another/plan/Scripts/.gitkeep', ''],
    ['another/plan/Data/.gitkeep', ''],
    ['another/plan/Utilities/.gitkeep', ''],
  ]);
  if (options.missing) files.delete(`${base}/Data/.gitkeep`);
  let writes = 0,
    refs = 0;
  const tree = () => [...files.keys()].map(path => ({ path, type: 'blob' }));
  await context.route(options.gitlab ? 'https://gitlab.com/api/v4/**' : 'https://api.github.com/**', async route => {
    const request = route.request(),
      url = new URL(request.url()),
      path = decodeURIComponent(url.pathname);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    };
    const send = (json: unknown, status = 200) => route.fulfill({ json, status, headers });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.method() !== 'GET') {
      writes++;
      return send({ message: 'Opening a plan must never write' }, 403);
    }
    if (path === '/user') return send({ login: 'collaborator' });
    if (path === '/api/v4/user') return send({ username: 'collaborator' });
    if (path === '/user/repos') return send([{ full_name: 'friend/team', permissions: { push: !options.readOnly } }]);
    if (path === '/api/v4/projects') return send([{ path_with_namespace: 'friend/team' }]);
    if (path === '/repos/friend/team' || path === '/api/v4/projects/friend/team')
      return send({ default_branch: 'main', permissions: { push: !options.readOnly } });
    if (path.endsWith('/branches')) return send([{ name: 'main' }, { name: 'qa' }]);
    if (path.includes('/git/ref/heads/') || path.includes('/repository/branches/')) {
      refs++;
      const sha = options.stale && refs > 2 ? 'b'.repeat(40) : head;
      return send({ object: { sha }, commit: { id: sha } });
    }
    if (path.includes('/git/commits/')) return send({ tree: { sha: 'f'.repeat(40) } });
    if (path.includes('/git/trees/') || path.endsWith('/repository/tree'))
      return send(options.gitlab ? tree() : { tree: tree(), truncated: false });
    const file = path.includes('/contents/')
      ? path.split('/contents/')[1]!
      : path.includes('/repository/files/')
        ? path.split('/repository/files/')[1]!
        : '';
    if (file) {
      if (files.has(file))
        return send({ encoding: 'base64', type: 'file', content: Buffer.from(files.get(file)!).toString('base64') });
      if ([...files.keys()].some(key => key.startsWith(file + '/'))) return send([{ type: 'dir' }]);
      return send({ message: 'Not Found' }, 404);
    }
    throw new Error('Unhandled mocked read ' + path);
  });
  await page.goto(new URL(saasURL!).origin);
  await page.evaluate(
    ({ duplicate }) => {
      const user = 'open-shared@example.invalid';
      localStorage.setItem('relampo-auth', 'true');
      localStorage.setItem('relampo-current-user', user);
      localStorage.setItem(`relampo-onboarding-${user}`, 'true');
      localStorage.setItem('relampo-language', 'en');
      localStorage.setItem(
        `relampo-test-plans:${encodeURIComponent(user)}`,
        JSON.stringify(
          duplicate
            ? [
                {
                  id: 'tp-team-existing',
                  name: 'Keep my local plan',
                  scope: 'local',
                  status: 'draft',
                  access: 'mine',
                  owner: 'Me',
                  updatedAgo: 'just now',
                  location: { kind: 'local', folder: 'mine', parentName: 'safe' },
                },
              ]
            : [],
        ),
      );
    },
    { duplicate: !!options.duplicate },
  );
  await page.goto(new URL('/projects', saasURL!).href);
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('combobox', { name: 'Save in', exact: true })
    .selectOption(options.gitlab ? 'gitlab' : 'github');
  await dialog.getByLabel('Access token').fill('test-only-open-shared-token');
  await dialog.getByRole('button', { name: options.gitlab ? 'Connect GitLab' : 'Connect GitHub', exact: true }).click();
  await dialog.getByLabel('Repository').selectOption('friend/team');
  await expect(dialog.getByLabel('Test Plans found in this repository')).toBeVisible();
  if (!options.invalid) await dialog.getByLabel('Test Plans found in this repository').selectOption(base);
  return {
    dialog,
    files,
    writes: () => writes,
    open: () => dialog.getByRole('button', { name: 'Open existing Test Plan', exact: true }).click(),
  };
}
test('detects multiple GitHub plans and opens their scripts without any remote writes', async ({ page, context }) => {
  const f = await fixture(page, context);
  await expect(f.dialog.getByLabel('Test Plans found in this repository').locator('option')).toHaveCount(3);
  await expect(f.dialog.getByLabel('Test Plan name')).toHaveValue('Team Checkout');
  await expect(f.dialog.getByLabel('Test Plan name')).toBeDisabled();
  await f.open();
  await expect(page).toHaveURL(/relampo-lab\?plan=tp-team-existing/);
  const editor = page.frameLocator('iframe[data-plan-editor]');
  await expect(editor.getByRole('combobox', { name: 'Plan script', exact: true }).locator('option')).toHaveText([
    'health.yaml',
    'login.yaml',
  ]);
  await expect(editor.getByRole('treeitem', { name: /Shared health/ })).toBeVisible();
  await editor.getByRole('combobox', { name: 'Plan script', exact: true }).selectOption({ label: 'login.yaml' });
  await expect(editor.getByRole('treeitem', { name: /Team login/ })).toBeVisible();
  expect(f.writes()).toBe(0);
});
test('opens GitLab plans through the same read-only flow', async ({ page, context }) => {
  const f = await fixture(page, context, { gitlab: true });
  await f.open();
  await expect(page).toHaveURL(/relampo-lab\?plan=tp-team-existing/);
  expect(f.writes()).toBe(0);
});
test('refuses incomplete plans without repairing or writing remote files', async ({ page, context }) => {
  const f = await fixture(page, context, { missing: true });
  await f.open();
  await expect(f.dialog.getByRole('alert')).toContainText('Data/');
  expect(f.writes()).toBe(0);
});
test('does not treat unrelated YAML manifests as Relampo plans', async ({ page, context }) => {
  const f = await fixture(page, context, { invalid: true });
  await expect(f.dialog.getByLabel('Test Plans found in this repository').locator('option')).toHaveCount(2);
  expect(f.writes()).toBe(0);
});
test('preserves a different local plan with the same manifest ID', async ({ page, context }) => {
  const f = await fixture(page, context, { duplicate: true });
  await f.open();
  await expect(f.dialog.getByRole('alert')).toContainText('different Test Plan already uses this ID');
  expect(f.writes()).toBe(0);
});
test('refuses importing a branch that changed during opening', async ({ page, context }) => {
  const f = await fixture(page, context, { stale: true });
  await f.open();
  await expect(f.dialog.getByRole('alert')).toContainText('shared plan changed');
  expect(f.writes()).toBe(0);
});

test('opens a plan with read-only GitHub repository access without requesting write permission', async ({
  page,
  context,
}) => {
  const f = await fixture(page, context, { readOnly: true });
  await f.open();
  await expect(page).toHaveURL(/relampo-lab\?plan=tp-team-existing/);
  expect(f.writes()).toBe(0);
});

test('keeps an orphaned browser draft intact instead of replacing it with the shared script', async ({
  page,
  context,
}) => {
  const f = await fixture(page, context);
  await page.evaluate(async () => {
    const user = localStorage.getItem('relampo-current-user')!;
    localStorage.setItem(`relampo-editor-account:${encodeURIComponent(user)}`, 'preserve-draft');
    const request = indexedDB.open('relampo-yaml-editor', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put({
        id: 'saas-plan:preserve-draft:tp-team-existing',
        fileName: 'mine.yaml',
        yaml: 'test: {name: Unsaved work}',
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await f.open();
  await expect(f.dialog.getByRole('alert')).toContainText('existing draft could not be replaced');
  const saved = await page.evaluate(async () => {
    const request = indexedDB.open('relampo-yaml-editor', 1);
    const db = await new Promise<IDBDatabase>(resolve => {
      request.onsuccess = () => resolve(request.result);
    });
    const value = await new Promise<any>(resolve => {
      const get = db
        .transaction('drafts', 'readonly')
        .objectStore('drafts')
        .get('saas-plan:preserve-draft:tp-team-existing');
      get.onsuccess = () => resolve(get.result);
    });
    db.close();
    return value;
  });
  expect(saved.yaml).toBe('test: {name: Unsaved work}');
  expect(f.writes()).toBe(0);
});
