import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { syncCompatibilityContract } from './sync-compatibility-contract';

const temporaryRoots: string[] = [];

async function createBundle(version = '1.0.0') {
  const root = await mkdtemp(join(tmpdir(), 'relampo-contract-source-'));
  temporaryRoots.push(root);
  const fixture = 'test:\n  name: valid\nscenarios:\n  - name: smoke\n    steps:\n      - get: /\n';
  const fixtureChecksum = createHash('sha256').update(fixture).digest('hex');
  const fixtures = [
    { kind: 'valid', path: 'fixtures/valid/basic.yaml', sha256: fixtureChecksum },
    {
      kind: 'invalid',
      path: 'fixtures/invalid/missing-scenarios.yaml',
      sha256: fixtureChecksum,
      expected_errors: [{ code: 'required_field', field: 'scenarios' }],
    },
    { kind: 'forward', path: 'fixtures/forward/unknown-fields.yaml', sha256: fixtureChecksum },
    { kind: 'roundtrip', path: 'fixtures/roundtrip/semantic-fields.yaml', sha256: fixtureChecksum },
  ];
  await Promise.all(
    fixtures.map(async ({ path }) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), fixture);
    }),
  );
  const manifest = JSON.stringify({
    schema_version: 1,
    contract_version: version,
    backend_sha: 'a'.repeat(40),
    fixtures,
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
    expect(await readFile(join(snapshotsRoot, 'bundles', '1.0.0', 'fixtures', 'valid', 'basic.yaml'), 'utf8')).toContain(
      'name: valid',
    );
  });

  it('rejects a manifest that omits a required fixture kind', async () => {
    const source = await createBundle();
    const snapshotsRoot = await mkdtemp(join(tmpdir(), 'relampo-contract-target-'));
    temporaryRoots.push(snapshotsRoot);
    const manifestPath = join(source.root, 'contract.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.fixtures = manifest.fixtures.filter((fixture: { kind: string }) => fixture.kind !== 'forward');
    const contents = JSON.stringify(manifest);
    await writeFile(manifestPath, contents);

    await expect(
      syncCompatibilityContract({
        source: source.root,
        snapshotsRoot,
        slot: 'current',
        version: '1.0.0',
        checksum: createHash('sha256').update(contents).digest('hex'),
      }),
    ).rejects.toThrow('fixture kinds');
  });

  it('does not copy files that are outside the verified manifest', async () => {
    const source = await createBundle();
    const snapshotsRoot = await mkdtemp(join(tmpdir(), 'relampo-contract-target-'));
    temporaryRoots.push(snapshotsRoot);
    await writeFile(join(source.root, 'unverified.txt'), 'not checksummed');

    await syncCompatibilityContract({
      ...source,
      source: source.root,
      snapshotsRoot,
      slot: 'current',
      version: '1.0.0',
    });

    await expect(access(join(snapshotsRoot, 'bundles', '1.0.0', 'unverified.txt'))).rejects.toThrow();
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
    await expect(access(join(snapshotsRoot, 'bundles', '1.0.0'))).rejects.toThrow();
  });
});
