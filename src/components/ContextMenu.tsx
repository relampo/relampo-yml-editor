import { 
  Package, 
  Database, 
  Settings, 
  Folder, 
  BarChart3,
  Cookie,
  HardDrive,
  Gauge,
  Globe,
  GitBranch,
  Clock,
  Filter,
  CheckCircle,
  Code,
  Repeat,
  RotateCw,
  Trash2,
  Edit3,
  Plus
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ScriptNode } from '../types/script';

export type AddableNodeType = 
  | 'variables'
  | 'data-source'
  | 'http-defaults'
  | 'scenario'
  | 'metrics'
  | 'cookie-manager'
  | 'cache-manager'
  | 'load'
  | 'http-request'
  | 'controller-group'
  | 'controller-if'
  | 'controller-loop'
  | 'controller-retry'
  | 'timer'
  | 'extractor'
  | 'assertion';

interface ContextMenuProps {
  x: number;
  y: number;
  node: ScriptNode;
  onAddNode: (nodeType: AddableNodeType) => void;
  onRename: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, node, onAddNode, onRename, onRemove, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Get available options based on node type and existing children
  const getAvailableOptions = (): AddableNodeType[] => {
    const children = node.children || [];
    const hasChild = (type: string) => children.some(child => child.type === type);

    switch (node.type) {
      case 'test-plan':
        return ['variables', 'data-source', 'http-defaults', 'scenario', 'metrics'];
      
      case 'scenario': {
        const options: AddableNodeType[] = ['data-source', 'http-request', 'controller-group', 'controller-if', 'controller-loop', 'controller-retry'];
        
        // Add managers only if they don't exist yet (solo una vez)
        if (!hasChild('cookie-manager')) {
          options.unshift('cookie-manager');
        }
        if (!hasChild('cache-manager')) {
          options.unshift('cache-manager');
        }
        if (!hasChild('load')) {
          options.unshift('load');
        }
        
        return options;
      }
      
      case 'http-request':
        return ['timer', 'extractor', 'assertion'];
      
      case 'controller-group':
      case 'controller-if':
      case 'controller-loop':
      case 'controller-retry':
      case 'controller-transaction':
        return ['http-request', 'controller-group', 'controller-if', 'controller-loop', 'controller-retry'];
      
      default:
        return [];
    }
  };

  const options = getAvailableOptions();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems: Record<AddableNodeType, { label: string; icon: any; color: string }> = {
    'variables': { label: 'Variables', icon: Package, color: 'text-neutral-500' },
    'data-source': { label: 'Data Source', icon: Database, color: 'text-emerald-500' },
    'http-defaults': { label: 'HTTP Defaults', icon: Settings, color: 'text-neutral-500' },
    'scenario': { label: 'Scenario', icon: Folder, color: 'text-purple-500' },
    'metrics': { label: 'Metrics', icon: BarChart3, color: 'text-neutral-500' },
    'cookie-manager': { label: 'Cookie Manager', icon: Cookie, color: 'text-pink-500' },
    'cache-manager': { label: 'Cache Manager', icon: HardDrive, color: 'text-slate-500' },
    'load': { label: 'Load Profile', icon: Gauge, color: 'text-green-500' },
    'http-request': { label: 'HTTP Request', icon: Globe, color: 'text-blue-500' },
    'controller-group': { label: 'Simple Controller', icon: GitBranch, color: 'text-orange-500' },
    'controller-if': { label: 'If Controller', icon: Code, color: 'text-amber-500' },
    'controller-loop': { label: 'Loop Controller', icon: Repeat, color: 'text-blue-500' },
    'controller-retry': { label: 'Retry Controller', icon: RotateCw, color: 'text-red-500' },
    'timer': { label: 'Think Time', icon: Clock, color: 'text-cyan-500' },
    'extractor': { label: 'Extractor', icon: Filter, color: 'text-violet-500' },
    'assertion': { label: 'Assertion', icon: CheckCircle, color: 'text-green-500' },
  };

  // Group items by category
  const categories = [
    {
      title: 'Configuration',
      types: ['variables', 'data-source', 'http-defaults', 'metrics'] as AddableNodeType[],
    },
    {
      title: 'Scenarios',
      types: ['scenario'] as AddableNodeType[],
    },
    {
      title: 'Managers',
      types: ['cookie-manager', 'cache-manager', 'load'] as AddableNodeType[],
    },
    {
      title: 'Requests',
      types: ['http-request'] as AddableNodeType[],
    },
    {
      title: 'Controllers',
      types: ['controller-group', 'controller-if', 'controller-loop', 'controller-retry'] as AddableNodeType[],
    },
    {
      title: 'Post-Processors',
      types: ['timer', 'extractor', 'assertion'] as AddableNodeType[],
    },
  ];

  const visibleCategories = categories
    .map(cat => ({
      ...cat,
      types: cat.types.filter(type => options.includes(type)),
    }))
    .filter(cat => cat.types.length > 0);

  // Check if node can be removed (everything except test-plan)
  const canRemove = node.type !== 'test-plan';
  const canRename = true; // All nodes can be renamed

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#111111] border border-white/10 rounded-xl shadow-2xl py-2 z-50 min-w-[240px]"
      style={{ left: x, top: y }}
    >
      {/* Node Actions Section */}
      {(canRename || canRemove) && (
        <>
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">Node Actions</p>
          </div>
          
          {canRename && (
            <button
              onClick={() => {
                onRename();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-500/10 transition-all duration-150 text-left group"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Rename</span>
            </button>
          )}
          
          {canRemove && (
            <button
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-all duration-150 text-left group"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
              </div>
              <span className="text-sm text-red-400 font-medium">Remove</span>
            </button>
          )}
        </>
      )}

      {/* Add Element Section */}
      {options.length > 0 && (
        <>
          {(canRename || canRemove) && <div className="border-t border-white/5 my-2" />}
          
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">Add Element</p>
          </div>
          
          {visibleCategories.map((category, catIndex) => (
            <div key={category.title}>
              {catIndex > 0 && <div className="border-t border-white/5 my-2" />}
              
              <div className="px-4 py-1.5">
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                  {category.title}
                </p>
              </div>
              
              {category.types.map(type => {
                const item = menuItems[type];
                const Icon = item.icon;
                
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onAddNode(type);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-500/10 transition-all duration-150 text-left group"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                    <Plus className="w-3.5 h-3.5 ml-auto text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}