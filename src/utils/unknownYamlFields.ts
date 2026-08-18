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

function dataScope(node: YAMLNode, parent?: YAMLNode): { scope: string; prefix: Array<string | number> } | null {
  const path = node.path || [];
  switch (node.type) {
    case 'test':
      return { scope: 'test', prefix: ['test'] };
    case 'scenario':
      return { scope: 'scenario', prefix: path };
    case 'group':
    case 'transaction':
      return { scope: 'group', prefix: [...path, node.type] };
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
    const supported = scope ? knownFields[scope.scope] : undefined;
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
