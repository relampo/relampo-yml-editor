import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

export type ContractSlot = 'current' | 'previous';

interface ContractFixture {
  kind: 'valid' | 'invalid' | 'forward' | 'roundtrip';
  path: string;
  sha256: string;
  expected_errors?: Array<{ code: string; field: string }>;
}

interface ContractManifest {
  schema_version: number;
  contract_version: string;
  backend_sha: string;
  fixtures: ContractFixture[];
}

interface ContractSlots {
  current?: string;
  previous?: string;
}

interface SyncOptions {
  source: string;
  snapshotsRoot: string;
  slot: ContractSlot;
  version: string;
  checksum: string;
  beforeActivate?: () => Promise<void>;
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function fixturePath(source: string, relativePath: string): string {
  const sourceRoot = `${resolve(source)}${sep}`;
  const candidate = resolve(source, relativePath);
  if (!candidate.startsWith(sourceRoot)) throw new Error(`Fixture path escapes bundle: ${relativePath}`);
  return candidate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFixtureKind(value: unknown): value is ContractFixture['kind'] {
  return value === 'valid' || value === 'invalid' || value === 'forward' || value === 'roundtrip';
}

function parseManifest(value: unknown): ContractManifest {
  if (!isRecord(value)) throw new Error('Contract manifest must be an object');
  if (value.schema_version !== 1) throw new Error(`Unsupported contract schema: ${value.schema_version}`);
  if (typeof value.contract_version !== 'string') throw new Error('Contract version must be a string');
  if (typeof value.backend_sha !== 'string' || !/^[a-f0-9]{40}$/.test(value.backend_sha)) {
    throw new Error('Contract backend_sha must be a full commit SHA');
  }
  if (!Array.isArray(value.fixtures) || value.fixtures.length === 0) throw new Error('Contract has no fixtures');

  const fixtures = value.fixtures.map((fixture, index): ContractFixture => {
    if (!isRecord(fixture)) throw new Error(`Contract fixture ${index} must be an object`);
    if (!isFixtureKind(fixture.kind)) {
      throw new Error(`Contract fixture ${index} has an unsupported kind`);
    }
    if (typeof fixture.path !== 'string' || fixture.path.length === 0) {
      throw new Error(`Contract fixture ${index} has an invalid path`);
    }
    if (typeof fixture.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(fixture.sha256)) {
      throw new Error(`Contract fixture ${index} has an invalid checksum`);
    }
    if (fixture.kind === 'invalid') {
      if (
        !Array.isArray(fixture.expected_errors) ||
        fixture.expected_errors.length === 0 ||
        !fixture.expected_errors.every(
          error => isRecord(error) && typeof error.code === 'string' && typeof error.field === 'string',
        )
      ) {
        throw new Error(`Contract fixture ${index} has invalid expected_errors`);
      }
    }
    return {
      kind: fixture.kind,
      path: fixture.path,
      sha256: fixture.sha256,
      ...(fixture.kind === 'invalid'
        ? { expected_errors: fixture.expected_errors as Array<{ code: string; field: string }> }
        : {}),
    };
  });

  const kinds = new Set(fixtures.map(fixture => fixture.kind));
  if (!['valid', 'invalid', 'forward', 'roundtrip'].every(kind => kinds.has(kind as ContractFixture['kind']))) {
    throw new Error('Contract must include valid, invalid, forward, and roundtrip fixture kinds');
  }
  if (new Set(fixtures.map(fixture => fixture.path)).size !== fixtures.length) {
    throw new Error('Contract fixture paths must be unique');
  }

  return {
    schema_version: 1,
    contract_version: value.contract_version,
    backend_sha: value.backend_sha,
    fixtures,
  };
}

export async function verifyCompatibilityContract(
  source: string,
  version: string,
  checksum: string,
): Promise<ContractManifest> {
  const manifestBytes = await readFile(join(source, 'contract.json'));
  const actualChecksum = sha256(manifestBytes);
  if (actualChecksum !== checksum) {
    throw new Error(`Contract manifest checksum mismatch: got ${actualChecksum}, expected ${checksum}`);
  }

  const manifest = parseManifest(JSON.parse(manifestBytes.toString('utf8')));
  if (manifest.contract_version !== version) {
    throw new Error(`Contract version mismatch: got ${manifest.contract_version}, expected ${version}`);
  }

  for (const fixture of manifest.fixtures) {
    const contents = await readFile(fixturePath(source, fixture.path));
    if (sha256(contents) !== fixture.sha256) throw new Error(`Fixture checksum mismatch: ${fixture.path}`);
  }
  return manifest;
}

async function copyVerifiedBundle(source: string, target: string, manifest: ContractManifest): Promise<void> {
  await copyFile(join(source, 'contract.json'), join(target, 'contract.json'));
  for (const fixture of manifest.fixtures) {
    const destination = join(target, fixture.path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(fixturePath(source, fixture.path), destination);
  }
}

export async function syncCompatibilityContract(options: SyncOptions): Promise<void> {
  const manifest = await verifyCompatibilityContract(options.source, options.version, options.checksum);
  const root = resolve(options.snapshotsRoot);
  const bundlesRoot = join(root, 'bundles');
  const target = join(bundlesRoot, options.version);
  await mkdir(bundlesRoot, { recursive: true });
  let installedTarget = false;

  if (!(await pathExists(target))) {
    const temporary = await mkdtemp(join(bundlesRoot, '.sync-'));
    try {
      await copyVerifiedBundle(options.source, temporary, manifest);
      await verifyCompatibilityContract(temporary, options.version, options.checksum);
      await rename(temporary, target);
      installedTarget = true;
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  } else {
    await verifyCompatibilityContract(target, options.version, options.checksum);
  }

  const slotsPath = join(root, 'slots.json');
  const temporarySlots = join(root, `.slots-${process.pid}.json`);
  try {
    const slots: ContractSlots = (await pathExists(slotsPath))
      ? (JSON.parse(await readFile(slotsPath, 'utf8')) as ContractSlots)
      : {};
    const nextSlots = { ...slots, [options.slot]: options.version };
    await writeFile(temporarySlots, `${JSON.stringify(nextSlots, null, 2)}\n`);
    await options.beforeActivate?.();
    await rename(temporarySlots, slotsPath);
  } catch (error) {
    await rm(temporarySlots, { force: true });
    if (installedTarget) await rm(target, { recursive: true, force: true });
    throw error;
  }
}

function parseArguments(args: string[]): Omit<SyncOptions, 'snapshotsRoot'> & { snapshotsRoot?: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Invalid argument near ${key || '<end>'}`);
    values.set(key.slice(2), value);
  }
  const source = values.get('source');
  const slot = values.get('slot');
  const version = values.get('version');
  const checksum = values.get('checksum');
  if (!source || !version || !checksum || (slot !== 'current' && slot !== 'previous')) {
    throw new Error('Required: --source DIR --slot current|previous --version VERSION --checksum SHA256');
  }
  return { source, slot, version, checksum, snapshotsRoot: values.get('snapshots-root') };
}

if (import.meta.main) {
  const options = parseArguments(process.argv.slice(2));
  const defaultRoot = resolve(dirname(new URL(import.meta.url).pathname), '..', 'src', 'contracts', 'backend');
  await syncCompatibilityContract({ ...options, snapshotsRoot: options.snapshotsRoot || defaultRoot });
  console.log(`Synced ${options.version} to ${options.slot}`);
}
