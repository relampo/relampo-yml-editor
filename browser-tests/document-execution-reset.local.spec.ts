import { expect, test } from '@playwright/test';

const script = (name: string, path: string) => `test: {name: ${name}}
scenarios:
- name: Flow
  load: {type: constant, users: 1, iterations: 1}
  steps:
  - request: {name: ${name} request, method: GET, url: 'http://example.test/${path}'}
`;

for (const view of ['Debug', 'Run'] as const) {
  test(`RLP-823 ${view} clears the previous execution when importing another YAML`, async ({ page }) => {
    await page.route('**/api/studio/info', route =>
      route.fulfill({
        json: {
          studio: true,
          initialScript: { name: 'first.yaml', yaml: script('First document', 'rlp823-first') },
          capabilities: { debug: true, loadRun: true },
        },
      }),
    );
    await page.route('**/api/debug/runs', route => route.fulfill({ json: { id: 'debug-first' } }));
    await page.route('**/api/debug/runs/debug-first/events**', route =>
      route.fulfill({
        contentType: 'text/event-stream',
        body: 'event: engine\ndata: {"ts":"2026-11-17T00:00:00Z","name":"First document request","method":"GET","path":"/rlp823-first","status":200,"latency_ms":2,"concurrency":1}\n\nevent: done\ndata: {}\n\n',
      }),
    );
    await page.route('**/api/run', route => route.fulfill({ json: { id: 'run-first' } }));
    await page.route('**/api/run/run-first/events**', route =>
      route.fulfill({
        contentType: 'text/event-stream',
        body: `event: done\ndata: ${JSON.stringify({
          status: 'completed',
          summary: {
            test_name: 'First document',
            status: 'completed',
            start_time: '',
            end_time: '',
            duration: 1000000000,
            total_requests: 1,
            total_failures: 0,
            requests: [
              {
                name: 'First document request',
                method: 'GET',
                path: '/rlp823-first',
                count: 1,
                failures: 0,
                avg_ms: 2,
                min_ms: 2,
                max_ms: 2,
                p50_ms: 2,
                p90_ms: 2,
                p95_ms: 2,
                p99_ms: 2,
              },
            ],
          },
        })}\n\n`,
      }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: view, exact: true }).click();
    await page.getByRole('button', { name: view === 'Debug' ? 'Run Debug' : 'Run load test', exact: true }).click();
    const panel = page.locator('[data-editor-panel-heading]').locator('..');
    const previousResult =
      view === 'Debug'
        ? panel.getByText('/rlp823-first', { exact: true })
        : panel.getByRole('cell').filter({ hasText: '/rlp823-first' });
    await expect(previousResult.first()).toBeVisible();

    // A tab change must preserve the current document's result.
    await page.getByRole('button', { name: 'Tree', exact: true }).click();
    await page.getByRole('button', { name: view, exact: true }).click();
    await expect(previousResult.first()).toBeVisible();

    // Failed imports must leave the current document and its results intact.
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: 'broken.yaml',
        mimeType: 'text/yaml',
        buffer: Buffer.from('test: [broken'),
      });
    await expect(page.getByText(/Error parsing YAML:/).first()).toBeVisible();
    await expect(previousResult.first()).toBeVisible();

    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: 'second.yaml',
        mimeType: 'text/yaml',
        buffer: Buffer.from(script('Second document', 'rlp823-second')),
      });
    await expect(page.getByRole('treeitem', { name: /Second document$/ })).toBeVisible();
    await page.getByRole('button', { name: view, exact: true }).click();
    await expect(previousResult).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: view === 'Debug' ? 'Run Debug' : 'Run load test', exact: true }),
    ).toBeEnabled();
    const stored = await page.evaluate(() => ({
      debug: sessionStorage.getItem('relampo.studio.debugRun'),
      run: sessionStorage.getItem('relampo.studio.loadRun'),
    }));
    expect(stored).toEqual({ debug: null, run: null });
  });
}
