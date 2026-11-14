import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { treeToYAML } from './yamlParser';
import { agentRequest } from './agentTransport';

export function sqlDefaults(tree?: YAMLNode | null): YAMLNodeData {
  return tree?.children?.find(node => node.type === 'sql_defaults')?.data ?? {};
}
export function sqlConnectionNames(tree?: YAMLNode | null): string[] {
  return Object.keys(sqlDefaults(tree).connections ?? {});
}
export function effectiveSQLConnection(tree?: YAMLNode | null, reference?: string): string {
  const defaults = sqlDefaults(tree),
    names = sqlConnectionNames(tree);
  return reference || defaults.default_connection || (names.length === 1 ? names[0] : '');
}
export async function testSQLConnection(
  tree: YAMLNode,
  reference: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; duration_ms?: number; code?: string }> {
  const response = await agentRequest('/api/sql/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml: treeToYAML(tree), connection_ref: reference }),
    signal,
  });
  if (response.status === 404) return { ok: false, code: 'unsupported' };
  if (response.status === 401 || response.status === 403) return { ok: false, code: 'session' };
  const result = await response.json();
  return {
    ok: response.ok && result.ok === true,
    duration_ms: typeof result.duration_ms === 'number' ? result.duration_ms : undefined,
    code: result.code ?? 'connection',
  };
}

export function validateSQLConnections(tree: YAMLNode): { nodeId: string; message: string }[] {
  const issues: { nodeId: string; message: string }[] = [];
  const owner = tree.children?.find(node => node.type === 'sql_defaults');
  const defaults = sqlDefaults(tree),
    names = sqlConnectionNames(tree);
  if (owner) {
    if (defaults.default_connection && !names.includes(defaults.default_connection))
      issues.push({ nodeId: owner.id, message: 'SQL default connection does not exist.' });
    for (const name of names) {
      const cfg = defaults.connections?.[name],
        conn = cfg?.connection;
      if (
        !cfg ||
        !['postgres', 'postgresql', 'mysql'].includes(cfg.dialect ?? '') ||
        !conn?.host ||
        !conn?.database ||
        !conn?.user
      )
        issues.push({
          nodeId: owner.id,
          message: `SQL connection ${name}: database engine, host, database and user are required.`,
        });
    }
  }
  const walk = (node: YAMLNode) => {
    if (node.type === 'sql') {
      const inline = !!node.data?.connection && Object.keys(node.data.connection).length > 0;
      if (node.data?.connection_ref && inline)
        issues.push({ nodeId: node.id, message: 'SQL connection_ref conflicts with inline connection.' });
      const selected = effectiveSQLConnection(tree, node.data?.connection_ref);
      if (!inline && (!selected || !names.includes(selected)))
        issues.push({ nodeId: node.id, message: 'Select an existing SQL connection in SQL Defaults.' });
    }
    node.children?.forEach(walk);
  };
  walk(tree);
  return issues;
}
