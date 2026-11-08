import { expect, test } from '@playwright/test';

test('browser capture reports observed traffic and leads to Discovery or proto without claiming server internals', async ({
  page,
}) => {
  let state = {
    active: false,
    detected: 'none',
    requests: [] as { method: string; url: string; protocol: string }[],
    counts: { http: 0, https: 0, grpcWeb: 0, grpcNative: 0 },
    totalRequests: 0,
    tlsFailures: 0,
    grpcWebReplaySupported: false,
    firefoxAvailable: true,
    firefoxCertificateManaged: true,
    firefoxCertificateReady: false,
    firefoxRunning: false,
    proxyAddress: '127.0.0.1:8888',
    applicationUrl: 'https://app.example.test',
  };
  await page.route('**/api/studio/info', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ studio: true, capabilities: { grpcAuthoring: true, grpcBrowserRecording: true } }),
    }),
  );
  await page.route('**/api/grpc/recordings/current', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ active: false, calls: [] }) }),
  );
  await page.route(/\/api\/grpc\/browser-recordings(?:\/.*)?(?:\?.*)?$/, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/browser-recordings') && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        applicationUrl: 'https://app.example.test',
        listen: '127.0.0.1:0',
      });
      state = { ...state, active: true };
    }
    if (path.endsWith('/firefox')) {
      state = { ...state, firefoxRunning: true, firefoxCertificateReady: true };
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ opened: true, certificateReady: true }),
      });
      return;
    }
    if (path.endsWith('/stop'))
      state = { ...state, active: false, firefoxRunning: false, firefoxCertificateReady: false };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Recorder', exact: true }).click();
  await page.getByRole('menuitem', { name: 'gRPC', exact: true }).click();
  await page.getByRole('button', { name: 'Record traffic', exact: true }).click();
  await expect(page.getByLabel('Traffic source')).toHaveValue('browser');
  await expect(page.getByLabel('Server address', { exact: true })).toHaveCount(0);
  await page.getByLabel('Application URL').fill('https://app.example.test');
  await page.getByRole('button', { name: 'Start browser recording', exact: true }).click();
  await expect(page.getByText('Waiting for browser traffic', { exact: true })).toBeVisible();
  await expect(page.getByText(/Relampo automatically prepares and verifies the recorder certificate/)).toBeVisible();
  await page.getByRole('button', { name: 'Open Firefox', exact: true }).click();
  await expect(page.getByText('Firefox recorder certificate verified', { exact: true })).toBeVisible();
  await expect(page.getByText(/import this certificate in Firefox Settings/i)).toHaveCount(0);

  state = {
    ...state,
    detected: 'http',
    totalRequests: 1,
    counts: { ...state.counts, https: 1 },
    requests: [{ method: 'POST', url: 'https://app.example.test/login', protocol: 'https' }],
  };
  await expect(page.getByText('HTTP/HTTPS traffic observed', { exact: true })).toBeVisible();
  await expect(page.getByText(/does not reveal whether the server uses gRPC internally/)).toBeVisible();
  await page.getByRole('button', { name: 'Use Discovery', exact: true }).click();
  await expect(page.getByLabel('Server address', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Server address', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Record traffic', exact: true }).click();
  await page.getByRole('button', { name: 'Import .proto', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Import contract', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Record traffic', exact: true }).click();
  state = {
    ...state,
    detected: 'grpc_web',
    totalRequests: 2,
    counts: { ...state.counts, grpcWeb: 1 },
    requests: [
      ...state.requests,
      { method: 'POST', url: 'https://app.example.test/demo.API/Call', protocol: 'grpc_web' },
    ],
  };
  await expect(page.getByText('gRPC-Web detected', { exact: true })).toBeVisible();
  await expect(page.getByText(/gRPC-Web script generation is not available yet/)).toBeVisible();
  await page.getByRole('button', { name: 'Stop browser recording', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start browser recording', exact: true })).toBeVisible();
  await expect(page.getByText('gRPC-Web detected', { exact: true })).toBeVisible();
});
