import { expect, test } from '@playwright/test';
const origin = process.env.RELAMPO_SAAS_ORIGIN;
test('recording imports preserve binary uploads and gRPC contracts in the local Test Plan', async ({ page }) => {
  test.skip(!origin, 'Set RELAMPO_SAAS_ORIGIN to a local SaaS Vite server.');
  await page.route(origin + '/recording-storage-audit', route =>
    route.fulfill({ contentType: 'text/html', body: '<main>Recording storage test</main>' }),
  );
  await page.goto(origin + '/recording-storage-audit');
  const result = await page.evaluate(async () => {
    // OPFS provides real cloneable FileSystem handles without a picker. It has no permission prompt.
    if (!FileSystemDirectoryHandle.prototype.queryPermission)
      Object.defineProperty(FileSystemDirectoryHandle.prototype, 'queryPermission', { value: async () => 'granted' });
    localStorage.setItem('relampo-current-user', 'recording-storage-fixture');
    const storage = await import(/* @vite-ignore */ '/src/utils/localPlanStorage.ts');
    const assets = await import(/* @vite-ignore */ '/src/utils/recordingAssets.ts');
    const root = await navigator.storage.getDirectory();
    const id = crypto.randomUUID();
    const plan: any = { id, name: 'recording-' + id, scope: 'test' };
    plan.location = await storage.createLocalPlan(root, plan);
    const files = [
      { path: 'Data/recording-upload.bin', data: btoa(String.fromCharCode(0, 255, 1, 128)) },
      { path: 'Utilities/recording-api.protoset', data: btoa('descriptor-fixture') },
    ];
    await assets.persistRecordingAssets(plan, files);
    await assets.persistRecordingAssets(plan, files);
    const folder = await root.getDirectoryHandle(plan.location.folder);
    const data = await (
      await (await folder.getDirectoryHandle('Data')).getFileHandle('recording-upload.bin')
    ).getFile();
    const proto = await (
      await (await folder.getDirectoryHandle('Utilities')).getFileHandle('recording-api.protoset')
    ).getFile();
    let rejected = false;
    try {
      await assets.persistRecordingAssets(plan, [{ ...files[0], data: btoa('changed') }]);
    } catch {
      rejected = true;
    }
    let traversal = false;
    try {
      await assets.persistRecordingAssets(plan, [{ path: '../outside.txt', data: btoa('blocked') }]);
    } catch {
      traversal = true;
    }
    const bytes = Array.from(new Uint8Array(await data.arrayBuffer()));
    const descriptor = await proto.text();
    await root.removeEntry(plan.location.folder, { recursive: true });
    return { bytes, descriptor, rejected, traversal };
  });
  expect(result).toEqual({
    bytes: [0, 255, 1, 128],
    descriptor: 'descriptor-fixture',
    rejected: true,
    traversal: true,
  });
});
for (const kind of ['github', 'gitlab'] as const)
  test(`recording assets are published as binary and verified through ${kind}`, async ({ page }) => {
    test.skip(!origin, 'Set RELAMPO_SAAS_ORIGIN to a local SaaS Vite server.');
    const files = new Map<string, string>();
    const blobs = new Map<string, string>();
    let pendingTree: any[] = [];
    let publications = 0;
    const sha = (value: number) => value.toString(16).padStart(40, '0');
    let head = sha(1);
    await page.route('https://api.github.com/**', handle);
    await page.route('https://gitlab.com/api/**', handle);
    async function handle(route: any) {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname,
        method = request.method(),
        data = method === 'GET' ? {} : request.postDataJSON();
      const json = (value: any, status = 200) => route.fulfill({ status, json: value });
      if (path.endsWith('/owner/tests') || path.endsWith('/owner%2Ftests')) return json({ default_branch: 'main' });
      if (url.searchParams.get('per_page')) return json([{ name: 'main' }]);
      if (path.includes('/git/ref/heads/')) return json({ object: { sha: head } });
      if (path.includes('/repository/branches/')) return json({ commit: { id: head } });
      if (method === 'GET' && (path.includes('/contents/') || path.includes('/repository/files/'))) {
        const marker = path.includes('/contents/') ? '/contents/' : '/repository/files/';
        const name = decodeURIComponent(path.split(marker)[1]);
        return files.has(name)
          ? json({ encoding: 'base64', content: files.get(name) })
          : json({ message: 'not found' }, 404);
      }
      if (method === 'GET' && path.includes('/git/commits/')) return json({ tree: { sha: sha(2) } });
      if (path.endsWith('/git/blobs')) {
        const id = sha(10 + blobs.size);
        blobs.set(id, data.content);
        return json({ sha: id });
      }
      if (path.endsWith('/git/trees')) {
        pendingTree = data.tree;
        return json({ sha: sha(3) });
      }
      if (path.endsWith('/git/commits')) return json({ sha: sha(4) });
      if (method === 'PATCH' && path.includes('/git/refs/')) {
        for (const item of pendingTree) files.set(item.path, blobs.get(item.sha)!);
        head = data.sha;
        publications++;
        return json({ object: { sha: head } });
      }
      if (method === 'POST' && path.endsWith('/repository/commits')) {
        for (const action of data.actions) {
          expect(action.encoding).toBe('base64');
          files.set(action.file_path, action.content);
        }
        head = sha(4);
        publications++;
        return json({ id: head });
      }
      throw new Error('Unexpected fixture request ' + method + ' ' + path);
    }
    await page.route(origin + '/recording-git-audit', route =>
      route.fulfill({ contentType: 'text/html', body: '<main>Recording Git test</main>' }),
    );
    await page.goto(origin + '/recording-git-audit');
    const result = await page.evaluate(async kind => {
      const owner = 'recording-git-fixture';
      localStorage.setItem('relampo-current-user', owner);
      const provider = await import(/* @vite-ignore */ '/src/utils/gitProvider.ts');
      const assets = await import(/* @vite-ignore */ '/src/utils/recordingAssets.ts');
      await provider.connectGit(kind, 'owner/tests', 'fixture-token');
      const target = { kind, repository: 'owner/tests', branch: 'main', folder: 'performance-tests/test-plan' };
      const id = crypto.randomUUID();
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('relampo-git-plans', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('plans');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('plans', 'readwrite');
        tx.objectStore('plans').put(
          { target, base: '1'.padStart(40, '0'), baseline: {}, changes: {}, bindings: {} },
          owner + ':' + id,
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      const plan: any = { id, location: target };
      const binary = btoa(String.fromCharCode(0, 255, 1, 128));
      const files = [
        { path: 'Data/upload.bin', data: binary },
        { path: 'Utilities/api.protoset', data: btoa('descriptor-fixture') },
      ];
      await assets.persistRecordingAssets(plan, files);
      await assets.persistRecordingAssets(plan, files);
      let rejected = false;
      try {
        await assets.persistRecordingAssets(plan, [{ path: 'Data/upload.bin', data: btoa('different') }]);
      } catch {
        rejected = true;
      }
      return { binary, rejected };
    }, kind);
    expect(result.rejected).toBe(true);
    expect(files.get('performance-tests/test-plan/Data/upload.bin')).toBe(result.binary);
    expect(files.get('performance-tests/test-plan/Utilities/api.protoset')).toBe(
      Buffer.from('descriptor-fixture').toString('base64'),
    );
    expect(publications).toBe(1);
  });
