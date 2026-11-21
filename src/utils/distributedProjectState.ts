import type { DistributedConfig } from './distributedApi';

export type ProjectFileChange = { path: string; kind: 'new' | 'modified' | 'removed' };

/** The current editor YAML replaces the saved copy in the execution snapshot. */
export function projectFileContents(config: DistributedConfig): Map<string, string> {
  const files = new Map(config.workspace?.files.map(file => [file.path, file.data]) ?? []);
  files.set(config.workspace?.scriptPath ?? `scenarios/${config.file_name || 'studio.yaml'}`, `yaml:${config.yaml}`);
  return files;
}

/** Nodes and report formats do not require republishing the project files. */
export function projectInputsKey(config: DistributedConfig): string {
  return JSON.stringify([
    config.provider,
    config.provider === 'gitlab' ? config.host?.trim().toLowerCase() : 'github.com',
    config.repository.trim(),
    [...projectFileContents(config)].sort(([a], [b]) => a.localeCompare(b)),
  ]);
}

export function projectFileChanges(
  before: DistributedConfig | undefined,
  after: DistributedConfig,
): ProjectFileChange[] {
  const previous = before ? projectFileContents(before) : new Map<string, string>();
  const current = projectFileContents(after);
  return [...new Set([...previous.keys(), ...current.keys()])]
    .sort((a, b) => a.localeCompare(b))
    .filter(path => previous.get(path) !== current.get(path))
    .map(path => ({ path, kind: !current.has(path) ? 'removed' : previous.has(path) ? 'modified' : 'new' }));
}
