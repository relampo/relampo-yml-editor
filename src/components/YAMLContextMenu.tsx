import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { getAddableItems, type YAMLAddableNodeType } from './yaml-tree-view/addableItems';

interface YAMLContextMenuProps {
  x: number;
  y: number;
  node: YAMLNode;
  onClose: () => void;
  onAddNode: (nodeType: YAMLAddableNodeType) => void;
  onRemove: () => void;
  onDuplicate?: (nodeId: string) => void;
  onToggleEnabled?: (nodeId: string, enabled: boolean) => void;
}

export function YAMLContextMenu({
  x,
  y,
  node,
  onClose,
  onAddNode,
  onRemove,
  onDuplicate,
  onToggleEnabled,
}: YAMLContextMenuProps) {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep the menu on-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      // Adjust if it would overflow on the right
      if (x + rect.width > viewportWidth - 10) {
        newX = viewportWidth - rect.width - 10;
      }

      // Adjust if it would overflow at the bottom
      if (y + rect.height > viewportHeight - 10) {
        newY = viewportHeight - rect.height - 10;
      }

      // Ensure the position never becomes negative
      newX = Math.max(10, newX);
      newY = Math.max(10, newY);

      if (newX !== x || newY !== y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [x, y]);

  const addableItems = getAddableItems(node.type, t);
  const canAddChildren = addableItems.length > 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[220px] max-h-[80vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
    >
      {canAddChildren && (
        <>
          <div className="px-3 py-1.5 sticky top-0 bg-[#111111] z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <Plus className="w-3 h-3" />
              {t('yamlEditor.common.add')}
            </div>
          </div>

          {addableItems.map(item => (
            <button
              key={item.type}
              onClick={() => onAddNode(item.type)}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
            >
              <div className={item.color}>{item.icon}</div>
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{item.label}</div>
                {item.description && <div className="text-xs text-zinc-500">{item.description}</div>}
              </div>
            </button>
          ))}

          <div className="h-px bg-white/5 my-1" />
        </>
      )}

      {/* Enable/Disable option */}
      {node.type !== 'root' &&
        node.type !== 'test' &&
        node.type !== 'scenarios' &&
        node.type !== 'steps' &&
        onToggleEnabled && (
          <button
            onClick={() => {
              const isCurrentlyEnabled = node.data?.enabled !== false;
              onToggleEnabled(node.id, !isCurrentlyEnabled);
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-zinc-300"
          >
            {node.data?.enabled === false ? (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm">{t('yamlEditor.common.enable')}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span className="text-sm">{t('yamlEditor.common.disable')}</span>
              </>
            )}
          </button>
        )}

      {node.type !== 'root' && node.type !== 'test' && node.type !== 'scenarios' && node.type !== 'steps' && (
        <>
          <div className="h-px bg-white/5 my-1" />

          {onDuplicate && (
            <button
              onClick={() => {
                onDuplicate(node.id);
                onClose();
              }}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-zinc-300"
            >
              <Copy className="w-4 h-4" />
              <span className="text-sm">{t('yamlEditor.common.duplicate') || 'Duplicate'}</span>
            </button>
          )}

          <button
            onClick={onRemove}
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-red-500/10 text-left transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">{t('yamlEditor.common.delete')}</span>
          </button>
        </>
      )}
    </div>
  );
}
