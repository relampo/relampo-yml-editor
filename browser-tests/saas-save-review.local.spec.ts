import { expect, test } from './saas-git-fixture';
import { dump, load } from 'js-yaml';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL to the local SaaS server.');

const yaml = (timeout = '5s', remoteName = 'Shared script') =>
  dump({
    test: { name: remoteName },
    scenarios: [
      {
        name: 'Checkout',
        load: { type: 'constant', users: 1, iterations: 1 },
        steps: [
          { request: { name: 'Login', method: 'GET', url: 'https://example.test/login', timeout } },
          {
            sql: {
              name: 'Read tickets',
              kind: 'query',
              query: 'SELECT id FROM tickets',
              timeout,
              connection: { host: 'localhost', database: 'tickets', user: 'reader' },
              dialect: 'postgres',
            },
          },
          { grpc: { name: 'Get account', target: 'localhost:50051', method: '/demo.Account/Get', timeout } },
          {
            websocket: {
              name: 'Live updates',
              url: 'wss://example.test/live',
              timeout,
              actions: [{ send: { type: 'text', data: 'ping' } }],
            },
          },
        ],
      },
    ],
  });

for (const provider of ['github', 'gitlab'] as const) {
  test(`${provider}: Save opens QA popup, merges shared edits, keeps component icons and rechecks before publishing`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1500, height: 1000 });
    const origin = new URL(saasURL!).origin;
    const filePath = 'performance-tests/review/Scripts/checkout.yaml';
    let head = 'a'.repeat(40),
      writes = 0,
      tree: any[] = [],
      parent = '',
      denyWrites = false;
    let files = new Map([
      [filePath, yaml()],
      ['performance-tests/review/Data/.gitkeep', ''],
    ]);
    const snapshots = new Map([[head, new Map(files)]]);
    const share = (content: string) => {
      head = String.fromCharCode(98 + snapshots.size).repeat(40);
      files.set(filePath, content);
      snapshots.set(head, new Map(files));
    };
    await context.route(
      provider === 'github' ? 'https://api.github.com/**' : 'https://gitlab.com/api/v4/**',
      async route => {
        const req = route.request(),
          url = new URL(req.url()),
          path = url.pathname;
        const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 });
        if (req.method() !== 'GET' && denyWrites) return respond({ message: 'Write denied' }, 403);
        if (req.method() === 'GET' && path.endsWith('/commits'))
          return respond(
            provider === 'github'
              ? [{ commit: { author: { name: 'Ana Torres' } }, author: { login: 'ana.qa' } }]
              : [{ author_name: 'Ana Torres' }],
          );
        if (provider === 'github') {
          if (path === '/repos/acme/performance')
            return respond({ default_branch: 'main', permissions: { push: true } });
          if (path.endsWith('/branches')) return respond([{ name: 'main' }]);
          if (path.includes('/git/ref/heads/')) return respond({ object: { sha: head } });
          if (path.includes('/contents/')) {
            const name = decodeURIComponent(path.split('/contents/')[1]!);
            const snapshot = snapshots.get(url.searchParams.get('ref') || head) || files;
            if (snapshot.has(name))
              return respond({
                type: 'file',
                encoding: 'base64',
                content: Buffer.from(snapshot.get(name)!).toString('base64'),
              });
            if ([...snapshot.keys()].some(key => key.startsWith(name + '/'))) return respond([{ type: 'file' }]);
            return respond({ message: 'Not found' }, 404);
          }
          if (path.includes('/git/commits/') && req.method() === 'GET')
            return respond({ tree: { sha: 'f'.repeat(40) } });
          if (path.endsWith('/git/trees')) {
            tree = req.postDataJSON().tree;
            return respond({ sha: 'e'.repeat(40) });
          }
          if (path.endsWith('/git/commits')) {
            parent = req.postDataJSON().parents[0];
            return respond({ sha: String(writes + 1).repeat(40) });
          }
          if (path.includes('/git/refs/heads/')) {
            expect(parent).toBe(head);
            expect(req.postDataJSON().force).toBe(false);
            for (const entry of tree) {
              expect(entry.path).toBe(filePath);
              if (entry.sha === null) files.delete(entry.path);
              else files.set(entry.path, entry.content);
            }
            head = req.postDataJSON().sha;
            snapshots.set(head, new Map(files));
            writes++;
            return respond({ object: { sha: head } });
          }
        } else {
          if (!path.includes('/repository/')) return respond({ default_branch: 'main' });
          if (path.endsWith('/repository/branches')) return respond([{ name: 'main' }]);
          if (path.includes('/repository/branches/')) return respond({ commit: { id: head } });
          if (path.endsWith('/repository/tree')) return respond([{ type: 'blob' }]);
          if (path.includes('/repository/files/')) {
            const name = decodeURIComponent(path.split('/repository/files/')[1]!);
            const snapshot = snapshots.get(url.searchParams.get('ref') || head) || files;
            return snapshot.has(name)
              ? respond({
                  encoding: 'base64',
                  content: Buffer.from(snapshot.get(name)!).toString('base64'),
                  last_commit_id: head,
                })
              : respond({}, 404);
          }
          if (path.endsWith('/repository/commits')) {
            const body = req.postDataJSON();
            expect(body.force).toBe(false);
            for (const action of body.actions) {
              expect(action.file_path).toBe(filePath);
              if (action.action === 'delete') files.delete(action.file_path);
              else files.set(action.file_path, action.content);
            }
            head = String(writes + 1).repeat(40);
            snapshots.set(head, new Map(files));
            writes++;
            return respond({ id: head });
          }
        }
        throw new Error(`${req.method()} ${path}`);
      },
    );
    await context.route('**/api/studio/info', route => route.fulfill({ json: { studio: false, capabilities: {} } }));
    await context.addInitScript(() => {
      if (window.parent !== window) return;
      window.addEventListener('message', event => {
        if (event.data?.type === 'relampo:save-progress' && event.data.reviewing === true)
          (window as any).__saveReviewPaused = true;
      });
    });
    await page.clock.install();
    await page.goto(origin);
    await page.evaluate(
      async ({ provider, origin, baseYaml, filePath, head }) => {
        const user = 'save-review@example.invalid';
        localStorage.setItem('relampo-auth', 'true');
        localStorage.setItem('relampo-current-user', user);
        localStorage.setItem(`relampo-onboarding-${user}`, 'true');
        localStorage.setItem('relampo-language', 'en');
        localStorage.setItem('relampo-theme', provider === 'github' ? 'light' : 'dark');
        const location = {
          kind: provider,
          repository: 'acme/performance',
          branch: 'main',
          folder: 'performance-tests/review',
        };
        localStorage.setItem(
          `relampo-test-plans:${encodeURIComponent(user)}`,
          JSON.stringify([
            {
              id: 'tp-review',
              name: 'Collaborative checkout',
              scope: 'QA',
              owner: 'QA',
              updatedAgo: 'now',
              status: 'draft',
              access: 'mine',
              location,
            },
          ]),
        );
        const providerURL = origin + '/src/utils/gitProvider.ts';
        await (await import(providerURL)).connectGit(provider, 'acme/performance', 'fake-review-token');
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open('relampo-git-plans', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('plans');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction('plans', 'readwrite');
            tx.objectStore('plans').put(
              {
                target: location,
                base: head,
                baseline: { [filePath]: baseYaml },
                changes: { 'performance-tests/review/Data/other.csv': 'keep draft' },
                bindings: {},
              },
              `${encodeURIComponent(user)}:tp-review`,
            );
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
          };
        });
      },
      { provider, origin, baseYaml: yaml(), filePath, head },
    );
    await page.goto(origin + '/relampo-lab?plan=tp-review');
    const editor = page.frameLocator('iframe[data-plan-editor]');
    await editor
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: 'checkout.yaml', mimeType: 'text/yaml', buffer: Buffer.from(yaml('15s')) });
    // First: independent remote metadata edit combines with local protocol edits.
    // Rebind the in-memory fake provider after navigation. No real credentials or writes.
    await page.evaluate(
      async ({ origin, provider }) => {
        // Vite's live graph can contain both timestamped and bare modules after edits.
        // Seed the fake authorization in each loaded variant; real UI connection is covered separately.
        const urls = [
          ...new Set([
            ...performance
              .getEntriesByType('resource')
              .map(entry => entry.name)
              .filter(name => name.startsWith(origin + '/src/utils/gitProvider.ts')),
            origin + '/src/utils/gitProvider.ts',
          ]),
        ];
        for (const url of urls) await (await import(url)).connectGit(provider, 'acme/performance', 'fake-review-token');
      },
      { origin, provider },
    );
    share(yaml('5s', 'Shared title updated'));
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    const popup = page.getByRole('dialog');
    await expect(
      popup.getByText('Someone updated this script. These changes can be combined with yours.'),
    ).toBeVisible();
    for (const kind of ['request', 'sql', 'grpc', 'websocket'])
      await expect(popup.locator(`[data-script-component=${kind}]`).first()).toBeVisible();
    expect(writes).toBe(0);
    await page.waitForFunction(() => (window as any).__saveReviewPaused === true);
    await page.clock.runFor(70000);
    await expect(popup.getByRole('button', { name: 'Accept and save', exact: true })).toBeEnabled();
    await page.screenshot({ path: `/private/tmp/relampo-save-review-${provider}.png` });
    await popup.getByRole('button', { name: 'Accept and save', exact: true }).click();
    await expect(popup.getByText('Script updated', { exact: true })).toBeVisible();
    expect(writes).toBe(1);
    const first = load(files.get(filePath)!) as any;
    expect(first.test.name).toBe('Shared title updated');
    expect(first.scenarios[0].steps[0].request.timeout).toBe('15s');
    await popup.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(editor.getByRole('treeitem', { name: /Shared title updated/ }).first()).toBeVisible();
    // Now both editors changed the same timeout. Cancel must not publish.
    const remote = load(files.get(filePath)!) as any;
    remote.scenarios[0].steps[0].request.timeout = '10s';
    share(dump(remote));
    await editor.getByRole('treeitem', { name: /Login/ }).click();
    // Change using the visual HTTP timeout control.
    const timeout = editor.getByLabel('Timeout', { exact: true });
    await timeout.fill('20s');
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(popup.getByRole('button', { name: /Use mine/ }).first()).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Accept and save', exact: true })).toBeDisabled();
    await popup.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(writes).toBe(1);
    await expect(timeout).toHaveValue('20s');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(editor.getByRole('alert')).toHaveCount(0);
    // Retry and change the shared version while the popup is open: it must review again.
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await popup
      .getByRole('button', { name: /Use shared/ })
      .first()
      .click();
    remote.scenarios[0].steps[0].request.timeout = '12s';
    share(dump(remote));
    await popup.getByRole('button', { name: 'Accept and save', exact: true }).click();
    await expect(popup.getByText('12s', { exact: true })).toBeVisible();
    expect(writes).toBe(1);
    await popup
      .getByRole('button', { name: /Use shared/ })
      .first()
      .click();
    await popup.getByRole('button', { name: 'Accept and save', exact: true }).click();
    await expect(popup.getByText('Script updated', { exact: true })).toBeVisible();
    await popup.getByRole('button', { name: 'Done', exact: true }).click();
    await editor.getByRole('treeitem', { name: /Login/ }).click();
    await expect(editor.getByLabel('Timeout', { exact: true })).toHaveValue('12s');
    // Shared-only acceptance needs no redundant provider commit.
    expect(load(files.get(filePath)!)).toEqual(remote);
    expect(writes).toBe(1);
    const pending = await page.evaluate(async origin => {
      const url = origin + '/src/utils/gitPlanStorage.ts';
      return (await import(url)).gitPlanStatus('tp-review');
    }, origin);
    expect(pending.paths).toContain('performance-tests/review/Data/other.csv');
    // A rejected write keeps the local draft and can be retried from the same popup flow.
    await editor.getByLabel('Timeout', { exact: true }).fill('35s');
    denyWrites = true;
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(popup.getByRole('alert')).toContainText('403');
    expect(writes).toBe(1);
    await popup.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(editor.getByLabel('Timeout', { exact: true })).toHaveValue('35s');
    denyWrites = false;
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(popup.getByText('Script updated', { exact: true })).toBeVisible();
    expect(writes).toBe(2);
    await popup.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Save Script', exact: true }).click();
    await expect(popup.getByText('Script updated', { exact: true })).toBeVisible();
    expect(writes).toBe(2);
  });
}
