import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { syncCompatibilityContract } from './sync-compatibility-contract';

const temporaryRoots: string[] = [];

async function createBundle(version = '1.0.0') {
  const root = await mkdtemp(join(tmpdir(), 'relampo-contract-source-'));
  temporaryRoots.push(root);
  const fixture = 'test:\n  name: valid\nscenarios:\n  - name: smoke\n    steps:\n      - get: /\n';
  await writeFile(join(root, 'valid.yaml'), fixture);
  const fixtureChecksum = createHash('sha256').update(fixture).digest('hex');
  const manifest = JSON.stringify({
    schema_version: 1,
    contract_version: version,
    backend_sha: 'a'.repeat(40),
    fixtures: [{ path: 'valid.yaml', sha256: fixtureChecksum }],
  });
  await writeFile(join(root, 'contract.json'), manifest);
  return {
    root,
    checksum: createHash('sha256').update(manifest).digest('hex'),
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('compatibility contract sync', () => {
  it('verifies the full bundle before atomically activating a slot', async () => {
    const source = await createBundle();
    const snapshotsRoot = await mkdtemp(join(tmpdir(), 'relampo-contract-target-'));
    temporaryRoots.push(snapshotsRoot);

    await syncCompatibilityContract({
      ...source,
      source: source.root,
      snapshotsRoot,
      slot: 'current',
      version: '1.0.0',
    });

    expect(JSON.parse(await readFile(join(snapshotsRoot, 'slots.json'), 'utf8'))).toEqual({ current: '1.0.0' });
    expect(await readFile(join(snapshotsRoot, 'bundles', '1.0.0', 'valid.yaml'), 'utf8')).toContain('name: valid');
  });

  it('leaves the active slot unchanged after checksum, malformed, or interrupted updates', async () => {
    const source = await createBundle();
    const snapshotsRoot = await mkdtemp(join(tmpdir(), 'relampo-contract-target-'));
    temporaryRoots.push(snapshotsRoot);
    await writeFile(join(snapshotsRoot, 'slots.json'), '{"current":"0.9.0"}\n');

    await expect(
      syncCompatibilityContract({
        source: source.root,
        snapshotsRoot,
        slot: 'current',
        version: '1.0.0',
        checksum: '0'.repeat(64),
      }),
    ).rejects.toThrow('checksum mismatch');
    expect(JSON.parse(await readFile(join(snapshotsRoot, 'slots.json'), 'utf8'))).toEqual({ current: '0.9.0' });

    await writeFile(
      join(source.root, 'contract.json'),
      JSON.stringify({
        schema_version: 1,
        contract_version: '1.0.0',
        backend_sha: 'a'.repeat(40),
      }),
    );
    const malformedChecksum = createHash('sha256')
      .update(await readFile(join(source.root, 'contract.json')))
      .digest('hex');
    await expect(
      syncCompatibilityContract({
        source: source.root,
        snapshotsRoot,
        slot: 'current',
        version: '1.0.0',
        checksum: malformedChecksum,
      }),
    ).rejects.toThrow('fixtures');
    expect(JSON.parse(await readFile(join(snapshotsRoot, 'slots.json'), 'utf8'))).toEqual({ current: '0.9.0' });

    const restored = await createBundle();
    await expect(
      syncCompatibilityContract({
        source: restored.root,
        snapshotsRoot,
        slot: 'current',
        version: '1.0.0',
        checksum: restored.checksum,
        beforeActivate: async () => {
          throw new Error('interrupted');
        },
      }),
    ).rejects.toThrow('interrupted');
    expect(JSON.parse(await readFile(join(snapshotsRoot, 'slots.json'), 'utf8'))).toEqual({ current: '0.9.0' });
  });
});
