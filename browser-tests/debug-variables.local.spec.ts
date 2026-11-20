import { expect, test } from '@playwright/test';

for (const mode of ['builtin', 'direct'] as const) {
  test(`RLP-819 Variables shows the captured request field for ${mode} values`, async ({ page }, testInfo) => {
    const value = mode === 'builtin' ? '{{_randomInt(1,10)}}' : 'qa-direct-value';
    const captured = mode === 'builtin' ? '5' : 'qa-direct-value';
    const yaml = `test: {name: Variables QA}
scenarios:
- name: Login flow
  steps:
  - request:
      name: Login QA
      method: POST
      url: /login
      headers: {Content-Type: application/x-www-form-urlencoded}
      body:
      - email: '{{user}}'
      - password: '${value}'
`;
    await page.route('**/api/studio/info', route => route.fulfill({ json: {
      studio: true, initialScript: { name: 'variables.yaml', yaml }, capabilities: { debug: true },
    } }));
    await page.route('**/api/debug/runs', route => route.fulfill({ json: { id: 'variables-qa' } }));
    await page.route('**/api/debug/runs/variables-qa/events**', route => route.fulfill({
      contentType: 'text/event-stream',
      body: `event: engine\ndata: ${JSON.stringify({
        ts: '2026-11-17T00:00:00Z', name: 'Login QA', method: 'POST', path: '/login',
        status: 200, latency_ms: 2, concurrency: 1, request_id: 1,
        variables: { user: 'qa@example.test' },
        request_headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        request_body: `email=qa%40example.test&password=${captured}`,
        builtin_invocations: mode === 'builtin' ? [{ expression: '{{_randomInt(1,10)}}', value: 5, status: 'resolved', origin: 'Body' }] : [],
      })}\n\nevent: done\ndata: {}\n\n`,
    }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
    await page.getByText('#1', { exact: true }).click();
    await page.getByRole('button', { name: 'variables', exact: true }).click();
    const row = page.getByTitle('password (REQ)', { exact: true }).locator('..');
    await expect(row).toContainText(captured);
    await expect(page.getByTitle('user (REQ)', { exact: true })).toBeVisible();
    await expect(page.getByText('Not captured', { exact: true })).toHaveCount(0);
    await expect(page.getByText('_randomInt(1,10) (REQ)', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`variables-${mode}.png`), fullPage: true });
    if (mode === 'builtin') {
      await page.getByRole('button', { name: 'Built-ins', exact: true }).click();
      await expect(page.getByLabel('Built-in invocations')).toContainText('{{_randomInt(1,10)}}');
    }
  });
}
