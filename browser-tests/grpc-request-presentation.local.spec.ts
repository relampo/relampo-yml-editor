import { expect, test } from '@playwright/test';

const scenario = `test: {name: Request presentation}
scenarios:
  - name: Purchase
    load: {type: constant, users: 1, iterations: 1}
    steps:
      - request:
          name: '[42] HTTPS login'
          request_id: 42
          method: POST
          url: https://example.test/login
          response: {status: 200, body: '{"token":"example"}'}
      - grpc:
          name: Login
          method: /practice.Shop/Login
          target: localhost:50051
          message: {username: user001}
          response_template:
            message_type: practice.Shop.LoginResponse
            message: {token: ''}
      - grpc:
          name: ListEvents
          method: /practice.Shop/ListEvents
          enabled: false
          message: {pageSize: 12}
          response: {status: OK, message: {events: []}}
`;

test('HTTP and gRPC share presentation and all requests have ordered numbers', async ({ page }) => {
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ studio: true, initialScript: { name: 'mixed.yaml', yaml: scenario } }),
    }),
  );
  await page.goto('/');
  const http = page.getByRole('treeitem', { name: /\[1\] HTTPS login/ });
  const login = page.getByRole('treeitem', { name: /\[2\] Login/ });
  const events = page.getByRole('treeitem', { name: /\[3\] ListEvents/ });
  await expect(http).toBeVisible();
  await expect(login).toBeVisible();
  await expect(events).toBeVisible();
  // Numbers belong to the request label, with the same typography and spacing.
  for (const [row, number] of [
    [http, '[1]'],
    [login, '[2]'],
  ] as const) {
    const numberLabel = row.getByText(number, { exact: true });
    await expect(numberLabel.locator('..')).toHaveClass(/text-sm/);
    await expect(numberLabel).not.toHaveClass(/font-mono|text-xs|text-zinc-500/);
  }
  await http.click();
  const details = page.locator('[data-node-details]');
  const requestTab = details.getByRole('button', { name: 'Request', exact: true });
  const httpClass = await requestTab.getAttribute('class');
  await login.click();
  await expect(requestTab).toHaveAttribute('class', httpClass!);
  await expect(page.getByLabel('RPC method', { exact: true })).toHaveValue('/practice.Shop/Login');
  await details.getByRole('button', { name: 'Response', exact: true }).click();
  await expect(page.getByLabel('Contract response template')).toHaveValue('{\n  "token": ""\n}');
  await expect(page.getByText('Not executed', { exact: true })).toBeVisible();
  await events.click();
  await details.getByRole('button', { name: 'Request', exact: true }).click();
  await expect(page.getByLabel('RPC method', { exact: true })).toBeDisabled();
  await details.getByRole('button', { name: 'Response', exact: true }).click();
  await expect(page.getByLabel('Recorded response')).toHaveValue(/"status": "OK"/);
});
