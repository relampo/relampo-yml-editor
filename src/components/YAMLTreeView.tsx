import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { YAMLNode, RedirectedRequestInfo } from '../types/yaml';
import { YAMLTreeNode } from './YAMLTreeNode';
import { YAMLContextMenu, type YAMLAddableNodeType } from './YAMLContextMenu';

interface YAMLTreeViewProps {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  selectedNodeIds: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  onSelectionChange: (primaryNode: YAMLNode | null, nodeIds: string[]) => void;
  onTreeChange: (tree: YAMLNode) => void;
}

export function YAMLTreeView({
  tree,
  selectedNode,
  selectedNodeIds,
  redirectedRequestMap,
  onSelectionChange,
  onTreeChange,
}: YAMLTreeViewProps) {
  const { t } = useLanguage();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: YAMLNode;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboardNodes, setClipboardNodes] = useState<YAMLNode[]>([]);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);

  const visibleNodes = useMemo(() => {
    if (!tree) return [] as YAMLNode[];
    const out: YAMLNode[] = [];
    const walk = (node: YAMLNode) => {
      out.push(node);
      const expanded = node.expanded ?? true;
      if (node.children && node.children.length > 0 && expanded) {
        node.children.forEach(walk);
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  const parentMap = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!tree) return map;

    const walk = (node: YAMLNode, parentId: string | null) => {
      map.set(node.id, parentId);
      node.children?.forEach(child => walk(child, node.id));
    };

    walk(tree, null);
    return map;
  }, [tree]);

  const nodeById = useMemo(() => {
    const map = new Map<string, YAMLNode>();
    visibleNodes.forEach(node => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const selectedNodes = useMemo(
    () => selectedNodeIds.map(id => nodeById.get(id)).filter(Boolean) as YAMLNode[],
    [selectedNodeIds, nodeById],
  );

  const effectiveSelectedIds = useMemo(() => {
    if (!tree) return [] as string[];
    const selectedSet = new Set(selectedNodeIds);

    const hasSelectedAncestor = (nodeId: string) => {
      let parentId = parentMap.get(nodeId) ?? null;
      while (parentId) {
        if (selectedSet.has(parentId)) return true;
        parentId = parentMap.get(parentId) ?? null;
      }
      return false;
    };

    return selectedNodeIds.filter(id => id !== tree.id && !hasSelectedAncestor(id));
  }, [selectedNodeIds, parentMap, tree]);

  const allSelectedDisabled = selectedNodes.length > 0 && selectedNodes.every(node => node.data?.enabled === false);

  useEffect(() => {
    if (!selectedNode?.id || !treeContainerRef.current) return;
    const el = treeContainerRef.current.querySelector(`[data-node-id="${selectedNode.id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
  }, [selectedNode?.id, visibleNodes.length]);

  const handleTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!visibleNodes.length) return;

    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isTypingContext = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
    if (isTypingContext) return;

    const isCommand = e.metaKey || e.ctrlKey;

    if ((e.key === 'Delete' || e.key === 'Backspace') && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleBulkDelete();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'c' && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleCopySelection();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'v' && clipboardNodes.length > 0) {
      e.preventDefault();
      handlePasteSelection();
      return;
    }

    if (isCommand && e.key.toLowerCase() === 'd' && effectiveSelectedIds.length > 0) {
      e.preventDefault();
      handleBulkDuplicate();
      return;
    }

    const currentIndex = selectedNode ? visibleNodes.findIndex(n => n.id === selectedNode.id) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, visibleNodes.length - 1);
      onSelectionChange(visibleNodes[nextIndex], [visibleNodes[nextIndex].id]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
      onSelectionChange(visibleNodes[prevIndex], [visibleNodes[prevIndex].id]);
      return;
    }
  };

  const handleNodeSelect = (node: YAMLNode, event: React.MouseEvent) => {
    const isToggle = event.metaKey || event.ctrlKey;
    const isRange = event.shiftKey;

    if (isRange && selectedNode) {
      const anchorIndex = visibleNodes.findIndex(n => n.id === selectedNode.id);
      const targetIndex = visibleNodes.findIndex(n => n.id === node.id);

      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const rangeIds = visibleNodes.slice(start, end + 1).map(n => n.id);
        const nextIds = Array.from(new Set([...selectedNodeIds, ...rangeIds]));
        onSelectionChange(node, nextIds);
        return;
      }
    }

    if (isToggle) {
      const isAlreadySelected = selectedNodeIds.includes(node.id);
      const nextIds = isAlreadySelected ? selectedNodeIds.filter(id => id !== node.id) : [...selectedNodeIds, node.id];

      if (nextIds.length === 0) {
        onSelectionChange(null, []);
        return;
      }

      if (isAlreadySelected && selectedNode?.id === node.id) {
        const fallbackPrimary = visibleNodes.find(n => n.id === nextIds[nextIds.length - 1]) ?? null;
        onSelectionChange(fallbackPrimary, nextIds);
        return;
      }

      onSelectionChange(node, nextIds);
      return;
    }

    onSelectionChange(node, [node.id]);
  };

  const handleContextMenu = (e: React.MouseEvent, node: YAMLNode) => {
    e.preventDefault();

    // If right-clicking an unselected node, target only that node for context actions.
    if (!selectedNodeIds.includes(node.id)) {
      onSelectionChange(node, [node.id]);
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const getContextActionTargetIds = (fallbackNodeId?: string): string[] => {
    const fallback = fallbackNodeId ? [fallbackNodeId] : [];
    if (!contextMenu) return fallback;

    const contextNodeId = contextMenu.node.id;
    const contextInSelection = effectiveSelectedIds.includes(contextNodeId);

    if (contextInSelection && effectiveSelectedIds.length > 1) {
      return effectiveSelectedIds;
    }

    return [contextNodeId];
  };

  const handleNodeToggle = (nodeId: string) => {
    if (!tree) return;

    const updatedTree = toggleNodeInTree(tree, nodeId);
    onTreeChange(updatedTree);
  };

  const handleAddNode = (nodeType: YAMLAddableNodeType) => {
    if (!contextMenu || !tree) return;

    const targetIds = getContextActionTargetIds();
    const updatedTree = targetIds.reduce(
      (currentTree, targetId) => addNodeToTree(currentTree, targetId, createNodeByType(nodeType)),
      tree,
    );
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleDuplicateNode = (nodeId: string) => {
    if (!tree) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const targetIds = getContextActionTargetIds(nodeId);
    const updatedTree = targetIds.reduce(
      (currentTree, targetId) => duplicateNodeInTree(currentTree, targetId, copySuffix),
      tree,
    );
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleRemoveNode = () => {
    if (!contextMenu || !tree) return;

    const targetIds = getContextActionTargetIds();
    const updatedTree = targetIds.reduce((currentTree, nodeId) => removeNodeFromTree(currentTree, nodeId), tree);
    onSelectionChange(null, []);
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleNodeMove = (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    if (!tree) return;

    const draggedSelection = effectiveSelectedIds.includes(nodeId)
      ? visibleNodes.map(node => node.id).filter(id => effectiveSelectedIds.includes(id))
      : [nodeId];

    if (draggedSelection.includes(targetId)) {
      return;
    }

    const moveOrder = position === 'after' ? [...draggedSelection].reverse() : draggedSelection;

    const updatedTree = moveOrder.reduce(
      (currentTree, draggedId) => moveNodeInTree(currentTree, draggedId, targetId, position),
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleToggleEnabled = (nodeId: string, enabled: boolean) => {
    if (!tree) return;

    const targetIds = getContextActionTargetIds(nodeId);
    const updatedTree = targetIds.reduce(
      (currentTree, targetId) => updateNodeEnabled(currentTree, targetId, enabled),
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleBulkDelete = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) => removeNodeFromTree(currentTree, nodeId),
      tree,
    );
    onSelectionChange(null, []);
    onTreeChange(updatedTree);
  };

  const handleCopySelection = () => {
    if (effectiveSelectedIds.length === 0) return;

    const copied = effectiveSelectedIds
      .map(id => nodeById.get(id))
      .filter(Boolean)
      .map(node => cloneNodeSnapshot(node as YAMLNode));

    setClipboardNodes(copied);
  };

  const handlePasteSelection = () => {
    if (!tree || clipboardNodes.length === 0) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const pastedNodes = clipboardNodes.map(node => cloneNodeWithNewIds(node, copySuffix));
    const targetNode = selectedNode && nodeById.get(selectedNode.id) ? selectedNode : tree;

    const updatedTree =
      targetNode.id === tree.id
        ? pastedNodes.reduce((currentTree, node) => addNodeToTree(currentTree, tree.id, node), tree)
        : insertNodesAfterTarget(tree, targetNode.id, pastedNodes);

    onTreeChange(updatedTree);
    onSelectionChange(
      pastedNodes[pastedNodes.length - 1] || null,
      pastedNodes.map(node => node.id),
    );
  };

  const handleBulkDuplicate = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const copySuffix = t('yamlEditor.common.copy') || 'Copy';
    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) => duplicateNodeInTree(currentTree, nodeId, copySuffix),
      tree,
    );
    onTreeChange(updatedTree);
  };

  const handleBulkToggleEnabled = () => {
    if (!tree || effectiveSelectedIds.length === 0) return;

    const nextEnabled = allSelectedDisabled;
    const updatedTree = effectiveSelectedIds.reduce(
      (currentTree, nodeId) => updateNodeEnabled(currentTree, nodeId, nextEnabled),
      tree,
    );
    onTreeChange(updatedTree);
  };

  // No filtrar, solo pasar el searchQuery para señales visuales del nodo

  if (!tree) {
    return (
      <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-sm text-zinc-500 mb-8 max-w-[280px] mx-auto">{t('yamlEditor.emptyState.description')}</p>

          <button
            onClick={() => {
              const rootPlan = createNodeByType('root_plan');
              onTreeChange(rootPlan);
            }}
            className="group relative px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-xl shadow-yellow-400/10"
          >
            <Plus className="w-5 h-5" />
            <span>{t('yamlEditor.emptyState.addBtn')}</span>
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col">
      {/* Search Bar - Estilo exacto del converter */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
          {/* Input container */}
          <div className="flex-1 flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded px-3 py-1.5">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Close button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-zinc-500 hover:border-yellow-400 hover:text-yellow-400 transition-all flex items-center justify-center"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {selectedNodeIds.length > 1 && (
        <div className="flex-shrink-0 px-3 pb-2">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#111111] border border-white/10 rounded-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {selectedNodeIds.length} selected
            </span>
            <button
              onClick={handleBulkDuplicate}
              disabled={effectiveSelectedIds.length === 0}
              className="px-2.5 py-1.5 text-xs font-semibold rounded border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Duplicate
            </button>
            <button
              onClick={handleBulkToggleEnabled}
              disabled={effectiveSelectedIds.length === 0}
              className="px-2.5 py-1.5 text-xs font-semibold rounded border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allSelectedDisabled ? 'Enable' : 'Disable'}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={effectiveSelectedIds.length === 0}
              className="px-2.5 py-1.5 text-xs font-semibold rounded border border-red-400/20 text-red-300 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Tree */}
      <div
        ref={treeContainerRef}
        role="tree"
        aria-label="YAML tree"
        className="flex-1 overflow-y-auto px-3 pb-3 outline-none"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        onMouseDown={() => treeContainerRef.current?.focus()}
      >
        {tree ? (
          <YAMLTreeNode
            node={tree}
            depth={0}
            isSelected={selectedNodeIds.includes(tree.id)}
            selectedNodeIds={selectedNodeIds}
            redirectedRequestMap={redirectedRequestMap}
            onNodeSelect={handleNodeSelect}
            onNodeToggle={handleNodeToggle}
            onContextMenu={handleContextMenu}
            onNodeMove={handleNodeMove}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-zinc-500">No YAML loaded</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <YAMLContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={handleCloseContextMenu}
          onAddNode={handleAddNode}
          onRemove={handleRemoveNode}
          onDuplicate={handleDuplicateNode}
          onToggleEnabled={handleToggleEnabled}
        />
      )}
    </div>
  );
}

function toggleNodeInTree(tree: YAMLNode, nodeId: string): YAMLNode {
  if (tree.id === nodeId) {
    return { ...tree, expanded: !tree.expanded };
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => toggleNodeInTree(child, nodeId)),
    };
  }

  return tree;
}

function addNodeToTree(tree: YAMLNode, parentId: string, newNode: YAMLNode): YAMLNode {
  if (tree.id === parentId) {
    const children = tree.children || [];
    return {
      ...tree,
      children: [...children, newNode],
      expanded: true,
    };
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => addNodeToTree(child, parentId, newNode)),
    };
  }

  return tree;
}

function removeNodeFromTree(tree: YAMLNode, nodeId: string): YAMLNode {
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.filter(child => child.id !== nodeId).map(child => removeNodeFromTree(child, nodeId)),
    };
  }

  return tree;
}

function duplicateNodeInTree(tree: YAMLNode, nodeId: string, copySuffix: string): YAMLNode {
  let nodeToDuplicate: YAMLNode | null = null;

  // Encontrar el nodo
  const findNode = (node: YAMLNode) => {
    if (node.id === nodeId) {
      nodeToDuplicate = node;
      return;
    }
    if (node.children) {
      node.children.forEach(findNode);
    }
  };
  findNode(tree);

  if (!nodeToDuplicate) return tree;

  // Clonar profundamente con nuevos IDs
  const newNode = cloneNodeWithNewIds(nodeToDuplicate, copySuffix);

  // Insertar después del original
  const insertAfterOriginal = (node: YAMLNode): YAMLNode => {
    if (node.children) {
      const index = node.children.findIndex(c => c.id === nodeId);
      if (index !== -1) {
        const newChildren = [...node.children];
        newChildren.splice(index + 1, 0, newNode);
        return { ...node, children: newChildren };
      }
      return {
        ...node,
        children: node.children.map(insertAfterOriginal),
      };
    }
    return node;
  };

  return insertAfterOriginal(tree);
}

function insertNodesAfterTarget(tree: YAMLNode, targetId: string, newNodes: YAMLNode[]): YAMLNode {
  if (!newNodes.length) return tree;

  if (tree.children) {
    const index = tree.children.findIndex(child => child.id === targetId);
    if (index !== -1) {
      const newChildren = [...tree.children];
      newChildren.splice(index + 1, 0, ...newNodes);
      return { ...tree, children: newChildren };
    }

    return {
      ...tree,
      children: tree.children.map(child => insertNodesAfterTarget(child, targetId, newNodes)),
    };
  }

  return tree;
}

function cloneNodeSnapshot(node: YAMLNode): YAMLNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNodeSnapshot) : undefined,
  };
}

function cloneNodeWithNewIds(node: YAMLNode, copySuffix?: string): YAMLNode {
  const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    ...node,
    id: newId,
    name: copySuffix ? `${node.name} (${copySuffix})` : node.name,
    children: node.children ? node.children.map(child => cloneNodeWithNewIds(child, copySuffix)) : undefined,
  };
}

function updateNodeEnabled(tree: YAMLNode, nodeId: string, enabled: boolean): YAMLNode {
  const setEnabledInSubtree = (node: YAMLNode, nextEnabled: boolean): YAMLNode => ({
    ...node,
    data: { ...node.data, enabled: nextEnabled },
    children: node.children?.map(child => setEnabledInSubtree(child, nextEnabled)),
  });

  if (tree.id === nodeId) {
    // Keep parent/children state consistent in YAML code:
    // toggling parent enabled/disabled propagates to all descendants.
    return setEnabledInSubtree(tree, enabled);
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map(child => updateNodeEnabled(child, nodeId, enabled)),
    };
  }

  return tree;
}

function moveNodeInTree(
  tree: YAMLNode,
  nodeId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside',
): YAMLNode {
  // No mover si es el mismo nodo
  if (nodeId === targetId) return tree;

  // Paso 1: Encontrar el nodo a mover (sin extraerlo aún)
  let nodeToMove: YAMLNode | null = null;

  const findNode = (node: YAMLNode): void => {
    if (node.id === nodeId) {
      nodeToMove = { ...node };
      return;
    }
    if (node.children) {
      node.children.forEach(findNode);
    }
  };
  findNode(tree);

  if (!nodeToMove) return tree;

  // Paso 2: Remover el nodo de su posición original
  const removeNode = (node: YAMLNode): YAMLNode => {
    if (!node.children) return node;

    return {
      ...node,
      children: node.children.filter(child => child.id !== nodeId).map(removeNode),
    };
  };

  const treeWithoutNode = removeNode(tree);

  // Paso 3: Insertar el nodo en la nueva posición
  let inserted = false;

  const insertNode = (node: YAMLNode): YAMLNode => {
    if (inserted) return node;

    // Insertar dentro del target
    if (position === 'inside' && node.id === targetId) {
      inserted = true;
      const children = node.children || [];
      return {
        ...node,
        children: [...children, nodeToMove!],
        expanded: true,
      };
    }

    // Buscar en los hijos para before/after
    if (node.children && node.children.length > 0) {
      const targetIndex = node.children.findIndex(c => c.id === targetId);

      if (targetIndex !== -1 && (position === 'before' || position === 'after')) {
        inserted = true;
        const newChildren = [...node.children];
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        newChildren.splice(insertIndex, 0, nodeToMove!);
        return { ...node, children: newChildren };
      }

      // Continuar buscando recursivamente
      return {
        ...node,
        children: node.children.map(insertNode),
      };
    }

    return node;
  };

  const result = insertNode(treeWithoutNode);

  // Si no se insertó, devolver el árbol original
  if (!inserted) {
    console.warn('[moveNodeInTree] No se pudo insertar el nodo');
    return tree;
  }

  return result;
}

function createNodeByType(type: string | 'root_plan'): YAMLNode {
  const id = `node_${Math.random().toString(36).substr(2, 9)}`;

  // Root Plan Initialization
  if (type === 'root_plan') {
    const scenarioId = `node_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: 'root',
      type: 'root',
      name: 'Test Plan',
      expanded: true,
      children: [
        {
          id: 'node_scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          expanded: true,
          children: [
            {
              id: scenarioId,
              type: 'scenario',
              name: 'New Scenario',
              expanded: true,
              data: { name: 'New Scenario' },
              children: [
                {
                  id: `${scenarioId}_load`,
                  type: 'load',
                  name: 'Load Config',
                  data: {
                    vusers: 1,
                    duration: '1m',
                    ramp_up: '10s',
                  },
                },
                {
                  id: `${scenarioId}_steps`,
                  type: 'steps',
                  name: 'Steps',
                  expanded: true,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  switch (type) {
    // HTTP Requests
    case 'request':
      return {
        id,
        type: 'get',
        name: 'GET: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'sql':
      return {
        id,
        type: 'sql',
        name: 'POSTGRES: SELECT',
        data: {
          dialect: 'postgres',
          kind: 'query',
          query: 'SELECT 1',
          connection: {
            host: '{{db_host}}',
            port: 5432,
            database: 'app',
            user: '{{db_user}}',
            password: '{{db_password}}',
            validate_connectivity: true,
            max_open_conns: 5,
            max_idle_conns: 2,
          },
          params: [],
          allow_writes: false,
        },
        children: [],
      };
    case 'get':
      return {
        id,
        type: 'get',
        name: 'GET: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'post':
      return {
        id,
        type: 'post',
        name: 'POST: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'put':
      return {
        id,
        type: 'put',
        name: 'PUT: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'delete':
      return {
        id,
        type: 'delete',
        name: 'DELETE: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'patch':
      return {
        id,
        type: 'patch',
        name: 'PATCH: /api/endpoint',
        data: { url: '/api/endpoint', body: '{}' },
        children: [],
      };
    case 'head':
      return {
        id,
        type: 'head',
        name: 'HEAD: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };
    case 'options':
      return {
        id,
        type: 'options',
        name: 'OPTIONS: /api/endpoint',
        data: { url: '/api/endpoint' },
        children: [],
      };

    // Logic Controllers
    case 'group':
      return {
        id,
        type: 'group',
        name: 'Group',
        children: [],
        data: { name: 'Group' },
        expanded: true,
      };
    case 'transaction':
      return {
        id,
        type: 'transaction',
        name: 'Transaction',
        children: [],
        data: { name: 'Transaction' },
        expanded: true,
      };
    case 'if':
      return {
        id,
        type: 'if',
        name: 'If Controller',
        children: [],
        data: { condition: '{{variable}} == true' },
        expanded: true,
      };
    case 'loop':
      return {
        id,
        type: 'loop',
        name: 'Loop Controller',
        children: [],
        data: { count: 3 },
        expanded: true,
      };
    case 'retry':
      return {
        id,
        type: 'retry',
        name: 'Retry Controller',
        children: [],
        data: { attempts: 3, backoff: 'exponential' },
        expanded: true,
      };
    case 'on_error':
      return {
        id,
        type: 'on_error',
        name: 'On Error',
        children: [],
        data: { action: 'continue' },
        expanded: true,
      };
    // Timers
    case 'think_time':
      return {
        id,
        type: 'think_time',
        name: 'Think Time',
        data: { duration: '1s' },
      };

    // Pre/Post Processors
    case 'spark_before':
      return {
        id,
        type: 'spark_before',
        name: 'Spark Before',
        data: { script: '// Pre-request script\n' },
      };
    case 'spark_after':
      return {
        id,
        type: 'spark_after',
        name: 'Spark After',
        data: { script: '// Post-request script\n' },
      };

    // Assertions & Extractors
    case 'assertion':
      return {
        id,
        type: 'assertion',
        name: 'Assertion',
        data: {
          type: 'status',
          __allowTypeSelection: true,
        },
      };
    case 'extractor':
      return {
        id,
        type: 'extractor',
        name: 'Extractor',
        data: {
          type: 'regex',
          __allowTypeSelection: true,
          from: 'body',
          var: 'extracted_value',
          variable: 'extracted_value',
          pattern: 'token=([a-zA-Z0-9_-]+)',
          capture_mode: 'first',
          group: 1,
          default: '',
        },
      };
    case 'file':
      return {
        id,
        type: 'file',
        name: 'File Upload',
        data: {
          field: 'file',
          path: '',
          mime_type: 'application/octet-stream',
        },
      };
    case 'header':
      return {
        id,
        type: 'header',
        name: 'Header',
        data: {
          name: 'Authorization',
          value: '',
        },
      };
    case 'headers':
      return {
        id,
        type: 'headers',
        name: 'Headers',
        data: {
          'Content-Type': 'application/json',
        },
      };

    // Scenarios block
    case 'scenarios':
      return {
        id,
        type: 'scenarios',
        name: 'Scenarios',
        expanded: true,
        children: [],
      };

    // Scenario
    case 'scenario':
      return {
        id,
        type: 'scenario',
        name: 'New Scenario',
        children: [
          {
            id: `${id}_load`,
            type: 'load',
            name: 'Load Config',
            data: {
              vusers: 1,
              duration: '1m',
              ramp_up: '10s',
            },
          },
          {
            id: `${id}_steps`,
            type: 'steps',
            name: 'Steps',
            children: [],
            expanded: true,
          },
        ],
        data: { name: 'New Scenario' },
        expanded: true,
      };

    // Root level config elements
    case 'variables':
      return {
        id,
        type: 'variables',
        name: 'Variables',
        data: { newVariable: 'value' },
      };
    case 'data_source':
      return {
        id,
        type: 'data_source',
        name: 'Data Source',
        data: {
          type: 'csv',
          file: 'data.csv',
          mode: 'sequential',
        },
      };
    case 'http_defaults':
      return {
        id,
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: {
          base_url: 'https://api.example.com',
          timeout: '',
        },
      };
    case 'metrics':
      return {
        id,
        type: 'metrics',
        name: 'Metrics',
        data: { enabled: true },
      };

    // Scenario config elements
    case 'load':
      return {
        id,
        type: 'load',
        name: 'Load Config',
        data: {
          type: 'constant',
          users: 10,
          duration: '1m',
        },
      };
    case 'cookies':
      return {
        id,
        type: 'cookies',
        name: 'Cookies',
        data: {
          mode: 'auto',
          policy: 'standard',
          jar_scope: 'vu',
          persist_across_iterations: true,
          clear_each_iteration: false,
          cookies: [],
        },
      };
    case 'cache_manager':
      return {
        id,
        type: 'cache_manager',
        name: 'Cache Manager',
        data: {
          enabled: true,
          clear_each_iteration: true,
          max_elements: 1000,
        },
      };
    case 'error_policy':
      return {
        id,
        type: 'error_policy',
        name: 'Error Policy',
        data: {
          on_4xx: 'continue',
          on_5xx: 'stop',
          on_timeout: 'stop',
        },
      };

    default:
      return {
        id,
        type: 'step',
        name: 'Step',
        data: {},
      };
  }
}
