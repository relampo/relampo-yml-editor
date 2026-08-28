import slots from '../contracts/backend/slots.json';
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

// Recorder output includes provenance metadata at test scope. The runtime
// contract omits these fields because execution ignores them, but the editor
// supports them as preserved document data rather than forward-compatibility
// fields that need a warning.
const TEST_KNOWN_FIELDS = new Set([
  ...(knownFields.test || []),
  'recorded_at',
  'recorded_from',
]);

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
      return { scope: 'scenario', prefix: path };
    case 'group':
    case 'simple':
    case 'transaction':
      return { scope: 'group', prefix: [...path, node.type === 'simple' ? 'group' : node.type] };
    case 'parallel':
    case 'balanced':
    case 'if':
    case 'loop':
    case 'retry':
    case 'one_time':
    case 'on_error':
      return { supported: knownFields[node.type] || CONTROLLER_KNOWN_FIELDS[node.type], prefix: [...path, node.type] };
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
        prefix: parent && REQUEST_TYPES.has(parent.type)
          ? [...(parent.path || []), 'request', 'assertions', childIndex(parent, node, ASSERTION_TYPES)]
          : path,
      };
    case 'extractor':
    case 'extract':
      return {
        scope: 'extractor',
        prefix: parent && REQUEST_TYPES.has(parent.type)
          ? [...(parent.path || []), 'request', 'extractors', childIndex(parent, node, EXTRACTOR_TYPES)]
          : path,
      };
    default:
      return null;
  }
}

export function collectUnknownFieldPaths(tree: YAMLNode | null): string[] {
  if (!tree) return [];
  const paths = new Set<string>();

  const visit = (node: YAMLNode, parent?: YAMLNode) => {
    for (const key of Object.keys(node.unknownData || {})) paths.add(formatPath([...(node.path || []), key]));

    const scope = dataScope(node, parent);
    const supported = scope ? scope.supported || (scope.scope ? knownFields[scope.scope] : undefined) : undefined;
    if (scope && supported) {
      for (const key of Object.keys(node.data || {})) {
        if (!key.startsWith('__') && !supported.has(key)) paths.add(formatPath([...scope.prefix, key]));
      }
    }
    node.children?.forEach(child => visit(child, node));
  };

  visit(tree);
  return [...paths].sort();
}
