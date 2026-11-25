// Reproduce the historical Editor v0.3.114 query editing behavior, without patching it.
// Usage: node repro/genexus-comma.cjs /absolute/path/to/relampo-2.11.0
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const cli = process.argv[2];
const editorBuild = process.env.RELAMPO_EDITOR_BUILD;
const editorLabel = process.env.RELAMPO_EDITOR_LABEL || 'v0.3.114';
if (!cli) throw new Error('Pass the absolute path to the official CLI 2.11.0 binary.');
(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'relampo-comma-'));
  const wire = [];
  const target = http.createServer((req, res) => {
    const status = /%2c/i.test(req.url) ? 403 : 200;
    wire.push({ method: req.method, uri: req.url, status });
    res.writeHead(status, { 'Content-Type': status === 200 ? 'application/json' : 'text/html' });
    res.end(status === 200 ? '{"redirect":{"url":"/welcome"}}' : '<title>Error</title>Synthetic comma rejection');
  });
  await new Promise(resolve => target.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${target.address().port}`;
  const yaml = `test: {name: GeneXus comma reproduction}
variables:
  gx_evt_token: 0123456789abcdef0123456789abcdeffedcba9876543210fedcba9876543210
http_defaults:
  base_url: ${base}
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
  const file = path.join(folder, 'genexus-comma.yaml');
  await fs.writeFile(file, yaml);
  const child = spawn(cli, ['studio', file, '--editor', 'embedded', '--no-open'], { cwd: folder });
  let browser;
  let output = '';
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Studio did not start')), 15000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Studio exited: ${code}`)); });
      child.stdout.on('data', data => {
        output += data.toString();
        const match = output.match(/running at (http:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    assert.match(output, /Studio v0\.3\.114 \(embedded\)/);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const payloads = [];
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('/api/debug/runs')) payloads.push(request.postDataJSON());
    });
    if (editorBuild) {
      const origin = new URL(url).origin;
      await page.route(origin + '/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.startsWith('/api/')) return route.continue();
        const candidate = path.join(editorBuild, pathname === '/' ? 'index.html' : pathname);
        try {
          const body = await fs.readFile(candidate);
          const contentType = candidate.endsWith('.js') ? 'text/javascript' : candidate.endsWith('.css') ? 'text/css' : candidate.endsWith('.html') ? 'text/html' : 'application/octet-stream';
          return route.fulfill({ status: 200, contentType, body });
        } catch { return route.continue(); }
      });
    }
    await page.goto(url);
    await page.getByRole('button', { name: 'Run Debug', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
    await page.waitForFunction(() => document.body.innerText.includes('3\n\nPASSED'));
    const before = wire.slice();
    assert.equal(before.length, 3);
    assert.ok(before.every(row => row.status === 200 && !/%2c/i.test(row.uri)));
    await page.screenshot({ path: path.join(folder, 'before.png'), fullPage: true });
    for (const name of ['Login', 'Alerts', 'Reset']) {
      await page.getByText(new RegExp(name + '$')).first().click();
      const field = page.getByPlaceholder(name === 'Login' ? 'value' : 'name', { exact: true });
      const original = await field.inputValue();
      await field.fill(original + 'x');
      await field.fill(original);
    }
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await page.getByRole('button', { name: 'Run Debug', exact: true }).click();
    await page.waitForFunction(() => document.body.innerText.includes('3\n\nFAILED'));
    const after = wire.slice(3);
    assert.equal(after.length, 3);
    assert.ok(after.every(row => row.status === 403 && /%2c/i.test(row.uri)));
    assert.ok(!payloads[0].yaml.includes('%2C'));
    assert.ok(payloads[1].yaml.includes('{{gx_evt_token}}%2Cgx-no-cache'));
    await page.screenshot({ path: path.join(folder, 'after.png'), fullPage: true });
    await fs.writeFile(path.join(folder, 'evidence.json'), JSON.stringify({
      editor: editorLabel, cli: '2.11.0 (same official backend control)', platform: process.platform,
      note: '403 is simulated by a local target when it receives an encoded comma. No real GeneXus server is contacted.',
      before, after, submittedYAML: payloads.map(value => value.yaml),
    }, null, 2));
    console.log('REPRODUCED: original YAML => literal commas; edit query fields => %2C before Debug POST.');
    console.log('Evidence:', folder);
  } finally {
    if (browser) await browser.close();
    child.kill('SIGTERM');
    target.closeAllConnections();
    await new Promise(resolve => target.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
