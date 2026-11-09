import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { refreshTreePaths } from '../components/yaml-tree-view/treeOperations';

export function splitWebSocketConversation(tree: YAMLNode, nodeId: string): YAMLNode {
  const replace = (parent: YAMLNode): YAMLNode => {
    if (!parent.children) return parent;
    return {
      ...parent,
      children: parent.children.flatMap(node => {
        if (node.id !== nodeId) return [replace(node)];
        if (node.type !== 'websocket') return [node];
        const data = structuredClone(node.data || {}) as Record<string, unknown>;
        if (!Array.isArray(data.actions)) return [node];
        const actions = data.actions as Record<string, unknown>[];
        if (actions.some(action => !['send', 'receive', 'close'].some(kind => action[kind]))) return [node];
        const connection = 'ws_' + node.id.replace(/[^a-zA-Z0-9_]/g, '_');
        delete data.actions;
        const connect = {
          ...node,
          name: node.name + ' · connect',
          data: { ...data, name: node.name + ' · connect', action: 'connect', connection } as unknown as YAMLNodeData,
        };
        const steps = [...actions];
        if (!steps.some(action => action.close)) steps.push({ close: { code: 1000 } });
        return [
          connect,
          ...steps.map((action, index) => {
            const kind = ['send', 'receive', 'close'].find(key => action[key])!;
            const inherited = Object.fromEntries(
              ['enabled', 'on_error', 'error_policy']
                .filter(key => data[key] !== undefined)
                .map(key => [key, data[key]]),
            );
            return {
              id: node.id + '_' + kind + '_' + index,
              type: 'websocket' as const,
              name: node.name + ' · ' + kind + ' ' + (index + 1),
              data: {
                ...inherited,
                name: node.name + ' · ' + kind + ' ' + (index + 1),
                action: kind,
                connection,
                [kind]: action[kind],
              } as unknown as YAMLNodeData,
              children: [],
            };
          }),
        ];
      }),
    };
  };
  return refreshTreePaths(replace(tree));
}
