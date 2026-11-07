import { inspectComponentConfiguration, STABLE_CONTAINERS } from './componentConfiguration';
import { authoredNodeData } from './yamlAuthoredData';
import { treeToObject } from './yamlTreeSerializer';
import slots from '../contracts/backend/slots.json';
import grpcContract from '../contracts/backend/bundles/1.1.0/contract.json';
import type { YAMLNode } from '../types/yaml';

interface ContractManifest {
  known_fields: Record<string, string[]>;
}

const manifests = import.meta.glob<ContractManifest>('../contracts/backend/bundles/*/contract.json', {
  eager: true,
  import: 'default',
});

function currentKnownFields(): Record<string, ReadonlySet<string>> {
  const suffix = `/bundles/${slots.current}/contract.json`;
  const manifest = Object.entries(manifests).find(([path]) => path.endsWith(suffix))?.[1];
  if (!manifest) return {};
  return Object.fromEntries(Object.entries(manifest.known_fields).map(([scope, fields]) => [scope, new Set(fields)]));
}

const knownFields = currentKnownFields();
// Adopt the gRPC contract scopes while keeping the current HTTP/component contract.
for (const [scope, fields] of Object.entries(grpcContract.known_fields)) {
  if (scope === 'grpc' || scope.startsWith('grpc_')) knownFields[scope] = new Set(fields);
}

// Recorder fields are preserved document data, beyond the runtime contract.
knownFields.cookies = new Set([...(knownFields.cookies || []), 'mode']);
knownFields.response = new Set([...(knownFields.response || []), 'body']);

// Recorder output includes provenance metadata at test scope. The runtime
// contract omits these fields because execution ignores them, but the editor
// supports them as preserved document data rather than forward-compatibility
// fields that need a warning.
const SCENARIO_KNOWN_FIELDS = new Set([...(knownFields.scenario || []), 'x-studio-load-profiles']);

const TEST_KNOWN_FIELDS = new Set([...(knownFields.test || []), 'recorded_at', 'recorded_from']);

function formatPath(parts: Array<string | number>): string {
  return parts.reduce<string>((path, part) => {
    if (typeof part === 'number') return `${path}[${part}]`;
    return path ? `${path}.${part}` : part;
  }, '');
}

function childIndex(parent: YAMLNode, node: YAMLNode, types: ReadonlySet<string>): number {
  return (parent.children || []).filter(child => types.has(child.type)).indexOf(node);
}

const ASSERTION_TYPES = new Set(['assertion', 'assert']);
const EXTRACTOR_TYPES = new Set(['extractor', 'extract']);
const REQUEST_TYPES = new Set(['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const CONTROLLER_KNOWN_FIELDS: Record<string, ReadonlySet<string>> = {
  parallel: new Set(['name', 'enabled', 'steps']),
  balanced: new Set(['name', 'type', 'mode', 'enabled', 'steps']),
  if: new Set(['condition', 'enabled', 'steps']),
  loop: new Set(['count', 'enabled', 'steps']),
  retry: new Set(['attempts', 'backoff', 'enabled', 'steps']),
  one_time: new Set(['name', 'enabled', 'steps']),
  on_error: new Set(['action', 'enabled', 'steps']),
};

function dataScope(
  node: YAMLNode,
  parent?: YAMLNode,
): { scope?: string; supported?: ReadonlySet<string>; prefix: Array<string | number> } | null {
  const path = node.path || [];
  switch (node.type) {
    case 'test':
      return { supported: TEST_KNOWN_FIELDS, prefix: ['test'] };
    case 'scenario':
      return { supported: SCENARIO_KNOWN_FIELDS, prefix: path };
    case 'sql':
      return { scope: 'sql', prefix: path };
    case 'grpc':
    case 'grpc_defaults':
      return { scope: node.type, prefix: path };
    case 'http_defaults':
    case 'error_policy':
    case 'think_time':
    case 'data_source':
    case 'cookies':
    case 'cache_manager':
      return { scope: node.type, prefix: path };
    case 'group':
    case 'simple':
    case 'transaction':
      return {
        scope: node.data?.__controller ? 'controller' : 'group',
        prefix: [...path, node.data?.__controller ? 'controller' : node.type === 'simple' ? 'group' : node.type],
      };
    case 'parallel':
    case 'balanced':
    case 'if':
    case 'loop':
    case 'retry':
    case 'one_time':
    case 'on_error':
      return {
        supported: new Set([...(knownFields[node.type] || []), ...CONTROLLER_KNOWN_FIELDS[node.type]]),
        prefix: [...path, node.type],
      };
    case 'request':
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
    case 'head':
    case 'options':
      return { scope: 'request', prefix: [...path, 'request'] };
    case 'assertion':
    case 'assert':
      return {
        scope: 'assertion',
        prefix:
          parent && REQUEST_TYPES.has(parent.type)
            ? [...(parent.path || []), 'request', 'assertions', childIndex(parent, node, ASSERTION_TYPES)]
            : path,
      };
    case 'extractor':
    case 'extract':
      return {
        scope: 'extractor',
        prefix:
          parent && REQUEST_TYPES.has(parent.type)
            ? [...(parent.path || []), 'request', 'extractors', childIndex(parent, node, EXTRACTOR_TYPES)]
            : path,
      };
    default:
      return null;
  }
}

export interface UnrecognizedField {
  path: string;
  value: unknown;
}

// ponytail: splits on "." and "[n]", so a YAML key that itself contains a dot
// resolves to undefined (no value preview). Quote-aware paths would fix it.
export function valueAtPath(document: unknown, path: string): unknown {
  let value = document;
  for (const [, key, index] of path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[index ?? key];
  }
  return value;
}

/** The deepest tree node whose YAML path contains `path` (the root when none does), and `path` relative to it. */
export function nearestNode(tree: YAMLNode, path: string): { node: YAMLNode; relativePath: string } {
  let best = { node: tree, nodePath: '' };
  const visit = (node: YAMLNode) => {
    const nodePath = node.path ? formatPath(node.path) : '';
    const contains =
      nodePath === '' || path === nodePath || path.startsWith(`${nodePath}.`) || path.startsWith(`${nodePath}[`);
    if (node.path && contains && nodePath.length > best.nodePath.length) best = { node, nodePath };
    node.children?.forEach(visit);
  };
  visit(tree);
  return { node: best.node, relativePath: path.slice(best.nodePath.length).replace(/^\./, '') || path };
}

export function collectUnknownFieldPaths(tree: YAMLNode | null): string[] {
  return collectUnrecognizedFields(tree).map(field => field.path);
}

export function collectUnrecognizedFields(tree: YAMLNode | null): UnrecognizedField[] {
  if (!tree) return [];
  const document = treeToObject(tree);
  const paths = new Set<string>(inspectComponentConfiguration(document).warnings.map(issue => issue.path));
  const adopted = tree.unknownData?.component_configuration_version === 1;

  const visit = (node: YAMLNode, parent?: YAMLNode) => {
    for (const key of Object.keys(node.unknownData || {}))
      if (!(node.id === tree.id && ['defaults', 'component_configuration_version'].includes(key)))
        paths.add(formatPath([...(node.path || []), key]));

    const scope = dataScope(node, parent);
    const supported = scope ? scope.supported || (scope.scope ? knownFields[scope.scope] : undefined) : undefined;
    if (!adopted && REQUEST_TYPES.has(node.type) && 'auth' in authoredNodeData(node))
      paths.add(formatPath([...scope!.prefix, 'auth']));
    if (scope && supported) {
      for (const key of Object.keys(authoredNodeData(node))) {
        if (
          !(key === 'name' && ['data_source', 'think_time'].includes(node.type)) &&
          !key.startsWith('__') &&
          !supported.has(key) &&
          !(
            key === 'defaults' &&
            (node.type === 'scenario' || STABLE_CONTAINERS.has(node.type) || node.type === 'simple')
          ) &&
          !(adopted && REQUEST_TYPES.has(node.type) && key === 'auth')
        )
          paths.add(formatPath([...scope.prefix, key]));
      }
    }
    if (scope) {
      const data = authoredNodeData(node);
      for (const [field, nestedScope] of [
        ['auth', 'auth'],
        ['connection', 'sql_connection'],
        ['throughput', 'throughput'],
        ['error_policy', 'error_policy'],
        ['retry', 'retry'],
        ['response', 'response'],
      ]) {
        const value = data[field];
        if (!value || typeof value !== 'object' || Array.isArray(value) || !knownFields[nestedScope]) continue;
        for (const key of Object.keys(value)) {
          // Earlier editor exports are migrated to sql.validate_connectivity on save.
          if (node.type === 'sql' && field === 'connection' && key === 'validate_connectivity') continue;
          if (!knownFields[nestedScope].has(key)) paths.add(formatPath([...scope.prefix, field, key]));
        }
      }
    }
    node.children?.forEach(child => visit(child, node));
  };

  visit(tree);
  return [...paths].sort().map(path => ({ path, value: valueAtPath(document, path) }));
}
