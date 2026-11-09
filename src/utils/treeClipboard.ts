import type { YAMLNode } from '../types/yaml';

type Channel = Pick<BroadcastChannel, 'postMessage' | 'onmessage'>;
type Snapshot = { kind: 'snapshot'; clock: number; source: string; nodes: YAMLNode[] };
const EMPTY: YAMLNode[] = [];

function validNodes(value: unknown): value is YAMLNode[] {
  if (!Array.isArray(value) || value.length > 10000) return false;
  const pending = value.map(node => ({ node, depth: 0 }));
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (
      ++count > 10000 ||
      depth > 64 ||
      !node ||
      typeof node !== 'object' ||
      typeof node.id !== 'string' ||
      typeof node.name !== 'string' ||
      typeof node.type !== 'string'
    )
      return false;
    for (const key of ['data', 'unknownData', 'authoredData', 'initialData']) {
      if (node[key] !== undefined && (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])))
        return false;
    }
    if (node.children !== undefined) {
      if (!Array.isArray(node.children) || node.children.length > 10000) return false;
      pending.push(...node.children.map((child: unknown) => ({ node: child, depth: depth + 1 })));
    }
  }
  return true;
}

/** An ephemeral clipboard for same-origin Studio tabs; no script data is persisted. */
export function createTreeClipboard(
  factory: () => Channel | null = () =>
    typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
      ? new window.BroadcastChannel('relampo-tree-clipboard-v1')
      : null,
) {
  const source = crypto.randomUUID();
  let snapshot: Snapshot = { kind: 'snapshot', clock: 0, source, nodes: EMPTY };
  let channel: Channel | null = null;
  let connected = false;
  const listeners = new Set<() => void>();
  const connect = () => {
    if (connected) return;
    connected = true;
    try {
      channel = factory();
      if (!channel) return;
      channel.onmessage = event => {
        const message = event.data;
        if (message?.kind === 'request') {
          if (snapshot.clock) channel?.postMessage(snapshot);
          return;
        }
        if (
          message?.kind !== 'snapshot' ||
          !Number.isSafeInteger(message.clock) ||
          typeof message.source !== 'string' ||
          !validNodes(message.nodes)
        )
          return;
        if (message.clock < snapshot.clock || (message.clock === snapshot.clock && message.source <= snapshot.source))
          return;
        snapshot = structuredClone(message);
        listeners.forEach(notify => notify());
      };
      channel.postMessage({ kind: 'request' });
    } catch {
      channel = null;
    }
  };
  return {
    getSnapshot: () => snapshot.nodes,
    subscribe: (notify: () => void) => {
      listeners.add(notify);
      connect();
      return () => {
        listeners.delete(notify);
      };
    },
    copy: (nodes: YAMLNode[]) => {
      connect();
      if (!validNodes(nodes)) return;
      snapshot = {
        kind: 'snapshot',
        clock: Math.max(Date.now(), snapshot.clock + 1),
        source,
        nodes: structuredClone(nodes),
      };
      listeners.forEach(notify => notify());
      try {
        channel?.postMessage(snapshot);
      } catch {
        /* Local copy still works. */
      }
    },
  };
}
export const treeClipboard = createTreeClipboard();
