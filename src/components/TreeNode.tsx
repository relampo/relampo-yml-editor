import { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  FileText,
  Folder,
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
  GripVertical,
} from 'lucide-react';
import type { ScriptNode, NodeType } from '../types/script';
import { canDropNode, canReorderNodes } from '../utils/dragDropRules';

const DRAG_TYPE = 'SCRIPT_NODE';

type DropPosition = 'before' | 'after' | 'inside' | null;

interface TreeNodeProps {
  node: ScriptNode;
  depth: number;
  isSelected: boolean;
  selectedNodeId?: string;
  parentNode?: ScriptNode;
  onNodeSelect: (node: ScriptNode) => void;
  onNodeToggle: (nodeId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: ScriptNode) => void;
  onNodeMove?: (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}

const getNodeIcon = (type: NodeType) => {
  const iconMap: Record<NodeType, any> = {
    'test-plan': FileText,
    'scenario': Folder,
    'profile': User,
    'controller-simple': GitBranch,
    'controller-if': Code,
    'controller-loop': Repeat,
    'controller-group': GitBranch,
    'controller-retry': RotateCw,
    'controller-transaction': GitBranch,
    'http-request': Globe,
    'cookie-manager': Cookie,
    'cache-manager': HardDrive,
    'header-manager': FileCode,
    'timer': Clock,
    'assertion': CheckCircle,
    'extractor': Filter,
    'variables': Package,
    'data-source': Database,
    'http-defaults': Settings,
    'metrics': BarChart3,
    'load': Gauge,
  };
  return iconMap[type] || FileText;
};

const getNodeColor = (type: NodeType): string => {
  const colorMap: Record<NodeType, string> = {
    'test-plan': 'text-orange-400',
    'scenario': 'text-purple-400',
    'profile': 'text-green-400',
    'controller-simple': 'text-orange-400',
    'controller-if': 'text-amber-400',
    'controller-loop': 'text-blue-400',
    'controller-group': 'text-orange-400',
    'controller-retry': 'text-red-400',
    'controller-transaction': 'text-orange-400',
    'http-request': 'text-blue-400',
    'cookie-manager': 'text-pink-400',
    'cache-manager': 'text-slate-400',
    'header-manager': 'text-indigo-400',
    'timer': 'text-cyan-400',
    'assertion': 'text-green-400',
    'extractor': 'text-violet-400',
    'variables': 'text-neutral-400',
    'data-source': 'text-emerald-400',
    'http-defaults': 'text-neutral-400',
    'metrics': 'text-neutral-400',
    'load': 'text-green-400',
  };
  return colorMap[type] || 'text-neutral-400';
};

export function TreeNode({
  node,
  depth,
  isSelected,
  selectedNodeId,
  parentNode,
  onNodeSelect,
  onNodeToggle,
  onContextMenu,
  onNodeMove,
}: TreeNodeProps) {
  const Icon = getNodeIcon(node.type);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded;
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);

  // Don't allow dragging the test-plan root
  const canDrag = node.type !== 'test-plan';

  const [{ isDragging }, dragRef] = useDrag({
    type: DRAG_TYPE,
    item: { node, parentNode },
    canDrag: () => canDrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop: canDropHere }, dropRef] = useDrop({
    accept: DRAG_TYPE,
    canDrop: (item: { node: ScriptNode; parentNode?: ScriptNode }) => {
      // Can't drop on itself or its descendants
      if (item.node.id === node.id) return false;

      // Can't drop a parent into its own child
      const isDescendant = (parent: ScriptNode, childId: string): boolean => {
        if (parent.id === childId) return true;
        if (!parent.children) return false;
        return parent.children.some(child => isDescendant(child, childId));
      };
      if (isDescendant(item.node, node.id)) return false;

      return true; // We'll validate specific positions in hover
    },
    hover: (item: { node: ScriptNode; parentNode?: ScriptNode }, monitor) => {
      if (!nodeRef.current) return;

      const hoverBoundingRect = nodeRef.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const hoverHeight = hoverBoundingRect.height;
      
      // Divide the node into three zones
      const topThreshold = hoverHeight * 0.25;
      const bottomThreshold = hoverHeight * 0.75;

      let newPosition: DropPosition = null;

      if (hoverClientY < topThreshold) {
        // Top zone: insert before this node (reorder as sibling)
        if (parentNode && canReorderNodes(item.node.type, node.type, parentNode.type)) {
          newPosition = 'before';
        }
      } else if (hoverClientY > bottomThreshold) {
        // Bottom zone: insert after this node (reorder as sibling)
        if (parentNode && canReorderNodes(item.node.type, node.type, parentNode.type)) {
          newPosition = 'after';
        }
      } else {
        // Middle zone: insert as child (nest inside)
        if (canDropNode(item.node.type, node.type)) {
          newPosition = 'inside';
        }
      }

      setDropPosition(newPosition);
    },
    drop: (item: { node: ScriptNode; parentNode?: ScriptNode }) => {
      if (onNodeMove && dropPosition) {
        onNodeMove(item.node.id, node.id, dropPosition);
      }
      setDropPosition(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const nodeRef = useRef<HTMLDivElement>(null);
  dragRef(dropRef(nodeRef) as any);

  // Determine drop indicator style
  const getDropStyle = () => {
    if (!isOver) return '';
    if (dropPosition === 'inside') {
      return 'ring-2 ring-yellow-400 bg-yellow-50';
    }
    return ''; // Border indicators will show for before/after
  };

  return (
    <div className="relative">
      {/* Before indicator */}
      {isOver && dropPosition === 'before' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 z-10"
          style={{ top: '-1px', left: `${depth * 16 + 12}px` }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full -ml-1 shadow-lg shadow-yellow-400/50"></div>
        </div>
      )}

      <div
        className={`
          group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150
          ${isDragging
            ? 'opacity-40 cursor-grabbing scale-95'
            : canDrag
            ? 'cursor-grab hover:shadow-md hover:shadow-yellow-400/20'
            : 'cursor-pointer'
          } 
          ${isSelected
            ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 text-zinc-100 shadow-md border border-yellow-400/30'
            : 'hover:bg-white/5 text-zinc-300'
          } 
          ${getDropStyle()}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onNodeSelect(node)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
        ref={nodeRef}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeToggle(node.id);
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        <Icon className={`w-4 h-4 flex-shrink-0 ${getNodeColor(node.type)}`} />
        <span className="text-sm flex-1 truncate font-medium tracking-tight">{node.name}</span>
        {canDrag && (
          <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* After indicator */}
      {isOver && dropPosition === 'after' && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 z-10"
          style={{ bottom: '-1px', left: `${depth * 16 + 12}px` }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full -ml-1 shadow-lg shadow-yellow-400/50"></div>
        </div>
      )}

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isSelected={selectedNodeId === child.id}
              selectedNodeId={selectedNodeId}
              parentNode={node}
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