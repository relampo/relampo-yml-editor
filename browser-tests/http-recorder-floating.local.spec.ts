import { expect, test } from '@playwright/test';

for (const mode of ['always-on-top', 'popup fallback'] as const) {
  test(`embedded controls share the recorder session in a separate ${mode} window`, async ({ page, context }) => {
    const calls: string[] = [];
    let state: any = { active: false, requests: [], totalRequests: 0 };
    if (mode === 'popup fallback')
      await page.addInitScript(() => {
        Object.defineProperty(window, 'documentPictureInPicture', { value: undefined });
      });
    await context.route('**/floating-host', route =>
      route.fulfill({
        contentType: 'text/html',
        body: '<iframe src="/browser-tests/fixtures/floating-recorder.html" style="width:100%;height:900px"></iframe>',
      }),
    );
    await context.route('**/api/studio/info', route =>
      route.fulfill({ json: { studio: true, capabilities: { httpRecorder: true } } }),
    );
    await context.route('**/api/recorder/http/**', route => {
      const path = new URL(route.request().url()).pathname.split('/').pop()!;
      expect(route.request().frame().url()).toContain('floating-recorder.html');
      if (route.request().url().includes('/requests/0'))
        return route.fulfill({
          json: {
            url: 'http://app.test/live',
            method: 'GET',
            status: 200,
            request: { headers: { 'X-Request': ['request-header-live'] }, body: { action: 'live-request' } },
            response: { headers: { 'Content-Type': ['text/html'] }, body: route.request().url().includes('showSensitive=true') ? '<html><body>live-response</body></html>' : { message: 'live-response' } },
          },
        });
      if (path === 'options')
        return route.fulfill({ json: { port: 8888, firefoxAvailable: true, firefoxConfigured: true } });
      if (route.request().method() === 'POST') calls.push(path);
      const body = route.request().method() === 'POST' ? route.request().postDataJSON() : {};
      if (path === 'start')
        state = { ...state, active: true, recording: false, prefixEnabled: true, transactionsEnabled: true };
      if (path === 'record') state = { ...state, recording: true };
      if (path === 'prefix') state = { ...state, prefix: body.prefix };
      if (path === 'transaction')
        state = { ...state, transaction: body.action === 'start' ? { id: 1, name: body.name } : { id: 0, name: '' } };
      if (path === 'stop') state = { ...state, active: false, recording: false, totalRequests: 3 };
      return route.fulfill({ json: state });
    });
    await page.goto('/floating-host');
    const editor = page.frameLocator('iframe');
    await editor.getByLabel('Base URL', { exact: true }).fill('app.test');
    const opened = context.waitForEvent('page');
    await editor.getByRole('button', { name: 'Open Firefox', exact: true }).click();
    let controls = await opened;
    await controls.setViewportSize({ width: 420, height: 360 });
    if (mode === 'always-on-top') {
      // Simulate a PiP window with twice the opener's zoom on the same screen.
      const screen = await page.evaluate(() => ({ width: window.screen.width, height: window.screen.height }));
      const cdp = await context.newCDPSession(controls);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 210,
        height: 180,
        deviceScaleFactor: 2,
        mobile: false,
        screenWidth: screen.width,
        screenHeight: screen.height,
      });
      await expect.poll(() => controls.evaluate(() => getComputedStyle(document.body).zoom)).toBe('0.5');
    }
    await expect(editor.getByRole('button', { name: 'Open recording controls', exact: true })).toBeVisible();
    await expect(editor.getByLabel('Prefix', { exact: true })).toHaveCount(0);
    if (mode === 'always-on-top') {
      await expect.poll(() => page.evaluate(() => !!(window as any).documentPictureInPicture?.window)).toBe(true);
    }
    await controls.getByLabel('Prefix', { exact: true }).fill('Login');
    await controls.getByRole('button', { name: 'Apply prefix', exact: true }).click();
    await expect(controls.getByText('Active prefix: Login', { exact: true })).toBeVisible();
    await controls.getByLabel('Transaction name', { exact: true }).fill('Checkout');
    await expect(controls.getByRole('button', { name: 'Start recording', exact: true })).toBeInViewport();
    await expect(controls.getByRole('button', { name: 'Stop recording', exact: true })).toBeInViewport();
    expect(await controls.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await controls.getByRole('button', { name: 'Start transaction', exact: true }).click();
    await expect(controls.getByText('Active transaction: Checkout', { exact: true })).toBeVisible();
    await controls.getByRole('button', { name: 'End transaction', exact: true }).click();
    await controls.getByRole('button', { name: 'Start recording', exact: true }).click();
    await expect.poll(() => state.recording).toBe(true);
    // Background browser tabs can throttle timers to once a minute. Controls
    // are still visible, so their window must own the live recorder polling.
    await editor.locator('body').evaluate(() => {
      const original = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, delay = 0, ...args: unknown[]) =>
        original(handler, delay <= 1000 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    state = {
      ...state,
      totalRequests: 1,
      requests: [
        {
          id: 0,
          name: 'Login - GET /live',
          method: 'GET',
          url: 'http://app.test/live',
          status: 200,
          durationMs: 12,
          time: new Date().toISOString(),
        },
      ],
    };
    const traffic = editor.getByRole('button', { name: 'http://app.test/live', exact: true });
    await expect(traffic).toBeVisible({ timeout: 6000 });
    await traffic.click();
    const details = editor.getByRole('region', { name: 'Request details' });
    await expect(details.locator('pre')).toContainText('live-request');
    await expect(details.getByText('request-header-live', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Response', exact: true }).click();
    await expect(details.locator('pre')).toContainText('live-response');
    await expect(details.getByText('text/html', { exact: true })).toBeVisible();
    await details.getByRole('button', { name: 'Show full content', exact: true }).click();
    await expect(details.locator('pre')).toHaveText('<html><body>live-response</body></html>');
    await expect(details.locator('iframe,script')).toHaveCount(0);
    expect(calls).not.toContain('stop');
    await expect(controls.getByRole('button', { name: 'Stop recording', exact: true })).toBeInViewport();
    expect(await controls.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await controls.screenshot({ path: `/private/tmp/relampo-popup-qa/${mode.replaceAll(' ', '-')}.png` });
    await controls.close();
    expect(calls).not.toContain('stop');
    const reopened = context.waitForEvent('page');
    await editor.getByRole('button', { name: 'Open recording controls', exact: true }).click();
    controls = await reopened;
    await controls.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await expect.poll(() => state.active).toBe(false);
    expect(calls.filter(path => path === 'start')).toHaveLength(1);
    expect(calls.filter(path => path === 'transaction')).toHaveLength(2);
  });
}
