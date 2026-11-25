// Uses production Debug/Run handlers behind a test-only entitlement fixture.
// node repro/debug-run-parity.cjs /path/studio-query-fixture.test /path/editor/build [broken|fixed]
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const [fixture, editorBuild, expected = 'fixed'] = process.argv.slice(2);
if (!fixture || !editorBuild)
  throw new Error('Pass fixture binary, editor build folder, and optional broken|fixed expectation.');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(50);
  }
  throw new Error(message);
}
(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'relampo-query-parity-'));
  const wire = [];
  const target = http.createServer((req, res) => {
    const status = /%2c/i.test(req.url) ? 403 : 200;
    wire.push({ method: req.method, uri: req.url, status });
    res.writeHead(status, { 'Content-Type': status === 200 ? 'application/json' : 'text/html' });
    res.end(status === 200 ? '{"redirect":{"url":"/welcome"}}' : '<title>Error</title>Synthetic comma rejection');
  });
  await new Promise(resolve => target.listen(0, '127.0.0.1', resolve));
  const yaml = `test: {name: Query parity}
variables:
  gx_evt_token: 0123456789abcdef0123456789abcdeffedcba9876543210fedcba9876543210
http_defaults:
  base_url: http://127.0.0.1:${target.address().port}
scenarios:
  - name: GeneXus query
    load: {type: constant, users: 1, iterations: 1}
    steps:
      - request:
          name: Login
          method: POST
          url: /bantotal/servlet/com.dlya.bantotal.hlogin?{{gx_evt_token}},gx-no-cache={{_timestamp()}}
          assertions: [{type: status, value: 200}]
      - request:
          name: Alerts
          method: GET
          url: /apfrgetalert?1,,0
          assertions: [{type: status, value: 200}]
      - request:
          name: Reset
          method: GET
          url: /hfrcallandreset?encrypted-value,0,01
          assertions: [{type: status, value: 200}]
`;
  await fs.writeFile(path.join(folder, 'genexus-comma.yaml'), yaml);
  const child = spawn(fixture, ['-test.run=^TestQueryBrowserFixture$', '-test.v'], {
    env: { ...process.env, RELAMPO_QUERY_BROWSER_FIXTURE: folder },
  });
  let diagnostic = '';
  child.stdout.on('data', chunk => {
    diagnostic += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    diagnostic += chunk.toString();
  });
  let browser;
  try {
    let url;
    await until(async () => {
      try {
        url = await fs.readFile(path.join(folder, 'url.txt'), 'utf8');
        return !!url;
      } catch {
        return false;
      }
    }, 'Fixture did not start: ' + diagnostic);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.route(url + '/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.startsWith('/api/')) return route.continue();
      const candidate = path.join(editorBuild, pathname === '/' ? 'index.html' : pathname);
      try {
        const body = await fs.readFile(candidate);
        const contentType = candidate.endsWith('.js')
          ? 'text/javascript'
          : candidate.endsWith('.css')
            ? 'text/css'
            : candidate.endsWith('.html')
              ? 'text/html'
              : 'application/octet-stream';
        return route.fulfill({ status: 200, contentType, body });
      } catch {
        return route.continue();
      }
    });
    const runs = [];
    await page.goto(url);
    for (const stage of ['original', 'edited']) {
      if (stage === 'edited') {
        for (const name of ['Login', 'Alerts', 'Reset']) {
          await page
            .getByText(new RegExp(name + '$'))
            .first()
            .click();
          const input = page.getByPlaceholder(name === 'Login' ? 'value' : 'name', { exact: true });
          const value = await input.inputValue();
          await input.fill(value + 'x');
          await input.fill(value);
        }
      }
      for (const mode of ['Debug', 'Run']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        const endpoint = mode === 'Debug' ? '/api/debug/runs' : '/api/run';
        const button = page.getByRole('button', {
          name: mode === 'Debug' ? 'Run Debug' : 'Run load test',
          exact: true,
        });
        const start = wire.length;
        const pending = page.waitForResponse(
          response => new URL(response.url()).pathname === endpoint && response.request().method() === 'POST',
        );
        await button.click();
        const response = await pending;
        assert.equal(response.status(), 201, await response.text());
        await until(() => wire.length >= start + 3, mode + ' sent fewer than three requests');
        await until(() => button.isEnabled(), mode + ' did not finish');
        const rows = wire.slice(start);
        assert.equal(rows.length, 3);
        const broken = expected === 'broken' && stage === 'edited';
        assert.ok(rows.every(row => row.status === (broken ? 403 : 200)));
        assert.ok(rows.every(row => /%2c/i.test(row.uri) === broken));
        if (!broken) {
          assert.equal(rows[1].uri, '/apfrgetalert?1,,0');
          assert.equal(rows[2].uri, '/hfrcallandreset?encrypted-value,0,01');
        }
        const payload = response.request().postDataJSON();
        runs.push({ stage, mode, yaml: payload.yaml, requests: rows });
        await page.screenshot({ path: path.join(folder, `${stage}-${mode}.png`), fullPage: true });
      }
    }
    assert.equal(runs[0].yaml, runs[1].yaml);
    assert.equal(runs[2].yaml, runs[3].yaml);
    if (expected === 'fixed') assert.equal(runs[0].yaml, runs[2].yaml);
    await fs.writeFile(
      path.join(folder, 'evidence.json'),
      JSON.stringify(
        {
          expected,
          platform: process.platform,
          runs,
          note: 'Local synthetic target; test entitlements; real engine and Debug/Run APIs.',
        },
        null,
        2,
      ),
    );
    console.log(`PASS ${expected}: Debug and Run compared before/after editing; 12 target requests checked.`);
    console.log('Evidence:', folder);
  } catch (error) {
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0];
      if (page) {
        await fs.writeFile(path.join(folder, 'failure.txt'), await page.locator('body').innerText());
        await page.screenshot({ path: path.join(folder, 'failure.png'), fullPage: true });
      }
    }
    console.error('Evidence:', folder, diagnostic);
    throw error;
  } finally {
    if (browser) await browser.close();
    await fs.writeFile(path.join(folder, 'stop'), 'done');
    target.closeAllConnections();
    await new Promise(resolve => target.close(resolve));
    if (child.exitCode === null) setTimeout(() => child.kill('SIGTERM'), 2000).unref();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
