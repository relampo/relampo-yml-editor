import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

export type ContractSlot = 'current' | 'previous';

interface ContractFixture {
  path: string;
  sha256: string;
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

  const manifest = JSON.parse(manifestBytes.toString('utf8')) as ContractManifest;
  if (manifest.schema_version !== 1) throw new Error(`Unsupported contract schema: ${manifest.schema_version}`);
  if (manifest.contract_version !== version) {
    throw new Error(`Contract version mismatch: got ${manifest.contract_version}, expected ${version}`);
  }
  if (!/^[a-f0-9]{40}$/.test(manifest.backend_sha)) throw new Error('Contract backend_sha must be a full commit SHA');
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) throw new Error('Contract has no fixtures');

  for (const fixture of manifest.fixtures) {
    const contents = await readFile(fixturePath(source, fixture.path));
    if (sha256(contents) !== fixture.sha256) throw new Error(`Fixture checksum mismatch: ${fixture.path}`);
  }
  return manifest;
}

export async function syncCompatibilityContract(options: SyncOptions): Promise<void> {
  await verifyCompatibilityContract(options.source, options.version, options.checksum);
  const root = resolve(options.snapshotsRoot);
  const bundlesRoot = join(root, 'bundles');
  const target = join(bundlesRoot, options.version);
  await mkdir(bundlesRoot, { recursive: true });

  if (!(await pathExists(target))) {
    const temporary = await mkdtemp(join(bundlesRoot, '.sync-'));
    try {
      await cp(options.source, temporary, { recursive: true });
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  } else {
    await verifyCompatibilityContract(target, options.version, options.checksum);
  }

  const slotsPath = join(root, 'slots.json');
  const slots: ContractSlots = (await pathExists(slotsPath))
    ? (JSON.parse(await readFile(slotsPath, 'utf8')) as ContractSlots)
    : {};
  const nextSlots = { ...slots, [options.slot]: options.version };
  const temporarySlots = join(root, `.slots-${process.pid}.json`);
  await writeFile(temporarySlots, `${JSON.stringify(nextSlots, null, 2)}\n`);
  try {
    await options.beforeActivate?.();
    await rename(temporarySlots, slotsPath);
  } catch (error) {
    await rm(temporarySlots, { force: true });
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
