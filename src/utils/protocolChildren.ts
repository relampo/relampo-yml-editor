import { canContain } from './yamlDragDropRules';
import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { authoredNodeData, rememberAuthoredData } from './yamlAuthoredData';
import {
  normalizeAssertionForEditor,
  normalizeExtractorForEditor,
  normalizeAssertionForEngine,
  normalizeExtractorForEngine,
} from './yamlParserHelpers';

type Data = Record<string, unknown>;
type Path = Array<string | number>;
const record = (v: unknown): Data => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Data) : {});
export const isNativeSampler = (type: string) => ['sql', 'grpc', 'websocket'].includes(type);

/** Native response processors belong to a particular receive, never to the handshake. */
export function receivePaths(data: Data): Path[] {
  if (data.action) return data.action === 'receive' && record(data.receive).type !== 'binary' ? [['receive']] : [];
  return Array.isArray(data.actions)
    ? data.actions.flatMap((action, index) => {
        const receive = record(action).receive;
        return receive && record(receive).type !== 'binary' ? [['actions', index, 'receive'] as Path] : [];
      })
    : [];
}
function at(data: Data, path: Path): Data {
  return (path.reduce<unknown>((value, key) => (value as Data | undefined)?.[key], data) as Data) || {};
}
function ownerPaths(node: YAMLNode, data: Data): Path[] {
  // Retain binary receive processors already authored, even though new extractors
  // are only offered for text messages.
  if (node.type !== 'websocket') return [[]];
  if (data.action) return data.action === 'receive' ? [['receive']] : [];
  return Array.isArray(data.actions)
    ? data.actions.flatMap((action, index) => (record(action).receive ? [['actions', index, 'receive'] as Path] : []))
    : [];
}
function fields(node: YAMLNode): Array<[string, YAMLNode['type']]> {
  if (node.type === 'websocket')
    return [
      ['headers', 'headers'],
      ['error_policy', 'error_policy'],
      ['data_source', 'data_source'],
      ['think_time', 'think_time'],
    ];
  return node.type === 'sql'
    ? [
        ['error_policy', 'error_policy'],
        ['data_source', 'data_source'],
        ['think_time', 'think_time'],
      ]
    : [
        ['metadata', 'headers'],
        ['error_policy', 'error_policy'],
        ['data_source', 'data_source'],
        ['think_time', 'think_time'],
      ];
}

/** Rebuild children when a native form changes its arrays; tree edits remain authoritative otherwise. */
export function withProtocolChildren(node: YAMLNode): YAMLNode {
  if (!isNativeSampler(node.type)) return node;
  const data = record(node.data);
  const children: YAMLNode[] = [];
  const base = node.type === 'sql' ? node.path || [] : [...(node.path || []), node.type];
  const add = (type: YAMLNode['type'], value: unknown, target: Path) => {
    const raw = record(value);
    const normalized =
      type === 'extractor'
        ? node.type === 'sql'
          ? { ...raw, type: raw.type ?? 'sql' }
          : normalizeExtractorForEditor(raw)
        : type === 'assertion'
          ? normalizeAssertionForEditor(raw)
          : raw;
    const id = `${node.id}_native_${target.join('_')}`;
    const previous = node.children?.find(child => JSON.stringify(child.protocolTarget) === JSON.stringify(target));
    children.push(
      rememberAuthoredData(
        {
          id: previous?.id || id,
          type,
          name:
            type === 'extractor'
              ? `Extract: ${raw.var ?? raw.variable ?? ''}`
              : type === 'headers'
                ? 'Headers'
                : type === 'assertion'
                  ? 'Assertion'
                  : type === 'error_policy'
                    ? 'Error Policy'
                    : type === 'data_source'
                      ? 'Data Source'
                      : type === 'file'
                        ? 'File Upload'
                        : type === 'spark_before'
                          ? 'Spark Before'
                          : type === 'spark_after'
                            ? 'Spark After'
                            : 'Think Time',
          data: normalized as YAMLNodeData,
          path: [...base, ...target],
          protocolTarget: target,
        },
        raw as YAMLNodeData,
      ),
    );
  };
  for (const [field, type] of fields(node)) {
    if (type === 'think_time' && typeof data[field] === 'string') {
      add(type, { duration: data[field] }, [field]);
      children[children.length - 1].protocolScalar = true;
    } else if (data[field] && typeof data[field] === 'object') add(type, data[field], [field]);
  }
  for (const path of ownerPaths(node, data)) {
    const owner = at(data, path);
    for (const [field, type] of [
      ['extractors', 'extractor'],
      ['assertions', 'assertion'],
    ] as const) {
      if (Array.isArray(owner[field]))
        owner[field].forEach((value, index) => add(type, value, [...path, field, index]));
    }
  }
  for (const [field, type] of [
    ['spark', 'spark_after'],
    ['files', 'file'],
  ] as const) {
    if (Array.isArray(data[field]))
      data[field].forEach((value, index) => {
        const kind = field === 'spark' && record(value).when === 'before' ? 'spark_before' : type;
        add(kind, value, [field, index]);
      });
  }
  return { ...node, protocolChildrenManaged: true, authoredChildTypes: children.map(child => child.type), children };
}

/** Serialize children into the exact native fields consumed by the runtime. */
export function protocolData(node: YAMLNode, input: Data = authoredNodeData(node)): Data {
  if (!isNativeSampler(node.type)) return input;
  const data = structuredClone(input);
  const children = node.children || [];
  const targets = ownerPaths(node, data);
  const targetFor = (child: YAMLNode): Path => {
    if (node.type !== 'websocket') return [];
    const stored = child.protocolTarget?.slice(0, -2);
    if (stored && targets.some(path => JSON.stringify(path) === JSON.stringify(stored))) return stored;
    return receivePaths(data).at(-1) || [];
  };
  for (const path of targets) {
    const owner = at(data, path);
    for (const [field, type] of [
      ['extractors', 'extractor'],
      ['assertions', 'assertion'],
    ] as const) {
      const matches = children.filter(
        child => child.type === type && JSON.stringify(targetFor(child)) === JSON.stringify(path),
      );
      if (!node.protocolChildrenManaged && !matches.length) continue;
      if (matches.length || Array.isArray(owner[field]))
        owner[field] = matches.map(child => {
          const raw = authoredNodeData(child);
          if (
            node.type === 'sql' ||
            (child.authoredData && JSON.stringify(child.data) === JSON.stringify(child.initialData))
          )
            return raw;
          return child.type === 'extractor' ? normalizeExtractorForEngine(raw) : normalizeAssertionForEngine(raw);
        });
    }
  }
  for (const [field, type] of fields(node)) {
    const child = children.find(child => child.type === type);
    if (child) {
      const value = authoredNodeData(child);
      data[field] =
        child.protocolScalar && Object.keys(value).every(key => key === 'duration') ? value.duration : value;
    } else if (node.authoredChildTypes?.includes(type)) delete data[field];
  }
  for (const field of ['spark', 'files']) {
    const matches = children.filter(child =>
      field === 'spark' ? ['spark_before', 'spark_after'].includes(child.type) : child.type === 'file',
    );
    if (!node.protocolChildrenManaged && !matches.length) continue;
    if (matches.length || Array.isArray(data[field]))
      data[field] = matches.map(child => {
        const value = authoredNodeData(child);
        if (field === 'spark') {
          if (!child.authoredData || JSON.stringify(child.data) !== JSON.stringify(child.initialData))
            value.when = child.type === 'spark_before' ? 'before' : 'after';
        } else if (value.mime_type !== undefined) {
          value.mime = value.mime ?? value.mime_type;
          delete value.mime_type;
        }
        return value;
      });
  }
  return data;
}

/** Menu and mutation guards use the same rules, including keyboard paste. */
export function nativeChildUnavailable(
  node: Pick<YAMLNode, 'type' | 'data' | 'children'>,
  type: string,
): string | undefined {
  if (!isNativeSampler(node.type)) return;
  if (type === 'file' && node.type === 'sql') return 'sqlUnsupported';
  if (node.type === 'sql') {
    if (type === 'headers') return 'sqlUnsupported';
    if (type === 'extractor' && ['exec', 'write'].includes(String(node.data?.kind))) return 'queryOnly';
  }
  if (
    ['headers', 'error_policy', 'data_source', 'think_time'].includes(type) &&
    node.children?.some(child => child.type === type)
  )
    return 'alreadyAdded';
  if (node.type === 'websocket') {
    if (type === 'file' && node.data?.action && node.data.action !== 'send') return 'sendOnly';
    if (type === 'headers' && node.data?.action && node.data.action !== 'connect') return 'handshakeOnly';
    if (['extractor', 'assertion'].includes(type) && !receivePaths(record(node.data)).length) return 'receiveOnly';
  }
}

// The same runtime rules apply to every insertion path, including clipboard and drag/drop.
export function acceptsNativeChildren(parent: YAMLNode, incoming: YAMLNode[], movingId?: string): boolean {
  if (!isNativeSampler(parent.type)) return true;
  let target = { ...parent, children: parent.children?.filter(child => child.id !== movingId) || [] };
  for (const child of incoming) {
    // Already authored SQL component children can still be reordered.
    const existingSQLComponent =
      parent.type === 'sql' && ['assertion', 'think_time'].includes(child.type) && child.protocolTarget;
    if (child.type === 'extractor' && child.data?.type === 'sql' && parent.type !== 'sql') return false;
    if (!canContain(parent.type, child.type) && !existingSQLComponent) return false;
    if (nativeChildUnavailable(target, child.type) && !existingSQLComponent) return false;
    target = { ...target, children: [...target.children, child] };
  }
  return true;
}

export function protocolChildPath(
  parent: YAMLNode,
  child: YAMLNode,
  index: number,
  siblings: YAMLNode[],
  parentPath: Path,
): Path {
  const ordinal = (nodes: YAMLNode[], last: number, predicate: (node: YAMLNode) => boolean) =>
    nodes.slice(0, last + 1).filter(predicate).length - 1;
  const base = parent.type === 'sql' ? parentPath : [...parentPath, parent.type];
  if (['spark_before', 'spark_after', 'file'].includes(child.type)) {
    const isSpark = child.type !== 'file';
    return [
      ...base,
      isSpark ? 'spark' : 'files',
      ordinal(siblings, index, node =>
        isSpark ? ['spark_before', 'spark_after'].includes(node.type) : node.type === 'file',
      ),
    ];
  }
  const field =
    child.type === 'extractor'
      ? 'extractors'
      : child.type === 'assertion'
        ? 'assertions'
        : child.type === 'headers' && parent.type === 'grpc'
          ? 'metadata'
          : child.type;
  if (['extractors', 'assertions'].includes(field)) {
    const target =
      parent.type === 'websocket'
        ? child.protocolTarget?.slice(0, -2) ||
          receivePaths((parent.data || {}) as Record<string, unknown>).at(-1) ||
          []
        : [];
    return [
      ...base,
      ...target,
      field,
      ordinal(
        siblings,
        index,
        node =>
          node.type === child.type &&
          JSON.stringify(node.protocolTarget?.slice(0, -2) || target) === JSON.stringify(target),
      ),
    ];
  }
  return [...base, field];
}
