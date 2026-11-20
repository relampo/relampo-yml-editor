import type { DistributedConfig } from './distributedApi';

/** Compare execution inputs, not filesystem enumeration or checkbox selection order. */
export function preparationKey(config: DistributedConfig): string {
  return JSON.stringify({
    ...config,
    workspace: config.workspace
      ? {
          scriptPath: config.workspace.scriptPath,
          files: [...config.workspace.files].sort((a, b) => a.path.localeCompare(b.path)),
        }
      : undefined,
    files: config.files ? [...config.files].sort() : undefined,
    report_formats: config.report_formats ? [...config.report_formats].sort() : undefined,
    runner_tags: config.runner_tags ? [...config.runner_tags].sort() : undefined,
  });
}

export function preparationChange(previous: DistributedConfig, current: DistributedConfig, es: boolean): string {
  if (
    previous.yaml !== current.yaml ||
    previous.file_name !== current.file_name ||
    previous.workspace?.scriptPath !== current.workspace?.scriptPath
  )
    return es ? 'Cambió el script.' : 'The script changed.';
  if (
    previous.repository !== current.repository ||
    previous.provider !== current.provider ||
    previous.host !== current.host
  )
    return es ? 'Cambió el repositorio de destino.' : 'The target repository changed.';
  if (previous.nodes !== current.nodes) return es ? 'Cambió la cantidad de nodos.' : 'The number of nodes changed.';
  const before = new Map(previous.workspace?.files.map(file => [file.path, file.data]) ?? []);
  const after = new Map(current.workspace?.files.map(file => [file.path, file.data]) ?? []);
  const paths = [...new Set([...before.keys(), ...after.keys()])].filter(path => before.get(path) !== after.get(path));
  if (paths.length)
    return `${es ? 'Cambiaron los archivos' : 'Files changed'}: ${paths.slice(0, 3).join(', ')}${paths.length > 3 ? '…' : ''}.`;
  return es ? 'Cambió la configuración de ejecución.' : 'The execution settings changed.';
}
