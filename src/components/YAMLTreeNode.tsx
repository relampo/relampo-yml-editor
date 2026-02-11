import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  User,
  GitBranch,
  Code,
  Cookie,
  FileCode,
  Clock,
  CheckCircle,
  Filter,
  Globe,
  ChevronRight,
  ChevronDown,
  Package,
  Settings,
  BarChart3,
  RotateCw,
  Repeat,
  Gauge,
  Database,
  HardDrive,
  Zap,
  Braces,
} from 'lucide-react';
import type { YAMLNode, YAMLNodeType } from '../types/yaml';
import { canDrop, canContain } from '../utils/yamlDragDropRules';

// Estado global para drag & drop (dataTransfer.getData no funciona en dragOver)
let currentDraggedNode: { id: string; type: YAMLNodeType } | null = null;

export function setDraggedNode(node: { id: string; type: YAMLNodeType } | null) {
  currentDraggedNode = node;
}

export function getDraggedNode() {
  return currentDraggedNode;
}

interface YAMLTreeNodeProps {
  node: YAMLNode;
  depth: number;
  isSelected: boolean;
  selectedNodeId: string | undefined;
  onNodeSelect: (node: YAMLNode) => void;
  onNodeToggle: (nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent, node: YAMLNode) => void;
  onNodeMove: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}

export function YAMLTreeNode({
  node,
  depth,
  isSelected,
  selectedNodeId,
  onNodeSelect,
  onNodeToggle,
  onContextMenu,
  onNodeMove,
}: YAMLTreeNodeProps) {
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded ?? true;
  const hoverTimerRef = useRef<number | null>(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id); // Necesario para Firefox
    // Guardar en estado global (dataTransfer.getData no funciona en dragOver)
    setDraggedNode({ id: node.id, type: node.type });
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragged = getDraggedNode();
    if (!dragged) {
      setDragOver(null);
      return;
    }

    const draggedNodeId = dragged.id;
    const draggedNodeType = dragged.type;

    if (draggedNodeId === node.id) {
      setDragOver(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const percentage = (y / height) * 100;

    const canContainResult = canContain(node.type, draggedNodeType);
    
    // AUTO-EXPAND: Si puede contener y NO está expandido, iniciar timer
    if (canContainResult && hasChildren && !isExpanded) {
      if (!hoverTimerRef.current) {
        hoverTimerRef.current = window.setTimeout(() => {
          onNodeToggle(node.id);
          hoverTimerRef.current = null;
        }, 600);
      }
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }

    // Determinar posición basada en zonas
    let position: 'before' | 'after' | 'inside';
    
    if (percentage < 25) {
      position = 'before';
    } else if (percentage > 75) {
      position = 'after';
    } else {
      position = canContainResult ? 'inside' : 'after';
    }

    const canDropResult = canDrop(draggedNodeType, node.type, position);
    
    if (canDropResult) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(position);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDragOver(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo limpiar si realmente salimos del nodo (no de un child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      setDragOver(null);
      
      // Cancelar timer de auto-expand
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragged = getDraggedNode();
    
    if (dragged && dragged.id !== node.id && dragOver) {
      onNodeMove(dragged.id, node.id, dragOver);
    }

    setDragOver(null);
    setDraggedNode(null);
  };

  const icon = getNodeIcon(node.type);
  const color = getNodeColor(node.type);
  const IconComponent = icon;

  return (
    <div className="select-none">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onNodeSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        className={`
          relative group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-yellow-400/10 border border-yellow-400/20' : 'hover:bg-white/5 border border-transparent'}
          ${dragOver === 'before' ? 'border-t-2 border-t-yellow-400' : ''}
          ${dragOver === 'after' ? 'border-b-2 border-b-yellow-400' : ''}
          ${dragOver === 'inside' ? 'bg-yellow-400/5 border-yellow-400/30' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeToggle(node.id);
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}

        {!hasChildren && <div className="w-4" />}

        {/* Icon */}
        <div className={`flex-shrink-0 ${color}`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Name */}
        <span className="text-sm text-zinc-300 truncate flex-1">
          {node.name}
        </span>

        {/* Badge with extra info */}
        {getNodeBadge(node)}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2 border-l border-white/5">
          {node.children!.map((child) => (
            <YAMLTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isSelected={selectedNodeId === child.id}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              onNodeToggle={onNodeToggle}
              onContextMenu={onContextMenu}
              onNodeMove={onNodeMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getNodeIcon(type: YAMLNodeType): any {
  const iconMap: Record<string, any> = {
    'root': FileText,
    'test': FileText,
    'variables': Braces,
    'data_source': Database,
    'http_defaults': Settings,
    'scenarios': Folder,
    'scenario': Zap,
    'metrics': BarChart3,
    'load': Gauge,
    'steps': Package,
    'step': Code,
    'request': Globe,
    'get': Globe,
    'post': Globe,
    'put': Globe,
    'delete': Globe,
    'patch': Globe,
    'head': Globe,
    'options': Globe,
    'group': Folder,
    'simple': FolderOpen,
    'if': Folder,
    'loop': Folder,
    'retry': Folder,
    'think_time': Clock,
    'extract': Filter,
    'extractor': Filter,
    'assert': CheckCircle,
    'assertion': CheckCircle,
    'cookies': Cookie,
    'cache_manager': HardDrive,
    'error_policy': FileCode,
    'spark': Code,
    'spark_before': Code,
    'spark_after': Code,
  };
  return iconMap[type] || FileText;
}

function getNodeColor(type: YAMLNodeType): string {
  const colorMap: Record<string, string> = {
    'root': 'text-orange-400',
    'test': 'text-orange-400',
    'variables': 'text-pink-400',
    'data_source': 'text-cyan-400',
    'http_defaults': 'text-sky-400',
    'scenarios': 'text-violet-400',
    'scenario': 'text-yellow-400',
    'metrics': 'text-indigo-400',
    'load': 'text-red-500',
    'steps': 'text-amber-400',
    'step': 'text-amber-400',
    'request': 'text-emerald-400',
    'get': 'text-emerald-400',
    'post': 'text-emerald-400',
    'put': 'text-emerald-400',
    'delete': 'text-emerald-400',
    'patch': 'text-emerald-400',
    'head': 'text-emerald-400',
    'options': 'text-emerald-400',
    'group': 'text-blue-400',
    'simple': 'text-blue-400',
    'if': 'text-pink-500',
    'loop': 'text-purple-400',
    'retry': 'text-red-400',
    'think_time': 'text-sky-400',
    'extract': 'text-cyan-400',
    'extractor': 'text-cyan-400',
    'assert': 'text-yellow-400',
    'assertion': 'text-yellow-400',
    'cookies': 'text-pink-500',
    'cache_manager': 'text-slate-400',
    'error_policy': 'text-orange-400',
    'spark': 'text-yellow-500',
    'spark_before': 'text-yellow-500',
    'spark_after': 'text-amber-500',
  };
  return colorMap[type] || 'text-zinc-400';
}

function getNodeBadge(node: YAMLNode): JSX.Element | null {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  
  if (httpMethods.includes(node.type)) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-mono uppercase">
        {node.type}
      </span>
    );
  }

  if (node.type === 'request' && node.data?.method) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-mono uppercase">
        {node.data.method}
      </span>
    );
  }

  if (node.type === 'loop' && node.data?.count) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-mono">
        ×{node.data.count}
      </span>
    );
  }

  if (node.type === 'think_time' && node.data?.duration) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 font-mono">
        {node.data.duration}
      </span>
    );
  }

  // Spark badges
  if (node.type === 'spark_before') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400 font-mono">
        before
      </span>
    );
  }

  if (node.type === 'spark_after') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-mono">
        after
      </span>
    );
  }

  // Assertion badge
  if (node.type === 'assertion' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-mono">
        {node.data.type}
      </span>
    );
  }

  // Extractor badge
  if (node.type === 'extractor' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 font-mono">
        {node.data.type}
      </span>
    );
  }

  return null;
}
