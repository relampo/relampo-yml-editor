import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeNode } from './YAMLTreeNode';
import { YAMLContextMenu, type YAMLAddableNodeType } from './YAMLContextMenu';

interface YAMLTreeViewProps {
  tree: YAMLNode | null;
  selectedNode: YAMLNode | null;
  onNodeSelect: (node: YAMLNode) => void;
  onTreeChange: (tree: YAMLNode) => void;
}

export function YAMLTreeView({
  tree,
  selectedNode,
  onNodeSelect,
  onTreeChange,
}: YAMLTreeViewProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: YAMLNode;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleContextMenu = (e: React.MouseEvent, node: YAMLNode) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleNodeToggle = (nodeId: string) => {
    if (!tree) return;
    
    const updatedTree = toggleNodeInTree(tree, nodeId);
    onTreeChange(updatedTree);
  };

  const handleAddNode = (nodeType: YAMLAddableNodeType) => {
    if (!contextMenu || !tree) return;

    const newNode = createNodeByType(nodeType);
    const updatedTree = addNodeToTree(tree, contextMenu.node.id, newNode);
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleRemoveNode = () => {
    if (!contextMenu || !tree) return;

    const updatedTree = removeNodeFromTree(tree, contextMenu.node.id);
    onTreeChange(updatedTree);
    handleCloseContextMenu();
  };

  const handleNodeMove = (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    if (!tree) return;

    const updatedTree = moveNodeInTree(tree, nodeId, targetId, position);
    onTreeChange(updatedTree);
  };

  const handleToggleEnabled = (nodeId: string, enabled: boolean) => {
    if (!tree) return;

    const updatedTree = updateNodeEnabled(tree, nodeId, enabled);
    onTreeChange(updatedTree);
  };

  // No filtrar, solo pasar el searchQuery para highlight

  if (!tree) {
    return (
      <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-zinc-600 mb-2">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-500">Escribe o sube un YAML válido</p>
          <p className="text-xs text-zinc-600 mt-1">para visualizar el árbol</p>
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
              onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {tree ? (
          <YAMLTreeNode
            node={tree}
            depth={0}
            isSelected={selectedNode?.id === tree.id}
            selectedNodeId={selectedNode?.id}
            onNodeSelect={onNodeSelect}
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
      children: tree.children
        .filter(child => child.id !== nodeId)
        .map(child => removeNodeFromTree(child, nodeId)),
    };
  }

  return tree;
}

function updateNodeEnabled(tree: YAMLNode, nodeId: string, enabled: boolean): YAMLNode {
  if (tree.id === nodeId) {
    return {
      ...tree,
      data: { ...tree.data, enabled },
    };
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
  position: 'before' | 'after' | 'inside'
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
      children: node.children
        .filter(child => child.id !== nodeId)
        .map(removeNode),
    };
  };
  
  let treeWithoutNode = removeNode(tree);
  
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

function createNodeByType(type: YAMLAddableNodeType): YAMLNode {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
          value: 200
        },
      };
    case 'extractor':
      return {
        id,
        type: 'extractor',
        name: 'Extractor',
        data: { 
          type: 'json',
          path: '$.data.id',
          variable: 'extracted_id'
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
          mime_type: 'application/octet-stream'
        },
      };
    case 'header':
      return {
        id,
        type: 'header',
        name: 'Header',
        data: { 
          name: 'Authorization',
          value: ''
        },
      };
    case 'headers':
      return {
        id,
        type: 'headers',
        name: 'Headers',
        data: {
          'Content-Type': 'application/json'
        },
      };

    // Scenario
    case 'scenario':
      return {
        id,
        type: 'scenario',
        name: 'New Scenario',
        children: [
          {
            id: `${id}_steps`,
            type: 'steps',
            name: 'Steps',
            children: [],
            expanded: true,
          }
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
          mode: 'sequential'
        },
      };
    case 'http_defaults':
      return {
        id,
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: { 
          base_url: 'https://api.example.com',
          timeout: '30s'
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
          duration: '1m'
        },
      };
    case 'cookies':
      return {
        id,
        type: 'cookies',
        name: 'Cookies',
        data: { mode: 'shared' },
      };
    case 'cache_manager':
      return {
        id,
        type: 'cache_manager',
        name: 'Cache Manager',
        data: { enabled: true },
      };
    case 'error_policy':
      return {
        id,
        type: 'error_policy',
        name: 'Error Policy',
        data: { 
          on_4xx: 'continue',
          on_5xx: 'stop'
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
