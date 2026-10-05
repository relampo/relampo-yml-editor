import { file, serve, spawn } from 'bun';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve the current editor build and proxy its API to a real Studio process.
// The CLI session token stays in this process, never in browser test artifacts.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const buildRoot = join(projectRoot, 'build');
const sessionDir = await mkdtemp(join(tmpdir(), 'relampo-gdp-e2e-'));
const initialScript = join(sessionDir, 'upload.yaml');
await copyFile(join(projectRoot, 'tests/fixtures/data-source-uploads/upload.yaml'), initialScript);

const studio = spawn(
  [process.env.RELAMPO_BIN ?? 'relampo', 'studio', initialScript, '--editor', 'embedded', '--no-open'],
  { cwd: sessionDir, stdout: 'pipe', stderr: 'pipe' },
);

let server: ReturnType<typeof serve> | undefined;
let stopping = false;

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  server?.stop(true);
  studio.kill();
  await studio.exited;
  await rm(sessionDir, { recursive: true, force: true });
}

process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));
process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));

try {
  const startup = (async () => {
    const reader = studio.stdout.getReader();
    const decoder = new TextDecoder();
    let output = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error('Studio stopped before announcing its local address');
        output += decoder.decode(value, { stream: true });
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/);
        if (match) return new URL(match[0]);
      }
    } finally {
      reader.releaseLock();
    }
  })();

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const address = await Promise.race([
    startup,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Studio startup timed out')), 20_000);
    }),
  ]).finally(() => clearTimeout(timeout));
  process.env.RELAMPO_E2E_STUDIO_TOKEN = address.searchParams.get('token') ?? '';
  const studioOrigin = address.origin;

  server = serve({
    hostname: '127.0.0.1',
    port: Number(process.argv[2]),
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/') || url.pathname === '/runtime-config.json') {
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.delete('content-length');
        headers.set('X-Relampo-Studio-Token', process.env.RELAMPO_E2E_STUDIO_TOKEN ?? '');
        if (headers.has('origin')) headers.set('origin', studioOrigin);
        const response = await fetch(new URL(`${url.pathname}${url.search}`, studioOrigin), {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
        });
        return new Response(response.body, { status: response.status, headers: response.headers });
      }

      const path = resolve(buildRoot, `.${decodeURIComponent(url.pathname)}`);
      if (path !== buildRoot && !path.startsWith(`${buildRoot}${sep}`)) return new Response('Not found', { status: 404 });
      const asset = file(path);
      if (path !== buildRoot && await asset.exists()) return new Response(asset);
      return new Response(file(join(buildRoot, 'index.html')));
    },
  });
  console.log(`Studio upload test server ready on port ${server.port}`);
} catch (error) {
  await shutdown();
  throw error;
}
