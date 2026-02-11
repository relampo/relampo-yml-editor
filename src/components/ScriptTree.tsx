import { useState } from 'react';
import type { ScriptNode } from '../types/script';
import { TreeNode } from './TreeNode';
import { ContextMenu, type AddableNodeType } from './ContextMenu';

interface ScriptTreeProps {
  tree: ScriptNode;
  selectedNode: ScriptNode | null;
  onNodeSelect: (node: ScriptNode) => void;
  onNodeToggle: (nodeId: string) => void;
  onNodeAdd: (parentId: string, nodeType: AddableNodeType) => void;
  onNodeRename: (node: ScriptNode) => void;
  onNodeRemove: (nodeId: string) => void;
  onNodeMove: (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}

export function ScriptTree({
  tree,
  selectedNode,
  onNodeSelect,
  onNodeToggle,
  onNodeAdd,
  onNodeRename,
  onNodeRemove,
  onNodeMove,
}: ScriptTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: ScriptNode;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, node: ScriptNode) => {
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

  const handleAddNode = (nodeType: AddableNodeType) => {
    if (contextMenu) {
      onNodeAdd(contextMenu.node.id, nodeType);
      handleCloseContextMenu();
    }
  };

  const handleRenameNode = () => {
    if (contextMenu) {
      onNodeRename(contextMenu.node);
      handleCloseContextMenu();
    }
  };

  const handleRemoveNode = () => {
    if (contextMenu) {
      onNodeRemove(contextMenu.node.id);
      handleCloseContextMenu();
    }
  };

  return (
    <aside className="w-80 bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 flex flex-col overflow-hidden">
      {/* Header con acento amarillo */}
      <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-[#111111] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-5 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 rounded-full shadow-lg shadow-yellow-400/40" />
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Script Tree</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 bg-[#0a0a0a] min-h-0">
        <TreeNode
          node={tree}
          depth={0}
          isSelected={selectedNode?.id === tree.id}
          selectedNodeId={selectedNode?.id}
          onNodeSelect={onNodeSelect}
          onNodeToggle={onNodeToggle}
          onContextMenu={handleContextMenu}
          onNodeMove={onNodeMove}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={handleCloseContextMenu}
          onAddNode={handleAddNode}
          onRename={handleRenameNode}
          onRemove={handleRemoveNode}
        />
      )}
    </aside>
  );
}